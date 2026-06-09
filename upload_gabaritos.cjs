
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const url = "https://jhqnitdmdlbagnfwwrwx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4";
const supabase = createClient(url, key);

const rootDir = "C:\\Users\\edino\\Downloads\\gabarito avaliações";

async function upload() {
  try {
    const folders = fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of folders) {
      console.log(`Processing folder: ${folder}`);
      const folderPath = path.join(rootDir, folder);
      const files = fs.readdirSync(folderPath).filter(file => file.endsWith(".html"));

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const content = fs.readFileSync(filePath, "utf8");

        // Filename format: Subject_-_VX_gabarito.html
        // e.g. Angelologia_-_V1_gabarito.html
        const parts = file.split("_-_");
        if (parts.length < 2) {
          console.log(`Skipping file with unexpected format: ${file}`);
          continue;
        }

        const subject = parts[0];
        const versionPart = parts[1].split("_")[0]; // V1, V2, V3
        const version = parseInt(versionPart.replace("V", "")) || 1;

        console.log(`Updating: ${subject} V${version}`);

        // Find the aula that matches the subject and version
        const { data: aulas, error: searchError } = await supabase
          .from("aulas")
          .select("id, titulo, versao")
          .ilike("titulo", `%${subject}%`)
          .eq("versao", version);

        if (searchError) {
          console.error(`Error searching for ${subject} V${version}:`, searchError);
          continue;
        }

        if (!aulas || aulas.length === 0) {
          console.log(`No aula found for ${subject} V${version}`);
          continue;
        }

        // We take the first match, as subjects are usually unique per version in a book
        const aulaId = aulas[0].id;
        const { error: updateError } = await supabase
          .from("aulas")
          .update({ corpo_html: content })
          .eq("id", aulaId);

        if (updateError) {
          console.error(`Error updating ${subject} V${version}:`, updateError);
        } else {
          console.log(`Successfully updated ${subject} V${version}`);
        }
      }
    }
    console.log("Upload complete.");
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

upload();
