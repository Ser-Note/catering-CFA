// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseKey) missingVars.push('SUPABASE_ANON_KEY');
  
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these environment variables in your deployment platform.');
  console.error('Example: SUPABASE_URL=https://your-project.supabase.co');
  
  throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ Invalid SUPABASE_URL format:', supabaseUrl);
  console.error('URL must be a valid HTTP/HTTPS URL like: https://your-project.supabase.co');
  throw new Error(`Invalid SUPABASE_URL format: ${supabaseUrl}`);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;