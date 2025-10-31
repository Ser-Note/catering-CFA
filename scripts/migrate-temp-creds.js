// migrate-temp-creds.js - Migrate temp-creds.csv to Supabase database
const fs = require('fs');
const path = require('path');
const { tempCredsDB } = require('../database/db');

async function migrateTempCreds() {
  console.log('🔄 Starting temp credentials migration...');
  
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'temp-creds.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('📄 No temp-creds.csv file found, skipping migration.');
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('📄 temp-creds.csv is empty, skipping migration.');
      return;
    }
    
    console.log(`📊 Found ${lines.length} temporary credential(s) to migrate`);
    
    // Migrate each line
    for (const line of lines) {
      const [username, tempPassword] = line.split(',').map(s => s.trim());
      
      if (!username || !tempPassword) {
        console.log(`⚠️  Skipping invalid line: ${line}`);
        continue;
      }
      
      try {
        // Check if already exists
        const existing = await tempCredsDB.getByUsername(username);
        
        if (existing) {
          console.log(`📝 Temp credentials for ${username} already exist in database, skipping.`);
          continue;
        }
        
        // Insert into database
        await tempCredsDB.create(username, tempPassword);
        console.log(`✅ Migrated temp credentials for ${username}`);
        
      } catch (error) {
        console.error(`❌ Error migrating temp credentials for ${username}:`, error.message);
      }
    }
    
    // Create backup of original file
    const backupPath = csvPath + '.backup.' + Date.now();
    fs.copyFileSync(csvPath, backupPath);
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Remove original file
    fs.unlinkSync(csvPath);
    console.log(`🗑️  Removed original temp-creds.csv file`);
    
    console.log('✅ Temp credentials migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateTempCreds().then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateTempCreds };