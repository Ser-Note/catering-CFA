// test-temp-creds.js - Test temp credentials functionality
const { tempCredsDB } = require('./database/db');

async function testTempCreds() {
  console.log('🧪 Testing temp credentials functionality...\n');
  
  try {
    // Test 1: Get all temp credentials
    console.log('1. Getting all temp credentials:');
    const allCreds = await tempCredsDB.getAll();
    console.log('   Found:', allCreds.length, 'temp credentials');
    allCreds.forEach(cred => {
      console.log(`   - ${cred.username}: ${cred.temp_password} (expires: ${cred.expires_at})`);
    });
    
    // Test 2: Test specific username lookup
    console.log('\n2. Testing username lookup:');
    const testUser = 'chase.rogers';
    const cred = await tempCredsDB.getByUsername(testUser);
    if (cred) {
      console.log(`   ✅ Found temp credential for ${testUser}: ${cred.temp_password}`);
    } else {
      console.log(`   ❌ No temp credential found for ${testUser}`);
    }
    
    // Test 3: Test password validation
    console.log('\n3. Testing password validation:');
    const isValid = await tempCredsDB.validateTempPassword(testUser, 'lcSkk97om6P');
    console.log(`   Password validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    // Test 4: Create a test temp credential
    console.log('\n4. Creating test temp credential:');
    try {
      await tempCredsDB.create('bill.bob', 'testPassword123');
      console.log('   ✅ Created temp credential for bill.bob');
      
      // Verify it was created
      const newCred = await tempCredsDB.getByUsername('bill.bob');
      if (newCred) {
        console.log(`   ✅ Verified: ${newCred.username} - ${newCred.temp_password}`);
      }
    } catch (error) {
      console.log('   ⚠️  Error creating test credential (might already exist):', error.message);
    }
    
    console.log('\n🎉 Temp credentials testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testTempCreds().then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testTempCreds };