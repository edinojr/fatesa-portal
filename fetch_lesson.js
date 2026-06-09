const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const fs = require("fs");

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
    const response = await axios.get(lesson.arquivo_url);
    console.log("--- CONTENT START ---");
    console.log(response.data);
    console.log("--- CONTENT END ---");
  } catch (e) {
    console.error("Error fetching HTML content:", e.message);
  }
}

run();
