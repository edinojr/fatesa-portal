-- ACTIVITY ENHANCEMENTS: INDIVIDUAL EXAM/ACTIVITY RELEASE MECHANISM
-- This migration enables professors to grant individual access to specific exam/assessment activities for students within the same nucleus

-- Table: liberacoes_excecao_atividade
-- Purpose: Stores manual authorizations of individual access to proofs/activities for students
-- Key features:
--   * Allows professors to "unlock" specific assessments for individual students
--   * Maintains audit trail (who granted, when)
--   * Supports multiple student-aula_id combinations uniquely

CREATE TABLE IF NOT EXISTS public.liberacoes_excecao_atividade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now(),
    granted_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, aula_id)
);

-- Enable Row Level Security (RLS) for this new table
ALTER TABLE public.liberacoes_excecao_atividade ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- Policy 1: "Public read access"
-- Allows all authenticated users to read this table
-- Reason: Students need to check if they have individual exceptions, professors/admins can view for management
CREATE POLICY "Liberacoes excecao atividade: leitura por todos" ON public.liberacoes_excecao_atividade
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy 2: "Professors and admins manage"
-- Allows professors, admins, support staff to manage individual releases
-- Uses type OR caminhos_acesso arrays for flexible role-based access
CREATE POLICY "Liberacoes excecao atividade: professores e admins podem gerenciar" ON public.liberacoes_excecao_atividade
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (
                users.tipo IN ('admin', 'professor', 'suporte') 
                OR users.caminhos_acesso && ARRAY['admin', 'professor', 'suporte']
            )
        )
    );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_liberacoes_excecao_atividade_user_id ON public.liberacoes_excecao_atividade(user_id);
CREATE INDEX IF NOT EXISTS idx_liberacoes_excecao_atividade_aula_id ON public.liberacoes_excecao_atividade(aula_id);

COMMENT ON TABLE public.liberacoes_excecao_atividade IS 'Armazena autorizações manuais de acesso a provas/atividades específicas para alunos individuais.';

-- Table: respostas_aulas
-- Purpose: Stores student responses and grades for activities and proofs

CREATE TABLE IF NOT EXISTS respostas_aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES auth.users(id) NOT NULL,
    aula_id UUID REFERENCES public.aulas(id) NOT NULL,
    respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
    nota NUMERIC DEFAULT NULL,
    nota_original NUMERIC,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'corrigida')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (aluno_id, aula_id)
);

-- Enable Row Level Security (RLS) for this table
ALTER TABLE respostas_aulas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for respostas_aulas:
-- Policy 1: "Students insert their responses"
CREATE POLICY "Estudantes inserem" ON respostas_aulas
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = aluno_id);

-- Policy 2: "Students select their own grades"
CREATE POLICY "Estudantes leem próprias notas" ON respostas_aulas
    FOR SELECT TO authenticated
    USING (auth.uid() = aluno_id);

-- Policy 3: "Professors/administrators select all"
CREATE POLICY "Suporte admin le tudo" ON respostas_aulas
    FOR ALL TO authenticated
    USING (
        (SELECT tipo FROM users WHERE id = auth.uid()) IN ('admin', 'suporte', 'professor')
    );

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_respostas_aulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
DROP TRIGGER IF EXISTS trigger_update_respostas_aulas_updated_at ON public.respostas_aulas;
CREATE TRIGGER trigger_update_respostas_aulas_updated_at
    BEFORE UPDATE ON public.respostas_aulas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_respostas_aulas_updated_at();