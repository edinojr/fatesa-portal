
const { createClient } = require("@supabase/supabase-js");
const url = "https://jhqnitdmdlbagnfwwrwx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4";
const supabase = createClient(url, key);
async function check() {
  const { data, error } = await supabase.from("aulas").select("titulo, corpo_html").neq("corpo_html", "").limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found entries with corpo_html:", data);
  }
}
check();
