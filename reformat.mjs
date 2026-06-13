import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\licoes\\Curso Básico\\Epístolas Gerais';

const css = `        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.8; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 2rem; 
            color: #2d3748; 
            background-color: #f7fafc; 
        }
        
        .lesson-container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        
        .lesson-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            color: white;
            padding: 2rem 2.5rem;
            text-align: center;
        }
        
        .lesson-header h1 {
            font-size: 1.4rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
            opacity: 0.9;
        }
        
        .lesson-header h2 {
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0;
        }
        
        .lesson-nav {
            display: flex;
            justify-content: space-between;
            padding: 1rem 2.5rem;
            background-color: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .lesson-nav a {
            text-decoration: none;
            color: #2563eb;
            font-weight: 500;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        
        .lesson-nav a:hover { color: #1d4ed8; text-decoration: underline; }
        
        .lesson-content { padding: 2.5rem; }
        
        .texto-section {
            margin-bottom: 2.5rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .texto-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .texto-label {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 0.3rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        
        .section-title {
            color: #1e3a8a;
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 1.2rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #dbeafe;
        }
        
        .subsection-title {
            color: #1e40af;
            font-size: 1.1rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.8rem;
        }
        
        p { 
            margin-bottom: 1rem; 
            text-align: justify; 
        }
        
        .bible-verse {
            background-color: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 1rem 1.2rem;
            margin: 1.2rem 0;
            font-style: italic;
            color: #475569;
            border-radius: 0 8px 8px 0;
        }
        
        .bible-verse strong { color: #1e3a8a; font-style: normal; }
        
        .highlight-box {
            background-color: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 1.2rem;
            margin: 1.5rem 0;
        }
        
        .highlight-box strong { color: #92400e; }
        
        .illustration-container {
            margin: 2rem 0;
            text-align: center;
        }
        
        .illustration-container img {
            max-width: 100%;
            max-height: 350px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        }
        
        .illustration-caption {
            font-size: 0.85rem;
            color: #64748b;
            font-style: italic;
            margin-top: 0.8rem;
        }
        
        ul, ol { 
            margin: 1rem 0; 
            padding-left: 1.5rem; 
        }
        
        li { margin-bottom: 0.5rem; }
        
        .key-concept {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 1px solid #93c5fd;
            border-radius: 8px;
            padding: 1.2rem;
            margin: 1.5rem 0;
        }
        
        .key-concept strong { color: #1e40af; }
        
        .biblical-ref { 
            color: #2563eb; 
            text-decoration: underline dotted; 
            cursor: pointer; 
        }
        
        .biblical-ref:hover { color: #1d4ed8; }
        
        .popup-window {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid #ccc;
            padding: 20px;
            z-index: 1000;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            max-width: 80%;
            border-radius: 8px;
        }
        
        .popup-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 999;
        }
        
        .popup-window button {
            margin-top: 15px;
            padding: 8px 20px;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .popup-window button:hover { background-color: #1d4ed8; }

        @media (max-width: 640px) {
            body { padding: 1rem; }
            .lesson-header { padding: 1.5rem; }
            .lesson-content { padding: 1.5rem; }
            .lesson-nav { padding: 0.8rem 1.5rem; }
        }`;

const popupHtml = `    <div class="popup-overlay" id="overlay" onclick="closePopup()"></div>
    <div class="popup-window" id="popup">
        <div id="popup-content"></div>
        <button onclick="closePopup()">Fechar</button>
    </div>

    <script>
        async function showBiblicalPopup(element) {
            const ref = element.innerText;
            const contentDiv = document.getElementById("popup-content");
            const overlay = document.getElementById("overlay");
            const popup = document.getElementById("popup");
            contentDiv.innerText = "Carregando...";
            overlay.style.display = "block";
            popup.style.display = "block";
            try {
                const response = await fetch(\\\`https://bible-api.com/\\\${encodeURIComponent(ref)}?translation=almeida\\\`);
                const data = await response.json();
                contentDiv.innerText = data.text || "Versiculo nao encontrado.";
            } catch (error) {
                contentDiv.innerText = "Erro ao carregar o versiculo.";
            }
        }

        function showPopup(content) {
            document.getElementById('popup-content').innerText = content;
            document.getElementById('overlay').style.display = 'block';
            document.getElementById('popup').style.display = 'block';
        }
        function closePopup() {
            document.getElementById('overlay').style.display = 'none';
            document.getElementById('popup').style.display = 'none';
        }
    </script>`;

const lessons = [
    { num: '01', title: 'CONCEITOS E GENERALIDADES', file: 'Lição 01 - Conceitos e Generalidades.html', prev: 'Panorama.html', next: 'Lição 02 - Gozo no Sofrimento.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '02', title: 'GOZO NO SOFRIMENTO', file: 'Lição 02 - Gozo no Sofrimento.html', prev: 'Panorama.html', next: 'Lição 03 - A Prática da Palavra de Deus.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '03', title: 'A PRÁTICA DA PALAVRA DE DEUS', file: 'Lição 03 - A Prática da Palavra de Deus.html', prev: 'Panorama.html', next: 'Lição 04 - Sabedoria - Paixões e Paciência.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '04', title: 'SABEDORIA - PAIXÕES E PACIÊNCIA', file: 'Lição 04 - Sabedoria - Paixões e Paciência.html', prev: 'Panorama.html', next: 'Lição 05 - Epístolas de Pedro.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '05', title: 'EPÍSTOLAS DE PEDRO', file: 'Lição 05 - Epístolas de Pedro.html', prev: 'Panorama.html', next: 'Lição 06 - Modalidades de Relacionamentos Cristãos.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '06', title: 'MODALIDADES DE RELACIONAMENTOS CRISTÃOS', file: 'Lição 06 - Modalidades de Relacionamentos Cristãos.html', prev: 'Panorama.html', next: 'Lição 07 - Segunda Epístola de Pedro.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '07', title: 'SEGUNDA EPÍSTOLA DE PEDRO', file: 'Lição 07 - Segunda Epístola de Pedro.html', prev: 'Panorama.html', next: 'Lição 08 - Primeira Epístola de João.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '08', title: 'PRIMEIRA EPÍSTOLA DE JOÃO', file: 'Lição 08 - Primeira Epístola de João.html', prev: 'Panorama.html', next: 'Lição 09 - Segunda e Terceira Epístolas de João.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '09', title: 'SEGUNDA E TERCEIRA EPÍSTOLAS DE JOÃO', file: 'Lição 09 - Segunda e Terceira Epístolas de João.html', prev: 'Panorama.html', next: 'Lição 10 - A Epístola de Judas.html', prevText: 'Panorama', nextText: 'Próxima Lição' },
    { num: '10', title: 'A EPÍSTOLA DE JUDAS', file: 'Lição 10 - A Epístola de Judas.html', prev: 'Panorama.html', next: 'Panorama.html', prevText: 'Lição Anterior', nextText: 'Panorama' }
];

function getNavHtml(lesson) {
    let html = '        <nav class="lesson-nav">';
    html += `\n            <a href="${lesson.prev}">&larr; ${lesson.prevText}</a>`;
    html += `\n            <a href="${lesson.next}">${lesson.nextText} &rarr;</a>`;
    html += '\n        </nav>';
    return html;
}

function extractBodyContent(content) {
    const bodyStart = content.indexOf('<body>');
    const bodyEnd = content.indexOf('</body>');
    if (bodyStart === -1 || bodyEnd === -1) return '';
    return content.substring(bodyStart + 6, bodyEnd).trim();
}

function fixText(text) {
    const replacements = [
        ['Oseias que pensam', 'O que pensam'],
        ['Oseias eruditos', 'Os eruditos'],
        ['Oseias fariseus', 'Os fariseus'],
        ['Oseias que criticam', 'Os que criticam'],
        ['Oseias outros', 'Os outros'],
        ['Oseias que se acomodam', 'Os que se acomodam'],
        ['Oseias crentes judeus', 'Os crentes judeus'],
        ['Oseias trabalhadores crentes', 'Os trabalhadores crentes'],
        ['Oseias apóstolos', 'Os apostolos'],
        ['Oseias falsos mestres', 'Os falsos mestres'],
        ['Oseias mestres', 'Os mestres'],
        ['Oseias anjos', 'Os anjos'],
        ['Oseias tres', 'Os tres'],
        ['Oseias dois', 'Os dois'],
        ['Oseias catolicos romanos', 'Os catolicos romanos'],
        ['Oseias pais', 'Os pais'],
        ['Oseias projetos', 'Os projetos'],
        ['Oseias recursos', 'Os recursos'],
        ['Oseias ultimos', 'Os ultimos'],
        ['Oseias membros', 'Os membros'],
        ['Oseias irmaos', 'Os irmaos'],
        ['Oseias crentes hebreus', 'Os crentes hebreus'],
        ['Oseias pagaros', 'Os pagares'],
        ['Oseias que nao', 'Os que nao'],
        ['Oseias animais', 'Os animais'],
        ['Oseias obreiros', 'Os obreiros'],
        ['Oseias que forem', 'Os que forem'],
        ['Oseias', 'Os'],
        ['Naum arqueologia', 'Na arqueologia'],
        ['Naum Epístola', 'Na Epistola'],
        ['Naum episitola', 'Na epistola'],
        ['Naum passagem', 'Na passagem'],
        ['Naum expressão', 'Na expressao'],
        ['Naum consideração', 'Na consideracao'],
        ['Naum provação', 'Na provacao'],
        ['Naum escolha', 'Na escolha'],
        ['Naum acepção', 'Na acepcao'],
        ['Naum predileção', 'Na predilecao'],
        ['Naum verdade', 'Na verdade'],
        ['Naum igreja', 'Na igreja'],
        ['Naum época', 'Na epoca'],
        ['Naum tempo', 'Na tempo'],
        ['Naum casa', 'Na casa'],
        ['Naum divisão', 'Na divisao'],
        ['Naum tradução', 'Na traducao'],
        ['Naum sequencia', 'Na sequencia'],
        ['Naum período', 'No periodo'],
        ['Naum', 'Na'],
        ['Jerusalám', 'Jerusalem'],
        ['Belám', 'Belem'],
        ['alám', 'alem']
    ];
    
    let result = text;
    for (const [from, to] of replacements) {
        result = result.split(from).join(to);
    }
    return result;
}

function convertToNewStructure(bodyContent) {
    let result = fixText(bodyContent);
    
    result = result.replace(/<PopUp[^>]*>([\s\S]*?)<\/PopUp>/gi, '$1');
    
    result = result.replace(/<div class="nav-links">[\s\S]*?<\/div>/gi, '');
    result = result.replace(/<h1>EPÍSTOLAS GERAIS<\/h1>/gi, '');
    result = result.replace(/<h2>LIÇÃO \d+<\/h2>/gi, '');
    result = result.replace(/<h3>[^<]+<\/h3>/gi, '');
    result = result.replace(/<p>\*\*---<\/p>/gi, '');
    result = result.replace(/<hr\s*\/?>/gi, '');
    result = result.replace(/<div class="popup-overlay"[\s\S]*?<\/script>/gi, '');
    result = result.replace(/<div class="popup-window"[\s\S]*?<\/div>\s*<\/div>/gi, '');
    
    return result;
}

for (const lesson of lessons) {
    console.log(`Processing ${lesson.file}...`);
    
    const filePath = join(dir, lesson.file);
    const content = readFileSync(filePath, 'utf8');
    
    let bodyContent = extractBodyContent(content);
    bodyContent = convertToNewStructure(bodyContent);
    
    const navHtml = getNavHtml(lesson);
    
    const illustration = `                <div class="illustration-container">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop" alt="${lesson.title}">
                    <p class="illustration-caption">${lesson.title}</p>
                </div>`;
    
    const newContent = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lição ${lesson.num} - ${lesson.title}</title>
    <style>
${css}
    </style>
</head>
<body>
    <div class="lesson-container">
        <header class="lesson-header">
            <h1>EPÍSTOLAS GERAIS</h1>
            <h2>Lição ${lesson.num} &mdash; ${lesson.title}</h2>
        </header>

${navHtml}

        <div class="lesson-content">
${bodyContent}
        </div>
    </div>
${popupHtml}
</body>
</html>`;
    
    writeFileSync(filePath, newContent, 'utf8');
    console.log('  Done!');
}

console.log('\nAll 10 lessons reformatted successfully!');
