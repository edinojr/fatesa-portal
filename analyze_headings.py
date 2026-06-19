import os
import re

root_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico'
html_files = []

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.html'):
            html_files.append(os.path.join(root, file))

for file_path in html_files:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception:
        continue

    headings = []
    heading_pattern = re.compile(r'<(h[1-6])>(.*?)</\1>', re.IGNORECASE)
    
    for i, line in enumerate(lines):
        match = heading_pattern.search(line)
        if match:
            tag = match.group(1)
            content = match.group(2).strip()
            headings.append({'line': i + 1, 'tag': tag, 'content': content})

    if not headings:
        continue

    case1_found = False
    case1_details = []
    for i in range(len(headings) - 1):
        current = headings[i]
        if re.match(r'^TEXTO\s+[IVXLCDM]+$', current['content'], re.IGNORECASE):
            next_heading = headings[i+1]
            case1_found = True
            case1_details.append((current, next_heading))

    case2_found = False
    case2_details = []
    texto_headings = [h for h in headings if re.match(r'^TEXTO\s+[IVXLCDM]+', h['content'], re.IGNORECASE)]
    numeral_groups = {}
    for h in texto_headings:
        match = re.match(r'^TEXTO\s+([IVXLCDM]+)', h['content'], re.IGNORECASE)
        if match:
            numeral = match.group(1).upper()
            if numeral not in numeral_groups:
                numeral_groups[numeral] = []
            numeral_groups[numeral].append(h)

    for numeral, group in numeral_groups.items():
        if len(group) > 1:
            has_simple = any(re.match(r'^TEXTO\s+' + numeral + r'$', h['content'], re.IGNORECASE) for h in group)
            has_complex = any(re.match(r'^TEXTO\s+' + numeral + r'\s*-.+', h['content'], re.IGNORECASE) for h in group)
            if has_simple and has_complex:
                case2_found = True
                case2_details.append(group)

    if case1_found or case2_found:
        print(f"FILE: {file_path}")
        if case1_found:
            print("  Case 1: Heading followed by Title")
            for curr, nxt in case1_details:
                print(f"    - Line {curr['line']}: <{curr['tag']}>{curr['content']}</{curr['tag']}>")
                print(f"    - Line {nxt['line']}: <{nxt['tag']}>{nxt['content']}</{nxt['tag']}>")
        if case2_found:
            print("  Case 2: Redundant Headings")
            for group in case2_details:
                for h in group:
                    print(f"    - Line {h['line']}: <{h['tag']}>{h['content']}</{h['tag']}>")
        print("-" * 40)
