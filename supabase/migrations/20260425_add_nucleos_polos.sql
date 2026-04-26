-- Fatesa Nucleos e Polos Migration - 2026-04-25
-- Autor: Engenheiro de Banco de Dados Especialista
-- Objetivo: Implementação de gestão de unidades físicas (Polos) e regras de acesso para Coordenadores de Polo.

BEGIN;

-- 1. Adicionar o novo tipo de usuário ao ENUM existente
-- Nota: ALTER TYPE ADD VALUE não pode ser executado dentro de um bloco de transação em versões antigas do Postgres,
-- mas o Supabase/Postgres moderno permite se não houver uso imediato.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'coordenador_polo') THEN
        ALTER TYPE public.user_tipo ADD VALUE 'coordenador_polo';
    END IF;
END $$;

-- 2. Garantir e expandir a tabela 'nucleos'
-- A tabela já existe, então adicionamos colunas faltantes para suportar a expansão.
ALTER TABLE public.nucleos 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'manutencao')),
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id);

-- Comentário para documentação: A tabela 'nucleos' agora suporta:
-- ID, Nome, Cidade, Estado, Status, Created_at (Data_Criacao)

-- 3. Garantir a coluna 'nucleo_id' nas tabelas de usuários
-- O sistema centraliza Alunos, Professores e Admins na tabela 'users'.
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;

-- 4. Refatoração de Políticas de Row Level Security (RLS)

-- Função auxiliar para verificar se o usuário é Coordenador de um Polo específico
CREATE OR REPLACE FUNCTION public.get_user_nucleo_id(user_uuid UUID)
RETURNS UUID AS $$
    SELECT nucleo_id FROM public.users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4.1. Políticas para a tabela NUCLEOS
DROP POLICY IF EXISTS "Coordenadores veem seu nucleo" ON public.nucleos;
CREATE POLICY "Coordenadores veem seu nucleo" ON public.nucleos
FOR SELECT USING (
    id = public.get_user_nucleo_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- 4.2. Políticas para a tabela USERS (Alunos e Professores)
DROP POLICY IF EXISTS "Coordenadores veem alunos do seu nucleo" ON public.users;
CREATE POLICY "Coordenadores veem alunos do seu nucleo" ON public.users
FOR SELECT USING (
    (tipo = 'online' OR tipo = 'presencial') AND 
    nucleo_id = public.get_user_nucleo_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'coordenador_polo')
);


-- 4.4. Políticas para a tabela FREQUENCIA (Presenças)
DROP POLICY IF EXISTS "Coordenadores veem frequencia do seu nucleo" ON public.frequencia;
CREATE POLICY "Coordenadores veem frequencia do seu nucleo" ON public.frequencia
FOR SELECT USING (
    nucleo_id = public.get_user_nucleo_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'coordenador_polo')
);

-- 5. Garantir que Admins Globais continuem com acesso total
-- As políticas de Admin geralmente são definidas como:
-- USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin'))

COMMIT;

-- Notificar o PostgREST para recarregar o schema devido à mudança no ENUM
NOTIFY pgrst, 'reload schema';
