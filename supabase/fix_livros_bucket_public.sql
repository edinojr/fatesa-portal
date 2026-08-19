-- =====================================================
-- CORREÇÃO DEFINITIVA: Tornar bucket 'livros' público
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. FORÇAR o bucket livros como público (UPDATE, não INSERT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('livros', 'livros', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Confirmar que ficou público
SELECT id, name, public FROM storage.buckets WHERE id = 'livros';

-- 2. Recriar política de leitura pública (sem necessidade de autenticação)
DROP POLICY IF EXISTS "Public Access for livros" ON storage.objects;
CREATE POLICY "Public Access for livros" ON storage.objects 
  FOR SELECT USING (bucket_id = 'livros');

-- 3. Política de upload para admin, suporte, colaborador, professor
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

-- Confirmar políticas criadas
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
