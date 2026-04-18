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

// use service role key
const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_SERVICE_ROLE_KEY']);

async function checkStudents() {
  const { data, error } = await supabase.from('users').select('email, tipo, nucleo_id, nome').limit(5);
  if (error) console.error(error);
  console.log("Users:");
  console.log(data);
}
checkStudents();
