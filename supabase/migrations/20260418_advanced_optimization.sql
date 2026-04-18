-- Fatesa Advanced Database Optimization & Repair - 2026-04-18
-- Focado em performance de busca JSONB, resiliência de schema e correção de permissões Staff (403).

-- 1. Garantir que as tabelas base existem
DO $$ 
BEGIN
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
CREATE INDEX IF NOT EXISTS idx_atividades_questionario_gin ON public.atividades USING GIN (questionario);
CREATE INDEX IF NOT EXISTS idx_materiais_arquivos_gin ON public.materiais_adicionais USING GIN (arquivos);

-- 3. Resiliência de Schema (Adicionar colunas se faltarem)
ALTER TABLE public.respostas_aulas 
ADD COLUMN IF NOT EXISTS tentativas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS primeira_correcao_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comentario_professor TEXT,
ADD COLUMN IF NOT EXISTS nota_original NUMERIC;

-- 4. Índices Compostos para joins frequentes no Dashboard
CREATE INDEX IF NOT EXISTS idx_progresso_aluno_aula ON public.progresso(aluno_id, aula_id);
CREATE INDEX IF NOT EXISTS idx_respostas_aula_status ON public.respostas_aulas(aula_id, status);
CREATE INDEX IF NOT EXISTS idx_respostas_aulas_nota_null ON public.respostas_aulas(nota) WHERE nota IS NULL;
CREATE INDEX IF NOT EXISTS idx_aulas_is_bloco_final ON public.aulas(is_bloco_final);
CREATE INDEX IF NOT EXISTS idx_aulas_parent_id ON public.aulas(parent_aula_id);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 5. Reconstrução da View de Submissões (Focado em Estabilidade)
DROP VIEW IF EXISTS public.view_submissions_detailed CASCADE;

CREATE OR REPLACE VIEW public.view_submissions_detailed AS
SELECT
    sub.id AS submission_id,
    sub.aluno_id AS student_id,
    sub.nota,
    sub.status,
    sub.respostas,
    sub.tentativas,
    sub.primeira_correcao_at,
    sub.comentario_professor,
    sub.created_at AS submitted_at,
    sub.updated_at AS last_updated,
    a.id AS lesson_id,
    a.titulo AS lesson_title,
    a.tipo AS lesson_type,
    a.questionario,
    a.questionario_v2,
    a.questionario_v3,
    a.is_bloco_final,
    a.versao AS lesson_versao,
    l.id AS book_id,
    l.titulo AS book_title,
    l.ordem AS book_order,
    u.id AS user_id,
    u.nome AS student_name,
    u.email AS student_email,
    u.nucleo_id AS student_nucleo_id,
    n.id AS nucleus_id,
    n.nome AS nucleus_name
FROM
    public.respostas_aulas sub
LEFT JOIN public.aulas a ON sub.aula_id = a.id
LEFT JOIN public.livros l ON a.livro_id = l.id
LEFT JOIN public.users u ON sub.aluno_id = u.id
LEFT JOIN public.nucleos n ON u.nucleo_id = n.id;

GRANT SELECT ON public.view_submissions_detailed TO authenticated;
GRANT SELECT ON public.view_submissions_detailed TO anon;

-- 6. Ajuste de Políticas de Segurança (Corrigir erro 403 para suporte/colaboradores)
DO $$ 
BEGIN
    -- Política para a tabela USERS
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
    CREATE POLICY "Staff can view all profiles" ON public.users 
    FOR SELECT USING (
        tipo IN ('admin', 'suporte', 'professor') 
        OR auth.uid() = id
        OR email = 'edi.ben.jr@gmail.com'
    );

    -- Política para a tabela DOCUMENTOS
    DROP POLICY IF EXISTS "Admins and Professors can view all documents" ON public.documentos;
    CREATE POLICY "Staff can view all documents" ON public.documentos 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte', 'professor'))
    );

    -- Política para a tabela PAGAMENTOS
    DROP POLICY IF EXISTS "Admins and Professors can view all payments" ON public.pagamentos;
    CREATE POLICY "Staff can view all payments" ON public.pagamentos 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte', 'professor'))
    );

    -- Política para a tabela RESPOSTAS_AULAS
    DROP POLICY IF EXISTS "Suporte admin le tudo" ON public.respostas_aulas;
    CREATE POLICY "Staff can manage submissions" ON public.respostas_aulas 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte', 'professor'))
    );
END $$;

-- 7. Comentário de Manutenção
COMMENT ON INDEX idx_users_email_lower IS 'Acelera o login e a verificação de duplicidade de alunos.';
NOTIFY pgrst, 'reload schema';
