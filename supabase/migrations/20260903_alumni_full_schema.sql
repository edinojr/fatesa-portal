-- ==============================================================================
-- CORREÇÃO ALUMNI: schema completo de registros_alumni
-- ------------------------------------------------------------------------------
-- PROBLEMA: a tabela em produção possui apenas (id, nome, email, curso,
-- nivel_curso, created_at). As colunas usadas pelo painel "Base de Formados"
-- (ano_formacao, nucleo, matricula, rg, telefone, cep, endereco, bairro,
-- cidade, uf, codigo_verificacao, user_id, observacoes, historico) NÃO existem,
-- causando HTTP 400 (code 42703 "column does not exist") no select/insert.
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run.
-- Idempotente: pode ser reexecutado sem erro.
-- ==============================================================================

BEGIN;

-- 1. Adicionar TODAS as colunas usadas pela aplicação
ALTER TABLE public.registros_alumni
  ADD COLUMN IF NOT EXISTS nucleo TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS ano_formacao TEXT,
  ADD COLUMN IF NOT EXISTS matricula TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS codigo_verificacao UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS historico JSONB DEFAULT '[]'::jsonb;

-- 2. Preencher codigo_verificacao em registros antigos que ficaram NULL
UPDATE public.registros_alumni
SET codigo_verificacao = gen_random_uuid()
WHERE codigo_verificacao IS NULL;

-- 3. Garantir unicidade por e-mail (necessária para o upsert de importação)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.registros_alumni'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%(email)%'
    ) THEN
        ALTER TABLE public.registros_alumni ADD CONSTRAINT unique_alumni_email UNIQUE (email);
    END IF;
END $$;

-- 4. Índices de busca e agrupamento
CREATE INDEX IF NOT EXISTS idx_alumni_ano_nivel ON public.registros_alumni(ano_formacao, nivel_curso);
CREATE INDEX IF NOT EXISTS idx_registros_alumni_verificacao ON public.registros_alumni(codigo_verificacao);
CREATE INDEX IF NOT EXISTS idx_registros_alumni_user_id ON public.registros_alumni(user_id);

-- 5. RLS e políticas (staff gerencia; aluno atualiza o próprio; leitura pública
--    p/ verificação de certificado)
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff_Total_Access_Alumni" ON public.registros_alumni;
CREATE POLICY "Staff_Total_Access_Alumni" ON public.registros_alumni
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo IN ('admin', 'professor', 'suporte')
    )
  );

DROP POLICY IF EXISTS "Alumni_Self_Identity" ON public.registros_alumni;
CREATE POLICY "Alumni_Self_Identity" ON public.registros_alumni
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public_Read_Alumni" ON public.registros_alumni;
CREATE POLICY "Public_Read_Alumni" ON public.registros_alumni
  FOR SELECT USING (true);

-- 6. RPC pública de verificação de certificado (usada por graduationService)
CREATE OR REPLACE FUNCTION public.verificar_certificado(p_codigo UUID)
RETURNS TABLE (
  nome TEXT,
  curso TEXT,
  nivel_curso TEXT,
  ano_formacao TEXT,
  nucleo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.nome,
    r.curso,
    r.nivel_curso,
    r.ano_formacao,
    r.nucleo
  FROM public.registros_alumni r
  WHERE r.codigo_verificacao = p_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Recarregar cache do PostgREST (essencial para o 42703 sumir)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verificação rápida (opcional, rodar separado):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'registros_alumni'
-- ORDER BY ordinal_position;
