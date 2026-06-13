import os
import re
import requests
import json

SUPABASE_URL = "https://jhqnitdmdlbagnfwwrwx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4"
LOCAL_BASE = r"C:\Users\edino\OneDrive\Área de Trabalho\Fatesa\public\licoes\Curso Básico"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

def normalize(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def find_local_file(titulo, book_name):
    norm_title = normalize(titulo)
    # Search all subdirectories
    for root, dirs, files in os.walk(LOCAL_BASE):
        for f in files:
            if not f.endswith('.html'):
                continue
            fname = f.replace('.html', '')
            norm_fname = normalize(fname)
            if norm_fname == norm_title:
                return os.path.join(root, f)
            # Partial match
            if norm_title in norm_fname or norm_fname in norm_title:
                return os.path.join(root, f)
    return None

def main():
    # 1. Fetch all lessons with tipo='licao' and arquivo_url not null
    print("Fetching lessons...")
    params = "?select=id,titulo,arquivo_url,livro_id&tipo=eq.licao&arquivo_url=not.is.null"
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/aulas{params}",
        headers=HEADERS
    )
    if resp.status_code != 200:
        print(f"Error fetching lessons: {resp.status_code} {resp.text[:200]}")
        return
    lessons = resp.json()
    print(f"Found {len(lessons)} lessons with arquivo_url")

    # 2. Fetch book names
    print("Fetching books...")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/livros?select=id,titulo",
        headers=HEADERS
    )
    books = {b['id']: b['titulo'] for b in resp.json()}

    storage_headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "x-upsert": "true"
    }

    bucket_url = f"{SUPABASE_URL}/storage/v1/object/public/livros/"
    uploaded = 0
    skipped = 0
    errors = 0

    for lesson in lessons:
        titulo = lesson['titulo']
        arquivo_url = lesson['arquivo_url']
        book_name = books.get(lesson['livro_id'], '')

        if not arquivo_url or not arquivo_url.startswith(bucket_url):
            skipped += 1
            continue

        local_path = find_local_file(titulo, book_name)
        if not local_path:
            skipped += 1
            continue

        storage_path = arquivo_url[len(bucket_url):]

        with open(local_path, 'rb') as f:
            content = f.read()

        # Upload via PUT (overwrite)
        put_headers = dict(storage_headers)
        put_headers["Content-Type"] = "text/html; charset=utf-8"
        resp = requests.put(
            f"{SUPABASE_URL}/storage/v1/object/livros/{storage_path}",
            data=content,
            headers=put_headers
        )

        if resp.status_code in (200, 201):
            uploaded += 1
            print(f"  [{uploaded}] OK: {titulo}")
        else:
            errors += 1
            print(f"  FAILED [{resp.status_code}]: {titulo} - {resp.text[:100]}")

    print(f"\nUploaded: {uploaded}, Skipped: {skipped}, Errors: {errors}")

if __name__ == "__main__":
    main()
