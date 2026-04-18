-- Fatesa Advanced Database Optimization & Repair - 2026-04-18
-- Focado em performance de busca JSONB e resiliência de schema.

-- 1. Garantir que as tabelas base existem antes de criar índices
DO $$ 
BEGIN
    -- Restaurar atividades se não existir
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'atividades') THEN
        CREATE TABLE public.atividades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            titulo TEXT NOT NULL,
            descricao TEXT,
            nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT now(),
            questionario JSONB DEFAULT '[]'::jsonb
        );
        ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Acesso leitura atividades" ON public.atividades FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Índices GIN para campos JSONB (Busca rápida dentro de objetos)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'atividades') THEN
        CREATE INDEX IF NOT EXISTS idx_atividades_questionario_gin ON public.atividades USING GIN (questionario);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materiais_arquivos_gin ON public.materiais_adicionais USING GIN (arquivos);

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'respostas_atividades_extra') THEN
        CREATE INDEX IF NOT EXISTS idx_respostas_extra_res_gin ON public.respostas_atividades_extra USING GIN (respostas);
    END IF;
END $$;

-- 3. Índices Compostos para Consultas Frequentes
CREATE INDEX IF NOT EXISTS idx_progresso_aluno_aula ON public.progresso(aluno_id, aula_id);
CREATE INDEX IF NOT EXISTS idx_respostas_aula_status ON public.respostas_aulas(aula_id, status);

-- 4. Otimização de busca por Email (Sempre Lowercase)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 5. Comentário de Manutenção
COMMENT ON INDEX idx_users_email_lower IS 'Acelera o login e a verificação de duplicidade de alunos.';
