-- ==============================================================================
-- LIBERAÇÃO/BLOQUEIO INDIVIDUAL DE LIÇÃO + HIATO
-- ------------------------------------------------------------------------------
-- 1. Cria a tabela exclusoes_modulo_aluno (referenciada pelo código, mas nunca
--    criada no banco). Usada para BLOQUEAR módulos individualmente por aluno
--    e para marcar HIATO (motivo='hiato').
-- 2. Padroniza as políticas RLS das tabelas de liberação para aceitar staff
--    por tipo OU por caminhos_acesso (contas como edi.ben.jr@gmail.com têm
--    tipo='online' com caminhos admin).
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

-- 1. Tabela de bloqueio individual de módulos por aluno
CREATE TABLE IF NOT EXISTS public.exclusoes_modulo_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  livro_id UUID REFERENCES public.livros(id) ON DELETE CASCADE NOT NULL,
  motivo TEXT DEFAULT 'manual',
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, livro_id)
);

CREATE INDEX IF NOT EXISTS idx_exclusoes_modulo_aluno_user ON public.exclusoes_modulo_aluno(user_id);

ALTER TABLE public.exclusoes_modulo_aluno ENABLE ROW LEVEL SECURITY;

-- 2. Política inclusiva de staff (tipo OU caminhos_acesso) — reutilizável
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

-- 2b. Garantir unique constraints usadas pelos upserts (onConflict) do app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.liberacoes_excecao'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%livro_id%'
  ) THEN
    ALTER TABLE public.liberacoes_excecao ADD CONSTRAINT uq_liberacoes_excecao UNIQUE (user_id, livro_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.liberacoes_excecao_atividade'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%aula_id%'
  ) THEN
    ALTER TABLE public.liberacoes_excecao_atividade ADD CONSTRAINT uq_liberacoes_atividade UNIQUE (user_id, aula_id);
  END IF;
END $$;

-- 3. Aplicar em todas as tabelas de liberação (políticas permissivas somam — OR)
DROP POLICY IF EXISTS "Staff_Or_Paths_Exclusoes" ON public.exclusoes_modulo_aluno;
CREATE POLICY "Staff_Or_Paths_Exclusoes" ON public.exclusoes_modulo_aluno
  FOR ALL USING (public.is_staff_or_paths()) WITH CHECK (public.is_staff_or_paths());

DROP POLICY IF EXISTS "Aluno_Ve_Proprias_Exclusoes" ON public.exclusoes_modulo_aluno;
CREATE POLICY "Aluno_Ve_Proprias_Exclusoes" ON public.exclusoes_modulo_aluno
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff_Or_Paths_Liberacoes_Excecao" ON public.liberacoes_excecao;
CREATE POLICY "Staff_Or_Paths_Liberacoes_Excecao" ON public.liberacoes_excecao
  FOR ALL USING (public.is_staff_or_paths()) WITH CHECK (public.is_staff_or_paths());

DROP POLICY IF EXISTS "Staff_Or_Paths_Liberacoes_Atividade" ON public.liberacoes_excecao_atividade;
CREATE POLICY "Staff_Or_Paths_Liberacoes_Atividade" ON public.liberacoes_excecao_atividade
  FOR ALL USING (public.is_staff_or_paths()) WITH CHECK (public.is_staff_or_paths());

DROP POLICY IF EXISTS "Staff_Or_Paths_Liberacoes_Nucleo" ON public.liberacoes_nucleo;
CREATE POLICY "Staff_Or_Paths_Liberacoes_Nucleo" ON public.liberacoes_nucleo
  FOR ALL USING (public.is_staff_or_paths()) WITH CHECK (public.is_staff_or_paths());

-- 4. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
