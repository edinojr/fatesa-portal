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

  const { data: lesson, error } = await supabase
    .from("aulas")
    .select("id, titulo, arquivo_url, tipo")
    .neq("tipo", "atividade")
    .neq("tipo", "prova")
    .neq("arquivo_url", null)
    .ilike("arquivo_url", "%.html")
    .limit(1)
    .maybeSingle();

  if (error || !lesson) {
    console.error("Error fetching lesson:", error);
    process.exit(1);
  }

  console.log("Lesson found: " + lesson.titulo);
  console.log("URL: " + lesson.arquivo_url);

  try {
    const response = await fetch(lesson.arquivo_url);
    const text = await response.text();
    console.log("--- CONTENT START ---");
    console.log(text);
    console.log("--- CONTENT END ---");
  } catch (e) {
    console.error("Error fetching HTML content:", e.message);
  }
}

run();
