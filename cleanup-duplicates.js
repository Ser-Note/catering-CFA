// Delete duplicate email orders, keeping only the most recent one
require('dotenv').config();
const { emailOrderDB } = require('./database/db');
const supabase = require('./config/supabase');

(async () => {
  try {
    console.log('🧹 Starting duplicate cleanup...\n');
    
    const orders = await emailOrderDB.getAll();
    console.log(`📊 Total orders: ${orders.length}`);
    
    // Group by customer_email + order_date + total
    const groups = new Map();
    
    orders.forEach(order => {
      const key = `${order.customer_email}|${order.order_date}|${order.total}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(order);
    });
    
    // Find duplicates and determine which to delete
    const toDelete = [];
    
    groups.forEach((orderGroup, key) => {
      if (orderGroup.length > 1) {
        // Sort by ID descending (keep the highest ID, delete the rest)
        orderGroup.sort((a, b) => b.id - a.id);
        
        // Delete all except the first (highest ID)
        for (let i = 1; i < orderGroup.length; i++) {
          toDelete.push(orderGroup[i].id);
        }
      }
    });
    
    if (toDelete.length === 0) {
      console.log('✅ No duplicates to clean up!');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${toDelete.length} duplicate orders to delete`);
    console.log('🗑️  Deleting duplicates...\n');
    
    // Delete in batches of 100
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      
      const { error } = await supabase
        .from('email_orders')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`❌ Error deleting batch: ${error.message}`);
      } else {
        deleted += batch.length;
        console.log(`   Deleted ${deleted} / ${toDelete.length}...`);
      }
    }
    
    console.log(`\n✅ Successfully deleted ${deleted} duplicate orders!`);
    console.log(`📊 Remaining orders: ${orders.length - deleted}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
