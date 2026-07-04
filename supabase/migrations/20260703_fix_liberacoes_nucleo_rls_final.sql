-- FIX: Remove conflicting RLS policies on liberacoes_nucleo that block admins/professors
-- Root cause: Multiple FOR ALL policies coexisting with different WITH CHECK conditions.
-- "Staff manage releases" checks tipo only, "Gestao_Total_Staff" checks tipo OR caminhos_acesso.
-- PostgreSQL requires ALL policies' WITH CHECK to pass for INSERT.
-- Users with tipo='aluno' but caminhos_acesso containing 'professor' pass Gestao_Total_Staff
-- but fail "Staff manage releases", causing 403/42501.

BEGIN;

-- Drop ALL existing policies to clean slate
DROP POLICY IF EXISTS "Staff manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Gestao_Total_Staff" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Admins and Professors can manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Professors manage releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Students can view releases for their nucleo" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Leitura_Aluno_Liberacoes" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Staff can manage all releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Anyone can view releases" ON public.liberacoes_nucleo;

-- Create unified read policy: all authenticated users can see releases
CREATE POLICY "liberacoes_leitura_todos" ON public.liberacoes_nucleo
FOR SELECT
TO authenticated
USING (true);

-- Create unified write policy: staff (via tipo OR caminhos_acesso) can manage
CREATE POLICY "liberacoes_gestao_staff" ON public.liberacoes_nucleo
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'professor', 'suporte')
        OR caminhos_acesso && ARRAY['admin', 'professor', 'suporte']
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'professor', 'suporte')
        OR caminhos_acesso && ARRAY['admin', 'professor', 'suporte']
      )
  )
);

GRANT ALL ON public.liberacoes_nucleo TO authenticated;
GRANT ALL ON public.liberacoes_nucleo TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
