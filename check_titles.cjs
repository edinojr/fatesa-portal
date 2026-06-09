
const { createClient } = require("@supabase/supabase-js");
const url = "https://jhqnitdmdlbagnfwwrwx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4";
const supabase = createClient(url, key);
async function check() {
  const { data, error } = await supabase.from("aulas").select("titulo, versao").or("tipo.eq.prova,is_bloco_final.eq.true");
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Evaluations in DB:");
    data.forEach(a => console.log(`${a.titulo} (V${a.versao || 1})`));
  }
}
check();
