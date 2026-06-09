const { createClient } = require("@supabase/supabase-js");

async function run() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: lesson, error } = await supabase
    .from("aulas")
    .select("id, titulo, arquivo_url")
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
