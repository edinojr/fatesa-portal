import os
import re
import html

def escape_xml(text):
    """Escape XML special characters"""
    return html.escape(text)

def generate_svg(topic_number, topic_title, course_name="", lesson_name=""):
    """Generate an SVG placeholder for a topic"""
    # Clean up the title for display
    clean_title = topic_title.strip()
    
    # Determine color based on topic number
    colors = {
        'I': ('#1a365d', '#2b6cb0'),      # Blue
        'II': ('#744210', '#d69e2e'),     # Yellow/Gold
        'III': ('#22543d', '#38a169'),    # Green
        'IV': ('#553c9a', '#9f7aea'),     # Purple
        'V': ('#9c4221', '#ed8936'),      # Orange
        'VI': ('#2c5282', '#63b3ed'),     # Light Blue
        'VII': ('#285e61', '#4fd1c5'),    # Teal
        'VIII': ('#44337a', '#b794f4'),   # Lavender
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
    svg = f'''<svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{accent_color};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="200" rx="12" fill="url(#bgGradient)" filter="url(#shadow)"/>
  
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

def extract_topics_from_html(file_path):
    """Extract TEXTO topics from an HTML file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    topics = []
    
    # Pattern for TEXTO with title (Format A)
    pattern_a = re.compile(r'<h[23]>\s*TEXTO\s+([IVXLCDM]+)\s*[-–]\s*(.*?)\s*</h[23]>', re.IGNORECASE)
    for match in pattern_a.finditer(content):
        topic_num = match.group(1).upper()
        topic_title = match.group(2).strip()
        topics.append((topic_num, topic_title))
    
    # Pattern for TEXTO without title (Format B) - look for the next heading or text
    pattern_b = re.compile(r'<h[23]>\s*TEXTO\s+([IVXLCDM]+)\s*</h[23]>', re.IGNORECASE)
    for match in pattern_b.finditer(content):
        topic_num = match.group(1).upper()
        # Look for the next heading or paragraph for the title
        pos = match.end()
        next_heading = re.search(r'<h[23][^>]*>(.*?)</h[23]>', content[pos:pos+500], re.IGNORECASE)
        if next_heading:
            topic_title = re.sub(r'<[^>]+>', '', next_heading.group(1)).strip()
        else:
            topic_title = f"Texto {topic_num}"
        
        # Check if this topic already exists
        if not any(t[0] == topic_num and t[1] == topic_title for t in topics):
            topics.append((topic_num, topic_title))
    
    return topics

def main():
    root_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico'
    output_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\assets\topic_svgs'
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Dictionary to store all unique topics
    all_topics = {}
    
    # Scan all HTML files
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                course_name = os.path.basename(root)
                lesson_name = file.replace('.html', '')
                
                topics = extract_topics_from_html(file_path)
                
                for topic_num, topic_title in topics:
                    # Create a unique key for the topic
                    key = f"{topic_num}_{topic_title}"
                    if key not in all_topics:
                        all_topics[key] = {
                            'number': topic_num,
                            'title': topic_title,
                            'course': course_name,
                            'lesson': lesson_name
                        }
    
    print(f"Found {len(all_topics)} unique topics")
    
    # Generate SVGs for each unique topic
    generated_count = 0
    for key, topic_info in all_topics.items():
        topic_num = topic_info['number']
        topic_title = topic_info['title']
        
        # Create filename from topic title
        safe_title = re.sub(r'[^\w\s-]', '', topic_title)
        safe_title = re.sub(r'\s+', '_', safe_title)
        filename = f"texto_{topic_num.lower()}_{safe_title[:50]}.svg"
        
        # Generate SVG
        svg_content = generate_svg(topic_num, topic_title, topic_info['course'], topic_info['lesson'])
        
        # Save SVG
        svg_path = os.path.join(output_dir, filename)
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        generated_count += 1
        print(f"Generated: {filename}")
    
    print(f"\nTotal SVGs generated: {generated_count}")
    print(f"Output directory: {output_dir}")

if __name__ == "__main__":
    main()
