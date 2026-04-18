import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function test() {
  const { data, error } = await supabase.from('liberacoes_nucleo').select('*').limit(1);
  if (error) {
    console.error("ERROR:", error.message);
  } else {
    console.log("SUCCESS. Columns:", data.length > 0 ? Object.keys(data[0]) : "No rows, but query succeeded");
    
    // Test if is_current exists by specifically selecting it
    const { error: err2 } = await supabase.from('liberacoes_nucleo').select('is_current').limit(1);
    if (err2) {
       console.error("ERROR checking is_current:", err2.message);
    } else {
       console.log("is_current column exists!");
    }
  }
}
test();
