const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GABARITO_ROOT = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\gabarito';

async function parseMatching(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const matchingSection = Array.from(doc.querySelectorAll('h3')).find(h3 => h3.textContent.includes('Enumere a coluna "B"'));
    if (!matchingSection) return null;

    const questionDiv = matchingSection.nextElementSibling;
    if (!questionDiv || !questionDiv.classList.contains('question')) return null;

    const colA = Array.from(questionDiv.querySelectorAll('div')).find(d => d.querySelector('h4')?.textContent.includes('Coluna A'));
    const colB = Array.from(questionDiv.querySelectorAll('div')).find(d => d.querySelector('h4')?.textContent.includes('Coluna B'));

    if (!colA || !colB) return null;

    const leftItems = Array.from(colA.querySelectorAll('li')).map(li => li.textContent.replace(/^\d+-\s*/, '').trim());
    const rightItems = Array.from(colB.querySelectorAll('li')).map(li => {
        const text = li.querySelector('div:last-child')?.textContent.trim();
        const select = li.querySelector('select');
        const correctVal = select ? select.querySelector('option[selected]')?.value : null;
        return { text, correctVal: correctVal ? parseInt(correctVal) - 1 : null };
    });

    const pairs = new Array(leftItems.length);
    rightItems.forEach((item, j) => {
        if (item.correctVal !== null && item.correctVal >= 0 && item.correctVal < leftItems.length) {
            pairs[item.correctVal] = { left: leftItems[item.correctVal], right: item.text };
        }
    });

    return {
        text: 'Enumere a coluna "B" de acordo com a coluna "A"',
        type: 'matching',
        matchingPairs: pairs.filter(Boolean)
    };
}

async function main() {
    const subjects = fs.readdirSync(GABARITO_ROOT);
    const { data: livros } = await supabase.from('livros').select('id, titulo');
    if (!livros) return;

    const normalize = (str) => str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    for (const subject of subjects) {
        const subjectPath = path.join(GABARITO_ROOT, subject);
        if (!fs.lstatSync(subjectPath).isDirectory()) continue;

        const files = fs.readdirSync(subjectPath);
        const normSubject = normalize(subject);
        
        let livro = livros.find(l => {
            const normL = normalize(l.titulo);
            return normL === normSubject || normL.includes(normSubject) || normSubject.includes(normL);
        });

        if (!livro) {
            if (normSubject === 'angelologia') {
                livro = livros.find(l => normalize(l.titulo) === 'angeologia');
            } else if (normSubject === 'teologia obreiro') {
                livro = livros.find(l => normalize(l.titulo) === 'teologia do obreiro');
            }
        }

        if (!livro) {
            console.log(`Skipping subject: ${subject} (no libro found)`);
            continue;
        }

        for (const file of files) {
            if (!file.endsWith('.html')) continue;
            
            const matchingQuestion = await parseMatching(path.join(subjectPath, file));
            if (!matchingQuestion) continue;

            const match = file.match(/(\d+)_licao_(\d+)/);
            const lessonNum = match ? match[2] : null;
            let version = 1;
            if (file.includes('v3')) version = 3;
            else if (file.includes('v2')) version = 2;

            console.log(`Processing ${file} for ${livro.titulo}...`);

            const { data: provaAula } = await supabase.from('aulas')
                .select('id, questionario')
                .eq('livro_id', livro.id)
                .eq('versao', version)
                .eq('tipo', 'prova')
                .maybeSingle();

            if (provaAula) {
                console.log(`Updating Matching in Prova V${version}...`);
                let q = Array.isArray(provaAula.questionario) ? [...provaAula.questionario] : [];
                const idx = q.findIndex(item => item.type === 'matching');
                if (idx !== -1) q[idx] = matchingQuestion; else q.push(matchingQuestion);
                await supabase.from('aulas').update({ questionario: q }).eq('id', provaAula.id);
            }

            if (lessonNum) {
                const { data: atividadeAula } = await supabase.from('aulas')
                    .select('id, questionario')
                    .eq('livro_id', livro.id)
                    .eq('tipo', 'atividade')
                    .ilike('titulo', `%Lição ${lessonNum}%`)
                    .maybeSingle();

                if (atividadeAula) {
                    console.log(`Updating Matching in Atividade Lição ${lessonNum}...`);
                    let q = Array.isArray(atividadeAula.questionario) ? [...atividadeAula.questionario] : [];
                    const idx = q.findIndex(item => item.type === 'matching');
                    if (idx !== -1) q[idx] = matchingQuestion; else q.push(matchingQuestion);
                    await supabase.from('aulas').update({ questionario: q }).eq('id', atividadeAula.id);
                }
            }
        }
    }
    console.log('Processing completed!');
}

main().catch(console.error);
