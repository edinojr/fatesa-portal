import re

# Test multiple files
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
    
    # Find all TEXTO headings
    heading_pattern = re.compile(r'<h[23][^>]*>\s*TEXTO\s+([IVXLCDM]+)\s*[-–]?\s*(.*?)\s*</h[23]>', re.IGNORECASE | re.DOTALL)
    
    matches = list(heading_pattern.finditer(content))
    print(f'Found {len(matches)} TEXTO headings')
    
    for i, match in enumerate(matches[:2]):
        topic_num = match.group(1)
        topic_title_from_heading = match.group(2).strip()
        print(f'\nMatch {i+1}:')
        print(f'  Full match: {match.group(0)[:60]}...')
        print(f'  Topic number: {topic_num}')
        print(f'  Topic title from heading: "{topic_title_from_heading}"')
        
        # Check if there's a title in the heading
        if topic_title_from_heading:
            print(f'  Format: A (title in heading)')
            topic_title = topic_title_from_heading
            print(f'  Title: {topic_title}')
        else:
            print(f'  Format: B (title in next h4)')
            # Look for next h4
            pos = match.end()
            next_h4 = re.search(r'<h4[^>]*>(.*?)</h4>', content[pos:pos+2000], re.IGNORECASE | re.DOTALL)
            if next_h4:
                topic_title = re.sub(r'<[^>]+>', '', next_h4.group(1)).strip()
                print(f'  Found h4: {next_h4.group(0)[:50]}...')
                print(f'  Extracted title: {topic_title}')
            else:
                print(f'  No h4 found')
                # Look for the lesson title from h2 or h3
                lesson_title_match = re.search(r'<h[23][^>]*>LIÇÃO\s+\d+\s*[-–]?\s*(.*?)\s*</h[23]>', content, re.IGNORECASE | re.DOTALL)
                if lesson_title_match:
                    lesson_title = re.sub(r'<[^>]+>', '', lesson_title_match.group(1)).strip()
                    print(f'  Using lesson title: {lesson_title}')
