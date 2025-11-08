// Check for duplicate orders in the database
require('dotenv').config();
const { emailOrderDB } = require('./database/db');

(async () => {
  try {
    console.log('🔍 Checking for duplicate email orders...\n');
    
    const orders = await emailOrderDB.getAll();
    console.log(`📊 Total orders: ${orders.length}`);
    
    // Group by customer_email + order_date + total
    const seen = new Map();
    const duplicates = [];
    
    orders.forEach(order => {
      const key = `${order.customer_email}|${order.order_date}|${order.total}`;
      
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: order
        });
      } else {
        seen.set(key, order);
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
    } else {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate(s):\n`);
      
      duplicates.forEach((dupe, index) => {
        console.log(`${index + 1}. Duplicate detected:`);
        console.log(`   Original:  ID ${dupe.original.id} - ${dupe.original.customer_name} - ${dupe.original.order_date} - $${dupe.original.total}`);
        console.log(`   Duplicate: ID ${dupe.duplicate.id} - ${dupe.duplicate.customer_name} - ${dupe.duplicate.order_date} - $${dupe.duplicate.total}`);
        console.log(`   Created: ${new Date(dupe.duplicate.created_at).toLocaleString()}\n`);
      });
      
      console.log('💡 To delete duplicates, you can manually remove them from Supabase or run a cleanup script.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
