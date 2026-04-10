import fs from 'fs';

const url = 'https://jhqnitdmdlbagnfwwrwx.supabase.co/rest/v1/pagamentos?select=id%2Cvalor%2Cstatus%2Cdata_vencimento%2Ccomprovante_url%2Cfeedback%2Cmodulo%2Cusers%28id%2Cnome%2Cemail%2Cnucleo%2Cnucleo_id%2Cnucleos%28nome%29%29&order=data_vencimento.desc:1';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';

async function logError() {
  const res = await fetch(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } });
  const text = await res.text();
  console.log('HTTP:', res.status);
  console.log('ERROR JSON:', text);
}
logError();
