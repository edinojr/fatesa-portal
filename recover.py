import json
import re

log_path = r'C:\Users\edino\.gemini\antigravity\brain\b5804865-c25c-4a04-bfbf-ae6ff5c615e1\.system_generated\logs\transcript.jsonl'
file_path = r'c:\Users\edino\OneDrive\Área de Trabalho\Fatesa\src\features\courses\hooks\useStudentCourses.ts'

target_output = ""
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
        if data.get('type') == 'TOOL_RESPONSE':
            # Check tool_calls to ensure it's from the list_dir or view_file tool
            tool_calls = data.get('tool_calls', [])
            content = data.get('content', '')
            if 'Total Lines: 528' in content and 'useStudentCourses.ts' in content:
                target_output = content

if target_output:
    lines = target_output.split('\n')
    cleaned_lines = []
    capture = False
    for line in lines:
        if 'The following code has been modified' in line:
            capture = True
            continue
        if 'The above content shows the entire, complete file contents' in line:
            capture = False
            continue
        
        if capture:
            # remove "1: "
            # using regex to match start of line digits and colon
            new_line = re.sub(r'^\d+:\s?', '', line)
            cleaned_lines.append(new_line)
    
    final_content = '\n'.join(cleaned_lines)
    
    # Fix the toLowerCase issue
    final_content = final_content.replace(
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('basico')",
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase()?.includes('basico')"
    )
    final_content = final_content.replace(
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('básico')",
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase()?.includes('básico')"
    )
    final_content = final_content.replace(
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('medio')",
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase()?.includes('medio')"
    )
    final_content = final_content.replace(
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('médio')",
        "r.aulas?.livros?.cursos?.nivel?.toLowerCase()?.includes('médio')"
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("File recovered successfully!")
else:
    print("Could not find the target output in transcript.")
