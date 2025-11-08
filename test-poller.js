// Test the Gmail poller manually
require('dotenv').config();
const GmailPoller = require('./services/gmailPoller');

(async () => {
  console.log('🔍 Manually checking Gmail for new orders...\n');
  
  const poller = new GmailPoller();
  
  try {
    const count = await poller.checkOnce();
    console.log(`\n✅ Check complete. New orders saved: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
