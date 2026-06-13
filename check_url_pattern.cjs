const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { data: sampleAulas, error } = await supabase
    .from('aulas')
    .select('titulo, arquivo_url, tipo')
    .limit(5);

  if (error) {
    console.error('Error fetching sample aulas:', error);
    return;
  }

  console.log('Sample Aulas:');
  console.log(JSON.stringify(sampleAulas, null, 2));
}

run().catch(console.error);
