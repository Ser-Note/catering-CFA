// Check what's in the database for today's orders
const { emailOrderDB } = require('./database/db');

async function checkTodayOrders() {
  try {
    const etToday = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split(',')[0];
    
    const [month, day, year] = etToday.split('/');
    const todayStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    console.log(`📅 Checking orders for ${todayStr}\n`);
    
    const allOrders = await emailOrderDB.getAll();
    const todayOrders = allOrders.filter(o => {
      if (!o.order_date) return false;
      const orderDate = new Date(o.order_date).toISOString().split('T')[0];
      return orderDate === todayStr;
    });
    
    console.log(`📊 Found ${todayOrders.length} orders for today\n`);
    
    todayOrders.forEach((order, idx) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`ORDER #${idx + 1} - ID: ${order.id}`);
      console.log(`Customer: ${order.customer_name}`);
      console.log(`Time: ${order.order_time}`);
      console.log(`Total: ${order.total}`);
      
      console.log(`\n📦 MEAL BOXES (${Array.isArray(order.meal_boxes) ? order.meal_boxes.length : 0}):`);
      if (order.meal_boxes && Array.isArray(order.meal_boxes)) {
        order.meal_boxes.forEach(item => {
          console.log(`  - ${item.qty} x ${item.item}`);
        });
      } else {
        console.log(`  (none or invalid format)`);
      }
      
      console.log(`\n🍽️  FOOD ITEMS (${Array.isArray(order.food_items) ? order.food_items.length : 0}):`);
      if (order.food_items && Array.isArray(order.food_items)) {
        order.food_items.forEach(item => {
          console.log(`  - ${item.qty} x ${item.item}`);
        });
      } else {
        console.log(`  (none or invalid format)`);
      }
      
      console.log(`\n🥤 DRINK ITEMS (${Array.isArray(order.drink_items) ? order.drink_items.length : 0}):`);
      if (order.drink_items && Array.isArray(order.drink_items)) {
        order.drink_items.forEach(item => {
          console.log(`  - ${item.qty} x ${item.item}`);
        });
      } else {
        console.log(`  (none)`);
      }
    });
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTodayOrders();
