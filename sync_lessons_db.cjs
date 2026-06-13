const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const JSON_ROOT = 'C:\\Users\\edino\\Downloads\\Nova pasta\\fatesa-casa-do-saber-licoes-json\\Curso Básico';
const HTML_ROOT_URL = '/licoes/Curso Básico';

async function syncLessons() {
    try {
        // 1. Get all books from DB
        const { data: books, error: booksError } = await supabase.from('livros').select('id, titulo');
        if (booksError) throw booksError;

        const bookMap = {};
        books.forEach(b => {
            bookMap[b.titulo.toLowerCase()] = b.id;
        });

        // Exact folder-to-book mapping to avoid substring matching bugs
        // (e.g., "História de Israel I" is a substring of "História de Israel II")
        const folderToBookTitle = {
            'História de Israel I': 'História de Israel I',
            'História de Israel II': 'História de Israel II',
            'Livros Poéticos I': 'Livros Poéticos I',
            'Livros Poéticos II': 'Livros Poéticos II',
            'Pentateuco': 'Pentateuco',
            'Livro de Josué': 'Livro de Josué',
            'Livro de Juízes': 'Livro de Juízes',
            'Livro de Rute': 'Livro de Rute',
            'Reis e Crônicas': 'Reis e Crônicas',
            'Livros de Esdras e Neemias': 'Livros de Esdras e Neemias',
            'Livro de Ester': 'Livro de Ester',
            'Livro de Jó': 'Livro de Jó',
            'Salmos': 'Salmos',
            'Provérbios': 'Provérbios',
            'Eclesiastes': 'Eclesiastes',
            'Cantares': 'Cantares',
            'Profetas Maiores': 'Profetas Maiores',
            'Profetas Menores': 'Profetas Menores',
            'Evangelhos': 'Evangelhos',
            'Atos dos Apóstolos': 'Atos dos Apóstolos',
            'Epístolas Paulinas I': 'Epístolas Paulinas I',
            'Epístolas Paulinas II': 'Epístolas Paulinas II',
            'Epístolas Paulinas III': 'Epístolas Paulinas III',
            'Epístolas Gerais': 'Epístolas Gerais',
            'Hebreus': 'Epístola aos Hebreus',
            'Apocalipse': 'Apocalipse',
            'Doutrina Cristã': 'Doutrina Cristã',
            'Teologia Prática': 'Teologia Prática'
        };

        const folders = fs.readdirSync(JSON_ROOT, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const folder of folders) {
            console.log(`Processing folder: ${folder}...`);
            
            // Find matching book ID - use exact mapping first
            let bookId = null;
            
            // 1. Try exact folder name mapping
            const mappedTitle = folderToBookTitle[folder];
            if (mappedTitle) {
                bookId = bookMap[mappedTitle.toLowerCase()];
            }
            
            // 2. Fallback: try exact match only (no substring matching)
            if (!bookId) {
                bookId = bookMap[folder.toLowerCase()];
            }
            
            // 3. Fallback: try normalized match (remove punctuation, extra spaces)
            if (!bookId) {
                const normalizedFolder = folder.toLowerCase().replace(/[.\-–—]/g, '').replace(/\s+/g, ' ').trim();
                for (const [title, id] of Object.entries(bookMap)) {
                    const normalizedTitle = title.replace(/[.\-–—]/g, '').replace(/\s+/g, ' ').trim();
                    if (normalizedFolder === normalizedTitle) {
                        bookId = id;
                        break;
                    }
                }
            }

            if (!bookId) {
                console.warn(`Could not find matching book for folder: ${folder}`);
                continue;
            }

            const folderPath = path.join(JSON_ROOT, folder);
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const title = jsonContent.title;

                if (!title) continue;

                const htmlFileName = file.replace('.json', '.html');
                const url = `${HTML_ROOT_URL}/${folder}/${htmlFileName}`;

                // 2. Check if lesson already exists by title
                const { data: existingLesson, error: findError } = await supabase
                    .from('aulas')
                    .select('id')
                    .eq('titulo', title)
                    .maybeSingle();

                if (findError) {
                    console.error(`Error searching for ${title}:`, findError);
                    errorCount++;
                    continue;
                }

                if (existingLesson) {
                    // Update URL
                    const { error: updateError } = await supabase
                        .from('aulas')
                        .update({ arquivo_url: url })
                        .eq('id', existingLesson.id);

                    if (updateError) {
                        console.error(`Error updating ${title}:`, updateError);
                        errorCount++;
                    } else {
                        console.log(`Updated: ${title}`);
                        updatedCount++;
                    }
                } else {
                    // Create new lesson
                    // Determine order: extract lesson number if possible
                    let order = 10;
                    const match = title.match(/Lição\s+(\d+)/i);
                    if (match) {
                        order = parseInt(match[1]) * 10;
                    }

                    const { error: insertError } = await supabase
                        .from('aulas')
                        .insert({
                            titulo: title,
                            livro_id: bookId,
                            tipo: 'licao',
                            ordem: order,
                            arquivo_url: url,
                            is_bloco_final: false
                        });

                    if (insertError) {
                        console.error(`Error inserting ${title}:`, insertError);
                        errorCount++;
                    } else {
                        console.log(`Created: ${title}`);
                        createdCount++;
                    }
                }
            }
        }

        console.log(`\\nSync completed!`);
        console.log(`Created: ${createdCount}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);
    } catch (err) {
        console.error('Global error:', err);
    }
}

syncLessons();
