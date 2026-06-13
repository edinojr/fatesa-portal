const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: users } = await supabase.from('users').select('tipo');
  if (!users) {
    console.log('No users found');
    return;
  }
  const types = [...new Set(users.map(u => u.tipo))];
  console.log('User types found in DB:');
  types.forEach(t => console.log(`- ${t}`));
}

run();
