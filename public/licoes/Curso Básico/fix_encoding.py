import os
import glob

def fix_bytes(data):
    # Exact byte sequences from the file
    replacements = [
        (b'LI\xc3\x83\xc2\x87\xc3\x83\xc2\x83O', b'LI\xc3\x87\xc3\x83O'), # LIÇÃO
        (b'ESBO\xc3\x83\xc2\x87O', b'ESBO\xc3\x87O'), # ESBOÇO
        (b'PR\xc3\x83 TICA', b'PR\xc3\x81TICA'), # PRÁTICA
        (b'N\xc3\x83\xc3\x81O', b'N\xc3\x83O'), # NÃO
    ]
    
    for bad, good in replacements:
        data = data.replace(bad, good)
    return data

def process_files(root_dir):
    html_files = glob.glob(os.path.join(root_dir, "**/*.html"), recursive=True)
    for file_path in html_files:
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            fixed_data = fix_bytes(data)
            if fixed_data != data:
                with open(file_path, 'wb') as f:
                    f.write(fixed_data)
                print(f"Fixed: {file_path}")
        except Exception as e:
            print(f"Error: {file_path} - {e}")

if __name__ == "__main__":
    process_files(r"C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico")
