// scripts/migrate-users-to-supabase.js
// Migration script to move users.json to Supabase database

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { userDB } = require('../database/db');

const usersFile = path.join(__dirname, '..', 'data', 'users.json');

async function migrateUsers() {
  console.log('🔄 Migrating users to Supabase database...\n');
  
  if (!fs.existsSync(usersFile)) {
    console.log('⚠️  users.json not found, skipping users migration.');
    return;
  }

  try {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    let migrated = 0;
    let skipped = 0;
    
    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await userDB.getByUsername(user.username);
        if (existing) {
          console.log(`  ⏭️  User ${user.username} already exists, skipping`);
          skipped++;
          continue;
        }

        // Create user in database - userDB.create expects (username, password_hash, fname, lname)
        const newUser = await userDB.create(
          user.username,
          user.password_hash || user.password, // Handle both hash fields
          user.fname,
          user.lname
        );
        migrated++;
        console.log(`  ✅ Migrated user: ${user.username} (${user.fname} ${user.lname})`);
        
      } catch (error) {
        console.error(`  ❌ Failed to migrate user ${user.username}:`, error.message);
      }
    }
    
    console.log(`\n✅ Users migration complete!`);
    console.log(`   📊 Migrated: ${migrated} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already exist)`);
    console.log(`   📝 Total: ${users.length} users processed\n`);

    if (migrated > 0) {
      console.log('🎉 Users successfully migrated to database!');
      console.log('\n📝 Next steps:');
      console.log('1. Test user login functionality');
      console.log('2. Verify users in your Supabase dashboard');
      console.log('3. Consider backing up users.json before deleting it');
    }
    
  } catch (error) {
    console.error('❌ Error reading users.json:', error.message);
  }
}

// Test user authentication
async function testUserAuth() {
  console.log('🧪 Testing user authentication...\n');
  
  try {
    const users = await userDB.getAll();
    console.log(`📊 Found ${users.length} users in database:`);
    
    users.forEach(user => {
      console.log(`  👤 ${user.username} (${user.fname} ${user.lname}) - Created: ${user.created_at}`);
    });
    
    if (users.length > 0) {
      console.log('\n✅ User database is ready for authentication!');
    }
    
  } catch (error) {
    console.error('❌ Error testing user authentication:', error.message);
  }
}

// Run the migration
async function main() {
  await migrateUsers();
  await testUserAuth();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateUsers, testUserAuth };