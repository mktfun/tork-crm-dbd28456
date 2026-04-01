const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testSupabase() {
  try {
    const envStr = fs.readFileSync('supabase/config.toml', 'utf8');
    console.log("Config TOML found.");
  } catch(e) {
    console.log("No config.toml", e);
  }
}

testSupabase();
