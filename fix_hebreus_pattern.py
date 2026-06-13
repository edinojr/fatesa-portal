import os
import re
from bs4 import BeautifulSoup

def fix_hebreus_lessons():
    base_dir = r'C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico\Epístola aos Hebreus'
    
    # Pattern CSS from Bibliologia
    pattern_css = """
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    h1, h2, h3, h4, h5 { color: #1e40af; margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
    blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #4b5563; margin-left: 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
    th { background-color: #f9fafb; }
    img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1.5rem 0; }
    pre { background-color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: monospace; background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; }
    ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    """

    files = sorted([f for f in os.listdir(base_dir) if f.endswith('.html')])
    
    for i, filename in enumerate(files):
        filepath = os.path.join(base_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')

        # 1. Fix "Oseias" error
        # Replace "Oseias " with "Os " in text
        for element in soup.find_all(string=True):
            if 'Oseias ' in element:
                new_text = element.replace('Oseias ', 'Os ')
                element.replace_with(new_text)

        # 2. Update CSS
        style_tag = soup.find('style')
        if style_tag:
            style_tag.string = pattern_css
        else:
            new_style = soup.new_tag('style')
            new_style.string = pattern_css
            soup.head.append(new_style)

        # Add audio CSS link
        if not soup.find('link', href='../assets/leitor-audio.css'):
            css_link = soup.new_tag('link', rel='stylesheet', href='../assets/leitor-audio.css')
            soup.head.append(css_link)

        # 3. Update Header
        # Ensure <h1>Epístola aos Hebreus</h1>
        h1_tag = soup.find('h1')
        if h1_tag:
            h1_tag.string = 'EPÍSTOLA AOS HEBREUS'
        else:
            new_h1 = soup.new_tag('h1')
            new_h1.string = 'EPÍSTOLA AOS HEBREUS'
            soup.body.insert(0, new_h1)

        # Fix <h2>
        h2_tag = soup.find('h2')
        if h2_tag:
            # Normalize title to "LIÇÃO XX - TITLE"
            text = h2_tag.get_text().strip().upper()
            h2_tag.string = text

        # 4. Fix TEXTO X IDs
        texts = soup.find_all('h3', string=re.compile(r'^TEXTO [IVXLCDM]+$', re.IGNORECASE))
        roman_map = {'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10'}
        
        for idx, text_tag in enumerate(texts):
            roman = text_tag.get_text().strip().replace('TEXTO ', '').upper()
            num = roman_map.get(roman, str(idx + 1))
            text_tag['id'] = f'texto-{num}'

        # 5. Create ESBOÇO DA LIÇÃO
        h4_tags = soup.find_all('h4')
        if h4_tags:
            esboço_h3 = soup.new_tag('h3')
            esboço_h3.string = 'ESBOÇO DA LIÇÃO'
            
            esboço_p = soup.new_tag('p')
            
            # Map h4s to texts
            # We need to find which TEXTO X the h4 belongs to
            current_text_id = 'texto-1'
            for h4 in h4_tags:
                # Find the preceding h3 that is a "TEXTO X"
                prev = h4.find_previous('h3')
                if prev and 'id' in prev.attrs and prev['id'].startswith('texto-'):
                    current_text_id = prev['id']
                
                link = soup.new_tag('a', href=f'#{current_text_id}')
                link.string = h4.get_text().strip().upper()
                esboço_p.append(link)
                esboço_p.append(soup.new_tag('br'))
            
            # Insert after h2
            if h2_tag:
                h2_tag.insert_after(esboço_h3)
                esboço_h3.insert_after(esboço_p)

        # 6. Ensure <hr> after ESBOÇO
        if esboço_p:
            hr_tag = soup.new_tag('hr')
            esboço_p.insert_after(hr_tag)

        # 7. Add audio script
        if not soup.find('script', src='../assets/leitor-audio.js'):
            script_tag = soup.new_tag('script', src='../assets/leitor-audio.js')
            soup.body.append(script_tag)

        # 8. Fix "Próxima Lição" link
        # Find the link at the end
        links = soup.find_all('a')
        for link in links:
            if 'Próxima Lição' in link.text:
                if i < len(files) - 1:
                    link['href'] = files[i+1]
                else:
                    link.decompose() # Remove if it's the last lesson

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
            
    print(f"Processed {len(files)} lessons in Epístola aos Hebreus.")

if __name__ == '__main__':
    fix_hebreus_lessons()
