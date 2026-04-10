const url = 'https://jhqnitdmdlbagnfwwrwx.supabase.co/rest/v1/users?select=id,nome,email&email=eq.daise.vieira@yahoo.com.br';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';

fetch(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }})
  .then(r => r.json())
  .then(console.log);
