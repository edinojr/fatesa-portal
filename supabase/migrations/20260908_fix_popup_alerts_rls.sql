-- ==============================================================================
-- FIX POPUP ALERTS RLS: reconhece staff por caminhos_acesso (alem de tipo)
-- ------------------------------------------------------------------------------
-- PROBLEMA: o usuario de suporte (edi.ben.jr@gmail.com) possui tipo = 'online'
--   mas caminhos_acesso = [admin, suporte, professor, aluno]. A UI libera o painel
--   por caminhos_acesso, porem a politica "Admins podem gerenciar popups"
--   validava apenas tipo = 'admin' -> desativar/editar/excluir popup retornava 403
--   (row-level security), pois INSERT/UPDATE/DELETE ficavam bloqueados.
--
-- SOLUCAO: reutilizar o mesmo helper check_is_admin_or_suporte() ja usado nas
--   politicas de gestao de conteudo (aulas/livros/cursos), que aceita staff por
--   tipo OU por caminhos_acesso. Padrao tambem seguido por historico_notas,
--   registros_alumni e pela logica de autorizacao em ProtectedRoute.tsx.
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

-- 1. Garante o helper reutilizavel (admin ou suporte, inclusive via caminhos_acesso)
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

GRANT EXECUTE ON FUNCTION public.check_is_admin_or_suporte() TO authenticated;

-- 2. Substitui a politica restrita (tipo = 'admin') pela versao staff + paths
DROP POLICY IF EXISTS "Admins podem gerenciar popups" ON public.popup_alerts;

CREATE POLICY "Admins podem gerenciar popups" ON public.popup_alerts
  FOR ALL TO authenticated
  USING (public.check_is_admin_or_suporte())
  WITH CHECK (public.check_is_admin_or_suporte());

NOTIFY pgrst, 'reload schema';

COMMIT;