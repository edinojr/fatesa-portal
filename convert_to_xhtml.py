#!/usr/bin/env python3
"""Converte PDFs de material teológico para XHTML com navegação."""

import re
import os
from pathlib import Path
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import json

BASE_DIR = Path(r"C:\Users\edino\OneDrive\Área de Trabalho\Arquivos\Arquivos")
OUTPUT_DIR = Path(r"C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\output")
TEMPLATES_DIR = OUTPUT_DIR / "templates"
DISCIPLINES_FILE = OUTPUT_DIR / "disciplines.json"

DISCIPLINE_NAMES = {
    "angelologia": "Angelologia, Antropologia e Hamartiologia",
    "apocalipse": "Apocalipse",
    "atosapostolos": "Atos dos Apóstolos",
    "bibliologia": "Bibliologia",
    "cristologia": "Cristologia",
    "doutdeus": "Doutrina de Deus",
    "doutsalvao": "Doutrina da Salvação",
    "eclesiologia": "Eclesiologia",
    "epgerais": "Epístolas Gerais",
    "epistolas aos hebreus": "Epístolas aos Hebreus",
    "epstolas paulinas": "Epístolas Paulinas",
    "escatologiabiblica": "Eschatologia Bíblica",
    "espsanto": "Espírito Santo",
    "heresiologia": "Heresiologia",
    "histigreja": "História da Igreja",
    "histisrael1": "História de Israel 1",
    "israel2": "História de Israel 2",
    "livrosmedio": "Livros Históricos",
    "osevangelhos": "Os Evangelhos",
    "paulinas2": "Epístolas Paulinas 2",
    "paulinas3": "Epístolas Paulinas 3",
    "pentateuco": "Pentateuco",
    "poeticos1": "Livros Poéticos 1",
    "poeticos2": "Livros Poéticos 2",
    "profetasmenores": "Profetas Menores",
    "profmaiores": "Profetas Maiores",
    "teologiapratica": "Teologia Prática",
    "teoobreiro": "Teologia do Obreiro",
}

CSS = """@charset "UTF-8";
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Georgia', 'Times New Roman', serif;
    line-height: 1.6;
    color: #333;
    background: #f5f5f5;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background: #fff;
    min-height: 100vh;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}
/* Header */
.header {
    background: linear-gradient(135deg, #1a5f2a, #2e7d46);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 5px;
    margin-bottom: 20px;
}
.header h1 {
    font-size: 1.8em;
    margin-bottom: 10px;
}
.header .subtitle {
    font-style: italic;
    opacity: 0.9;
}
/* Navigation */
.nav {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 20px;
}
.nav-title {
    font-weight: bold;
    margin-bottom: 10px;
    color: #1a5f2a;
}
.nav ul {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}
.nav a {
    display: block;
    padding: 8px 15px;
    background: #e9ecef;
    color: #333;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9em;
    transition: all 0.2s;
}
.nav a:hover, .nav a.active {
    background: #1a5f2a;
    color: white;
}
/* Sidebar with lessons */
.content-wrapper {
    display: flex;
    gap: 20px;
}
.sidebar {
    width: 280px;
    flex-shrink: 0;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    max-height: 80vh;
    overflow-y: auto;
    position: sticky;
    top: 20px;
}
.sidebar-title {
    font-weight: bold;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 2px solid #1a5f2a;
    color: #1a5f2a;
}
.lesson-list {
    list-style: none;
}
.lesson-list > li {
    margin-bottom: 5px;
}
.lesson-list a {
    display: block;
    padding: 8px 10px;
    color: #333;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9em;
}
.lesson-list a:hover, .lesson-list a.active {
    background: #1a5f2a;
    color: white;
}
/* Submenu (outline) */
.outline-menu {
    list-style: none;
    margin-left: 15px;
    border-left: 2px solid #ddd;
    padding-left: 10px;
}
.outline-menu li {
    margin: 3px 0;
}
.outline-menu a {
    font-size: 0.8em;
    color: #666;
    padding: 4px 8px;
}
.outline-menu a:hover {
    color: #1a5f2a;
    background: #e8f5e9;
}
/* Main content */
.main-content {
    flex: 1;
    min-width: 0;
}
.lesson-content {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 30px;
}
.lesson-title {
    color: #1a5f2a;
    font-size: 1.5em;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #1a5f2a;
}
/* Outline section */
.outline-section {
    background: #f0f7f1;
    border: 1px solid #c8e6c9;
    border-radius: 5px;
    padding: 20px;
    margin: 20px 0;
}
.outline-title {
    color: #1a5f2a;
    font-size: 1.1em;
    margin-bottom: 15px;
    font-weight: bold;
}
.outline-list {
    list-style: none;
    counter-reset: outline-counter;
}
.outline-list > li {
    counter-increment: outline-counter;
    margin: 10px 0;
    padding: 8px 0 8px 35px;
    position: relative;
}
.outline-list > li::before {
    content: counter(outline-counter, upper-roman) ".";
    position: absolute;
    left: 0;
    font-weight: bold;
    color: #1a5f2a;
}
/* Lesson text */
.lesson-text {
    text-align: justify;
    margin-top: 20px;
}
.lesson-text p {
    margin-bottom: 15px;
    text-indent: 2em;
}
/* Footer */
.footer {
    text-align: center;
    padding: 20px;
    margin-top: 30px;
    color: #666;
    font-size: 0.9em;
    border-top: 1px solid #ddd;
}
/* Mobile responsive */
@media (max-width: 768px) {
    .content-wrapper {
        flex-direction: column;
    }
    .sidebar {
        width: 100%;
        position: static;
        max-height: none;
    }
}
"""

def normalize_title(title):
    """Normaliza título para uso em URLs."""
    return re.sub(r'[^\w\s-]', '', title).strip().lower().replace(' ', '-')

def extract_lessons(text):
    """Extrai lições do texto baseado em padrões."""
    lessons = []

    lesson_pattern = re.compile(r'L[IÍ]ÇÃO\s*(\d+)[:\s]*(.+?)(?=L[IÍ]ÇÃO\s*\d+|BIBLIOGRAFIA|GRADE)', re.IGNORECASE | re.DOTALL)
    outline_pattern = re.compile(r'ESBOÇO\s*DA\s*L[IÍ]ÇÃO', re.IGNORECASE)

    matches = list(lesson_pattern.finditer(text))

    for i, match in enumerate(matches):
        lesson_num = match.group(1).strip()
        lesson_title = match.group(2).strip().split('\n')[0].strip()

        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)

        lesson_text = text[start:end]

        has_outline = bool(outline_pattern.search(lesson_text[:500]))
        outline_items = []
        if has_outline:
            outline_section = lesson_text[:1500]
            outline_matches = re.findall(r'\n([IVX]+)\.\s*(.+?)(?=\n[IVX]+\.|\n\s*(?:TEXTO|BÍBLICO|REFERÊNCIA))', outline_section, re.IGNORECASE)
            for roman, title in outline_matches[:5]:
                outline_items.append({'num': roman, 'title': title.strip()})

        lessons.append({
            'number': lesson_num,
            'title': lesson_title,
            'has_outline': has_outline,
            'outline': outline_items
        })

    return lessons

def get_lesson_content(pdf_path, lesson_num):
    """Extrai conteúdo de uma lição específica do PDF."""
    text = extract_text(pdf_path, laparams=LAParams())
    return text

def parse_lesson_full(text, lesson_num):
    """Parse completo do conteúdo de uma lição."""
    lesson_pattern = re.compile(
        rf'L[IÍ]ÇÃO\s*{lesson_num}[:\s]*(.+?)(?=L[IÍ]ÇÃO\s*\d+|BIBLIOGRAFIA|GRADE)',
        re.IGNORECASE | re.DOTALL
    )
    match = lesson_pattern.search(text)
    if not match:
        return None

    content = match.group(0)

    outline_start = re.search(r'ESBOÇO\s*DA\s*L[IÍ]ÇÃO', content, re.IGNORECASE)
    if outline_start:
        content = content[:outline_start.start()] + content[outline_start.end():]

    paragraphs = []
    current_para = []

    for line in content.split('\n'):
        line = line.strip()
        if not line:
            if current_para:
                para_text = ' '.join(current_para)
                if para_text and len(para_text) > 30:
                    paragraphs.append(para_text)
                current_para = []
        else:
            if line.startswith('L') and 'LIÇÃO' in line:
                continue
            if re.match(r'^[IVX]+\.', line):
                continue
            current_para.append(line)

    if current_para:
        para_text = ' '.join(current_para)
        if para_text and len(para_text) > 30:
            paragraphs.append(para_text)

    paragraphs = [p for p in paragraphs if not re.match(r'^L[IÍ]ÇÃO\s*\d+', p)]
    paragraphs = [p for p in paragraphs if not re.match(r'^(FATESA|ANGELOLOGIA|.*?\s+-\s*\d{2}\s*$)', p)]

    return paragraphs

def generate_xhtml(discipline_key, discipline_name, lessons, pdf_path):
    """Gera XHTML completo com navegação."""

    discipline_lower = discipline_key.lower()
    discipline_dir = OUTPUT_DIR / discipline_lower
    discipline_dir.mkdir(exist_ok=True)

    outline_items_html = ""
    for i, lesson in enumerate(lessons):
        num = lesson['number']
        outline_items_html += f'<li><a href="{discipline_lower}-licao-{num.zfill(2)}.xhtml">{lesson["title"]}</a>'
        if lesson.get('outline'):
            outline_items_html += '<ul class="outline-menu">'
            for item in lesson['outline']:
                anchor = f"{discipline_lower}-licao-{num.zfill(2)}#{normalize_title(item['title'])}"
                outline_items_html += f'<li><a href="{anchor}">{item["num"]}. {item["title"]}</a></li>'
            outline_items_html += '</ul>'
        outline_items_html += '</li>\n'

    nav_items = ""
    for disc_key, disc_name in DISCIPLINE_NAMES.items():
        active_class = "active" if disc_key == discipline_lower else ""
        nav_items += f'<li><a href="../{disc_key}/{disc_key}.xhtml" class="{active_class}">{disc_name}</a></li>\n'

    full_xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>{discipline_name} - FATESA</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{discipline_name}</h1>
            <p class="subtitle">Curso Básico de Teologia - FATESA</p>
        </div>

        <nav class="nav">
            <p class="nav-title">Disciplinas:</p>
            <ul>
                {nav_items}
            </ul>
        </nav>

        <div class="content-wrapper">
            <aside class="sidebar">
                <p class="sidebar-title">Lições:</p>
                <ul class="lesson-list">
                    {outline_items_html}
                </ul>
            </aside>

            <main class="main-content">
                <div class="lesson-content">
                    <h2 class="lesson-title">{discipline_name}</h2>
                    <p>Selecione uma lição no menu ao lado para visualizar o conteúdo.</p>
                </div>
            </main>
        </div>

        <div class="footer">
            <p>FATESA - A Casa do Saber - Cursos de Teologia</p>
        </div>
    </div>
</body>
</html>'''

    with open(discipline_dir / f"{discipline_lower}.xhtml", 'w', encoding='utf-8') as f:
        f.write(full_xhtml)

    return discipline_dir / f"{discipline_lower}.xhtml"

def generate_lesson_xhtml(discipline_key, discipline_name, lesson, content_paragraphs, pdf_path):
    """Gera XHTML para uma lição específica."""

    discipline_lower = discipline_key.lower()
    lesson_dir = OUTPUT_DIR / discipline_lower
    lesson_dir.mkdir(exist_ok=True)

    lesson_num = lesson['number'].zfill(2)
    filename = f"{discipline_lower}-licao-{lesson_num}.xhtml"

    outline_items_html = ""
    for i, l in enumerate(lesson.get('outline', [])):
        anchor = f"{normalize_title(l['title'])}"
        outline_items_html += f'<li><a href="#{anchor}">{l["num"]}. {l["title"]}</a></li>\n'

    all_lessons_html = ""
    lessons_data = extract_lessons(get_lesson_content(pdf_path, lesson['number']))
    for l in lessons_data:
        active = "active" if l['number'] == lesson['number'] else ""
        all_lessons_html += f'<li><a href="{discipline_lower}-licao-{l["number"].zfill(2)}.xhtml" class="{active}">{l["title"]}</a></li>\n'

    nav_items = ""
    for disc_key, disc_name in DISCIPLINE_NAMES.items():
        active_class = "active" if disc_key == discipline_lower else ""
        nav_items += f'<li><a href="../{disc_key}/{disc_key}.xhtml" class="{active_class}">{disc_name}</a></li>\n'

    paragraphs_html = ""
    for para in content_paragraphs:
        escaped = para.replace('&', '&').replace('<', '<').replace('>', '>')
        paragraphs_html += f'<p>{escaped}</p>\n'

    full_xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>Lição {lesson["number"]} - {lesson["title"]} - {discipline_name}</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{discipline_name}</h1>
            <p class="subtitle">Lição {lesson["number"]}: {lesson["title"]}</p>
        </div>

        <nav class="nav">
            <p class="nav-title">Disciplinas:</p>
            <ul>
                {nav_items}
            </ul>
        </nav>

        <div class="content-wrapper">
            <aside class="sidebar">
                <p class="sidebar-title">Lições:</p>
                <ul class="lesson-list">
                    {all_lessons_html}
                </ul>
            </aside>

            <main class="main-content">
                <article class="lesson-content">
                    <h2 class="lesson-title">Lição {lesson["number"]}: {lesson["title"]}</h2>

                    {f'''<aside class="outline-section">
                        <h3 class="outline-title">Esboço da Lição</h3>
                        <ol class="outline-list">
                            {outline_items_html}
                        </ol>
                    </aside>''' if lesson.get('outline') else ''}

                    <div class="lesson-text">
                        {paragraphs_html}
                    </div>
                </article>
            </main>
        </div>

        <div class="footer">
            <p>FATESA - A Casa do Saber - Cursos de Teologia</p>
        </div>
    </div>
</body>
</html>'''

    with open(lesson_dir / filename, 'w', encoding='utf-8') as f:
        f.write(full_xhtml)

    return lesson_dir / filename

def generate_index():
    """Gera o índice principal com todas as disciplinas."""

    nav_items = ""
    for disc_key, disc_name in DISCIPLINE_NAMES.items():
        nav_items += f'<li><a href="{disc_key}/{disc_key}.xhtml">{disc_name}</a></li>\n'

    disciplines_html = ""
    for disc_key, disc_name in DISCIPLINE_NAMES.items():
        disciplines_html += f'''
        <li>
            <a href="{disc_key}/{disc_key}.xhtml">{disc_name}</a>
            <ul class="outline-menu">
                <li><a href="{disc_key}/{disc_key}.xhtml">Ver todas as lições</a></li>
            </ul>
        </li>'''

    index_xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>Curso Básico de Teologia - FATESA</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Curso Básico de Teologia</h1>
            <p class="subtitle">FATESA - A Casa do Saber</p>
        </div>

        <nav class="nav">
            <p class="nav-title">Disciplinas:</p>
            <ul>
                {nav_items}
            </ul>
        </nav>

        <div class="content-wrapper">
            <main class="main-content">
                <div class="lesson-content">
                    <h2 class="lesson-title">Disciplinas do Curso</h2>
                    <ul class="lesson-list" style="list-style: none;">
                        {disciplines_html}
                    </ul>
                </div>
            </main>
        </div>

        <div class="footer">
            <p>FATESA - A Casa do Saber - Cursos de Teologia</p>
        </div>
    </div>
</body>
</html>'''

    OUTPUT_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_DIR / "index.xhtml", 'w', encoding='utf-8') as f:
        f.write(index_xhtml)

    return OUTPUT_DIR / "index.xhtml"

def convert_all():
    """Converte todos os PDFs para XHTML."""

    OUTPUT_DIR.mkdir(exist_ok=True)

    print("Iniciando conversão...")

    disciplines_data = {}

    folders = [d for d in BASE_DIR.iterdir() if d.is_dir() and not d.name.startswith('_')]

    for folder in folders:
        disc_key = folder.name.lower()
        disc_name = DISCIPLINE_NAMES.get(disc_key, folder.name.replace('-', ' ').title())

        print(f"\nProcessando: {disc_name}...")

        pdfs = list(folder.glob("*.pdf"))
        if not pdfs:
            continue

        pdf_path = pdfs[0]
        print(f"  PDF: {pdf_path.name}")

        try:
            text = extract_text(str(pdf_path), laparams=LAParams())
            lessons = extract_lessons(text)
            print(f"  Lições encontradas: {len(lessons)}")

            if lessons:
                main_file = generate_xhtml(disc_key, disc_name, lessons, str(pdf_path))
                print(f"  Gerado: {main_file.name}")

                disciplines_data[disc_key] = {
                    'name': disc_name,
                    'lessons': []
                }

                for lesson in lessons:
                    paragraphs = parse_lesson_full(text, lesson['number'])
                    if paragraphs:
                        lesson_file = generate_lesson_xhtml(disc_key, disc_name, lesson, paragraphs, str(pdf_path))
                        disciplines_data[disc_key]['lessons'].append({
                            'number': lesson['number'],
                            'title': lesson['title'],
                            'outline': lesson.get('outline', []),
                            'file': f"{disc_key}-licao-{lesson['number'].zfill(2)}.xhtml"
                        })
                        print(f"    Lição {lesson['number']}: {lesson_file.name}")

        except Exception as e:
            print(f"  Erro: {e}")
            import traceback
            traceback.print_exc()

    index_file = generate_index()
    print(f"\nÍndice gerado: {index_file}")

    with open(DISCIPLINES_FILE, 'w', encoding='utf-8') as f:
        json.dump(disciplines_data, f, ensure_ascii=False, indent=2)
    print(f"Dados das disciplinas: {DISCIPLINES_FILE}")

    print("\n=== Conversão concluída! ===")
    print(f"Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    convert_all()