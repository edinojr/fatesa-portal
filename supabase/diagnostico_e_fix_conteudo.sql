-- =====================================================
-- DIAGNÓSTICO COMPLETO + FIX PERMISSIVO
-- Rode no SQL Editor do Supabase e cole TODA a saída aqui.
-- =====================================================

-- 1) Quem é o usuário logado agora e qual seu tipo?
SELECT 'USUARIO LOGADO' AS etapa,
       auth.uid() AS uid,
       u.email,
       u.tipo
FROM public.users u
WHERE u.id = auth.uid();

-- 2) Lista TODAS as políticas atuais no bucket 'livros' (storage)
SELECT 'POLICIES STORAGE livros' AS etapa,
       policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (qual LIKE '%livros%' OR with_check LIKE '%livros%');

-- 3) Lista TODAS as políticas atuais nas tabelas aulas/livros/cursos
SELECT 'POLICIES aulas' AS etapa, policyname, cmd, permissive, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aulas';

SELECT 'POLICIES livros (tabela)' AS etapa, policyname, cmd, permissive, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'livros';

SELECT 'POLICIES cursos' AS etapa, policyname, cmd, permissive, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cursos';

-- =====================================================
-- FIX PERMISSIVO — qualquer usuário autenticado gerencia
-- conteúdo no bucket livros + tabelas aulas/livros/cursos.
-- (Mais permissivo, mas elimina qualquer dúvida sobre
--  tipo/RLS. Ajuste depois se quiser restringir.)
-- =====================================================

-- 4) Bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('livros', 'livros', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5) STORAGE: LIMPA e recria TODAS as políticas do bucket livros
DROP POLICY IF EXISTS "Public Access for livros" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload livros" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update livros" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete livros" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload livros" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update livros" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete livros" ON storage.objects;

CREATE POLICY "Public Access for livros" ON storage.objects
  FOR SELECT USING (bucket_id = 'livros');

CREATE POLICY "Authenticated Upload livros" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'livros' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Update livros" ON storage.objects
  FOR UPDATE USING (bucket_id = 'livros' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'livros' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Delete livros" ON storage.objects
  FOR DELETE USING (bucket_id = 'livros' AND auth.uid() IS NOT NULL);

-- 6) AULAS: garante INSERT/UPDATE/DELETE para qualquer autenticado
DROP POLICY IF EXISTS "Admins can insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins can update aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins can delete aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated update aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated delete aulas" ON public.aulas;

CREATE POLICY "Authenticated insert aulas" ON public.aulas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update aulas" ON public.aulas
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete aulas" ON public.aulas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7) LIVROS (tabela): garante INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can insert livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can update livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can delete livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated insert livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated update livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated delete livros" ON public.livros;

CREATE POLICY "Authenticated insert livros" ON public.livros
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update livros" ON public.livros
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete livros" ON public.livros
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 8) CURSOS: garante INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins can update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins can delete cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated delete cursos" ON public.cursos;

CREATE POLICY "Authenticated insert cursos" ON public.cursos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update cursos" ON public.cursos
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete cursos" ON public.cursos
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 9) Corrige URLs antigas gravadas sem /public/
UPDATE public.aulas
SET arquivo_url = REPLACE(arquivo_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE arquivo_url LIKE '%/storage/v1/object/livros/%'
  AND arquivo_url NOT LIKE '%/storage/v1/object/public/livros/%';

UPDATE public.aulas
SET pdf_url = REPLACE(pdf_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE pdf_url LIKE '%/storage/v1/object/livros/%'
  AND pdf_url NOT LIKE '%/storage/v1/object/public/livros/%';

UPDATE public.livros
SET capa_url = REPLACE(capa_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE capa_url LIKE '%/storage/v1/object/livros/%'
  AND capa_url NOT LIKE '%/storage/v1/object/public/livros/%';

-- 10) Estado FINAL
SELECT 'DEPOIS - aulas' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aulas' AND cmd IN ('INSERT','UPDATE','DELETE');

SELECT 'DEPOIS - livros (tabela)' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'livros' AND cmd IN ('INSERT','UPDATE','DELETE');

SELECT 'DEPOIS - storage livros' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  AND (qual LIKE '%livros%' OR with_check LIKE '%livros%');

SELECT 'DEPOIS - bucket' AS etapa, id, name, public
FROM storage.buckets WHERE id = 'livros';

NOTIFY pgrst, 'reload schema';