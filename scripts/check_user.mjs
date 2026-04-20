import { createClient } from '@supabase/supabase-js';

const url = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';
const supabase = createClient(url, anonKey);

async function checkUser() {
  const { data, error } = await supabase.from('users').select('*').ilike('email', 'daise.vieira@yahoo.com.br');
  if (error) console.error(error);
  console.log('User Data:', JSON.stringify(data, null, 2));
}

checkUser();
