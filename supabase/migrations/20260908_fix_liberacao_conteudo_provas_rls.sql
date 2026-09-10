-- ==============================================================================
-- FIX RLS LIBERAÇÃO DE CONTEÚDO E PROVAS (professor_active em aulas/livros)
-- ------------------------------------------------------------------------------
-- PROBLEMA:
--   O usuário admin (edi.ben.jr@gmail.com) tem tipo='online' e admin via
--   caminhos_acesso=['admin','suporte','professor','aluno']. Os painéis de
--   Liberação de Conteúdos e de Provas liberam linhas em liberacoes_nucleo
--   (funciona), MAS o fluxo também precisa ATIVAR as lições/módulos atualizando
--   aulas.professor_active e livros.professor_active.
--
--   Essas atualizações dependem de políticas UPDATE em aulas/livros que aceitem
--   staff por caminhos_acesso (helper check_is_staff). Esse helper/políticas
--   (migration 20270818_fix_content_management_rls.sql) NUNCA foram aplicadas
--   no banco remoto -> UPDATE retorna 42501 (row-level security) -> o conteúdo
--   e as provas ficam com professor_active=false e os alunos não os veem.
--
-- SOLUÇÃO:
--   Recriar os helpers de staff (por tipo OU caminhos_acesso) e as políticas
--   INSERT/UPDATE/DELETE de aulas e livros. Também garante is_staff_or_paths e
--   check_is_admin_or_suporte (usados por outras tabelas) para o banco ficar
--   consistente com o código (ProtectedRoute.tsx / isStaff).
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

-- 1. Helpers padronizados de staff (tipo OU caminhos_acesso) — SECURITY DEFINER
--    para quebrar recursão de RLS e funcionar em políticas de UPDATE.
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

CREATE OR REPLACE FUNCTION public.is_staff_or_paths()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.tipo IN ('admin', 'professor', 'suporte')
        OR u.caminhos_acesso && ARRAY['admin', 'suporte', 'professor']::TEXT[]
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.check_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin_or_suporte() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_paths() TO authenticated;

-- 2. AULAS — políticas de escrita para staff (admin/suporte/professor via
--    caminhos_acesso). Essencial para atualizar aulas.professor_active no
--    fluxo de liberar conteúdo/provas.
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

-- 3. LIVROS — políticas de escrita para staff. Substitui a política antiga
--    "Staff can update livros" (20260622) que checava apenas tipo e por isso
--    bloqueava o admin tipo='online'.
DROP POLICY IF EXISTS "Admins can insert livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can update livros" ON public.livros;
DROP POLICY IF EXISTS "Admins can delete livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated insert livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated update livros" ON public.livros;
DROP POLICY IF EXISTS "Authenticated delete livros" ON public.livros;
DROP POLICY IF EXISTS "Staff can update livros" ON public.livros;
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

-- 4. CURSOS — políticas de escrita para admin/suporte (consistência com o resto)
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

-- 5. LIBERAÇÕES POR NÚCLEO — garante política de escrita para staff por
--    caminhos_acesso (idempotente; já pode existir de migrações anteriores).
DROP POLICY IF EXISTS "Gestao_Total_Staff" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Staff_Or_Paths_Liberacoes_Nucleo" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "liberacoes_gestao_staff" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "release_control_all_staff" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Staff manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Admins and Professors can manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Professors manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Staff can manage all releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Anyone can view releases" ON public.liberacoes_nucleo;

DROP POLICY IF EXISTS "liberacoes_leitura_todos" ON public.liberacoes_nucleo;

CREATE POLICY "liberacoes_leitura_todos" ON public.liberacoes_nucleo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "liberacoes_gestao_staff" ON public.liberacoes_nucleo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte', 'colaborador')
          OR u.caminhos_acesso && ARRAY['admin', 'professor', 'suporte', 'colaborador']
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte', 'colaborador')
          OR u.caminhos_acesso && ARRAY['admin', 'professor', 'suporte', 'colaborador']
        )
    )
  );

GRANT ALL ON public.liberacoes_nucleo TO authenticated;

-- 6. Reload do schema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
