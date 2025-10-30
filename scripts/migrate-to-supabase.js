// scripts/migrate-to-supabase.js
// Migration script to move existing JSON data to Supabase database

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { employeeDB, checkInDB, debugLogDB, cateringOrderDB, emailOrderDB } = require('../database/db');

const dataDir = path.join(__dirname, '..', 'data');

async function migrateEmployees() {
  console.log('🔄 Migrating employees...');
  const employeeFile = path.join(dataDir, 'employee.json');
  
  if (fs.existsSync(employeeFile)) {
    try {
      const employees = JSON.parse(fs.readFileSync(employeeFile, 'utf8'));
      let migrated = 0;
      
      for (const emp of employees) {
        try {
          await employeeDB.create(emp.fname, emp.lname);
          migrated++;
          console.log(`  ✅ Migrated employee: ${emp.fname} ${emp.lname}`);
        } catch (error) {
          console.error(`  ❌ Failed to migrate employee ${emp.fname} ${emp.lname}:`, error.message);
        }
      }
      
      console.log(`✅ Employees migration complete. Migrated ${migrated}/${employees.length} employees.\n`);
    } catch (error) {
      console.error('❌ Error reading employee.json:', error.message);
    }
  } else {
    console.log('⚠️  employee.json not found, skipping employees migration.\n');
  }
}

async function migrateCheckIns() {
  console.log('🔄 Migrating check-ins...');
  const checkInFile = path.join(dataDir, 'checkIn.json');
  
  if (fs.existsSync(checkInFile)) {
    try {
      const checkIns = JSON.parse(fs.readFileSync(checkInFile, 'utf8'));
      let migrated = 0;
      
      for (const checkIn of checkIns) {
        try {
          await checkInDB.create(
            checkIn.fname, 
            checkIn.lname, 
            checkIn.date, 
            checkIn.time
          );
          migrated++;
          console.log(`  ✅ Migrated check-in: ${checkIn.fname} ${checkIn.lname} on ${checkIn.date}`);
        } catch (error) {
          console.error(`  ❌ Failed to migrate check-in for ${checkIn.fname} ${checkIn.lname}:`, error.message);
        }
      }
      
      console.log(`✅ Check-ins migration complete. Migrated ${migrated}/${checkIns.length} check-ins.\n`);
    } catch (error) {
      console.error('❌ Error reading checkIn.json:', error.message);
    }
  } else {
    console.log('⚠️  checkIn.json not found, skipping check-ins migration.\n');
  }
}

async function migrateDebugLogs() {
  console.log('🔄 Migrating debug logs...');
  const debugLogFile = path.join(dataDir, 'debug_log.json');
  
  if (fs.existsSync(debugLogFile)) {
    try {
      const debugLogs = JSON.parse(fs.readFileSync(debugLogFile, 'utf8'));
      let migrated = 0;
      
      for (const log of debugLogs) {
        try {
          await debugLogDB.log(log.message);
          migrated++;
        } catch (error) {
          console.error(`  ❌ Failed to migrate debug log:`, error.message);
        }
      }
      
      console.log(`✅ Debug logs migration complete. Migrated ${migrated}/${debugLogs.length} log entries.\n`);
    } catch (error) {
      console.error('❌ Error reading debug_log.json:', error.message);
    }
  } else {
    console.log('⚠️  debug_log.json not found, skipping debug logs migration.\n');
  }
}

async function migrateCateringOrders() {
  console.log('🔄 Migrating catering orders...');
  const cateringFile = path.join(dataDir, 'catering.json');
  
  if (fs.existsSync(cateringFile)) {
    try {
      const orders = JSON.parse(fs.readFileSync(cateringFile, 'utf8'));
      let migrated = 0;
      
      for (const order of orders) {
        try {
          const dbOrder = {
            order_date: order.orderDate || null,
            organization: order.organization || '',
            num_sandwiches: parseInt(order.numSandwiches) || 0,
            other_items: order.otherItems || '',
            sauces: order.sauces || '',
            cost: parseFloat(order.cost) || 0,
            paid: order.paid || false,
            order_type: order.orderType || '',
            time_of_day: order.timeOfDay || '',
            contact_name: order.contactName || '',
            contact_phone: order.contactPhone || '',
            pickles: order.pickles || 'no',
            num_bags: parseInt(order.numBags) || 0,
            creator: order.creator || '',  
            last_edited_by: order.lastEditedBy || ''
          };
          
          await cateringOrderDB.create(dbOrder);
          migrated++;
          console.log(`  ✅ Migrated catering order: ${order.organization} on ${order.orderDate}`);
        } catch (error) {
          console.error(`  ❌ Failed to migrate catering order ${order.id}:`, error.message);
        }
      }
      
      console.log(`✅ Catering orders migration complete. Migrated ${migrated}/${orders.length} orders.\n`);
    } catch (error) {
      console.error('❌ Error reading catering.json:', error.message);
    }
  } else {
    console.log('⚠️  catering.json not found, skipping catering orders migration.\n');
  }
}

async function migrateEmailOrders() {
  console.log('🔄 Migrating email orders...');
  const ordersFile = path.join(dataDir, 'orders.json');
  
  if (fs.existsSync(ordersFile)) {
    try {
      const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
      let migrated = 0;
      
      for (const order of orders) {
        try {
          const dbOrder = {
            order_type: order.orderType || order.order_type || '',
            order_date: order.date || null,
            order_time: order.time || '',
            destination: order.destination || '',
            customer_name: order.customer_name || '',
            phone_number: order.phone_number || '',
            customer_email: order.customer_email || '',
            guest_count: order.guest_count || '',
            paper_goods: order.paper_goods || 'No',
            special_instructions: order.special_instructions || '',
            food_items: order.food_items || [],
            drink_items: order.drink_items || [],
            sauces_dressings: order.sauces_dressings || [],
            meal_boxes: order.meal_boxes || [],
            total: order.total || '$0.00'
          };
          
          await emailOrderDB.create(dbOrder);
          migrated++;
          console.log(`  ✅ Migrated email order: ${order.customer_name || 'Unknown'} on ${order.date}`);
        } catch (error) {
          console.error(`  ❌ Failed to migrate email order ${order.id}:`, error.message);
        }
      }
      
      console.log(`✅ Email orders migration complete. Migrated ${migrated}/${orders.length} orders.\n`);
    } catch (error) {
      console.error('❌ Error reading orders.json:', error.message);
    }
  } else {
    console.log('⚠️  orders.json not found, skipping email orders migration.\n');
  }
}

async function main() {
  console.log('🚀 Starting migration to Supabase database...\n');
  
  try {
    await migrateEmployees();
    await migrateCheckIns();
    await migrateDebugLogs();
    await migrateCateringOrders();
    await migrateEmailOrders();
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify the data in your Supabase dashboard');
    console.log('2. Update your .env file with your Supabase credentials');
    console.log('3. Test the application functionality');
    console.log('4. Consider backing up the JSON files before deleting them');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateEmployees,
  migrateCheckIns,
  migrateDebugLogs,
  migrateCateringOrders,
  migrateEmailOrders
};