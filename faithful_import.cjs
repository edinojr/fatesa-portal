const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GABARITO_ROOT = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\gabarito';

function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/Angelologia/g, 'Angeologia')
        .replace(/angelologia/g, 'angeologia')
        .trim();
}

async function parseHtmlFaithfully(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const questions = [];

    const sections = Array.from(doc.querySelectorAll('h3'));
    
    for (let i = 0; i < sections.length; i++) {
        const header = sections[i];
        const headerText = header.textContent.toLowerCase();
        
        const questionsInSection = [];
        let nextElem = header.nextElementSibling;
        while (nextElem && nextElem.tagName !== 'H3') {
            if (nextElem.classList && nextElem.classList.contains('question')) {
                questionsInSection.push(nextElem);
            } else if (nextElem.querySelector('.question')) {
                questionsInSection.push(nextElem.querySelector('.question'));
            }
            nextElem = nextElem.nextElementSibling;
        }

        if (questionsInSection.length === 0) continue;

        if (headerText.includes('verdadeira') && headerText.includes('falsa')) {
            questionsInSection.forEach((div, idx) => {
                const text = normalizeText(div.querySelector('.q-text')?.textContent || '');
                const inputs = div.querySelectorAll('input[type="radio"]');
                let isTrue = null;
                inputs.forEach(input => {
                    if (input.hasAttribute('checked')) {
                        isTrue = input.parentElement.textContent.toLowerCase().includes('v');
                    }
                });
                questions.push({ id: `q-tf-${idx}`, type: 'true_false', text: text, isTrue: isTrue });
            });
        } else if (headerText.includes('alternativa correta') || headerText.includes('marque com "x"')) {
            questionsInSection.forEach((div, idx) => {
                const text = normalizeText(div.querySelector('.q-text')?.textContent || '');
                const options = [];
                const liElements = div.querySelectorAll('li');
                let correct = 0;
                liElements.forEach((li, oIdx) => {
                    const optText = normalizeText(li.textContent.trim());
                    options.push(optText);
                    const radio = li.querySelector('input[type="radio"]');
                    if (radio && radio.hasAttribute('checked')) {
                        correct = oIdx;
                    }
                });
                questions.push({ id: `q-mc-${idx}`, type: 'multiple_choice', text: text, options: options, correct: correct });
            });
        } else if (headerText.includes('enumere') || headerText.includes('relacione')) {
            const div = questionsInSection[0];
            // Search for containers that contain h4 "Coluna A" and "Coluna B"
            const allDivs = Array.from(div.querySelectorAll('div'));
            const colADiv = allDivs.find(d => d.querySelector('h4')?.textContent.toLowerCase().includes('coluna a'));
            const colBDiv = allDivs.find(d => d.querySelector('h4')?.textContent.toLowerCase().includes('coluna b'));
            
            if (colADiv && colBDiv) {
                const leftItems = Array.from(colADiv.querySelectorAll('li')).map(li => {
                    // Remove the number at start (e.g., "1- ")
                    return normalizeText(li.textContent.replace(/^\\d+-\\s*/, ''));
                });
                
                const rightItems = Array.from(colBDiv.querySelectorAll('li')).map(li => {
                    // Text is usually in the second div inside the li
                    const divs = Array.from(li.querySelectorAll('div'));
                    const text = divs.length > 1 ? normalizeText(divs[divs.length - 1].textContent) : normalizeText(li.textContent);
                    
                    const select = li.querySelector('select');
                    let correctVal = null;
                    if (select) {
                        const selectedOption = select.querySelector('option[selected]');
                        if (selectedOption) {
                            correctVal = selectedOption.value;
                        }
                    }
                    return { text, correctVal: correctVal ? parseInt(correctVal) - 1 : null };
                });

                const pairs = [];
                // We iterate through rightItems to find which Left item they match
                rightItems.forEach((item, j) => {
                    if (item.correctVal !== null && item.correctVal >= 0 && item.correctVal < leftItems.length) {
                        pairs.push({ 
                            left: leftItems[item.correctVal], 
                            right: item.text 
                        });
                    }
                });
                
                // Sort pairs by the left item's original index to maintain order if possible
                // Actually, let's just ensure we have a match for every left item if possible.
                // The best way is to create a result array based on leftItems.
                const finalPairs = new Array(leftItems.length);
                rightItems.forEach((item, j) => {
                    if (item.correctVal !== null && item.correctVal >= 0 && item.correctVal < leftItems.length) {
                        finalPairs[item.correctVal] = { 
                            left: leftItems[item.correctVal], 
                            right: item.text 
                        };
                    }
                });

                questions.push({
                    id: `q-match-0`,
                    type: 'matching',
                    text: normalizeText(header.textContent),
                    matchingPairs: finalPairs.filter(Boolean)
                });
            }
        } else if (headerText.includes('citar') || headerText.includes('descreva')) {
            questionsInSection.forEach((div, idx) => {
                const text = normalizeText(div.querySelector('.q-text')?.textContent || '');
                const answer = normalizeText(div.querySelector('textarea')?.value || '');
                questions.push({ id: `q-dis-${idx}`, type: 'discursive', text: text, expectedAnswer: answer });
            });
        }
    }
    return questions;
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
            if (normSubject === 'angelologia') livro = livros.find(l => normalize(l.titulo) === 'angeologia');
            else if (normSubject === 'teologia obreiro') livro = livros.find(l => normalize(l.titulo) === 'teologia do obreiro');
        }

        if (!livro) continue;

        for (const file of files) {
            if (!file.endsWith('.html')) continue;
            const questions = await parseHtmlFaithfully(path.join(subjectPath, file));
            if (!questions || questions.length === 0) continue;

            const match = file.match(/(\d+)_licao_(\d+)/);
            const lessonNum = match ? match[2] : null;
            let version = 1;
            if (file.includes('v3')) version = 3; else if (file.includes('v2')) version = 2;

            console.log(`Updating ${livro.titulo} V${version} ${file}...`);

            const { data: provaAula } = await supabase.from('aulas')
                .select('id')
                .eq('livro_id', livro.id)
                .eq('versao', version)
                .eq('tipo', 'prova')
                .maybeSingle();
            if (provaAula) await supabase.from('aulas').update({ questionario: questions }).eq('id', provaAula.id);

            if (lessonNum) {
                const { data: atividadeAula } = await supabase.from('aulas')
                    .select('id')
                    .eq('livro_id', livro.id)
                    .eq('tipo', 'atividade')
                    .ilike('titulo', `%Lição ${lessonNum}%`)
                    .maybeSingle();
                if (atividadeAula) await supabase.from('aulas').update({ questionario: questions }).eq('id', atividadeAula.id);
            }
        }
    }
    console.log('Faithful import completed!');
}

main().catch(console.error);
