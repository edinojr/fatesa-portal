-- =====================================================
-- FIX DEFINITIVO: Liberar gerenciamento de conteúdo
-- para admin, professor, suporte e colaborador.
--
-- IMPORTANTE: Este script NÃO engole erros. Se algo falhar,
-- você verá exatamente qual foi a política/stmt que falhou.
-- Execute no SQL Editor do Supabase.
-- =====================================================

-- ───────────────────────────────────────────────────────
-- 0. DIAGNÓSTICO: o que existe ANTES
-- ───────────────────────────────────────────────────────
SELECT 'ANTES — aulas policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aulas'
ORDER BY cmd;

SELECT 'ANTES — livros (tabela) policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'livros'
ORDER BY cmd;

SELECT 'ANTES — cursos policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cursos'
ORDER BY cmd;

SELECT 'ANTES — storage.objects (bucket livros)' AS etapa, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND qual LIKE '%livros%';

-- ───────────────────────────────────────────────────────
-- 1. GARANTIR que o bucket 'livros' é PÚBLICO
--    (sem isso, qualquer URL de leitura retorna 400)
-- ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('livros', 'livros', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ───────────────────────────────────────────────────────
-- 2. STORAGE POLICIES (bucket livros)
-- ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public Access for livros" ON storage.objects;
CREATE POLICY "Public Access for livros" ON storage.objects
  FOR SELECT USING (bucket_id = 'livros');

DROP POLICY IF EXISTS "Admins can upload livros" ON storage.objects;
CREATE POLICY "Admins can upload livros" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'livros' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can update livros" ON storage.objects;
CREATE POLICY "Admins can update livros" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'livros' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can delete livros" ON storage.objects;
CREATE POLICY "Admins can delete livros" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'livros' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

-- ───────────────────────────────────────────────────────
-- 3. TABELA aulas — INSERT / UPDATE / DELETE
--    (O schema original só criou SELECT. Esta é a causa
--     do "new row violates row-level security policy".)
-- ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert aulas" ON public.aulas;
CREATE POLICY "Admins can insert aulas" ON public.aulas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can update aulas" ON public.aulas;
CREATE POLICY "Admins can update aulas" ON public.aulas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can delete aulas" ON public.aulas;
CREATE POLICY "Admins can delete aulas" ON public.aulas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

-- ───────────────────────────────────────────────────────
-- 4. TABELA livros (módulos) — INSERT / UPDATE / DELETE
-- ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert livros" ON public.livros;
CREATE POLICY "Admins can insert livros" ON public.livros
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can update livros" ON public.livros;
CREATE POLICY "Admins can update livros" ON public.livros
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can delete livros" ON public.livros;
CREATE POLICY "Admins can delete livros" ON public.livros
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte', 'colaborador')
    )
  );

-- ───────────────────────────────────────────────────────
-- 5. TABELA cursos (trilhas) — INSERT / UPDATE / DELETE
-- ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert cursos" ON public.cursos;
CREATE POLICY "Admins can insert cursos" ON public.cursos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can update cursos" ON public.cursos;
CREATE POLICY "Admins can update cursos" ON public.cursos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'suporte', 'colaborador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'suporte', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins can delete cursos" ON public.cursos;
CREATE POLICY "Admins can delete cursos" ON public.cursos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'suporte', 'colaborador')
    )
  );

-- ───────────────────────────────────────────────────────
-- 6. CORRIGIR URLs ANTIGAS gravadas sem /public/
--    (Arquivos uploadados antes do fix geravam
--     /storage/v1/object/livros/... — que retorna 400.
--     Aqui trocamos por /storage/v1/object/public/livros/...)
-- ───────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────
-- 7. DIAGNÓSTICO: o que existe DEPOIS
-- ───────────────────────────────────────────────────────
SELECT 'DEPOIS — aulas policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aulas'
ORDER BY cmd;

SELECT 'DEPOIS — livros (tabela) policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'livros'
ORDER BY cmd;

SELECT 'DEPOIS — cursos policies' AS etapa, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cursos'
ORDER BY cmd;

SELECT 'DEPOIS — bucket livros' AS etapa, id, name, public
FROM storage.buckets WHERE id = 'livros';

-- Recarrega o schema do PostgREST para recognizar as novas políticas
NOTIFY pgrst, 'reload schema';