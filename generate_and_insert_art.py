import os
import re
import html

def escape_xml(text):
    return html.escape(text)


def get_palette(topic_number):
    classical_palettes = {
        'I':     {'bg1': '#1a0f0a', 'bg2': '#2d1810', 'bg3': '#4a2c1a', 'accent': '#c9a86c', 'gold': '#d4af37', 'text': '#f5e6c8', 'frame': '#8b6914', 'shadow': '#0d0705'},
        'II':    {'bg1': '#0a1a2d', 'bg2': '#102840', 'bg3': '#1a3a5c', 'accent': '#7ba3c9', 'gold': '#c9a86c', 'text': '#e8f0f8', 'frame': '#4a6a8a', 'shadow': '#050d15'},
        'III':   {'bg1': '#2d1a0a', 'bg2': '#402810', 'bg3': '#5c3a1a', 'accent': '#c9a86c', 'gold': '#d4af37', 'text': '#f5e6c8', 'frame': '#8b6914', 'shadow': '#150d05'},
        'IV':    {'bg1': '#1a0a2d', 'bg2': '#281040', 'bg3': '#3a1a5c', 'accent': '#a87bc9', 'gold': '#d4af37', 'text': '#f0e8f8', 'frame': '#6a4a8a', 'shadow': '#0d0515'},
        'V':     {'bg1': '#2d0a0a', 'bg2': '#401010', 'bg3': '#5c1a1a', 'accent': '#c97b7b', 'gold': '#d4af37', 'text': '#f8e8e8', 'frame': '#8a4a4a', 'shadow': '#150505'},
        'VI':    {'bg1': '#0a2d1a', 'bg2': '#104028', 'bg3': '#1a5c3a', 'accent': '#7bc9a8', 'gold': '#d4af37', 'text': '#e8f8f0', 'frame': '#4a8a6a', 'shadow': '#05150d'},
        'VII':   {'bg1': '#2d2d0a', 'bg2': '#404010', 'bg3': '#5c5c1a', 'accent': '#c9c97b', 'gold': '#d4af37', 'text': '#f8f8e8', 'frame': '#8a8a4a', 'shadow': '#151505'},
        'VIII':  {'bg1': '#1a1a2d', 'bg2': '#282840', 'bg3': '#3a3a5c', 'accent': '#7b7bc9', 'gold': '#d4af37', 'text': '#e8e8f8', 'frame': '#4a4a8a', 'shadow': '#0d0d15'},
    }
    # For numbers above VIII, cycle through
    roman_nums = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
    key = roman_nums[(roman_nums.index(topic_number) % 8)] if topic_number in roman_nums else 'I'
    return classical_palettes.get(key, classical_palettes['I'])


def generate_medieval_svg(topic_number, topic_title):
    clean_title = topic_title.strip()
    palette = get_palette(topic_number)

    max_chars_per_line = 35
    words = clean_title.split()
    lines = []
    current_line = ""
    for word in words:
        if len(current_line) + len(word) + 1 <= max_chars_per_line:
            current_line += (" " if current_line else "") + word
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    if len(lines) > 3:
        lines = lines[:3]
        lines[-1] = lines[-1][:32] + "..."

    text_y_start = 140
    line_height = 36

    svg = f'''<div class="topic-art-wrapper" style="text-align: left; margin: 1.5rem 0 2rem 0; float: left; margin-right: 2rem; max-width: 500px; width: 100%;">
<svg width="500" height="280" viewBox="0 0 500 280" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto; display: block; border-radius: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
  <defs>
    <radialGradient id="bgRadial_{topic_number}" cx="30%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:{palette['bg3']};stop-opacity:1" />
      <stop offset="50%" style="stop-color:{palette['bg2']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{palette['bg1']};stop-opacity:1" />
    </radialGradient>
    <linearGradient id="goldFrame_{topic_number}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1" />
      <stop offset="25%" style="stop-color:#f4e4bc;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#c9a86c;stop-opacity:1" />
      <stop offset="75%" style="stop-color:#f4e4bc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
    </linearGradient>
    <filter id="oilTexture_{topic_number}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="2" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <radialGradient id="vignette_{topic_number}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:transparent;stop-opacity:0" />
      <stop offset="70%" style="stop-color:transparent;stop-opacity:0" />
      <stop offset="100%" style="stop-color:{palette['shadow']};stop-opacity:0.7" />
    </radialGradient>
    <pattern id="brushstroke_{topic_number}" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="{palette['bg2']}"/>
      <rect x="0" y="0" width="2" height="2" fill="{palette['bg3']}" opacity="0.3"/>
      <rect x="2" y="2" width="2" height="2" fill="{palette['bg1']}" opacity="0.3"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="500" height="280" fill="url(#goldFrame_{topic_number})" rx="4"/>
  <rect x="6" y="6" width="488" height="268" fill="{palette['shadow']}" rx="2" opacity="0.5"/>
  <rect x="10" y="10" width="480" height="260" fill="url(#bgRadial_{topic_number})" rx="2"/>
  <rect x="10" y="10" width="480" height="260" fill="url(#brushstroke_{topic_number})" rx="2" opacity="0.15"/>
  <g transform="translate(25, 25)" opacity="0.6">
    <path d="M0,0 Q15,0 15,15 M0,0 Q0,15 15,15" stroke="{palette['gold']}" stroke-width="2" fill="none"/>
    <circle cx="7" cy="7" r="3" fill="{palette['gold']}"/>
  </g>
  <g transform="translate(475, 25) scale(-1,1)" opacity="0.6">
    <path d="M0,0 Q15,0 15,15 M0,0 Q0,15 15,15" stroke="{palette['gold']}" stroke-width="2" fill="none"/>
    <circle cx="7" cy="7" r="3" fill="{palette['gold']}"/>
  </g>
  <g transform="translate(25, 255) scale(1,-1)" opacity="0.6">
    <path d="M0,0 Q15,0 15,15 M0,0 Q0,15 15,15" stroke="{palette['gold']}" stroke-width="2" fill="none"/>
    <circle cx="7" cy="7" r="3" fill="{palette['gold']}"/>
  </g>
  <g transform="translate(475, 255) scale(-1,-1)" opacity="0.6">
    <path d="M0,0 Q15,0 15,15 M0,0 Q0,15 15,15" stroke="{palette['gold']}" stroke-width="2" fill="none"/>
    <circle cx="7" cy="7" r="3" fill="{palette['gold']}"/>
  </g>
  <rect x="20" y="20" width="460" height="240" fill="none" stroke="{palette['gold']}" stroke-width="1" rx="2" opacity="0.4"/>
  <rect x="25" y="25" width="450" height="230" fill="none" stroke="{palette['gold']}" stroke-width="0.5" rx="2" opacity="0.3"/>
  <g transform="translate(250, 45)">
    <rect x="-70" y="-18" width="140" height="36" rx="18" fill="{palette['frame']}" opacity="0.8"/>
    <rect x="-68" y="-16" width="136" height="32" rx="16" fill="none" stroke="{palette['gold']}" stroke-width="1"/>
    <text x="0" y="6" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="bold" fill="{palette['gold']}" text-anchor="middle" letter-spacing="3">TEXTO {escape_xml(topic_number)}</text>
  </g>
  <g transform="translate(250, 75)">
    <line x1="-120" y1="0" x2="-20" y2="0" stroke="{palette['gold']}" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="0" r="4" fill="{palette['gold']}" opacity="0.8"/>
    <line x1="20" y1="0" x2="120" y2="0" stroke="{palette['gold']}" stroke-width="1" opacity="0.6"/>
  </g>
  <g transform="translate(250, 95)" opacity="0.5">
    <path d="M-80,0 Q-60,-15 -40,0 Q-20,15 0,0 Q20,-15 40,0 Q60,15 80,0" stroke="{palette['gold']}" stroke-width="1.5" fill="none"/>
  </g>
'''
    for i, line in enumerate(lines):
        y_pos = text_y_start + (i * line_height)
        svg += f'  <text x="252" y="{y_pos + 2}" font-family="Georgia, \'Times New Roman\', serif" font-size="22" font-weight="bold" fill="{palette["shadow"]}" text-anchor="middle" opacity="0.5">{escape_xml(line)}</text>\n'
        svg += f'  <text x="250" y="{y_pos}" font-family="Georgia, \'Times New Roman\', serif" font-size="22" font-weight="bold" fill="{palette["text"]}" text-anchor="middle">{escape_xml(line)}</text>\n'

    svg += f'''
  <g transform="translate(250, 210)" opacity="0.5">
    <path d="M-60,0 Q-40,-10 -20,0 Q0,10 20,0 Q40,-10 60,0" stroke="{palette['gold']}" stroke-width="1.5" fill="none"/>
  </g>
  <circle cx="230" cy="225" r="2" fill="{palette['gold']}" opacity="0.4"/>
  <circle cx="250" cy="225" r="2" fill="{palette['gold']}" opacity="0.4"/>
  <circle cx="270" cy="225" r="2" fill="{palette['gold']}" opacity="0.4"/>
  <rect x="10" y="10" width="480" height="260" fill="url(#vignette_{topic_number})" rx="2"/>
  <ellipse cx="150" cy="80" rx="100" ry="60" fill="{palette['accent']}" opacity="0.05"/>
</svg>
</div>'''
    return svg


ABNT_CSS = '''
<style>
  body {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 12pt !important;
    line-height: 1.5 !important;
    max-width: 210mm !important;
    margin: 25mm 30mm 20mm 30mm !important;
    padding: 0 !important;
    text-align: justify !important;
    color: #000 !important;
    background: #fff !important;
  }
  h1 { font-size: 16pt; font-weight: bold; text-align: center; margin: 2.5rem 0 1.5rem 0; }
  h2 { font-size: 14pt; font-weight: bold; margin: 2rem 0 1rem 0; text-align: left; }
  h3 { font-size: 13pt; font-weight: bold; margin: 1.8rem 0 0.8rem 0; text-align: left; }
  h4 { font-size: 12pt; font-weight: bold; margin: 1.5rem 0 0.5rem 0; text-align: left; }
  p { margin: 0 0 0.7rem 0; text-indent: 1.25cm; }
  .nav-links { margin-bottom: 20px; text-align: center; }
  .nav-links a { margin: 0 10px; }
  .topic-art-wrapper { margin: 1rem 2rem 1.5rem 0 !important; float: left !important; max-width: 500px; width: 100%; }
  hr { margin: 2rem 0; }
  ul, ol { margin: 0.5rem 0 0.5rem 1.5cm; }
  li { margin: 0.25rem 0; }
  strong { font-weight: bold; }
  .biblical-ref { color: #2563eb; text-decoration: underline dotted; cursor: pointer; }
</style>
'''


def extract_topic_title(content, match):
    heading_text = match.group(0)
    pattern_a = re.compile(r'TEXTO\s+[IVXLCDM]+\s*[-u2013]\s*(.*?)', re.IGNORECASE)
    match_a = pattern_a.search(heading_text)
    if match_a:
        title = match_a.group(1).strip()
        title = re.sub(r'<[^>]+>', '', title)
        if title:
            return title
    pos = match.end()
    next_heading = re.search(r'<h[234][^>]*>(.*?)</h[234]>', content[pos:pos+500], re.IGNORECASE)
    if next_heading:
        return re.sub(r'<[^>]+>', '', next_heading.group(1)).strip()
    return None


def has_svg(content):
    return bool(re.search(r'<svg[^>]*width="500"[^>]*>', content))


def has_abnt_style(content):
    return 'font-family: \'Times New Roman\'' in content or 'font-size: 12pt' in content


def add_abnt_styling(content):
    if has_abnt_style(content):
        return content
    style_match = re.search(r'(<style[^>]*>)(.*?)(</style>)', content, re.DOTALL | re.IGNORECASE)
    if style_match:
        existing_style = style_match.group(2)
        if 'biblical-ref' in existing_style:
            content = content[:style_match.start(2)] + '\n' + ABNT_CSS + '\n' + content[style_match.start(2):]
        else:
            content = content[:style_match.start(2)] + ABNT_CSS + '\n' + existing_style + content[style_match.end(2):]
    else:
        head_match = re.search(r'(</head>)', content, re.IGNORECASE)
        if head_match:
            content = content[:head_match.start(0)] + ABNT_CSS + '\n' + content[head_match.start(0):]
    return content


def process_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if has_svg(content):
        return False, 'already has SVGs'

    heading_pattern = re.compile(
        r'<h([234])[^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*[-u2013:]?\s*(.*?)\s*</h\1>',
        re.IGNORECASE | re.DOTALL
    )

    modified = False
    new_content = content

    for match in heading_pattern.finditer(content):
        tag_level = match.group(1)
        topic_num = match.group(2).upper()
        inline_title = match.group(3).strip()
        inline_title_clean = re.sub(r'<[^>]+>', '', inline_title)

        topic_title = None
        if inline_title_clean:
            topic_title = inline_title_clean
        else:
            topic_title = extract_topic_title(content, match)

        if not topic_title:
            pos = match.end()
            next_h = re.search(r'<h[234][^>]*>(.*?)</h[234]>', content[pos:pos+500], re.IGNORECASE)
            if next_h:
                topic_title = re.sub(r'<[^>]+>', '', next_h.group(1)).strip()
            else:
                topic_title = f"Tópico {topic_num}"

        svg_image = generate_medieval_svg(topic_num, topic_title)

        replacement = match.group(0) + '\n' + svg_image
        new_content = new_content.replace(match.group(0), replacement, 1)
        modified = True

    # Also handle pattern with colon: <h2>TEXTO I: TITLE</h2>
    colon_pattern = re.compile(
        r'<h([234])[^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*:\s*(.*?)\s*</h\1>',
        re.IGNORECASE | re.DOTALL
    )
    for match in colon_pattern.finditer(new_content):
        if not has_svg(new_content):
            tag_level = match.group(1)
            topic_num = match.group(2).upper()
            inline_title = match.group(3).strip()
            inline_title_clean = re.sub(r'<[^>]+>', '', inline_title)

            topic_title = inline_title_clean if inline_title_clean else f"Tópico {topic_num}"
            svg_image = generate_medieval_svg(topic_num, topic_title)
            replacement = match.group(0) + '\n' + svg_image
            new_content = new_content.replace(match.group(0), replacement, 1)
            modified = True

    if modified:
        new_content = add_abnt_styling(new_content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, 'modified'

    return False, 'no TEXTO headings found'


def main():
    root_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico copy'

    stats = {'modified': 0, 'skipped_no_topics': 0, 'skipped_has_svg': 0, 'errors': 0}
    processed_files = []

    for root, dirs, files in os.walk(root_dir):
        for file in sorted(files):
            if not file.endswith('.html'):
                continue
            file_path = os.path.join(root, file)
            relative = os.path.relpath(file_path, root_dir)
            try:
                ok, reason = process_html_file(file_path)
                if ok:
                    stats['modified'] += 1
                    processed_files.append((relative, 'MODIFIED'))
                    print(f"  MODIFIED: {relative}")
                elif reason == 'already has SVGs':
                    stats['skipped_has_svg'] += 1
                    print(f"  SKIPPED (has SVGs): {relative}")
                else:
                    stats['skipped_no_topics'] += 1
                    print(f"  SKIPPED (no topics): {relative}")
            except Exception as e:
                stats['errors'] += 1
                print(f"  ERROR: {relative}: {str(e)}")

    print(f"\n{'='*60}")
    print(f"RESUMO FINAL")
    print(f"{'='*60}")
    print(f"  Arquivos modificados:  {stats['modified']}")
    print(f"  Ignorados (já têm SVG): {stats['skipped_has_svg']}")
    print(f"  Ignorados (sem tópicos): {stats['skipped_no_topics']}")
    print(f"  Erros:                 {stats['errors']}")
    print(f"  Total processados:     {sum(stats.values())}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
