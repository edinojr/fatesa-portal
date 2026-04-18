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

async function testUpsert() {
  // get a random nucleo id
  const { data: nucs } = await supabase.from('nucleos').select('id').limit(1);
  if (!nucs || nucs.length === 0) return console.log("No nucleos");
  const nucleo_id = nucs[0].id;

  const item_id = '00000000-0000-0000-0000-000000000000'; // dummy UUID

  console.log("Testing UPSERT...");
  const { error } = await supabase.from('liberacoes_nucleo').upsert({
    nucleo_id: nucleo_id,
    item_id: item_id,
    item_type: 'modulo',
    liberado: true
  }, { onConflict: 'nucleo_id, item_id, item_type' });

  if (error) {
    console.error("UPSERT ERROR:", error.message);
  } else {
    console.log("UPSERT SUCCESS");
  }
}
testUpsert();
