#!/usr/bin/env python3
"""Versão rápida do conversor - usa cache para evitar re-extração."""

import re
import os
from pathlib import Path
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import json
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
.nav a { display: block; padding: 8px 15px; background: #e9ecef; color: #333; text-decoration: none; border-radius: 4px; font-size: 0.9em; transition: all 0.2s; }
.nav a:hover, .nav a.active { background: #1a5f2a; color: white; }
.content-wrapper { display: flex; gap: 20px; }
.sidebar { width: 280px; flex-shrink: 0; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 15px; max-height: 80vh; overflow-y: auto; position: sticky; top: 20px; }
.sidebar-title { font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #1a5f2a; color: #1a5f2a; }
.lesson-list { list-style: none; }
.lesson-list > li { margin-bottom: 5px; }
.lesson-list a { display: block; padding: 8px 10px; color: #333; text-decoration: none; border-radius: 4px; font-size: 0.9em; }
.lesson-list a:hover, .lesson-list a.active { background: #1a5f2a; color: white; }
.outline-menu { list-style: none; margin-left: 15px; border-left: 2px solid #ddd; padding-left: 10px; }
.outline-menu li { margin: 3px 0; }
.outline-menu a { font-size: 0.8em; color: #666; padding: 4px 8px; }
.outline-menu a:hover { color: #1a5f2a; background: #e8f5e9; }
.main-content { flex: 1; min-width: 0; }
.lesson-content { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 30px; }
.lesson-title { color: #1a5f2a; font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #1a5f2a; }
.outline-section { background: #f0f7f1; border: 1px solid #c8e6c9; border-radius: 5px; padding: 20px; margin: 20px 0; }
.outline-title { color: #1a5f2a; font-size: 1.1em; margin-bottom: 15px; font-weight: bold; }
.outline-list { list-style: none; counter-reset: outline-counter; }
.outline-list > li { counter-increment: outline-counter; margin: 10px 0; padding: 8px 0 8px 35px; position: relative; }
.outline-list > li::before { content: counter(outline-counter, upper-roman) "."; position: absolute; left: 0; font-weight: bold; color: #1a5f2a; }
.lesson-text { text-align: justify; margin-top: 20px; }
.lesson-text p { margin-bottom: 15px; text-indent: 2em; }
.footer { text-align: center; padding: 20px; margin-top: 30px; color: #666; font-size: 0.9em; border-top: 1px solid #ddd; }
@media (max-width: 768px) { .content-wrapper { flex-direction: column; } .sidebar { width: 100%; position: static; max-height: none; } }
"""

def normalize_title(title):
    return re.sub(r'[^\w\s-]', '', title).strip().lower().replace(' ', '-')

def extract_lessons(text):
    lessons = []
    lesson_pattern = re.compile(r'L[IÍ]ÇÃO\s*(\d+)[:\s]*(.+?)(?=L[IÍ]ÇÃO\s*\d+|BIBLIOGRAFIA|GRADE|$)', re.IGNORECASE | re.DOTALL)
    matches = list(lesson_pattern.finditer(text))

    for i, match in enumerate(matches):
        lesson_num = match.group(1).strip()
        lesson_title = match.group(2).strip().split('\n')[0].strip()
        lessons.append({'number': lesson_num, 'title': lesson_title, 'outline': []})
    return lessons

def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'rb') as f:
            return pickle.load(f)
    return {}

def save_cache(cache):
    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    with open(CACHE_FILE, 'wb') as f:
        pickle.dump(cache, f)

def get_text(pdf_path, cache):
    if pdf_path in cache:
        return cache[pdf_path]
    text = extract_text(pdf_path, laparams=LAParams())
    cache[pdf_path] = text
    save_cache(cache)
    return text

def generate_discipline_xhtml(disc_key, disc_name, lessons):
    discipline_dir = OUTPUT_DIR / disc_key
    discipline_dir.mkdir(exist_ok=True)

    nav_items = "".join(f'<li><a href="../{k}/{k}.xhtml">{v}</a></li>' for k, v in DISCIPLINE_NAMES.items())

    lesson_links = ""
    for lesson in lessons:
        num = lesson['number'].zfill(2)
        lesson_links += f'<li><a href="{disc_key}-licao-{num}.xhtml">{lesson["title"]}</a></li>\n'

    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>{disc_name}</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>{disc_name}</h1><p class="subtitle">Curso Básico de Teologia - FATESA</p></div>
        <nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav_items}</ul></nav>
        <div class="content-wrapper">
            <aside class="sidebar">
                <p class="sidebar-title">Lições:</p>
                <ul class="lesson-list">{lesson_links}</ul>
            </aside>
            <main class="main-content"><div class="lesson-content"><h2 class="lesson-title">{disc_name}</h2><p>Selecione uma lição no menu.</p></div></main>
        </div>
        <div class="footer"><p>FATESA - A Casa do Saber</p></div>
    </div>
</body>
</html>'''
    with open(discipline_dir / f"{disc_key}.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def generate_lesson_xhtml(disc_key, disc_name, lesson, content_text):
    discipline_dir = OUTPUT_DIR / disc_key
    discipline_dir.mkdir(exist_ok=True)
    num = lesson['number'].zfill(2)

    nav_items = "".join(f'<li><a href="../{k}/{k}.xhtml" class="{"active" if k == disc_key else ""}">{v}</a></li>' for k, v in DISCIPLINE_NAMES.items())

    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>Lição {lesson['number']} - {disc_name}</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>{disc_name}</h1><p class="subtitle">Lição {lesson['number']}: {lesson['title']}</p></div>
        <nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav_items}</ul></nav>
        <div class="content-wrapper">
            <aside class="sidebar">
                <p class="sidebar-title">Lições:</p>
                <ul class="lesson-list">
                    <li><a href="{disc_key}.xhtml">{disc_name}</a></li>
                </ul>
            </aside>
            <main class="main-content">
                <article class="lesson-content">
                    <h2 class="lesson-title">Lição {lesson['number']}: {lesson['title']}</h2>
                    <div class="lesson-text"><pre style="white-space: pre-wrap; font-family: Georgia, serif;">{content_text}</pre></div>
                </article>
            </main>
        </div>
        <div class="footer"><p>FATESA - A Casa do Saber</p></div>
    </div>
</body>
</html>'''
    with open(discipline_dir / f"{disc_key}-licao-{num}.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def generate_index():
    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    nav_items = "".join(f'<li><a href="{k}/{k}.xhtml">{v}</a></li>' for k, v in DISCIPLINE_NAMES.items())

    xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>Curso de Teologia - FATESA</title>
    <style type="text/css">{CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>Curso Básico de Teologia</h1><p class="subtitle">FATESA - A Casa do Saber</p></div>
        <nav class="nav"><p class="nav-title">Disciplinas:</p><ul>{nav_items}</ul></nav>
        <div class="content-wrapper">
            <main class="main-content">
                <div class="lesson-content">
                    <h2 class="lesson-title">Disciplinas do Curso</h2>
                    <ul class="lesson-list">
                        {"".join(f'<li><a href="{k}/{k}.xhtml">{v}</a></li>' for k, v in DISCIPLINE_NAMES.items())}
                    </ul>
                </div>
            </main>
        </div>
        <div class="footer"><p>FATESA - A Casa do Saber</p></div>
    </div>
</body>
</html>'''
    with open(OUTPUT_DIR / "index.xhtml", 'w', encoding='utf-8') as f:
        f.write(xhtml)

def convert_all():
    print("Iniciando conversão...")
    cache = load_cache()

    folders = sorted([d for d in BASE_DIR.iterdir() if d.is_dir() and not d.name.startswith('_')])

    for folder in folders:
        disc_key = folder.name.lower()
        disc_name = DISCIPLINE_NAMES.get(disc_key, folder.name.replace('-', ' ').title())
        print(f"\n{disc_name}...")

        pdfs = list(folder.glob("*.pdf"))
        if not pdfs:
            print("  Nenhum PDF encontrado")
            continue

        try:
            text = get_text(str(pdfs[0]), cache)
            lessons = extract_lessons(text)
            print(f"  {len(lessons)} lições")

            generate_discipline_xhtml(disc_key, disc_name, lessons)

            for lesson in lessons:
                content = text
                generate_lesson_xhtml(disc_key, disc_name, lesson, content[:5000])
                print(f"    Lição {lesson['number']}")

            save_cache(cache)

        except Exception as e:
            print(f"  Erro: {e}")

    generate_index()
    print("\nConcluído!")

if __name__ == "__main__":
    convert_all()