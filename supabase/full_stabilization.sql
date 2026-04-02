-- ATENÇÃO: Este script irá RECOMEÇAR as tabelas de suporte para garantir que não haja erros de coluna.
-- Ele NÃO apaga seus usuários nem seus cursos.

-- 1. Restaurar Colunas de Usuários (Caso falte)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bolsista BOOLEAN DEFAULT FALSE;

-- 2. Limpeza de tabelas problemáticas (Para recriar do zero com a estrutura correta)
DROP TABLE IF EXISTS public.liberacoes_nucleo CASCADE;
DROP TABLE IF EXISTS public.registros_alumni CASCADE;
DROP TABLE IF EXISTS public.avisos CASCADE;
DROP TABLE IF EXISTS public.materiais_adicionais CASCADE;
DROP TABLE IF EXISTS public.respostas_atividades_extra CASCADE;
DROP TABLE IF EXISTS public.atividades CASCADE;
DROP TABLE IF EXISTS public.portal_access_logs CASCADE;

-- 3. Recriar Nucleos (Base)
CREATE TABLE IF NOT EXISTS public.nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logradouro TEXT,
  bairro TEXT,
  numero TEXT,
  horario_aulas TEXT,
  isento BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recriar Tabela de Liberação (O professor usa isso para liberar vídeos)
CREATE TABLE public.liberacoes_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'modulo', 'video', 'atividade'
  liberado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_nucleo_release UNIQUE (nucleo_id, item_id, item_type)
);

-- 5. Recriar Avisos
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Recriar Materiais
CREATE TABLE public.materiais_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivos JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Recriar Atividades do Polo
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  questionario JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Recriar Respostas Extras
CREATE TABLE public.respostas_atividades_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  respostas JSONB DEFAULT '{}',
  nota NUMERIC,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_extra_res UNIQUE (atividade_id, aluno_id)
);

-- 9. Recriar Portal Access Logs
CREATE TABLE public.portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Recriar Registros Alumni
CREATE TABLE public.registros_alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  curso TEXT NOT NULL,
  nivel_curso TEXT NOT NULL,
  ano_conclusao INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Estabilizar Constraints de Respostas e Liberações (Garante que upsert funcione)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_aluno_aula') THEN
        ALTER TABLE public.respostas_aulas ADD CONSTRAINT unique_aluno_aula UNIQUE (aluno_id, aula_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_liberacao_item') THEN
        ALTER TABLE public.liberacoes_nucleo ADD CONSTRAINT unique_liberacao_item UNIQUE (nucleo_id, item_id, item_type);
    END IF;
END $$;

-- 12. Habilitar RLS
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberacoes_nucleo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_atividades_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access_logs ENABLE ROW LEVEL SECURITY;

-- 12. Estabilização da Tabela de Pagamentos (Adicionar campos e permissões)
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- 13. Políticas de Segurança (Limpando e Recriando com Drop Policy para evitar duplicidade)
DO $$ 
BEGIN
    -- Nucleos
    DROP POLICY IF EXISTS "Leitura_Publica_Nucleos" ON public.nucleos;
    CREATE POLICY "Leitura_Publica_Nucleos" ON public.nucleos FOR SELECT USING (true);
    
    -- Avisos (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Avisos" ON public.avisos;
    CREATE POLICY "Leitura_Aluno_Avisos" ON public.avisos FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Materiais (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Materiais" ON public.materiais_adicionais;
    CREATE POLICY "Leitura_Aluno_Materiais" ON public.materiais_adicionais FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Liberações
    DROP POLICY IF EXISTS "Gestao_Total_Staff" ON public.liberacoes_nucleo;
    CREATE POLICY "Gestao_Total_Staff" ON public.liberacoes_nucleo FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor')));
    
    -- Atividades (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Atividades" ON public.atividades;
    CREATE POLICY "Leitura_Aluno_Atividades" ON public.atividades FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Pagamentos (Onde dava o erro 400 no upload)
    DROP POLICY IF EXISTS "Users can view their own payments" ON public.pagamentos;
    CREATE POLICY "Users can view their own payments" ON public.pagamentos FOR SELECT USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own payments" ON public.pagamentos;
    CREATE POLICY "Users can insert their own payments" ON public.pagamentos FOR INSERT WITH CHECK (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can update their own payments" ON public.pagamentos;
    CREATE POLICY "Users can update their own payments" ON public.pagamentos FOR UPDATE USING (user_id = auth.uid());

    -- Permissão Total para Admins nos Pagamentos (Para poderem Validar e EXCLUIR)
    DROP POLICY IF EXISTS "Admins can manage all payments" ON public.pagamentos;
    CREATE POLICY "Admins can manage all payments" ON public.pagamentos FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte')));

    DROP POLICY IF EXISTS "Leitura_Aluno_Liberacoes" ON public.liberacoes_nucleo;
    CREATE POLICY "Leitura_Aluno_Liberacoes" ON public.liberacoes_nucleo FOR SELECT USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));

    -- Políticas para Analytics (portal_access_logs)

    -- Ajuste final de Enums (Garantir que 'rejeitado' existe para pagamentos)
    ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'rejeitado';

    -- 14. Sincronização em Massa de Nomes de Núcleo (Para transferências anteriores)
    UPDATE public.users u
    SET nucleo = n.nome
    FROM public.nucleos n
    WHERE u.nucleo_id = n.id AND (u.nucleo IS DISTINCT FROM n.nome OR u.nucleo IS NULL);

EXCEPTION WHEN others THEN END $$;
