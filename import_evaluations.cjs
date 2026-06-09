const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GABARITO_ROOT = 'C:\\Users\\edino\\Downloads\\gabarito avaliações';

async function parseHtml(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const questions = [];

    const tfDivs = doc.querySelectorAll('.tf-question');
    tfDivs.forEach((div, idx) => {
        const textDiv = div.querySelector('div');
        if (!textDiv) return;
        const text = textDiv.textContent.trim();
        const inputs = div.querySelectorAll('input[type="radio"]');
        let correct = null;
        inputs.forEach(input => {
            if (input.hasAttribute('checked')) {
                correct = input.parentElement.textContent.toLowerCase().includes('verdadeiro');
            }
        });
        questions.push({
            id: `q-tf-${idx}`,
            type: 'true_false',
            text: text,
            isTrue: correct
        });
    });

    const allRadios = doc.querySelectorAll('input[type="radio"]:not(.tf-question input)');
    const mcGroups = new Map();

    allRadios.forEach(radio => {
        const questionCard = radio.closest('.question') || radio.closest('.question-group > div');
        if (!questionCard) return;
        const text = questionCard.querySelector('div')?.textContent?.trim() || "Questão sem título";
        if (!mcGroups.has(text)) {
            mcGroups.set(text, { text: text, options: [], correct: 0 });
        }
        const group = mcGroups.get(text);
        const optionText = radio.parentElement?.textContent?.trim() || "Opção sem texto";
        group.options.push(optionText);
        if (radio.hasAttribute('checked')) {
            group.correct = group.options.length - 1;
        }
    });

    Array.from(mcGroups.values()).forEach((q, idx) => {
        questions.push({
            id: `q-mc-${idx}`,
            type: 'multiple_choice',
            text: q.text,
            options: q.options,
            correct: q.correct
        });
    });

    const mpContainer = doc.querySelector('.mp-container');
    if (mpContainer) {
        const leftCols = mpContainer.querySelectorAll('.mp-left .mp-box');
        const rightCols = mpContainer.querySelectorAll('.mp-right .mp-box');
        const pairs = [];
        leftCols.forEach((left, i) => {
            pairs.push({
                left: left.textContent.trim(),
                right: rightCols[i]?.textContent.trim() || ''
            });
        });
        questions.push({
            id: `q-match-1`,
            type: 'matching',
            text: 'Relacione as colunas corretamente.',
            matchingPairs: pairs
        });
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
        
        // Strict matching for numbered series
        let livro = null;
        
        // Handle cardinal to roman mapping specifically for matching
        const subjectWithRoman = normSubject
            .replace(/ 1$/, ' i')
            .replace(/ 2$/, ' ii')
            .replace(/ 3$/, ' iii');

        livro = livros.find(l => {
            const normL = normalize(l.titulo);
            return normL === subjectWithRoman || normL === normSubject;
        });

        // Fallbacks
        if (!livro && normSubject.includes('angelologia')) {
            livro = livros.find(l => normalize(l.titulo).includes('angeologia'));
        }
        if (!livro && normSubject.includes('teologia obreiro')) {
            livro = livros.find(l => normalize(l.titulo).includes('teologia do obreiro'));
        }
        if (!livro && normSubject.includes('poeticos')) {
            livro = livros.find(l => normalize(l.titulo).includes('livros poeticos'));
        }

        if (!livro) {
            console.log(`Could not find livro for subject: ${subject} (Norm: ${subjectWithRoman})`);
            continue;
        }

        for (const file of files) {
            if (!file.endsWith('.html')) continue;
            let version = 1;
            const normFile = normalize(file);
            if (normFile.includes('v3')) version = 3;
            else if (normFile.includes('v2')) version = 2;
            else if (normFile.includes('v1')) version = 1;

            const questions = await parseHtml(path.join(subjectPath, file));
            let title = 'Avaliação';
            if (version === 2) title = 'Recuperação';
            if (version === 3) title = '2ª Recuperação';
            
            console.log(`Importing ${title} (V${version}) for livro ${livro.titulo}...`);
            
            const { data: existing } = await supabase.from('aulas')
                .select('id')
                .eq('livro_id', livro.id)
                .eq('versao', version)
                .eq('tipo', 'prova')
                .maybeSingle();

            const payload = {
                livro_id: livro.id,
                titulo: title,
                tipo: 'prova',
                is_bloco_final: true,
                versao: version,
                questionario: questions,
                min_grade: 7.0
            };

            if (existing) {
                await supabase.from('aulas').update(payload).eq('id', existing.id);
            } else {
                await supabase.from('aulas').insert(payload);
            }
        }
    }
    console.log('Import completed successfully!');
}

main().catch(console.error);
