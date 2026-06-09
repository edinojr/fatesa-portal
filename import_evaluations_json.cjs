const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const url = "https://jhqnitdmdlbagnfwwrwx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4";
const supabase = createClient(url, key);

const rootDir = "C:\\Users\\edino\\Downloads\\json";

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/_/g, " ")
    .trim();
}

async function importEvaluations() {
  try {
    console.log("Mapping books...");
    const { data: books, error: booksError } = await supabase.from("livros").select("id, titulo");
    if (booksError) throw booksError;
    
    const bookMap = {};
    books.forEach(b => {
      bookMap[normalize(b.titulo)] = b.id;
    });

    const manualMap = {
      "teologia_obreiro": "84ffc99a-bc60-4a57-ba61-3761445a518d"
    };

    const folders = fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of folders) {
      console.log(`Processing folder: ${folder}`);
      const folderPath = path.join(rootDir, folder);
      const files = fs.readdirSync(folderPath).filter(file => file.endsWith(".json"));

      const normalizedFolder = normalize(folder);
      let bookId = manualMap[folder.toLowerCase()] || null;
      
      if (!bookId) {
        for (const normTitle in bookMap) {
          if (normTitle.includes(normalizedFolder) || normalizedFolder.includes(normTitle)) {
            bookId = bookMap[normTitle];
            break;
          }
        }
      }

      if (!bookId) {
        console.log(`Could not find book for folder ${folder} (normalized: ${normalizedFolder}). Skipping.`);
        continue;
      }

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const jsonContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
        
        const quizQuestions = [];
        
        if (jsonContent.tfQuestions) {
          jsonContent.tfQuestions.forEach(q => {
            quizQuestions.push({
              type: "true_false",
              question: q.question,
              isTrue: q.answer === "V"
            });
          });
        }
        
        if (jsonContent.mcQuestions) {
          jsonContent.mcQuestions.forEach(q => {
            quizQuestions.push({
              type: "multiple_choice",
              question: q.question,
              options: q.options,
              correct: q.answer
            });
          });
        }
        
        if (jsonContent.matchingPairs) {
          quizQuestions.push({
            type: "matching",
            question: "Relacione as colunas",
            matchingPairs: jsonContent.matchingPairs
          });
        }

        let version = 1;
        const versionMatch = (jsonContent.title || file).match(/V([1-3])/i);
        if (versionMatch) {
          version = parseInt(versionMatch[1]);
        }

        console.log(`Updating ${folder} V${version} in book ${bookId}...`);

        const { data: aulas, error: searchError } = await supabase
          .from("aulas")
          .select("id")
          .eq("livro_id", bookId)
          .eq("versao", version)
          .or("tipo.eq.prova,is_bloco_final.eq.true");

        if (searchError) {
          console.error(`Search error for ${folder} V${version}:`, searchError);
          continue;
        }

        if (!aulas || aulas.length === 0) {
          console.log(`No evaluation aula found for ${folder} V${version} in book ${bookId}`);
          continue;
        }

        const aulaId = aulas[0].id;
        const { error: updateError } = await supabase
          .from("aulas")
          .update({ questionario: quizQuestions })
          .eq("id", aulaId);

        if (updateError) {
          console.error(`Update error for ${folder} V${version}:`, updateError);
        } else {
          console.log(`Successfully imported ${folder} V${version}`);
        }
      }
    }
    console.log("Import complete.");
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

importEvaluations();
