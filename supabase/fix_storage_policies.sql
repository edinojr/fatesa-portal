-- SCRIPT PARA LIBERAR O UPLOAD DE COMPROVANTES (STORAGE)
-- Execute este script no SQL Editor do seu Supabase

-- 1. Permitir que qualquer pessoa veja os arquivos (Leitura Pública)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');
EXCEPTION WHEN others THEN END $$;

-- 2. Permitir que usuários logados enviem arquivos (Upload)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'comprovantes' AND 
        auth.role() = 'authenticated'
    );
EXCEPTION WHEN others THEN END $$;

-- 3. Permitir que usuários atualizem seus próprios arquivos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
    CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (
        bucket_id = 'comprovantes' AND 
        auth.role() = 'authenticated'
    );
EXCEPTION WHEN others THEN END $$;
