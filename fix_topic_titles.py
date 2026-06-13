import os
import re
import html

def escape_xml(text):
    """Escape XML special characters"""
    return html.escape(text)

def generate_classical_svg(topic_number, topic_title):
    """Generate a classical oil painting style SVG for a topic"""
    clean_title = topic_title.strip()
    
    # Classical color palettes inspired by Renaissance/Baroque paintings
    classical_palettes = {
        'I': {
            'bg1': '#1a0f0a', 'bg2': '#2d1810', 'bg3': '#4a2c1a',
            'accent': '#c9a86c', 'gold': '#d4af37', 'text': '#f5e6c8',
            'frame': '#8b6914', 'shadow': '#0d0705'
        },
        'II': {
            'bg1': '#0a1a2d', 'bg2': '#102840', 'bg3': '#1a3a5c',
            'accent': '#7ba3c9', 'gold': '#c9a86c', 'text': '#e8f0f8',
            'frame': '#4a6a8a', 'shadow': '#050d15'
        },
        'III': {
            'bg1': '#2d1a0a', 'bg2': '#402810', 'bg3': '#5c3a1a',
            'accent': '#c9a86c', 'gold': '#d4af37', 'text': '#f5e6c8',
            'frame': '#8b6914', 'shadow': '#150d05'
        },
        'IV': {
            'bg1': '#1a0a2d', 'bg2': '#281040', 'bg3': '#3a1a5c',
            'accent': '#a87bc9', 'gold': '#d4af37', 'text': '#f0e8f8',
            'frame': '#6a4a8a', 'shadow': '#0d0515'
        },
        'V': {
            'bg1': '#2d0a0a', 'bg2': '#401010', 'bg3': '#5c1a1a',
            'accent': '#c97b7b', 'gold': '#d4af37', 'text': '#f8e8e8',
            'frame': '#8a4a4a', 'shadow': '#150505'
        },
        'VI': {
            'bg1': '#0a2d1a', 'bg2': '#104028', 'bg3': '#1a5c3a',
            'accent': '#7bc9a8', 'gold': '#d4af37', 'text': '#e8f8f0',
            'frame': '#4a8a6a', 'shadow': '#05150d'
        },
        'VII': {
            'bg1': '#2d2d0a', 'bg2': '#404010', 'bg3': '#5c5c1a',
            'accent': '#c9c97b', 'gold': '#d4af37', 'text': '#f8f8e8',
            'frame': '#8a8a4a', 'shadow': '#151505'
        },
        'VIII': {
            'bg1': '#1a1a2d', 'bg2': '#282840', 'bg3': '#3a3a5c',
            'accent': '#7b7bc9', 'gold': '#d4af37', 'text': '#e8e8f8',
            'frame': '#4a4a8a', 'shadow': '#0d0d15'
        },
    }
    
    palette = classical_palettes.get(topic_number, classical_palettes['I'])
    
    # Word wrap the title - allow more characters since this is the main content
    max_chars_per_line = 40
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
    
    # Limit to 4 lines max
    if len(lines) > 4:
        lines = lines[:4]
        lines[-1] = lines[-1][:37] + "..."
    
    # Calculate text positions based on number of lines
    if len(lines) <= 2:
        text_y_start = 130
        line_height = 40
    elif len(lines) == 3:
        text_y_start = 115
        line_height = 36
    else:
        text_y_start = 100
        line_height = 32
    
    # Generate classical oil painting style SVG
    svg = f'''<svg width="500" height="280" viewBox="0 0 500 280" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto; display: block; margin-bottom: 2rem; border-radius: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
  <defs>
    <!-- Classical gradient background -->
    <radialGradient id="bgRadial_{topic_number}" cx="30%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:{palette['bg3']};stop-opacity:1" />
      <stop offset="50%" style="stop-color:{palette['bg2']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{palette['bg1']};stop-opacity:1" />
    </radialGradient>
    
    <!-- Gold gradient for frame -->
    <linearGradient id="goldFrame_{topic_number}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1" />
      <stop offset="25%" style="stop-color:#f4e4bc;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#c9a86c;stop-opacity:1" />
      <stop offset="75%" style="stop-color:#f4e4bc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
    </linearGradient>
    
    <!-- Vignette effect -->
    <radialGradient id="vignette_{topic_number}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:transparent;stop-opacity:0" />
      <stop offset="70%" style="stop-color:transparent;stop-opacity:0" />
      <stop offset="100%" style="stop-color:{palette['shadow']};stop-opacity:0.7" />
    </radialGradient>
    
    <!-- Brushstroke texture -->
    <pattern id="brushstroke_{topic_number}" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="{palette['bg2']}"/>
      <rect x="0" y="0" width="2" height="2" fill="{palette['bg3']}" opacity="0.3"/>
      <rect x="2" y="2" width="2" height="2" fill="{palette['bg1']}" opacity="0.3"/>
    </pattern>
  </defs>
  
  <!-- Outer ornate frame -->
  <rect x="0" y="0" width="500" height="280" fill="url(#goldFrame_{topic_number})" rx="4"/>
  
  <!-- Inner shadow frame -->
  <rect x="6" y="6" width="488" height="268" fill="{palette['shadow']}" rx="2" opacity="0.5"/>
  
  <!-- Canvas background -->
  <rect x="10" y="10" width="480" height="260" fill="url(#bgRadial_{topic_number})" rx="2"/>
  
  <!-- Brushstroke texture overlay -->
  <rect x="10" y="10" width="480" height="260" fill="url(#brushstroke_{topic_number})" rx="2" opacity="0.15"/>
  
  <!-- Decorative corner ornaments -->
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
  
  <!-- Decorative border lines -->
  <rect x="20" y="20" width="460" height="240" fill="none" stroke="{palette['gold']}" stroke-width="1" rx="2" opacity="0.4"/>
  <rect x="25" y="25" width="450" height="230" fill="none" stroke="{palette['gold']}" stroke-width="0.5" rx="2" opacity="0.3"/>
  
  <!-- Topic number banner -->
  <g transform="translate(250, 40)">
    <rect x="-50" y="-15" width="100" height="30" rx="15" fill="{palette['frame']}" opacity="0.8"/>
    <rect x="-48" y="-13" width="96" height="26" rx="13" fill="none" stroke="{palette['gold']}" stroke-width="1"/>
    <text x="0" y="5" font-family="Georgia, 'Times New Roman', serif" font-size="14" font-weight="bold" fill="{palette['gold']}" text-anchor="middle" letter-spacing="2">TEXTO {escape_xml(topic_number)}</text>
  </g>
  
  <!-- Decorative divider -->
  <g transform="translate(250, 65)">
    <line x1="-100" y1="0" x2="-15" y2="0" stroke="{palette['gold']}" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="0" r="3" fill="{palette['gold']}" opacity="0.8"/>
    <circle cx="-8" cy="0" r="1.5" fill="{palette['gold']}" opacity="0.5"/>
    <circle cx="8" cy="0" r="1.5" fill="{palette['gold']}" opacity="0.5"/>
    <line x1="15" y1="0" x2="100" y2="0" stroke="{palette['gold']}" stroke-width="1" opacity="0.6"/>
  </g>
  
  <!-- Topic title with classical styling -->
'''
    
    for i, line in enumerate(lines):
        y_pos = text_y_start + (i * line_height)
        # Add subtle shadow effect
        svg += f'  <text x="252" y="{y_pos + 2}" font-family="Georgia, \'Times New Roman\', serif" font-size="20" font-weight="bold" fill="{palette["shadow"]}" text-anchor="middle" opacity="0.5">{escape_xml(line)}</text>\n'
        svg += f'  <text x="250" y="{y_pos}" font-family="Georgia, \'Times New Roman\', serif" font-size="20" font-weight="bold" fill="{palette["text"]}" text-anchor="middle">{escape_xml(line)}</text>\n'
    
    # Add classical decorative elements at the bottom
    svg += f'''
  <!-- Bottom ornamental flourish -->
  <g transform="translate(250, 230)" opacity="0.5">
    <path d="M-50,0 Q-30,-8 -15,0 Q0,8 15,0 Q30,-8 50,0" stroke="{palette['gold']}" stroke-width="1.5" fill="none"/>
  </g>
  
  <!-- Small decorative dots -->
  <circle cx="235" cy="245" r="2" fill="{palette['gold']}" opacity="0.4"/>
  <circle cx="250" cy="245" r="2" fill="{palette['gold']}" opacity="0.4"/>
  <circle cx="265" cy="245" r="2" fill="{palette['gold']}" opacity="0.4"/>
  
  <!-- Vignette overlay -->
  <rect x="10" y="10" width="480" height="260" fill="url(#vignette_{topic_number})" rx="2"/>
  
  <!-- Subtle light effect -->
  <ellipse cx="150" cy="80" rx="100" ry="60" fill="{palette['accent']}" opacity="0.05"/>
</svg>'''
    
    return svg

def extract_topic_title_from_heading(heading_text):
    """Extract the topic title from the heading text"""
    # Pattern for TEXTO with title (Format A): TEXTO I - TITLE or TEXTO I – TITLE
    pattern_a = re.compile(r'TEXTO\s+[IVXLCDM]+\s*[-–]\s*(.*)', re.IGNORECASE)
    match_a = pattern_a.search(heading_text)
    if match_a:
        return match_a.group(1).strip()
    
    return None

def process_html_file(file_path):
    """Process a single HTML file and replace SVG images with correct topic titles"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # First, extract the lesson title
    lesson_title = ""
    lesson_title_match = re.search(r'<h2[^>]*>LIÇÃO\s+\d+\s*[-–]?\s*(.*?)\s*</h2>', content, re.IGNORECASE | re.DOTALL)
    if lesson_title_match:
        lesson_title_from_h2 = re.sub(r'<[^>]+>', '', lesson_title_match.group(1)).strip()
        if lesson_title_from_h2:
            lesson_title = lesson_title_from_h2
        else:
            pos = lesson_title_match.end()
            next_h3 = re.search(r'<h3[^>]*>(.*?)</h3>', content[pos:pos+500], re.IGNORECASE | re.DOTALL)
            if next_h3:
                next_h3_text = re.sub(r'<[^>]+>', '', next_h3.group(1)).strip()
                if not re.match(r'TEXTO\s+[IVXLCDM]+', next_h3_text, re.IGNORECASE):
                    lesson_title = next_h3_text
    
    # Find all TEXTO headings with their positions
    heading_pattern = re.compile(r'<h[23][^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*[-–]?\s*(.*?)\s*</h[23]>', re.IGNORECASE | re.DOTALL)
    
    # Find all SVG divs with their positions
    svg_div_pattern = re.compile(r'<div style="text-align: left; margin-bottom: 2rem;">\s*<svg[^>]*>.*?</svg>\s*</div>', re.DOTALL)
    
    headings = list(heading_pattern.finditer(content))
    svg_divs = list(svg_div_pattern.finditer(content))
    
    if not headings:
        return False
    
    # Build a map of heading -> SVG (match each heading to the next SVG after it)
    replacements = []
    svg_idx = 0
    
    for heading_match in headings:
        topic_num = heading_match.group(1).upper()
        topic_title_from_heading = heading_match.group(2).strip()
        
        # Get the topic title
        if topic_title_from_heading:
            topic_title = topic_title_from_heading
        else:
            # Look for the next heading after this one
            pos = heading_match.end()
            next_heading = re.search(r'<h[34][^>]*>(.*?)</h[34]>', content[pos:pos+2000], re.IGNORECASE | re.DOTALL)
            
            if next_heading:
                next_heading_text = re.sub(r'<[^>]+>', '', next_heading.group(1)).strip()
                if re.match(r'TEXTO\s+[IVXLCDM]+', next_heading_text, re.IGNORECASE):
                    topic_title = lesson_title if lesson_title else f"Texto {topic_num}"
                else:
                    topic_title = next_heading_text
            else:
                topic_title = lesson_title if lesson_title else f"Texto {topic_num}"
        
        if not topic_title:
            topic_title = lesson_title if lesson_title else f"Texto {topic_num}"
        
        # Find the next SVG div after this heading
        while svg_idx < len(svg_divs) and svg_divs[svg_idx].start() < heading_match.end():
            svg_idx += 1
        
        if svg_idx < len(svg_divs):
            svg_match = svg_divs[svg_idx]
            svg_idx += 1
            
            classical_svg = generate_classical_svg(topic_num, topic_title)
            new_svg_div = '<div style="text-align: left; margin-bottom: 2rem;">\n' + classical_svg + '\n</div>'
            
            replacements.append((svg_match.start(), svg_match.end(), new_svg_div, topic_num, topic_title))
    
    if not replacements:
        return False
    
    # Apply replacements in reverse order to preserve positions
    new_content = content
    for start, end, replacement, topic_num, topic_title in reversed(replacements):
        new_content = new_content[:start] + replacement + new_content[end:]
        print(f'  Replaced SVG for TEXTO {topic_num} with title: {topic_title[:40]}...')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    root_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico'
    
    modified_count = 0
    skipped_count = 0
    error_count = 0
    
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    if process_html_file(file_path):
                        modified_count += 1
                        print(f"Modified: {file}")
                    else:
                        skipped_count += 1
                        print(f"Skipped (no topics): {file}")
                except Exception as e:
                    error_count += 1
                    print(f"Error processing {file}: {str(e)}")
    
    print(f"\nSummary:")
    print(f"  Modified: {modified_count} files")
    print(f"  Skipped: {skipped_count} files")
    print(f"  Errors: {error_count} files")

if __name__ == "__main__":
    main()
