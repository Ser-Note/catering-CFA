// routes/fetchCatering.js
const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const debugMode = true;
const { debugLogDB, emailOrderDB } = require('../database/db');
const ordersPath = path.join(__dirname, '..', 'data', 'orders.json');

// ---------- Helpers ----------

async function logDebug(msg) {
  try {
    await debugLogDB.log(msg);
    // Periodically clean up old logs (every 100 log entries)
    if (Math.random() < 0.01) { // 1% chance
      await debugLogDB.cleanup(1000);
    }
  } catch (error) {
    console.error('Failed to write debug log to database:', error);
  }
  
  if (debugMode) console.log(`[${new Date().toISOString()}] ${msg}`);
}

function cleanField(str) {
  if (!str) return '';
  return str.replace(/^\*+/, '').trim().replace(/\s+/g, ' ');
}

// Normalize text safely for Node 20+
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u00A0\u2000-\u200F\u2028\u2029]/g, ' ')
    .replace(/[^\w\s@.,!?:;/'"()$%&*-]/g, '') // keep safe printable chars
    // Normalize whitespace on each line but keep line breaks so parsers can rely on them
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractBetween(text, start, end = null) {
  const regex = new RegExp(
    start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '(.*?)' +
      (end ? end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '$'),
    'is'
  );
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractItemsBlock(text) {
  // First locate the items section using "Item Name" header
  let itemsSection = text.split(/Item\s+Name\s+Quantity\s+(?:Qty\s+)?Price/i)[1];
  if (!itemsSection) return '';
  
  // Cut off at Subtotal/Tax/Total
  itemsSection = itemsSection.split(/(?:Subtotal|Tax|Total)\s+\$[\d.,]+/i)[0];
  
  if (debugMode) {
    logDebug('Raw Items Section:\n' + itemsSection);
  }
  
  return itemsSection.trim();
}

function formatTime12h(time24) {
  if (!time24) return '';
  if (/am|pm/i.test(time24)) return time24;
  
  const [hours, minutes] = (time24 || '').split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(hours) ? hours : 0);
  d.setMinutes(Number.isFinite(minutes) ? minutes : 0);
  
  return d.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

function parseOrder(message) {
  if (!message) return {};

  const msg = message.replace(/\r\n|\r/g, '\n'); // normalize line endings only
  const orderType = /Pickup Order/i.test(msg) ? 'Pickup' : 'Delivery';

  // --- Customer Info ---
  const custBlock = extractBetween(msg, 'Customer Information', 'Item Name');
  const linesCust = custBlock ? custBlock.split('\n').map(l => l.trim()).filter(Boolean) : [];

  let customer_name = '';
  let phone_number = '';
  let customer_email = '';
  let guest_count = 'N/A';
  let paper_goods = 'No';
  let special_instructions = '';

  // Process customer info
  let inSpecialInstructions = false;
  for (const line of linesCust) {
    const lower = line.toLowerCase();
    
    // Check if we're entering the special instructions section
    if (lower === 'special instructions') {
      inSpecialInstructions = true;
      continue;
    }
    
    // If we're in special instructions, collect the text
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

  // --- Items ---
  // First locate the items section using "Item Name" header
  let itemsBlock = msg.split(/Item\s+Name\s+Quantity\s+(?:Qty\s+)?Price/i)[1] || '';
  
  // Cut off at Subtotal/Tax/Total
  itemsBlock = itemsBlock.split(/(?:Subtotal|Tax|Total)\s+\$[\d.,]+/i)[0];
  
  if (debugMode) {
    logDebug('Raw Items Block:\n' + itemsBlock);
  }

  // Split into raw lines and clean them
  const rawLines = itemsBlock
    .split('\n')
    .map(l => l.replace(/\u2003/g, ' '))  // normalize unicode spaces
    .map(l => l.replace(/®/g, ''))        // remove registered trademark
    .map(l => l.trim())
    .filter(l => l !== '' && 
      !/^(quantity\s+qty\s+price|quantity\s+price|qty\s+price)$/i.test(l) &&
      !/^(subtotal|tax|total)\b/i.test(l));

  if (debugMode) {
    logDebug('Cleaned Lines:');
    rawLines.forEach((l, i) => logDebug(`Line ${i}: "${l}"`));
  }

  const food_items = [];
  const drink_items = [];
  const sauces_dressings = [];
  const meal_boxes = [];

  function pushItem(name, qty, isMealBox = false) {
    name = name.trim();
    if (!name) return;
    
    qty = parseInt(qty, 10) || 1;
    
    if (debugMode) {
      logDebug(`Processing item: "${name}" with quantity: ${qty}, isMealBox: ${isMealBox}`);
    }
    
    const lower = name.toLowerCase();
    
    // Check if this is a meal box/package
    if (isMealBox || lower.includes('meal') || lower.includes('box') || 
        lower.includes('boxed') || lower.includes('package') || lower.includes('packaged')) {
      meal_boxes.push({ item: name, qty });
    }
    else if ((lower.includes('sauce') || lower.includes('dressing') || 
         lower.includes('ketchup') || lower.includes('mayo') || 
         lower.includes('honey') || lower.includes('jam')) && 
        !lower.includes('gallon') && !lower.includes('chips')) {
      sauces_dressings.push({ item: name, qty });
    } else if (lower.includes('gallon')) {
      drink_items.push({ item: name, qty });
    } else {
      food_items.push({ item: name, qty });
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    
    // Match item with embedded quantity and optional price (e.g., "25 x Packaged Meal 25 $125.00")
    const qtyInLine = line.match(/^(\d+)\s*x?\s*(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
    if (qtyInLine) {
      const qty = qtyInLine[1];
      const itemName = qtyInLine[2].trim();
      
      // Check if this is a meal box and if there are indented sub-items following
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
            
            // Check if this looks like a packaged meal component
            // Exclude trays, meals, boxes, and other bulk items
            const isMealComponent = !/(tray|meal|box|boxed|package|packaged|gallon)/i.test(lower) &&
                                   (/^(sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chip|cookie|brownie|fruit cup|side salad)/i.test(lower) ||
                                   /\b(kale|chips?|cookies?|brownies?)\b/i.test(lower));
            
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
        
        // Combine meal name with sub-items
        if (subItems.length > 0) {
          const fullMealName = `${itemName} w/ ${subItems.join(', ')}`;
          pushItem(fullMealName, qty, true);
          i = j - 1; // Skip the sub-items we've processed
        } else {
          pushItem(itemName, qty, isMealBox);
        }
      } else {
        pushItem(itemName, qty);
      }
      continue;
    }

    // Simpler pattern: "Item Name 25 $125.00"
    const simpleQty = line.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
    if (simpleQty) {
      const itemName = simpleQty[1].trim();
      const qty = simpleQty[2];
      const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
      
      if (isMealBox) {
        // Look ahead for sub-items
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
                                   (/^(sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chip|cookie|brownie|fruit cup|side salad)/i.test(lower) ||
                                   /\b(kale|chips?|cookies?|brownies?)\b/i.test(lower));
            
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

    // Skip indented items (they should have been captured above)
    if (/^\s{2,}/.test(line)) {
      continue;
    }

    // Match sauces or items starting with 8oz
    if (/^8oz\s/.test(line)) {
      pushItem(line.replace(/\s+\d+$/, ''), 1);
      continue;
    }

    // Check if next line has quantity and price
    const nextLine = rawLines[i + 1];
    if (nextLine && /^(\d+)(?:\s*\$[\d,.\-]+)?$/.test(nextLine)) {
      pushItem(line, nextLine.match(/^(\d+)/)[1]);
      i++; // Skip the quantity line
      continue;
    }

    // If we get here and line doesn't look like a quantity/price, treat as item
    if (!/^\d+(?:\s*\$[\d,.\-]+)?$/.test(line)) {
      pushItem(line, 1);
    }
  }

  // --- Total ---
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


// ---------- Fetch IMAP & Save Orders ----------

function fetchCateringOrders() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: 'cfa02348@gmail.com',
      password: 'qyhjujpaqkvktube', // ⚠️ move to env var later
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false, servername: 'imap.gmail.com' }
    });

    const orders = [];
    let id = 1;
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

                // --- Log raw email text to debug log database ---
                await logDebug(`RAW EMAIL START:\n${parsed.text}\nRAW EMAIL END`);

                const text = normalizeText(parsed.text);
                const orderData = parseOrder(text);

                // --- Date & Time ---
                const dtMatch = text.match(
                  /(?:(\w+)\s+)?(\d{1,2}\/\d{1,2}\/\d{4}).*?([\d:]+\s*(?:am|pm)?)/i
                );
                
                // Parse the date and time in Eastern Time
                let dateField = '*';
                let timeField = '';
                
                if (dtMatch) {
                  const [_, dayName, date, time] = dtMatch;
                  const [month, day, year] = date.split('/').map(Number);
                  const timeStr = time.toLowerCase();
                  
                  // Parse time components
                  let hours = 0, minutes = 0;
                  const timeMatch = timeStr.match(/(\d+):(\d+)(?:\s*(am|pm))?/i);
                  if (timeMatch) {
                    hours = parseInt(timeMatch[1], 10);
                    minutes = parseInt(timeMatch[2], 10);
                    const meridiem = timeMatch[3]?.toLowerCase();
                    
                    // Adjust hours for PM
                    if (meridiem === 'pm' && hours < 12) hours += 12;
                    if (meridiem === 'am' && hours === 12) hours = 0;
                  }
                  
                  // Create date
                  const d = new Date(year, month - 1, day, hours, minutes);
                  
                  dateField = `${month}/${day}/${year}`;
                  timeField = d.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  });
                  
                  if (debugMode) {
                    logDebug(`Parsed date/time: ${dateField} ${timeField} ET`);
                  }
                }

                // --- Delivery Destination ---
                let destination = 'N/A';
                if (orderData.orderType === 'Delivery') {
                  const destMatch = text.match(/Delivery Address\s*[:\s]*\n\s*([^\n]+(?:\n[^\n]+)*?)(?:\n\s*Customer Information|\n\s*$)/i);
                  if (destMatch && destMatch[1].trim()) {
                    destination = cleanField(destMatch[1].replace(/\n/g, ' '));
                  }
                }

                orders.push({
                  id: id++,
                  order_type: orderData.orderType,
                  date: dateField,
                  time: timeField,
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
              // Save orders to database, avoiding duplicates
              let savedCount = 0;
              for (const newOrder of orders) {
                try {
                  // Check for duplicate order
                  const existing = await emailOrderDB.findDuplicate(
                    newOrder.customer_email,
                    newOrder.date,
                    newOrder.total
                  );
                  
                  if (!existing) {
                    // Convert arrays to JSONB format for database
                    const dbOrder = {
                      order_type: newOrder.order_type,
                      order_date: newOrder.date,
                      order_time: newOrder.time,
                      destination: newOrder.destination,
                      customer_name: newOrder.customer_name,
                      phone_number: newOrder.phone_number,
                      customer_email: newOrder.customer_email,
                      guest_count: newOrder.guest_count,
                      paper_goods: newOrder.paper_goods,
                      special_instructions: newOrder.special_instructions,
                      food_items: newOrder.food_items,
                      drink_items: newOrder.drink_items,
                      sauces_dressings: newOrder.sauces_dressings,
                      meal_boxes: newOrder.meal_boxes,
                      total: newOrder.total
                    };
                    
                    await emailOrderDB.create(dbOrder);
                    savedCount++;
                  }
                } catch (orderErr) {
                  await logDebug(`ERROR saving order: ${orderErr.message}`);
                  console.error('Error saving individual order:', orderErr);
                }
              }

              if (debugMode)
                await logDebug(`Processed ${orders.length} orders, saved ${savedCount} new orders to database`);
            } catch (e) {
              console.error('Error processing orders:', e);
              await logDebug(`ERROR processing orders: ${e.message}`);
            } finally {
              safeEnd();
              resolve(orders.length);
            }
          });
        });
      });
    });

    imap.once('error', err => {
      console.error('⚠️ IMAP error:', err.message);
      safeEnd();
      resolve(0);
    });

    imap.once('close', () => {
      if (debugMode) console.log('IMAP connection closed');
      safeEnd();
    });

    try {
      imap.connect();
    } catch (e) {
      reject(e);
    }
  });
}

// ---------- Route ----------
router.get('/', async (req, res) => {
  try {
    const count = await fetchCateringOrders();
    res.send(`✅ Fetched and saved ${count} catering orders.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to fetch catering orders');
  }
});

module.exports = router;
