-- Adicionar coluna de nome na tabela de professores autorizados
ALTER TABLE public.professores_autorizados ADD COLUMN IF NOT EXISTS nome TEXT;

-- Adicionar coluna de nome do professor na tabela de livros (Módulos)
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS professor_nome TEXT;
