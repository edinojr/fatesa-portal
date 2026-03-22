-- Criar colunas que faltavam para o painel de aprovação administrativa de alunos

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS acesso_definitivo BOOLEAN DEFAULT false;

-- Recarregar cache do Supabase (Apenas informativo, o Supabase já faz isso na interface web)
NOTIFY pgrst, 'reload schema';
