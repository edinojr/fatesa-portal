-- =====================================================
-- FIX: Gestão de Conteúdo no Painel Administrador
-- Problema: Admin/Suporte não consegue INSERIR ou EXCLUIR
--           conteúdo (aulas/livros/cursos) nem fazer upload de PDFs.
-- Causa: As políticas RLS existentes em aulas/livros/cursos
--        são apenas FOR SELECT. Faltam INSERT/UPDATE/DELETE.
--        O script supabase/diagnostico_e_fix_conteudo.sql resolvia
--        isso, mas nunca foi registrado como migration oficial,
--        então se perdeu em resets/reaplicações.
-- =====================================================

BEGIN;

-- 1. FUNÇÃO HELPER SECURITY DEFINER (evita recursão infinita em RLS)
--    check_is_admin() já existe (só checa tipo='admin').
--    Criamos check_is_staff() para cobrir admin, suporte e professor
--    (inclusive via caminhos_acesso), usada nas políticas de escrita.
CREATE OR REPLACE FUNCTION public.check_is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND (
            tipo IN ('admin', 'suporte', 'professor')
            OR caminhos_acesso && ARRAY['admin', 'suporte', 'professor']
        )
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Admin full (admin ou suporte, inclusive via caminhos_acesso)
CREATE OR REPLACE FUNCTION public.check_is_admin_or_suporte()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND (
            tipo IN ('admin', 'suporte')
            OR caminhos_acesso && ARRAY['admin', 'suporte']
        )
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin_or_suporte() TO authenticated;

-- 2. AULAS — políticas de escrita para staff (admin/suporte/professor)
DROP POLICY IF EXISTS "Admins can insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins can update aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins can delete aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated update aulas" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated delete aulas" ON public.aulas;
DROP POLICY IF EXISTS "Staff insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Staff update aulas" ON public.aulas;
DROP POLICY IF EXISTS "Staff delete aulas" ON public.aulas;

CREATE POLICY "Staff insert aulas" ON public.aulas
    FOR INSERT TO authenticated
    WITH CHECK (public.check_is_staff());

CREATE POLICY "Staff update aulas" ON public.aulas
    FOR UPDATE TO authenticated
    USING (public.check_is_staff())
    WITH CHECK (public.check_is_staff());

CREATE POLICY "Staff delete aulas" ON public.aulas
    FOR DELETE TO authenticated
    USING (public.check_is_staff());

-- 3. LIVROS (tabela) — políticas de escrita para admin/suporte
DROP POLICY IF EXISTS "Admins can insert livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can update livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can delete livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated insert livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated update livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated delete livros" ON public.livros;
DROP POLICY IF EXISTS "Staff insert livros" ON public.livros;
DROP POLICY IF EXISTS "Staff update livros" ON public.livros;
DROP POLICY IF EXISTS "Staff delete livros" ON public.livros;

CREATE POLICY "Staff insert livros" ON public.livros
    FOR INSERT TO authenticated
    WITH CHECK (public.check_is_staff());

CREATE POLICY "Staff update livros" ON public.livros
    FOR UPDATE TO authenticated
    USING (public.check_is_staff())
    WITH CHECK (public.check_is_staff());

CREATE POLICY "Staff delete livros" ON public.livros
    FOR DELETE TO authenticated
    USING (public.check_is_staff());

-- 4. CURSOS — políticas de escrita para admin/suporte
DROP POLICY IF EXISTS "Admins can insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins can update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins can delete cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated delete cursos" ON public.cursos;
DROP POLICY IF EXISTS "Staff insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Staff update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Staff delete cursos" ON public.cursos;

CREATE POLICY "Staff insert cursos" ON public.cursos
    FOR INSERT TO authenticated
    WITH CHECK (public.check_is_admin_or_suporte());

CREATE POLICY "Staff update cursos" ON public.cursos
    FOR UPDATE TO authenticated
    USING (public.check_is_admin_or_suporte())
    WITH CHECK (public.check_is_admin_or_suporte());

CREATE POLICY "Staff delete cursos" ON public.cursos
    FOR DELETE TO authenticated
    USING (public.check_is_admin_or_suporte());

-- 5. STORAGE bucket 'livros' — garante upload/update/delete para staff
--    (inclui suporte e colaborador, além de admin/professor)
DROP POLICY IF EXISTS "Admins can upload livros" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update livros" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete livros" ON storage.objects;

CREATE POLICY "Staff can upload livros" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'livros' AND public.check_is_staff()
    );

CREATE POLICY "Staff can update livros" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'livros' AND public.check_is_staff()
    )
    WITH CHECK (
        bucket_id = 'livros' AND public.check_is_staff()
    );

CREATE POLICY "Staff can delete livros" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'livros' AND public.check_is_staff()
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
