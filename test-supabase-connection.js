// test-supabase-connection.js
// Quick test script to verify your Supabase connection
require('dotenv').config();
const supabase = require('./config/supabase');

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test a simple query
    const { data, error } = await supabase
      .from('employees')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n💡 Make sure you have:');
      console.log('1. Created the database tables using schema.sql');
      console.log('2. Set correct SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      console.log('3. Enabled Row Level Security policies');
    } else {
      console.log('✅ Connection successful!');
      console.log(`📊 Found ${data || 0} employees in database`);
      console.log('\n🎉 You can now run: npm start');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('\n💡 Check your .env file and Supabase credentials');
  }
}

testConnection();