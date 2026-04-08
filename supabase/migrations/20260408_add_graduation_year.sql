-- 1. Adicionar coluna ano_graduacao à tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ano_graduacao TEXT;

-- 2. Atualizar comentários para fins de documentação
COMMENT ON COLUMN public.users.ano_graduacao IS 'Ano em que o aluno se formou (apenas para ex-alunos)';

-- 3. (Opcional) Tentar preencher com dados de registros_alumni se o e-mail bater
UPDATE public.users u
SET ano_graduacao = r.ano_formacao
FROM public.registros_alumni r
WHERE LOWER(u.email) = LOWER(r.email)
AND u.ano_graduacao IS NULL;
