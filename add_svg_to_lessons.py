import os
import re
import html

def escape_xml(text):
    """Escape XML special characters"""
    return html.escape(text)

def generate_svg_for_topic(topic_number, topic_title):
    """Generate an SVG placeholder for a topic"""
    clean_title = topic_title.strip()
    
    # Determine color based on topic number
    colors = {
        'I': ('#1a365d', '#2b6cb0'),
        'II': ('#744210', '#d69e2e'),
        'III': ('#22543d', '#38a169'),
        'IV': ('#553c9a', '#9f7aea'),
        'V': ('#9c4221', '#ed8936'),
        'VI': ('#2c5282', '#63b3ed'),
        'VII': ('#285e61', '#4fd1c5'),
        'VIII': ('#44337a', '#b794f4'),
    }
    
    bg_color, accent_color = colors.get(topic_number, ('#2d3748', '#718096'))
    
    # Word wrap the title
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
    
    # Limit to 3 lines max
    if len(lines) > 3:
        lines = lines[:3]
        lines[-1] = lines[-1][:37] + "..."
    
    # Calculate text positions
    text_y_start = 120
    line_height = 32
    
    # Generate SVG
    svg = f'''<svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto; display: block; margin-bottom: 1.5rem; border-radius: 12px;">
  <defs>
    <linearGradient id="bgGradient_{topic_number}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{accent_color};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="200" rx="12" fill="url(#bgGradient_{topic_number})"/>
  
  <!-- Decorative pattern -->
  <circle cx="350" cy="50" r="60" fill="white" opacity="0.05"/>
  <circle cx="380" cy="150" r="40" fill="white" opacity="0.05"/>
  <circle cx="30" cy="170" r="50" fill="white" opacity="0.05"/>
  
  <!-- Topic number badge -->
  <rect x="20" y="20" width="80" height="32" rx="16" fill="white" opacity="0.2"/>
  <text x="60" y="42" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">TEXTO {escape_xml(topic_number)}</text>
  
  <!-- Decorative line -->
  <line x1="20" y1="65" x2="380" y2="65" stroke="white" stroke-opacity="0.3" stroke-width="2"/>
  
  <!-- Topic title -->
'''
    
    for i, line in enumerate(lines):
        y_pos = text_y_start + (i * line_height)
        svg += f'  <text x="20" y="{y_pos}" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="white">{escape_xml(line)}</text>\n'
    
    # Add decorative cross symbol
    svg += '''  
  <!-- Cross symbol -->
  <g transform="translate(340, 100)" opacity="0.15">
    <rect x="-3" y="-20" width="6" height="40" fill="white"/>
    <rect x="-15" y="-8" width="30" height="6" fill="white"/>
  </g>
</svg>'''
    
    return svg

def extract_topic_title(content, match):
    """Extract the topic title from the heading"""
    heading_text = match.group(0)
    
    # Pattern for TEXTO with title (Format A): TEXTO I - TITLE
    pattern_a = re.compile(r'TEXTO\s+[IVXLCDM]+\s*[-–]\s*(.*?)', re.IGNORECASE)
    match_a = pattern_a.search(heading_text)
    if match_a:
        return match_a.group(1).strip()
    
    # Pattern for TEXTO without title (Format B): TEXTO I
    # Look for the next heading for the title
    pos = match.end()
    next_heading = re.search(r'<h[23][^>]*>(.*?)</h[23]>', content[pos:pos+500], re.IGNORECASE)
    if next_heading:
        return re.sub(r'<[^>]+>', '', next_heading.group(1)).strip()
    
    return None

def process_html_file(file_path):
    """Process a single HTML file and add SVG images"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file already has SVG images with our pattern
    if 'svg style="max-width: 100%' in content:
        return False
    
    # Find all TEXTO headings (both h2 and h3)
    heading_pattern = re.compile(r'<h[23][^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*[-–]?\s*(.*?)\s*</h[23]>', re.IGNORECASE | re.DOTALL)
    
    modified = False
    new_content = content
    
    for match in heading_pattern.finditer(content):
        topic_num = match.group(1).upper()
        
        # Get the topic title
        if match.group(2).strip():
            topic_title = match.group(2).strip()
        else:
            topic_title = extract_topic_title(content, match)
        
        if not topic_title:
            topic_title = f"Texto {topic_num}"
        
        # Generate SVG
        svg_image = generate_svg_for_topic(topic_num, topic_title)
        
        # Create the replacement: heading + SVG image
        # The SVG should be placed after the heading, left-aligned
        replacement = match.group(0) + '\n<div style="text-align: left; margin-bottom: 1.5rem;">\n' + svg_image + '\n</div>'
        
        # Replace in new content
        new_content = new_content.replace(match.group(0), replacement, 1)
        modified = True
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    
    return False

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
                        print(f"Skipped (already has SVGs or no topics): {file}")
                except Exception as e:
                    error_count += 1
                    print(f"Error processing {file}: {str(e)}")
    
    print(f"\nSummary:")
    print(f"  Modified: {modified_count} files")
    print(f"  Skipped: {skipped_count} files")
    print(f"  Errors: {error_count} files")

if __name__ == "__main__":
    main()
