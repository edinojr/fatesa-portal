-- Script de Correção: Criação de Tabelas Base e Índices
-- Rodar este script se houver erro de "relation does not exist"

-- 1. Criar Enums Necessários (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documento_tipo') THEN
        CREATE TYPE documento_tipo AS ENUM ('rg', 'cnh', 'residencia', 'exame', 'outro');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_verificacao') THEN
        CREATE TYPE status_verificacao AS ENUM ('pendente', 'aprovado', 'rejeitado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pagamento_status') THEN
        CREATE TYPE pagamento_status AS ENUM ('aberto', 'pago', 'atrasado');
    END IF;
END $$;

-- 2. Criar Tabelas Base (se não existirem)
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo documento_tipo NOT NULL,
  url TEXT NOT NULL,
  status status_verificacao NOT NULL DEFAULT 'pendente',
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  status pagamento_status NOT NULL DEFAULT 'aberto',
  comprovante_url TEXT,
  feedback TEXT,
  data_vencimento DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Aplicar Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_users_nucleo_id ON public.users(nucleo_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo ON public.users(tipo);
CREATE INDEX IF NOT EXISTS idx_livros_curso_id ON public.livros(curso_id);
CREATE INDEX IF NOT EXISTS idx_aulas_livro_id ON public.aulas(livro_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON public.documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_atividades_nucleo_id ON public.atividades(nucleo_id);
CREATE INDEX IF NOT EXISTS idx_notas_aluno_id ON public.notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_atividade_id ON public.notas(atividade_id);
