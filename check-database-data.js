// check-database-data.js
// Script to verify data in your Supabase database

require('dotenv').config();
const { employeeDB, checkInDB, debugLogDB, cateringOrderDB, emailOrderDB } = require('./database/db');

async function checkAllData() {
  console.log('🔍 Checking all database tables...\n');

  try {
    // Check Employees
    console.log('👥 EMPLOYEES:');
    const employees = await employeeDB.getAll();
    if (employees.length > 0) {
      employees.forEach(emp => {
        console.log(`  ✅ ID: ${emp.id}, Name: ${emp.fname} ${emp.lname}`);
      });
    } else {
      console.log('  ⚠️  No employees found');
    }
    console.log(`  📊 Total: ${employees.length} employees\n`);

    // Check Check-ins
    console.log('🔐 CHECK-INS:');
    const checkIns = await checkInDB.getRecent(10);
    if (checkIns.length > 0) {
      checkIns.forEach(checkin => {
        console.log(`  ✅ ${checkin.fname} ${checkin.lname} - ${checkin.check_in_date} at ${checkin.check_in_time}`);
      });
    } else {
      console.log('  ⚠️  No check-ins found');
    }
    console.log(`  📊 Total: ${checkIns.length} check-ins\n`);

    // Check Debug Logs
    console.log('📝 DEBUG LOGS:');
    const logs = await debugLogDB.getRecent(5);
    if (logs.length > 0) {
      logs.forEach(log => {
        const shortMessage = log.message.length > 50 ? log.message.substring(0, 50) + '...' : log.message;
        console.log(`  ✅ ${log.created_at}: ${shortMessage}`);
      });
    } else {
      console.log('  ⚠️  No debug logs found');
    }
    console.log(`  📊 Total: ${logs.length} log entries\n`);

    // Check Catering Orders
    console.log('🍽️ CATERING ORDERS:');
    const cateringOrders = await cateringOrderDB.getAll();
    if (cateringOrders.length > 0) {
      cateringOrders.forEach(order => {
        console.log(`  ✅ ID: ${order.id}, ${order.organization} - ${order.order_date} (${order.num_sandwiches} sandwiches)`);
      });
    } else {
      console.log('  ⚠️  No catering orders found');
    }
    console.log(`  📊 Total: ${cateringOrders.length} catering orders\n`);

    // Check Email Orders
    console.log('📧 EMAIL ORDERS:');
    const emailOrders = await emailOrderDB.getAll();
    if (emailOrders.length > 0) {
      emailOrders.forEach(order => {
        console.log(`  ✅ ID: ${order.id}, ${order.customer_name} - ${order.order_date} (${order.total})`);
      });
    } else {
      console.log('  ⚠️  No email orders found');
    }
    console.log(`  📊 Total: ${emailOrders.length} email orders\n`);

    console.log('🎉 Database check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

// Test login and check-in functionality
async function testLogin() {
  console.log('\n🧪 Testing login functionality...');
  
  try {
    // Find the migrated employee
    const employee = await employeeDB.findByName('chase', 'rogers');
    if (employee) {
      console.log('✅ Employee found in database:', employee.fname, employee.lname);
      
      // Test creating a check-in
      const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const time = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      
      await checkInDB.create('chase', 'rogers', date, time);
      console.log('✅ Test check-in created successfully');
    } else {
      console.log('❌ Employee not found - login will fail');
    }
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

// Run the checks
checkAllData().then(() => testLogin()).catch(console.error);