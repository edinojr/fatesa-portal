-- ==============================================================================
-- CORREÇÃO: Alunos Formados (Alumni), Liberações Exceção e Logs de Acesso
-- Data: 2026-11-04
-- ==============================================================================

BEGIN;

-- 1. REGISTROS_ALUMNI: Garantir coluna 'cpf' e compatibilidade com 'rg'
ALTER TABLE IF EXISTS public.registros_alumni
  ADD COLUMN IF NOT EXISTS cpf TEXT;

UPDATE public.registros_alumni
SET cpf = rg
WHERE cpf IS NULL AND rg IS NOT NULL;

UPDATE public.registros_alumni
SET rg = cpf
WHERE rg IS NULL AND cpf IS NOT NULL;

-- 2. LIBERACOES_EXCECAO: Garantir coluna 'created_at' e sincronizar com 'granted_at'
ALTER TABLE IF EXISTS public.liberacoes_excecao
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.liberacoes_excecao
SET created_at = granted_at
WHERE created_at IS NULL AND granted_at IS NOT NULL;

-- 3. PORTAL_ACCESS_LOGS: Otimizar verificação de Admin via função STABLE SECURITY DEFINER
--    Isso evita timeouts (HTTP 500) causados por reexecução de subqueries RLS linha a linha.
CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'suporte')
        OR caminhos_acesso && ARRAY['admin', 'suporte']::TEXT[]
      )
  );
$$;

DROP POLICY IF EXISTS "Allow admins to select portal_access_logs" ON public.portal_access_logs;
DROP POLICY IF EXISTS "Admins can view analytics" ON public.portal_access_logs;
DROP POLICY IF EXISTS "Admins can view access logs" ON public.portal_access_logs;

CREATE POLICY "Admins can view access logs" ON public.portal_access_logs
FOR SELECT TO authenticated
USING (public.is_admin_or_support());

-- 4. Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';

COMMIT;
