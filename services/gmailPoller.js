// services/gmailPoller.js
// Background service that checks Gmail for new catering orders every 5-10 minutes

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { debugLogDB, emailOrderDB } = require('../database/db');
const EventEmitter = require('events');

class GmailPoller extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.pollInterval = options.pollInterval || 5 * 60 * 1000; // Default 5 minutes
    this.debugMode = options.debugMode || false;
    this.isPolling = false;
    this.pollTimer = null;
    this.lastCheckTime = null;
    this.newOrdersCount = 0;
    
    // IMAP configuration
    this.imapConfig = {
      user: 'cfa02348@gmail.com',
      password: 'qyhjujpaqkvktube', // Move to env var in production
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false, servername: 'imap.gmail.com' }
    };
  }

  async log(msg) {
    const timestamp = new Date().toISOString();
    const logMsg = `[GmailPoller ${timestamp}] ${msg}`;
    
    try {
      await debugLogDB.log(logMsg);
    } catch (error) {
      console.error('Failed to write to debug log:', error);
    }
    
    if (this.debugMode) {
      console.log(logMsg);
    }
  }

  // Start the background polling
  start() {
    if (this.isPolling) {
      this.log('⚠️ Poller is already running');
      return;
    }

    this.isPolling = true;
    this.log('🚀 Starting Gmail background poller...');
    this.log(`📅 Will check every ${Math.round(this.pollInterval / 60000)} minutes`);
    
    // Do an immediate check on startup
    this.checkForNewOrders();
    
    // Set up recurring checks
    this.pollTimer = setInterval(() => {
      this.checkForNewOrders();
    }, this.pollInterval);
    
    this.emit('started');
  }

  // Stop the background polling
  stop() {
    if (!this.isPolling) {
      this.log('⚠️ Poller is not running');
      return;
    }

    this.isPolling = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    this.log('🛑 Stopped Gmail background poller');
    this.emit('stopped');
  }

  // Check for new orders
  async checkForNewOrders() {
    const checkStartTime = new Date();
    this.log('🔍 Checking Gmail for new catering orders...');
    
    try {
      const newOrdersFound = await this.fetchAndSaveOrders();
      
      this.lastCheckTime = checkStartTime;
      
      if (newOrdersFound > 0) {
        this.newOrdersCount += newOrdersFound;
        this.log(`✨ Found ${newOrdersFound} new order(s)! Total new orders: ${this.newOrdersCount}`);
        
        // Emit event that new orders were found
        this.emit('newOrders', {
          count: newOrdersFound,
          totalNew: this.newOrdersCount,
          timestamp: checkStartTime
        });
      } else {
        this.log('✅ No new orders found');
        this.emit('checked', {
          newOrders: 0,
          timestamp: checkStartTime
        });
      }
    } catch (error) {
      this.log(`❌ Error checking for orders: ${error.message}`);
      this.emit('error', error);
    }
  }

  // Fetch orders from Gmail and save to database
  fetchAndSaveOrders() {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.imapConfig);
      const orders = [];
      let ended = false;

      const safeEnd = () => {
        if (!ended) {
          ended = true;
          try { imap.end(); } catch {}
        }
      };

      imap.once('ready', () => {
        imap.openBox('Catering', false, err => {
          if (err) { safeEnd(); return reject(err); }

          imap.search(['ALL'], (err, results) => {
            if (err) { safeEnd(); return reject(err); }
            if (!results || !results.length) {
              safeEnd();
              return resolve(0);
            }

            const f = imap.fetch(results, { bodies: '' });

            f.on('message', msg => {
              msg.on('body', stream => {
                simpleParser(stream, async (err, parsed) => {
                  if (err || !parsed.text) return;
                  if (!/Incoming Catering Order/i.test(parsed.subject || '')) return;

                  const text = this.normalizeText(parsed.text);
                  const orderData = this.parseOrder(text);

                  // Parse date and time
                  const dtMatch = text.match(
                    /(?:(\w+)\s+)?(\d{1,2}\/\d{1,2}\/\d{4}).*?([\d:]+\s*(?:am|pm)?)/i
                  );
                  
                  let dateField = '*';
                  let timeField = '';
                  
                  if (dtMatch) {
                    const [_, dayName, date, time] = dtMatch;
                    const [month, day, year] = date.split('/').map(Number);
                    const timeStr = time.toLowerCase();
                    
                    let hours = 0, minutes = 0;
                    const timeMatch = timeStr.match(/(\d+):(\d+)(?:\s*(am|pm))?/i);
                    if (timeMatch) {
                      hours = parseInt(timeMatch[1], 10);
                      minutes = parseInt(timeMatch[2], 10);
                      const meridiem = timeMatch[3]?.toLowerCase();
                      
                      if (meridiem === 'pm' && hours < 12) hours += 12;
                      if (meridiem === 'am' && hours === 12) hours = 0;
                    }
                    
                    const d = new Date(year, month - 1, day, hours, minutes);
                    dateField = `${month}/${day}/${year}`;
                    timeField = d.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  }

                  // Delivery destination
                  let destination = 'N/A';
                  if (orderData.orderType === 'Delivery') {
                    const destMatch = text.match(/Delivery Address\s*[:\s]*\n\s*([^\n]+(?:\n[^\n]+)*?)(?:\n\s*Customer Information|\n\s*$)/i);
                    if (destMatch && destMatch[1].trim()) {
                      destination = destMatch[1].replace(/\n/g, ' ').trim();
                    }
                  }

                  orders.push({
                    order_type: orderData.orderType,
                    order_date: dateField,
                    order_time: timeField,
                    destination,
                    customer_name: orderData.customer_name,
                    phone_number: orderData.phone_number,
                    customer_email: orderData.customer_email,
                    guest_count: orderData.guest_count,
                    paper_goods: orderData.paper_goods,
                    special_instructions: orderData.special_instructions || '',
                    food_items: orderData.food_items,
                    drink_items: orderData.drink_items,
                    sauces_dressings: orderData.sauces_dressings,
                    meal_boxes: orderData.meal_boxes,
                    total: orderData.total
                  });
                });
              });
            });

            f.once('end', async () => {
              try {
                let savedCount = 0;
                
                for (const newOrder of orders) {
                  try {
                    // Check for duplicate
                    const existing = await emailOrderDB.findDuplicate(
                      newOrder.customer_email,
                      newOrder.order_date,
                      newOrder.total
                    );
                    
                    if (!existing) {
                      await emailOrderDB.create(newOrder);
                      savedCount++;
                      this.log(`✅ Saved new order: ${newOrder.customer_name} - ${newOrder.order_date} - $${newOrder.total}`);
                    } else {
                      this.log(`⏭️ Skipped duplicate: ${newOrder.customer_name} - ${newOrder.order_date} - $${newOrder.total}`);
                    }
                  } catch (orderErr) {
                    this.log(`ERROR saving order: ${orderErr.message}`);
                  }
                }

                safeEnd();
                resolve(savedCount);
              } catch (e) {
                this.log(`ERROR processing orders: ${e.message}`);
                safeEnd();
                resolve(0);
              }
            });
          });
        });
      });

      imap.once('error', err => {
        this.log(`⚠️ IMAP error: ${err.message}`);
        safeEnd();
        resolve(0);
      });

      imap.once('close', () => {
        safeEnd();
      });

      try {
        imap.connect();
      } catch (e) {
        reject(e);
      }
    });
  }

  // Utility functions (copied from fetchCatering.js)
  normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\u00A0\u2000-\u200F\u2028\u2029]/g, ' ')
      .replace(/[^\w\s@.,!?:;/'"()$%&*-]/g, '')
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  extractBetween(text, start, end = null) {
    const regex = new RegExp(
      start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '(.*?)' +
        (end ? end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '$'),
      'is'
    );
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  parseOrder(message) {
    if (!message) return {};

    const msg = message.replace(/\r\n|\r/g, '\n');
    const orderType = /Pickup Order/i.test(msg) ? 'Pickup' : 'Delivery';

    const custBlock = this.extractBetween(msg, 'Customer Information', 'Item Name');
    const linesCust = custBlock ? custBlock.split('\n').map(l => l.trim()).filter(Boolean) : [];

    let customer_name = '';
    let phone_number = '';
    let customer_email = '';
    let guest_count = 'N/A';
    let paper_goods = 'No';
    let special_instructions = '';

    let inSpecialInstructions = false;
    for (const line of linesCust) {
      const lower = line.toLowerCase();
      
      if (lower === 'special instructions') {
        inSpecialInstructions = true;
        continue;
      }
      
      if (inSpecialInstructions) {
        special_instructions += (special_instructions ? '\n' : '') + line;
        continue;
      }
      
      if (lower.startsWith('guest count')) {
        guest_count = line.split(':')[1]?.trim() || 'N/A';
      } else if (lower.startsWith('paper goods')) {
        paper_goods = line.split(':')[1]?.trim() || 'No';
      } else if (/^[\w.%+-]+@[\w.-]+\.[a-z]{2,}$/i.test(line)) {
        customer_email = line;
      } else if (/^\+?\d{10,}$/.test(line.replace(/\D/g, ''))) {
        phone_number = line.replace(/\D/g, '');
        if (!phone_number.startsWith('+')) phone_number = '+' + phone_number;
      } else if (!customer_name && line && !lower.includes('customer information')) {
        customer_name = line;
      }
    }
    
    // Log raw email for sherry stockmal
    if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
      console.log('========== RAW EMAIL FOR sherry stockmal ==========');
      console.log(msg);
      console.log('========== END RAW EMAIL ==========');
    }

    // Parse items
    let itemsBlock = msg.split(/Item\s+Name\s+Quantity\s+(?:Qty\s+)?Price/i)[1] || '';
    itemsBlock = itemsBlock.split(/(?:Subtotal|Tax|Total)\s+\$[\d.,]+/i)[0];

    const rawLines = itemsBlock
      .split('\n')
      .map(l => l.replace(/\u2003/g, ' '))
      .map(l => l.replace(/®/g, ''))
      .map(l => l.trim())
      .filter(l => l !== '' && 
        !/^(quantity\s+qty\s+price|quantity\s+price|qty\s+price)$/i.test(l) &&
        !/^(subtotal|tax|total)\b/i.test(l));

    const food_items = [];
    const drink_items = [];
    const sauces_dressings = [];
    const meal_boxes = [];

    const pushItem = (name, qty, isMealBox = false) => {
      name = name.trim();
      if (!name) return;
      
      qty = parseInt(qty, 10) || 1;
      
      const lower = name.toLowerCase();
      
      // Log for debugging
      if (customer_name && (customer_name.toLowerCase().includes('lauren palcko') || customer_name.toLowerCase().includes('sherry stockmal'))) {
        console.log(`🔍 Pushing item: "${name}" | qty: ${qty} | isMealBox: ${isMealBox}`);
      }
      
      // Check if this is a meal box/package
      if (isMealBox || lower.includes('meal') || lower.includes('box') || 
          lower.includes('boxed') || lower.includes('package') || lower.includes('packaged')) {
        meal_boxes.push({ item: name, qty });
      }
      else if ((lower.includes('sauce') || lower.includes('dressing') || 
           lower.includes('ketchup') || lower.includes('mayo') || 
           lower.includes('honey') || lower.includes('jam')) && 
          !lower.includes('gallon') && !lower.includes('chips')) {
        // Normalize sauce names - ensure proper format like "8oz Sauce" not "8 x oz Sauce"
        let normalizedName = name;
        // If it looks like "X x Y" where Y contains a unit, reconstruct as "X Y"
        const badFormat = name.match(/^(\d+)\s+x\s+(\d+)\s*(oz|lb|lbs?|g|kg|ml|l|qt|gal|pt)\s+(.*)$/i);
        if (badFormat) {
          const [, qty1, size, unit, item] = badFormat;
          normalizedName = `${size}${unit} ${item}`;
          qty = parseInt(qty1, 10);
        }
        sauces_dressings.push({ item: normalizedName, qty });
      } else if (lower.includes('gallon') || /^(tea|lemonade|drink|soda|water|juice|milk|coffee)/i.test(lower)) {
        drink_items.push({ item: name, qty });
      } else {
        food_items.push({ item: name, qty });
      }
    };

    // Track which lines have been consumed as part of meal boxes
    const consumedLines = new Set();

    for (let i = 0; i < rawLines.length; i++) {
      // Skip lines that were already consumed as part of a meal box
      if (consumedLines.has(i)) {
        if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
          console.log(`⏭️ Skipping line ${i} (already consumed as meal component): "${rawLines[i]}"`);
        }
        continue;
      }
      
      const line = rawLines[i];
      
      // Log lines for sherry stockmal
      if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
        console.log(`📝 Line ${i}: "${line}"`);
      }
      
      // Match item with embedded quantity (e.g., "25 x Packaged Meal 25 $125.00")
      // BUT exclude patterns like "8oz Sauce" where the number is followed by "oz", "oz.", "lb", etc.
      let qtyInLine = null;
      if (!/^(\d+)\s*(?:oz|lb|lbs?|g|kg|ml|l|qt|gal|pt|cup|pt)\s+/i.test(line)) {
        qtyInLine = line.match(/^(\d+)\s+x\s+(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
      }
      
      if (qtyInLine) {
        if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
          console.log(`✅ Matched qtyInLine pattern: qty=${qtyInLine[1]}, item="${qtyInLine[2]}"`);
        }
        const qty = qtyInLine[1];
        const itemName = qtyInLine[2].trim();
        const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
        
        if (isMealBox) {
          // Look ahead for sub-items (indented OR common meal components)
          const subItems = [];
          let j = i + 1;
          
          // First check for indented items
          while (j < rawLines.length && /^\s{2,}/.test(rawLines[j])) {
            const subItem = rawLines[j].trim();
            if (subItem && !/^\d+\s*\$/.test(subItem)) {
              subItems.push(subItem);
            }
            j++;
          }
          
          // If no indented items, check next few lines for common meal components
          if (subItems.length === 0) {
            const maxLookAhead = 4;
            let lookAheadCount = 0;
            
            while (j < rawLines.length && lookAheadCount < maxLookAhead) {
              const nextLine = rawLines[j];
              
              // Skip if it looks like a price-only line
              if (/^\d+\s*\$/.test(nextLine)) {
                j++;
                continue;
              }
              
              // Extract the item name from various patterns
              let nextItemName = nextLine;
              const nextQtyMatch = nextLine.match(/^(\d+)\s+x\s+(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
              if (nextQtyMatch) {
                nextItemName = nextQtyMatch[2].trim();
              } else {
                const simpleMatch = nextLine.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
                if (simpleMatch) {
                  nextItemName = simpleMatch[1].trim();
                }
              }
              
              const lower = nextItemName.toLowerCase();
              
              // Check if this looks like a packaged meal component
              // Exclude trays, meals, boxes, and other bulk items
              const isMealComponent = !/(tray|meal|box|boxed|package|packaged|gallon)/i.test(lower) &&
                                     (/\b(sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chips?|cookies?|brownies?|fruit cup|side salad)\b/i.test(lower));
              
              if (isMealComponent) {
                subItems.push(nextItemName);
                j++;
                lookAheadCount++;
              } else {
                // Not a meal component, stop looking
                break;
              }
            }
          }
          
          if (subItems.length > 0) {
            const fullMealName = `${itemName} w/ ${subItems.join(', ')}`;
            pushItem(fullMealName, qty, true);
            i = j - 1;
          } else {
            pushItem(itemName, qty, isMealBox);
          }
        } else {
          pushItem(itemName, qty);
        }
        continue;
      }

      // Simpler pattern - item and qty on same line
      const simpleQty = line.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
      if (simpleQty) {
        if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
          console.log(`✅ Matched simpleQty pattern: item="${simpleQty[1]}", qty=${simpleQty[2]}`);
        }
        const itemName = simpleQty[1].trim();
        const qty = simpleQty[2];
        const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
        
        if (isMealBox) {
          const subItems = [];
          let j = i + 1;
          
          // Check for indented items
          while (j < rawLines.length && /^\s{2,}/.test(rawLines[j])) {
            const subItem = rawLines[j].trim();
            if (subItem && !/^\d+\s*\$/.test(subItem)) {
              subItems.push(subItem);
            }
            j++;
          }
          
          // If no indented items, check for meal components
          if (subItems.length === 0) {
            const maxLookAhead = 4;
            let lookAheadCount = 0;
            
            while (j < rawLines.length && lookAheadCount < maxLookAhead) {
              const nextLine = rawLines[j];
              
              if (/^\d+\s*\$/.test(nextLine)) {
                j++;
                continue;
              }
              
              let nextItemName = nextLine;
              const nextQtyMatch = nextLine.match(/^(\d+)\s*x?\s*(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
              if (nextQtyMatch) {
                nextItemName = nextQtyMatch[2].trim();
              } else {
                const simpleMatch = nextLine.match(/^(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/);
                if (simpleMatch) {
                  nextItemName = simpleMatch[1].trim();
                }
              }
              
              const lower = nextItemName.toLowerCase();
              const isMealComponent = !/(tray|meal|box|boxed|package|packaged|gallon)/i.test(lower) &&
                                     (/\b(sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chips?|cookies?|brownies?|fruit cup|side salad)\b/i.test(lower));
              
              if (isMealComponent) {
                subItems.push(nextItemName);
                j++;
                lookAheadCount++;
              } else {
                break;
              }
            }
          }
          
          if (subItems.length > 0) {
            const fullMealName = `${itemName} w/ ${subItems.join(', ')}`;
            pushItem(fullMealName, qty, true);
            i = j - 1;
          } else {
            pushItem(itemName, qty, isMealBox);
          }
        } else {
          pushItem(itemName, qty);
        }
        continue;
      }
      
      // NEW: Handle item name on one line, quantity on next line
      // Pattern: Line has item name but no quantity/price, next line has qty + price
      if (!/\d+\s*\$/.test(line) && i + 1 < rawLines.length) {
        const lookAheadLine = rawLines[i + 1];
        const nextLineQty = lookAheadLine.match(/^(\d+)\s*(?:\$[\d,.\-]+)?$/);
        
        if (nextLineQty) {
          const itemName = line.trim();
          const qty = nextLineQty[1];
          
          if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
            console.log(`✅ Matched split-line pattern: item="${itemName}", qty=${qty} (from next line)`);
          }
          
          const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
          
          if (isMealBox) {
            const subItems = [];
            let j = i + 2; // Start after the quantity line
            let lastConsumedLine = i + 1; // Track the last line we actually consumed
            
            if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
              console.log(`🔍 Looking for meal box sub-items starting at line ${j}`);
            }
            
            // Check for indented items first
            while (j < rawLines.length && /^\s{2,}/.test(rawLines[j])) {
              const subItem = rawLines[j].trim();
              if (subItem && !/^\d+\s*\$/.test(subItem)) {
                subItems.push(subItem);
                if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                  console.log(`  ✅ Found indented sub-item: "${subItem}"`);
                }
              }
              j++;
            }
            
            // If no indented items, look for meal components (with or without quantities)
            if (subItems.length === 0) {
              const maxLookAhead = 10; // Look ahead up to 10 lines
              let consecutiveNonComponents = 0;
              const maxConsecutiveNonComponents = 2; // Stop after 2 consecutive non-components
              
              while (j < rawLines.length && consecutiveNonComponents < maxConsecutiveNonComponents) {
                const checkLine = rawLines[j];
                
                if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                  console.log(`  🔍 Checking line ${j}: "${checkLine}"`);
                }
                
                // Skip price-only lines
                if (/^\d+\s*\$/.test(checkLine)) {
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    ⏭️ Skipping price-only line`);
                  }
                  j++;
                  continue;
                }
                
                // Extract item name and quantity, handling various formats
                let nextItemName = checkLine;
                let itemQty = null;
                
                // Try "X x Item Name" format
                const xFormatMatch = checkLine.match(/^(\d+)\s+x\s+(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
                if (xFormatMatch) {
                  itemQty = parseInt(xFormatMatch[1], 10);
                  nextItemName = xFormatMatch[2].trim();
                } else {
                  // Try "Item Name Qty" format
                  const simpleMatch = checkLine.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
                  if (simpleMatch) {
                    nextItemName = simpleMatch[1].trim();
                    itemQty = parseInt(simpleMatch[2], 10);
                  }
                }
                
                const lower = nextItemName.toLowerCase();
                
                if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                  console.log(`    📦 Item: "${nextItemName}", Qty: ${itemQty}`);
                }
                
                // Skip sauces and dressings completely
                if (/\b(sauce|dressing)\b/i.test(lower)) {
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    🚫 Skipping sauce/dressing: "${nextItemName}"`);
                  }
                  consecutiveNonComponents = 0; // Don't count sauces as non-components
                  j++;
                  continue;
                }
                
                // Stop if we hit another packaged meal or tray
                if (/(packaged meal|tray|gallon)/i.test(lower) && lower !== itemName.toLowerCase()) {
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    🛑 Hit another main item, stopping`);
                  }
                  break;
                }
                
                // Only accept items with qty of 1 (part of the meal box)
                // Items with different quantities are separate orders
                if (itemQty !== null && itemQty !== 1) {
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    ❌ Wrong quantity (${itemQty} ≠ 1), not part of meal box`);
                  }
                  break; // Stop looking, we've moved past the meal components
                }
                
                // Check if this is a meal component
                // Include: nuggets, sandwiches, sides, cookies, chips
                const isMealComponent = 
                  /\b(nuggets?|sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chips?|cookies?|brownies?|fruit cup|pickle)\b/i.test(lower);
                
                if (isMealComponent) {
                  subItems.push(nextItemName);
                  consumedLines.add(j); // Mark this line as consumed
                  lastConsumedLine = j; // Update last consumed line
                  consecutiveNonComponents = 0; // Reset counter
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    ✅ Found meal component: "${nextItemName}" (line ${j} marked as consumed)`);
                    console.log(`    🔖 lastConsumedLine updated to: ${lastConsumedLine}`);
                  }
                  j++;
                } else {
                  consecutiveNonComponents++;
                  if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                    console.log(`    ❌ Not a meal component (${consecutiveNonComponents}/${maxConsecutiveNonComponents})`);
                  }
                  j++;
                }
              }
              
              // Don't jump here - let it fall through to the pushItem logic below
            }
            
            if (subItems.length > 0) {
              const fullMealName = `${itemName} w/ ${subItems.join(', ')}`;
              if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                console.log(`✅ Final meal box: "${fullMealName}" | qty: ${qty}`);
                console.log(`📍 Will jump to lastConsumedLine: ${lastConsumedLine}`);
              }
              pushItem(fullMealName, qty, true);
              consumedLines.add(i + 1); // Mark the quantity line as consumed
              i = lastConsumedLine; // Jump to last consumed line
            } else {
              if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
                console.log(`⚠️ No sub-items found for meal box: "${itemName}"`);
              }
              pushItem(itemName, qty, isMealBox);
              i++; // Skip the quantity line
            }
          } else {
            pushItem(itemName, qty);
            i++; // Skip the quantity line
          }
          continue;
        }
      }

      // Skip indented items (should be captured above)
      if (/^\s{2,}/.test(line)) {
        if (customer_name && (customer_name.toLowerCase().includes('lauren palcko') || customer_name.toLowerCase().includes('sherry stockmal'))) {
          console.log(`⏭️ Skipping indented line: "${line}"`);
        }
        continue;
      }

      // Check if next line has quantity + price (e.g., "8oz Sauce" followed by "1 $3.00")
      const nextLine = rawLines[i + 1];
      if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
        console.log(`🔍 Checking if next line has qty+price. Current: "${line}", Next: "${nextLine}"`);
      }
      
      if (nextLine && /^(\d+)(?:\s*\$[\d,.\-]+)?$/.test(nextLine)) {
        if (customer_name && customer_name.toLowerCase().includes('sherry stockmal')) {
          console.log(`✅ Next line has qty+price pattern! Qty: ${nextLine.match(/^(\d+)/)[1]}`);
        }
        const qty = nextLine.match(/^(\d+)/)[1];
        const isMealBox = /meal|box|boxed|package|packaged/i.test(line);
        
        if (isMealBox) {
          // Look ahead for sub-items starting from i+2 (skip the price line)
          const subItems = [];
          let j = i + 2;
          
          // Check for indented items
          while (j < rawLines.length && /^\s{2,}/.test(rawLines[j])) {
            const subItem = rawLines[j].trim();
            if (subItem && !/^\d+\s*\$/.test(subItem)) {
              subItems.push(subItem);
            }
            j++;
          }
          
          // If no indented items, check for meal components
          if (subItems.length === 0) {
            const maxLookAhead = 10; // Look ahead up to 10 lines
            let consecutiveNonComponents = 0;
            const maxConsecutiveNonComponents = 2; // Stop after 2 consecutive non-components
            
            while (j < rawLines.length && consecutiveNonComponents < maxConsecutiveNonComponents) {
              const checkLine = rawLines[j];
              
              // Skip price-only lines
              if (/^\d+\s*\$/.test(checkLine)) {
                j++;
                continue;
              }
              
              // Extract item name and quantity
              let nextItemName = checkLine;
              let itemQty = null;
              const qtyAtEnd = checkLine.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
              if (qtyAtEnd) {
                nextItemName = qtyAtEnd[1].trim();
                itemQty = parseInt(qtyAtEnd[2], 10);
              }
              
              const lower = nextItemName.toLowerCase();
              
              // Skip sauces and dressings completely
              if (/\b(sauce|dressing)\b/i.test(lower)) {
                consecutiveNonComponents = 0; // Don't count sauces as non-components
                j++;
                continue;
              }
              
              // Stop if we hit another packaged meal or tray
              if (/(packaged meal|tray|gallon)/i.test(lower)) {
                break;
              }
              
              // Only accept items with qty of 1 (part of the meal box)
              if (itemQty !== null && itemQty !== 1) {
                break; // Stop looking, we've moved past the meal components
              }
              
              // Check if this is a meal component
              // Include: nuggets, sandwiches, sides, cookies, chips
              const isMealComponent = 
                /\b(nuggets?|sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chips?|cookies?|brownies?|fruit cup|pickle)\b/i.test(lower);
              
              if (isMealComponent) {
                subItems.push(nextItemName);
                consumedLines.add(j); // Mark this line as consumed
                consecutiveNonComponents = 0; // Reset counter
                j++;
              } else {
                consecutiveNonComponents++;
                j++;
              }
            }
          }
          
          if (subItems.length > 0) {
            const fullMealName = `${line} w/ ${subItems.join(', ')}`;
            pushItem(fullMealName, qty, true);
            consumedLines.add(i + 1); // Mark the quantity line as consumed
            i = j - 1; // Skip all processed lines
          } else {
            pushItem(line, qty, isMealBox);
            i++; // Skip the quantity line
          }
        } else {
          pushItem(line, qty);
          i++; // Skip the quantity line
        }
        continue;
      }

      // If no pattern matched, check if this is a standalone item line (no qty)
      if (!/^\d+(?:\s*\$[\d,.\-]+)?$/.test(line)) {
        if (customer_name && customer_name.toLowerCase().includes('lauren palcko')) {
          console.log(`📦 No pattern matched, pushing as standalone item: "${line}"`);
        }
        pushItem(line, 1);
      } else {
        if (customer_name && customer_name.toLowerCase().includes('lauren palcko')) {
          console.log(`⏭️ Skipping line (looks like qty/price only): "${line}"`);
        }
      }
    }

    const totalMatch = msg.match(/Total\s*\$?([\d.,]+)/i);
    const total = totalMatch ? '$' + totalMatch[1] : '$0.00';

    return {
      orderType,
      customer_name: customer_name || '*',
      phone_number: phone_number || '*',
      customer_email: customer_email || '*',
      guest_count,
      paper_goods,
      special_instructions: special_instructions || '',
      food_items,
      drink_items,
      sauces_dressings,
      meal_boxes,
      total
    };
  }

  // Get status of the poller
  getStatus() {
    return {
      isRunning: this.isPolling,
      pollInterval: this.pollInterval,
      pollIntervalMinutes: Math.round(this.pollInterval / 60000),
      lastCheckTime: this.lastCheckTime,
      newOrdersCount: this.newOrdersCount
    };
  }

  // Reset new orders counter
  resetNewOrdersCount() {
    const previousCount = this.newOrdersCount;
    this.newOrdersCount = 0;
    this.log(`🔄 Reset new orders counter (was: ${previousCount})`);
    return previousCount;
  }
}

module.exports = GmailPoller;
