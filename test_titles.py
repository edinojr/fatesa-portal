import re
import os

# Test the title extraction logic on a few files
test_files = [
    r'public/licoes/Curso Básico/Bibliologia/Lição 01 - Considerações Gerais.html',
    r'public/licoes/Curso Básico/Eclesiologia/Lição 01 - Deus Sempre Quis Relacionar-se Com o Homem.html',
    r'public/licoes/Curso Básico/Cristologia/Lição 01 - Quem Dizem os Homens Ser o Filho do Homem.html',
]

for file_path in test_files:
    print(f'\n{"="*60}')
    print(f'File: {file_path.split("/")[-1]}')
    print('='*60)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract lesson title
    lesson_title_match = re.search(r'<h2[^>]*>LIÇÃO\s+\d+\s*[-–]?\s*(.*?)\s*</h2>', content, re.IGNORECASE | re.DOTALL)
    lesson_title = ""
    if lesson_title_match:
        lesson_title_from_h2 = re.sub(r'<[^>]+>', '', lesson_title_match.group(1)).strip()
        print(f'Lesson title from h2: "{lesson_title_from_h2}"')
        if lesson_title_from_h2:
            lesson_title = lesson_title_from_h2
        else:
            # Look for the next h3 tag for the lesson title
            pos = lesson_title_match.end()
            print(f'Looking for h3 after position {pos}')
            print(f'Content around pos: {repr(content[pos:pos+200])}')
            next_h3 = re.search(r'<h3[^>]*>(.*?)</h3>', content[pos:pos+500], re.IGNORECASE | re.DOTALL)
            if next_h3:
                next_h3_text = re.sub(r'<[^>]+>', '', next_h3.group(1)).strip()
                print(f'Found h3: "{next_h3_text}"')
                # Check if it's a TEXTO heading (skip if it is)
                if not re.match(r'TEXTO\s+[IVXLCDM]+', next_h3_text, re.IGNORECASE):
                    lesson_title = next_h3_text
                else:
                    print(f'  -> Skipped (TEXTO heading)')
            else:
                print(f'No h3 found')
    print(f'Final lesson title: "{lesson_title}"')
    
    # Find all TEXTO headings
    heading_pattern = re.compile(r'<h[23][^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*[-–]?\s*(.*?)\s*</h[23]>', re.IGNORECASE | re.DOTALL)
    
    matches = list(heading_pattern.finditer(content))
    print(f'Found {len(matches)} TEXTO headings')
    
    for i, match in enumerate(matches[:2]):
        topic_num = match.group(1).upper()
        topic_title_from_heading = match.group(2).strip()
        print(f'\nMatch {i+1}:')
        print(f'  Topic number: {topic_num}')
        print(f'  Topic title from heading: "{topic_title_from_heading}"')
        
        # Get the topic title
        if topic_title_from_heading:
            # Format A: Title is in the heading
            topic_title = topic_title_from_heading
            print(f'  -> Format A, title: "{topic_title}"')
        else:
            # Format B or C: Look for the next heading (h3 or h4) for the title
            pos = match.end()
            
            # Look for the next h3 or h4 tag (skip the SVG div)
            next_heading = re.search(r'<h[34][^>]*>(.*?)</h[34]>', content[pos:pos+2000], re.IGNORECASE | re.DOTALL)
            
            if next_heading:
                next_heading_text = re.sub(r'<[^>]+>', '', next_heading.group(1)).strip()
                # Check if it's a TEXTO heading (skip if it is)
                if re.match(r'TEXTO\s+[IVXLCDM]+', next_heading_text, re.IGNORECASE):
                    # This is another TEXTO heading, use lesson title
                    topic_title = lesson_title if lesson_title else f"Texto {topic_num}"
                    print(f'  -> Format C (next is TEXTO), using lesson title: "{topic_title}"')
                else:
                    # Use this as the topic title
                    topic_title = next_heading_text
                    print(f'  -> Format B, using next heading: "{topic_title}"')
            else:
                # No heading found, use lesson title
                topic_title = lesson_title if lesson_title else f"Texto {topic_num}"
                print(f'  -> Format C (no next heading), using lesson title: "{topic_title}"')
