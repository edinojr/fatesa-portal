const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { data: lessons, error } = await supabase
    .from("aulas")
    .select("id, titulo, arquivo_url")
    .neq("arquivo_url", null)
    .ilike("arquivo_url", "%.html");

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  const list = lessons.map(l => `${l.id}|${l.titulo}|${l.arquivo_url}`).join("\n");
  fs.writeFileSync("html_lessons_list.txt", list);
  console.log(`Found ${lessons.length} HTML lessons. List saved to html_lessons_list.txt`);
}

run();
