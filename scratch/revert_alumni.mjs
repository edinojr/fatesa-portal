import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function revertAntony() {
  const email = 'antony200313@gmail.com';
  
  // Get User ID
  const { data: users, error: userError } = await supabase.from('users').select('id, tipo').eq('email', email);
  if (userError || !users?.length) {
    return console.error('User not found:', userError);
  }
  
  const userId = users[0].id;
  console.log(`Found Antony ID: ${userId}, current type: ${users[0].tipo}`);

  // Revert type to 'aluno'
  const { error: updateError } = await supabase.from('users').update({ tipo: 'aluno', ano_graduacao: null }).eq('id', userId);
  if (updateError) console.error('Error updating user type:', updateError);
  else console.log('User type reverted to aluno.');

  // Delete from registros_alumni
  const { error: deleteError } = await supabase.from('registros_alumni').delete().eq('user_id', userId);
  if (deleteError) console.error('Error deleting alumni record:', deleteError);
  else console.log('Alumni record deleted.');
  
  console.log('Revert process finished.');
}

revertAntony();
