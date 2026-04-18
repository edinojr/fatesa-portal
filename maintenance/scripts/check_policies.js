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

async function checkPolicy() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'liberacoes_nucleo' }).catch(() => ({data: null, error: null}));
  if (error) console.log(error);
  console.log(data);
}
checkPolicy();
