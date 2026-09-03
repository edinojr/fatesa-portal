-- ==============================================================================
-- CORREÇÃO ALUMNI v2: inserts e RLS
-- ------------------------------------------------------------------------------
-- PROBLEMA 1 (400 em todo INSERT): a tabela em produção possui as colunas
--   ano_conclusao INTEGER NOT NULL (sem default) e curso/nivel_curso NOT NULL,
--   herdadas de um schema alternativo criado fora do repo. A aplicação nunca
--   envia ano_conclusao -> "null value in column ano_conclusao violates
--   not-null constraint" (HTTP 400).
--
-- PROBLEMA 2 (403): as políticas RLS só permitem escrita por staff. Dois fluxos
--   legítimos quebram:
--   a) Auto-graduação do aluno (ModulosFinalizados -> graduationService) faz
--      INSERT com user_id = auth.uid();
--   b) Vínculo de ex-aluno no cadastro (Signup web/mobile) faz UPDATE
--      set user_id em registro ainda sem dono (user_id IS NULL).
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

-- 1. Relaxar NOT NULL que quebram os inserts da aplicação
ALTER TABLE public.registros_alumni
  ALTER COLUMN ano_conclusao DROP NOT NULL,
  ALTER COLUMN curso DROP NOT NULL,
  ALTER COLUMN nivel_curso DROP NOT NULL,
  ALTER COLUMN nivel_curso SET DEFAULT 'Básico';

-- 2. Backfill de ano_conclusao a partir de ano_formacao
UPDATE public.registros_alumni
SET ano_conclusao = ano_formacao::int
WHERE ano_conclusao IS NULL
  AND ano_formacao ~ '^\d{4}$';

-- 3. Manter ano_conclusao sincronizado automaticamente (o app só envia ano_formacao)
CREATE OR REPLACE FUNCTION public.fn_sync_alumni_ano_conclusao()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.ano_conclusao := CASE
    WHEN NEW.ano_conclusao IS NOT NULL THEN NEW.ano_conclusao
    WHEN NEW.ano_formacao ~ '^\d{4}$' THEN NEW.ano_formacao::int
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_alumni_ano_conclusao ON public.registros_alumni;
CREATE TRIGGER trg_sync_alumni_ano_conclusao
  BEFORE INSERT OR UPDATE OF ano_formacao, ano_conclusao
  ON public.registros_alumni
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_alumni_ano_conclusao();

-- 4. RLS: permitir que o aluno crie o PRÓPRIO registro de formando (auto-graduação)
DROP POLICY IF EXISTS "Alumni_Self_Insert" ON public.registros_alumni;
CREATE POLICY "Alumni_Self_Insert" ON public.registros_alumni
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. RLS: permitir que o formando atualize o próprio registro E que um
--    ex-aluno recém-cadastrado vincule (claim) um registro sem dono cujo
--    e-mail bate com o do JWT (fluxo do Signup web/mobile).
DROP POLICY IF EXISTS "Alumni_Self_Identity" ON public.registros_alumni;
CREATE POLICY "Alumni_Self_Identity" ON public.registros_alumni
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 6. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
