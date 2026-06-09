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
  
  const listContent = fs.readFileSync("html_lessons_list.txt", "utf8");
  const lines = listContent.split("\n").filter(l => l.trim() !== "");

  console.log(`Downloading ${lines.length} files...`);

  for (const line of lines) {
    const [id, titulo, url] = line.split("|");
    const filename = `${id}.html`;
    const filePath = path.join("src", "review_temp", filename);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.text();
      fs.writeFileSync(filePath, data, "utf8");
      console.log(`Downloaded: ${titulo}`);
    } catch (e) {
      console.error(`Error downloading ${titulo} (${url}): ${e.message}`);
    }
  }
  console.log("All files downloaded.");
}

run();
