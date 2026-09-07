-- Dados pessoais do aluno no painel: RG e foto de perfil.
-- (cpf, telefone e endereco já existem na tabela users)
-- Aplicar no SQL Editor do Supabase:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';
