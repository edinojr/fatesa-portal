import os

root = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico'

files_with_svg = 0
total_svgs = 0
files_with_abnt = 0
file_count = 0

for root_dir, dirs, files in os.walk(root):
    for file in files:
        if not file.endswith('.html'):
            continue
        file_count += 1
        with open(os.path.join(root_dir, file), 'r', encoding='utf-8') as f:
            content = f.read()
        
        svg_count = content.count('<svg width="500"')
        total_svgs += svg_count
        if svg_count > 0:
            files_with_svg += 1
        
        if "Times New Roman" in content:
            files_with_abnt += 1

print(f"Total HTML files: {file_count}")
print(f"Files with SVGs: {files_with_svg}")
print(f"Total SVGs inserted: {total_svgs}")
if files_with_svg > 0:
    print(f"Avg SVGs per modified file: {total_svgs / files_with_svg:.1f}")
print(f"Files with ABNT CSS: {files_with_abnt}")
