// Delete today's email orders so they can be re-fetched with the fixed parsing logic
const { emailOrderDB } = require('./database/db');

async function deleteTodayOrders() {
  try {
    // Get today's date in YYYY-MM-DD format (Eastern Time)
    const etToday = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split(',')[0];
    
    const [month, day, year] = etToday.split('/');
    const todayStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    console.log(`🗑️  Looking for orders on ${todayStr}...`);
    
    // Get all orders
    const allOrders = await emailOrderDB.getAll();
    
    // Filter for today's orders
    const todayOrders = allOrders.filter(o => {
      if (!o.order_date) return false;
      const orderDate = new Date(o.order_date).toISOString().split('T')[0];
      return orderDate === todayStr;
    });
    
    console.log(`📋 Found ${todayOrders.length} orders for today`);
    
    if (todayOrders.length === 0) {
      console.log('✅ No orders to delete');
      process.exit(0);
    }
    
    // Delete each order
    let deletedCount = 0;
    for (const order of todayOrders) {
      try {
        await emailOrderDB.delete(order.id);
        console.log(`  ✓ Deleted order #${order.id} (${order.customer_name})`);
        deletedCount++;
      } catch (err) {
        console.error(`  ✗ Failed to delete order #${order.id}:`, err.message);
      }
    }
    
    console.log(`\n✅ Deleted ${deletedCount} of ${todayOrders.length} orders`);
    console.log('\n💡 Now click the "🔄 Refresh Orders" button on the orders page to re-fetch with the fixed parsing logic');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteTodayOrders();
