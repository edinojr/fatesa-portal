import os
import re

def expand_biblical_abbreviations(text):
    abbreviations = {
        'Gn': 'Gênesis', 'Ex': 'Êxodo', 'Lv': 'Levítico', 'Nm': 'Números', 'Dt': 'Deuteronômio',
        'Js': 'Josué', 'Jz': 'Juízes', 'Rt': 'Rute', '1 Sm': '1 Samuel', '2 Sm': '2 Samuel',
        '1 Kgs': '1 Reis', '2 Kgs': '2 Reis', '1 Cr': '1 Crônicas', '2 Cr': '2 Crônicas',
        'Ed': 'Esdras', 'Ne': 'Neemias', 'Est': 'Ester', 'Is': 'Isaías', 'Jr': 'Jeremias',
        'Lm': 'Lamentações', 'Ez': 'Ezequiel', 'Dn': 'Daniel', 'Os': 'Oseias', 'Jl': 'Joel',
        'Am': 'Amós', 'Ob': 'Obadias', 'Jn': 'Jonas', 'Mi': 'Miqueias', 'Na': 'Naum',
        'Hab': 'Habacuque', 'Zc': 'Zacarias', 'Hg': 'Ageu', 'Ml': 'Malaquias',
        'Mt': 'Mateus', 'Mc': 'Marcos', 'Lc': 'Lucas', 'Jo': 'João', 'At': 'Atos',
        'Rm': 'Romanos', '1 Co': '1 Coríntios', '2 Co': '2 Coríntios', 'Gl': 'Gálatas',
        'Ef': 'Efésios', 'Fp': 'Filipenses', 'Cl': 'Colossenses', '1 Ts': '1 Tessalonicenses',
        '2 Ts': '2 Tessalonicenses', '1 Tm': '1 Timóteo', '2 Tm': '2 Timóteo', 'Tt': 'Tito',
        'Fm': 'Filemom', 'Hb': 'Hebreus', 'Tg': 'Tiago', '1 Pe': '1 Pedro', '2 Pe': '2 Pedro',
        '1 Jo': '1 João', '2 Jo': '2 João', '3 Jo': '3 João', 'Jd': 'Judas', 'Ap': 'Apocalipse',
        'Sl': 'Salmos', 'Ec': 'Eclesiastes', 'Ct': 'Cânticos'
    }
    
    # Handle Timóteo specifically as per rules
    def replace_tm(match):
        full_match = match.group(0)
        chapter = match.group(1)
        if chapter and int(chapter) > 4:
            return '1 Timóteo ' + chapter
        return 'Timóteo ' + (chapter if chapter else '')

    text = re.sub(r'\bTm\s*(\d+)?\b', replace_tm, text)
    
    for abbr, full in abbreviations.items():
        # Match abbreviation followed by optional dot or space
        text = re.sub(rf'\b{re.escape(abbr)}\b\.?', full, text)
        
    return text

def wrap_biblical_references(text):
    books = [
        'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', 
        '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 
        'Neemias', 'Ester', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 
        'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 
        'Zacarias', 'Ageu', 'Malaquias', 'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 
        'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 
        'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 
        'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', 
        '3 João', 'Judas', 'Apocalipse', 'Salmos', 'Eclesiastes', 'Cânticos'
    ]
    books.sort(key=len, reverse=True)
    books_pattern = '|'.join(map(re.escape, books))
    pattern = rf'\b({books_pattern})\s+(\d+):(\d+)(?:-(\d+))?\b'
    def replace_ref(match):
        full_ref = match.group(0)
        return f'<span class="biblical-ref" onclick="showBiblicalPopup(this)">{full_ref}</span>'
    return re.sub(pattern, replace_ref, text)

def refactor_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. FIX MOJIBAKE (everywhere)
    replacements = {
        'â€œ': '“', 'â€': '”', 'â€™': '’', 'â€“': '–', 'â€”': '—',
        'Ã\x81': 'á', 'Ã\x82': 'â', 'Ã\x83': 'ã', 'Ã\x84': 'ä', 'Ã\x80': 'à',
        'Ã\x85': 'é', 'Ã\x86': 'ê', 'Ã\x87': 'ë', 'Ã\x88': 'í', 'Ã\x89': 'î', 'Ã\x8A': 'ï',
        'Ã\x8B': 'ó', 'Ã\x8C': 'ô', 'Ã\x8D': 'õ', 'Ã\x8E': 'ö', 'Ã\x8F': 'ú', 'Ã\x90': 'û', 'Ã\x91': 'ü',
        'Ã\x92': 'ý', 'Ã\x93': 'ÿ', 'Ã\x80': 'Á', 'Ã\x81': 'Â', 'Ã\x82': 'Ã', 'Ã\x83': 'Ä', 'Ã\x80': 'À',
        'Ã\x84': 'É', 'Ã\x85': 'Ê', 'Ã\x86': 'Ë', 'Ã\x87': 'Í', 'Ã\x88': 'Î', 'Ã\x89': 'Ï',
        'Ã\x8A': 'Ó', 'Ã\x8B': 'Ô', 'Ã\x8C': 'Õ', 'Ã\x8D': 'Ö', 'Ã\x8E': 'Ú', 'Ã\x8F': 'Û', 'Ã\x90': 'Ü',
        'Ã\x91': 'Ý', 'Ã\x92': 'Ÿ', 'Ã\x87': 'Ç', 'Ã\x83': 'ç',
        'ééo': 'ação', 'paixées': 'paixões', 'naéées': 'nações', 'préprios': 'próprios', 'lé': 'lá', 'frutéferos': 'frutíferos',
        'geraação': 'geração', 'seréo': 'serão', 'justiéa': 'justiça', 'graéa': 'graça', 'redenação': 'redenção', 
        'esperanéa': 'esperança', 'iniqéidade': 'iniquidade', 'esté': 'está', 'péo': 'pão', 'viveré': 'viverá',
        'coraação': 'coração', 'émpio': 'ímpio', 'véo': 'vão', 'ééo': 'ação'
    }
    for old, new in replacements.items():
        content = content.replace(old, new)

    # 2. CLEANUP existing structural tags, images, and biblical refs
    content = re.sub(r'<ImageSection\s+[^>]*/>', '', content)
    content = re.sub(r'<PopUp\s+[^>]*>', '', content)
    content = re.sub(r'</PopUp>', '', content)
    content = re.sub(r'<svg[^>]*>.*?</svg>', '', content, flags=re.DOTALL)
    content = re.sub(r'<img[^>]*>', '', content)
    
    # Remove all biblical-ref spans and their closing tags to avoid nesting
    while '<span class="biblical-ref"' in content:
        content = re.sub(r'<span class="biblical-ref"[^>]*>(.*?)</span>', r'\1', content, flags=re.DOTALL)
    
    content = re.sub(r'<div style="text-align: left; margin-bottom: [^"]*">\s*</div>', '', content)
    content = re.sub(r'<p>\s*</p>', '', content)

    # 3. INJECT CSS
    css_rules = (
        '\n  .popup-window { background-color: #fff !important; color: #333 !important; border: 1px solid #e5e7eb; }\n'
        '  .popup-overlay { background-color: rgba(0,0,0,0.5); }\n'
        '  .biblical-ref { color: #2563eb; text-decoration: underline dotted; cursor: pointer; }\n'
        '  .biblical-ref:hover { color: #1d4ed8; }\n'
    )
    # Remove old CSS to prevent duplicates
    content = content.replace('.popup-window { background-color: #fff !important; color: #333 !important; border: 1px solid #e5e7eb; }', '')
    content = content.replace('.popup-overlay { background-color: rgba(0,0,0,0.5); }', '')
    content = content.replace('.biblical-ref { color: #2563eb; text-decoration: underline dotted; cursor: pointer; }', '')
    content = content.replace('.biblical-ref:hover { color: #1d4ed8; }', '')
    
    if '<style>' in content:
        content = re.sub(r'(<style.*?>)', r'\1' + css_rules, content, count=1)

    # 4. ImageSection Placement (Artistic Classical Style)
    def replace_with_image_section(match):
        full_header = match.group(1)
        roman_num = match.group(2)
        title = match.group(3).strip()
        
        # Create a prompt based on classical art, colors, and light
        visual_prompt = (
            f"Classical oil painting, baroque style, dramatic lighting, chiaroscuro, "
            f"rich classical colors, highly detailed, artistic representation of {title}, "
            f"museum quality, spiritual atmosphere, cinematic composition"
        )
        
        # Encode prompt for URL
        import urllib.parse
        encoded_prompt = urllib.parse.quote(visual_prompt)
        img_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=400&nologo=true"
        
        # Place image ABOVE the header
        return f'<img src="{img_url}" alt="{title}" class="lesson-art-image" style="width: 100%; max-width: 800px; height: auto; border-radius: 16px; margin: 1.5rem 0; display: block; margin-left: auto; margin-right: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" />\n{full_header}'

    # Match headers like <h2>TEXTO I - Title</h2> or <h3>TEXTO II - Title</h3>
    content = re.sub(
        r'(<h[1-6].*?>TEXTO\s+([IVXLCDM]+)\s+-\s+(.*?)</h[1-6]>)', 
        replace_with_image_section, 
        content, 
        flags=re.IGNORECASE
    )

    # 5. Expand Biblical Abbreviations and Wrap References in visible text
    parts = re.split(r'(<[^>]+>)', content)
    for i in range(len(parts)):
        if not parts[i].startswith('<'):
            # Expand abbreviations first
            parts[i] = expand_biblical_abbreviations(parts[i])
            # Then wrap biblical references
            parts[i] = wrap_biblical_references(parts[i])
    content = "".join(parts)

    # 6. First Occurrence PopUps
    theology_terms = [
        'Teologia Prática', 'Sustentador', 'Mordomo', 'Primazia', 'Soberania', 
        'Imortal', 'Criador', 'Redenção', 'Eternidade'
    ]
    
    parts = re.split(r'(<[^>]+>)', content)
    found_terms = set()
    for i in range(len(parts)):
        if not parts[i].startswith('<'):
            for term in theology_terms:
                if term not in found_terms:
                    if term in parts[i]:
                        parts[i] = parts[i].replace(term, f'<PopUp trigger="{term}" type="theology">{term}</PopUp>', 1)
                        found_terms.add(term)
    content = "".join(parts)

    # 7. Inject JS for Biblical Popups
    # Remove all existing showBiblicalPopup functions by matching until the next function or end of script
    content = re.sub(r'async function showBiblicalPopup[\s\S]*?(?=function showPopup|$)', '', content)
    
    js_code = (
        '\n        async function showBiblicalPopup(element) {\n'
        '            const ref = element.innerText;\n'
        '            const contentDiv = document.getElementById("popup-content");\n'
        '            const overlay = document.getElementById("overlay");\n'
        '            const popup = document.getElementById("popup");\n'
        '            contentDiv.innerText = "Carregando...";\n'
        '            overlay.style.display = "block";\n'
        '            popup.style.display = "block";\n'
        '            try {\n'
        '                const response = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=almeida`);\n'
        '                const data = await response.json();\n'
        '                contentDiv.innerText = data.text || "Versículo não encontrado.";\n'
        '            } catch (error) {\n'
        '                contentDiv.innerText = "Erro ao carregar o versículo.";\n'
        '            }\n'
        '        }\n'
    )
    if '<script>' in content:
        content = re.sub(r'(<script.*?>)', r'\1' + js_code, content, count=1)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    root_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.html'):
                refactor_html(os.path.join(root, file))
