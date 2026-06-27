#!/usr/bin/env python3
"""Conversor robusto para PDFs FATESA."""

import re
from pathlib import Path
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import pickle

BASE_DIR = Path(r"C:\Users\edino\OneDrive\Área de Trabalho\Arquivos\Arquivos")
OUTPUT_DIR = Path(r"C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\output")
CACHE_FILE = OUTPUT_DIR / "text_cache.pkl"

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
body { font-family: Georgia, serif; line-height: 1.6; color: #333; background: #f5f5f5; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; background: #fff; min-height: 100vh; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
.header { background: linear-gradient(135deg, #1a5f2a, #2e7d46); color: white; padding: 30px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
.header h1 { font-size: 1.8em; margin-bottom: 10px; }
.header .subtitle { font-style: italic; opacity: 0.9; }
.nav { background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
.nav-title { font-weight: bold; margin-bottom: 10px; color: #1a5f2a; }
.nav ul { list-style: none; display: flex; flex-wrap: wrap; gap: 5px; }
.nav a { display: block; padding: 8px 15px; background: #e9ecef; color: #333; text-decoration: none; border-radius: 4px; font-size: 0.9em; }
.nav a:hover, .nav a.active { background: #1a5f2a; color: white; }
.content-wrapper { display: flex; gap: 20px; }
.sidebar { width: 280px; flex-shrink: 0; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 15px; max-height: 80vh; overflow-y: auto; position: sticky; top: 20px; }
.sidebar-title { font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #1a5f2a; color: #1a5f2a; }
.lesson-list { list-style: none; }
.lesson-list > li { margin-bottom: 5px; }
.lesson-list a { display: block; padding: 8px 10px; color: #333; text-decoration: none; border-radius: 4px; font-size: 0.9em; }
.lesson-list a:hover, .lesson-list a.active { background: #1a5f2a; color: white; }
.main-content { flex: 1; min-width: 0; }
.lesson-content { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 30px; }
.lesson-title { color: #1a5f2a; font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #1a5f2a; }
.lesson-text { text-align: justify; margin-top: 20px; }
.lesson-text pre { white-space: pre-wrap; font-family: Georgia, serif; }
.footer { text-align: center; padding: 20px; margin-top: 30px; color: #666; font-size: 0.9em; border-top: 1px solid #ddd; }
@media (max-width: 768px) { .content-wrapper { flex-direction: column; } .sidebar { width: 100%; position: static; max-height: none; } }
"""

def get_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'rb') as f:
            return pickle.load(f)
    return {}

def save_cache(cache):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, 'wb') as f:
        pickle.dump(cache, f)

def get_text(pdf_path, cache):
    if pdf_path in cache:
        return cache[pdf_path]
    print(f"    Extraindo: {Path(pdf_path).name}")
    text = extract_text(pdf_path, laparams=LAParams())
    cache[pdf_path] = text
    save_cache(cache)
    return text

def extract_num_from_filename(filename):
    """Extrai número da lição do nome do arquivo."""
    match = re.search(r'licao[k]?\s*(\d+)', filename, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r'li[cç][aã]o\s*(\d+)', filename, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r'(\d+)', filename)
    if match:
        return match.group(1).strip()
    return None

def extract_lesson_title(text, fallback_num):
    """Tenta extrair título da primeira página do texto."""
    lines = text.split('\n')[:30]
    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
        if re.match(r'^[IVX]+\.', line):
            continue
        if any(x in line.upper() for x in ['FATESA', 'CURSO', 'LIVRO', 'PÁGINA', 'PAGINA', '----']):
            continue
        if 'LICAO' in line.upper() or 'LIÇÃO' in line.upper() or 'LIGÃO' in line.upper():
            match = re.search(r'L[IÍ]C[ÄÅA]O\s*(\d+)', line, re.IGNORECASE)
            if match:
                return f"Lição {match.group(1)}"
        return line[:80] if len(line) > 80 else line
    return f"Lição {fallback_num}"

def extract_lessons_from_text(text):
    """Extrai lições do texto整体."""
    lessons = []
    patterns = [
        r'L[IÍ]C[ÄÅ]O\s*(\d+)[:\s]*(.+?)(?=L[IÍ]C[ÄÅ]O\s*\d+|BIBLIOGRAFIA|GRADE|$)',
        r'LI[CÇ][AÃ]O\s*(\d+)[:\s]*(.+?)(?=LI[CÇ][AÃ]O\s*\d+|BIBLIOGRAFIA|GRADE|$)',
        r'LICEN\s*(\d+)',
        r'LIGÃO\s*(\d+)',
    ]
    for pattern in patterns:
        matches = list(re.finditer(pattern, text, re.IGNORECASE | re.DOTALL))
        if matches:
            for m in matches:
                num = m.group(1).strip()
                title = m.group(2).strip().split('\n')[0].strip() if m.lastindex >= 2 else f"Lição {num}"
                title = title[:100] if title else f"Lição {num}"
                lessons.append({'number': num, 'title': title})
            break
    return lessons

def generate_discipline_xhtml(disc_key, disc_name, lessons):
    disc_dir = OUTPUT_DIR / disc_key
    disc_dir.mkdir(parents=True, exist_ok=True)
    nav = "".join(f'<li><a href="../{k}/{k}.xhtml">{v}</a></li>' for k, v in sorted(DISCIPLINE_NAMES.items()))
    links = "".join(f'<li><a href="{disc_key}-licao-{l["number"].zfill(2)}.xhtml">{l["title"]}</a></li>' for l in lessons)
    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>{disc_name}</title><style type="text/css">{CSS}</style></head>
<body><div class="container">
<div class="header"><h1>{disc_name}</h1><p class="subtitle">Curso Básico de Teologia - FATESA</p></div>
<nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav}</ul></nav>
<div class="content-wrapper">
<aside class="sidebar"><p class="sidebar-title">Lições:</p><ul class="lesson-list">{links}</ul></aside>
<main class="main-content"><div class="lesson-content"><h2 class="lesson-title">{disc_name}</h2><p>Selecione uma lição no menu.</p></div></main>
</div><div class="footer"><p>FATESA - A Casa do Saber</p></div>
</div></body></html>'''
    with open(disc_dir / f"{disc_key}.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def generate_lesson_xhtml(disc_key, disc_name, lesson, content):
    disc_dir = OUTPUT_DIR / disc_key
    disc_dir.mkdir(parents=True, exist_ok=True)
    num = lesson['number'].zfill(2)
    nav = "".join(f'<li><a href="../{k}/{k}.xhtml" class="{"active" if k == disc_key else ""}">{v}</a></li>' for k, v in sorted(DISCIPLINE_NAMES.items()))
    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>Lição {lesson['number']} - {disc_name}</title><style type="text/css">{CSS}</style></head>
<body><div class="container">
<div class="header"><h1>{disc_name}</h1><p class="subtitle">Lição {lesson['number']}: {lesson['title']}</p></div>
<nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav}</ul></nav>
<div class="content-wrapper">
<aside class="sidebar"><p class="sidebar-title">Lições:</p><ul class="lesson-list"><li><a href="{disc_key}.xhtml">{disc_name}</a></li></ul></aside>
<main class="main-content"><article class="lesson-content">
<h2 class="lesson-title">Lição {lesson['number']}: {lesson['title']}</h2>
<div class="lesson-text"><pre style="white-space: pre-wrap; font-family: Georgia, serif;">{content[:15000]}</pre></div>
</article></main>
</div><div class="footer"><p>FATESA - A Casa do Saber</p></div>
</div></body></html>'''
    with open(disc_dir / f"{disc_key}-licao-{num}.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def generate_index():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    nav = "".join(f'<li><a href="{k}/{k}.xhtml">{v}</a></li>' for k, v in sorted(DISCIPLINE_NAMES.items()))
    items = "".join(f'<li><a href="{k}/{k}.xhtml">{v}</a></li>' for k, v in sorted(DISCIPLINE_NAMES.items()))
    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>Curso de Teologia - FATESA</title><style type="text/css">{CSS}</style></head>
<body><div class="container">
<div class="header"><h1>Curso Básico de Teologia</h1><p class="subtitle">FATESA - A Casa do Saber</p></div>
<nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav}</ul></nav>
<div class="content-wrapper">
<main class="main-content"><div class="lesson-content">
<h2 class="lesson-title">Disciplinas do Curso</h2>
<ul class="lesson-list">{items}</ul>
</div></main>
</div><div class="footer"><p>FATESA - A Casa do Saber</p></div>
</div></body></html>'''
    with open(OUTPUT_DIR / "index.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def process_folder(folder):
    """Processa uma pasta de disciplina."""
    disc_key = folder.name.lower()
    disc_name = DISCIPLINE_NAMES.get(disc_key, folder.name.replace('-', ' ').title())

    pdfs = sorted([p for p in folder.glob("*.pdf") if 'panorama' not in p.name.lower()])

    if not pdfs:
        print(f"  Nenhum PDF encontrado")
        return

    if len(pdfs) >= 10 and any('licao' in p.name.lower() or 'liçao' in p.name.lower() or 'lião' in p.name.lower() for p in pdfs):
        print(f"  {len(pdfs)} PDFs - modo múltiplos")
        process_multi_pdf(folder, disc_key, disc_name, pdfs)
    else:
        print(f"  1 PDF principal")
        process_single_pdf(folder, disc_key, disc_name, pdfs)

def process_multi_pdf(folder, disc_key, disc_name, pdfs):
    """Processa quando há vários PDFs (um por lição)."""
    cache = get_cache()
    lessons = []

    for pdf in pdfs:
        num = extract_num_from_filename(pdf.name)
        if not num:
            continue
        text = get_text(str(pdf), cache)
        title = extract_lesson_title(text, num)
        lessons.append({'number': num, 'title': title, 'pdf': str(pdf)})

    lessons.sort(key=lambda x: x['number'])
    lessons = lessons[:20]

    if lessons:
        generate_discipline_xhtml(disc_key, disc_name, lessons)
        print(f"  {len(lessons)} lições detectadas")

        for lesson in lessons:
            text = get_text(lesson['pdf'], cache)
            generate_lesson_xhtml(disc_key, disc_name, lesson, text)
            print(f"    {lesson['title']}")

def process_single_pdf(folder, disc_key, disc_name, pdfs):
    """Processa quando há um PDF com todas as lições."""
    cache = get_cache()
    pdf_path = pdfs[0]
    text = get_text(str(pdf_path), cache)
    lessons = extract_lessons_from_text(text)

    if not lessons:
        num = extract_num_from_filename(pdf_path.name) or "1"
        lessons = [{'number': num, 'title': f"Lição {num}"}]
        print(f"  Nenhuma lição detectada, usando {num}")

    if lessons:
        generate_discipline_xhtml(disc_key, disc_name, lessons)
        print(f"  {len(lessons)} lições detectadas")

        for lesson in lessons:
            generate_lesson_xhtml(disc_key, disc_name, lesson, text)
            print(f"    {lesson['title']}")

def main():
    print("Iniciando conversão...")
    folders = sorted([d for d in BASE_DIR.iterdir() if d.is_dir() and not d.name.startswith('_')])

    for folder in folders:
        disc_key = folder.name.lower()
        disc_name = DISCIPLINE_NAMES.get(disc_key, folder.name.replace('-', ' ').title())
        print(f"\n{disc_name}...")

        try:
            process_folder(folder)
        except Exception as e:
            print(f"  Erro: {e}")

    generate_index()
    print("\nConcluído!")

if __name__ == "__main__":
    main()