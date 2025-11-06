// Test meal parsing logic
const testLines = [
  "25 x Regular Chick-fil-A Chicken Sandwich Packaged Meal 25 $225.00",
  "Chick-fil-A Chicken Sandwich 1 $5.99",
  "Chocolate Chunk Cookie 1 $1.89",
  "Original Flavor Waffle Potato Chips 1 $1.99",
  "Small Hot Chick-fil-A Nuggets Tray 1 $45.00"
];

console.log("Testing with these lines:");
testLines.forEach((line, idx) => console.log(`  ${idx}: "${line}"`));
console.log("\n");

const meal_boxes = [];
const food_items = [];

function pushItem(name, qty, isMealBox = false) {
  const item = { item: name, qty: parseInt(qty) };
  if (isMealBox) {
    meal_boxes.push(item);
  } else {
    food_items.push(item);
  }
}

for (let i = 0; i < testLines.length; i++) {
  const line = testLines[i];
  console.log(`\nProcessing line ${i}: "${line}"`);
  
  // Match item with embedded quantity
  const qtyInLine = line.match(/^(\d+)\s*x?\s*(.*?)\s+\d+\s*(?:\$[\d,.\-]+)?$/i);
  if (qtyInLine) {
    const qty = qtyInLine[1];
    const itemName = qtyInLine[2].trim();
    const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
    
    console.log(`  ✓ Matched qtyInLine: qty=${qty}, item="${itemName}", isMealBox=${isMealBox}`);
    
    if (isMealBox) {
      const subItems = [];
      let j = i + 1;
      
      // Check for indented items first
      while (j < testLines.length && /^\s{2,}/.test(testLines[j])) {
        const subItem = testLines[j].trim();
        if (subItem && !/^\d+\s*\$/.test(subItem)) {
          subItems.push(subItem);
        }
        j++;
      }
      
      console.log(`  → Checked for indented items, found: ${subItems.length}`);
      
      // If no indented, look ahead for meal components
      if (subItems.length === 0) {
        const maxLookAhead = 4;
        let lookAheadCount = 0;
        
        console.log(`  → Looking ahead for meal components...`);
        
        while (j < testLines.length && lookAheadCount < maxLookAhead) {
          const nextLine = testLines[j];
          console.log(`    Checking j=${j}: "${nextLine}"`);
          
          if (/^\d+\s*\$/.test(nextLine)) {
            console.log(`      ✗ Skipping (price-only line)`);
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
          console.log(`      Item name extracted: "${nextItemName}"`);
          
          const isMealComponent = !/(tray|meal|box|boxed|package|packaged|gallon)/i.test(lower) &&
                                 (/\b(sandwich|spicy|deluxe|grilled|fried|cool wrap|kale|chips?|cookies?|brownies?|fruit cup|side salad)\b/i.test(lower));
          
          console.log(`      isMealComponent=${isMealComponent}`);
          
          if (isMealComponent) {
            subItems.push(nextItemName);
            console.log(`      ✓ Added as component`);
            j++;
            lookAheadCount++;
          } else {
            console.log(`      ✗ Not a component, stopping lookahead`);
            break;
          }
        }
      }
      
      if (subItems.length > 0) {
        const fullMealName = `${itemName} w/ ${subItems.join(', ')}`;
        console.log(`  ✓ Creating combined meal: "${fullMealName}"`);
        console.log(`  ✓ Skipping from i=${i} to i=${j-1} (will be ${j} after i++)`);
        pushItem(fullMealName, qty, true);
        i = j - 1;
      } else {
        console.log(`  ✓ No components found, adding as standalone meal`);
        pushItem(itemName, qty, isMealBox);
      }
    } else {
      console.log(`  ✓ Adding to food_items`);
      pushItem(itemName, qty);
    }
    continue;
  }
  
  // Try simpler pattern
  const simpleQty = line.match(/^(.*?)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/);
  if (simpleQty) {
    const itemName = simpleQty[1].trim();
    const qty = simpleQty[2];
    const isMealBox = /meal|box|boxed|package|packaged/i.test(itemName);
    console.log(`  ✓ Matched simpleQty: qty=${qty}, item="${itemName}", isMealBox=${isMealBox}`);
    
    // Similar logic as above...
    pushItem(itemName, qty, isMealBox);
    continue;
  }
  
  console.log(`  ✗ No pattern matched`);
}

console.log("\n\n=== FINAL RESULTS ===");
console.log("\nMeal Boxes:");
console.log(JSON.stringify(meal_boxes, null, 2));
console.log("\nFood Items:");
console.log(JSON.stringify(food_items, null, 2));
