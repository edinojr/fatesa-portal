-- Migração: Liberação Individual de Provas por Aluno
-- Descrição: Permite que professores liberem provas específicas (V1, V2, V3) individualmente para alunos dentro do seu núcleo.

-- 1. Criar tabela de exceções de atividades/provas (autorizações manuais por aluno)
CREATE TABLE IF NOT EXISTS public.liberacoes_excecao_atividade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now(),
    granted_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, aula_id)
);

-- 2. Habilitar RLS para a nova tabela
ALTER TABLE public.liberacoes_excecao_atividade ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de RLS
DROP POLICY IF EXISTS "Liberacoes excecao atividade: leitura por todos" ON public.liberacoes_excecao_atividade;
CREATE POLICY "Liberacoes excecao atividade: leitura por todos" ON public.liberacoes_excecao_atividade
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Liberacoes excecao atividade: professores e admins podem gerenciar" ON public.liberacoes_excecao_atividade;
CREATE POLICY "Liberacoes excecao atividade: professores e admins podem gerenciar" ON public.liberacoes_excecao_atividade
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.tipo IN ('admin', 'professor', 'suporte') OR users.caminhos_acesso && ARRAY['admin', 'professor', 'suporte'])
        )
    );

-- 4. Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_liberacoes_excecao_atividade_user_id ON public.liberacoes_excecao_atividade(user_id);
CREATE INDEX IF NOT EXISTS idx_liberacoes_excecao_atividade_aula_id ON public.liberacoes_excecao_atividade(aula_id);

COMMENT ON TABLE public.liberacoes_excecao_atividade IS 'Armazena autorizações manuais de acesso a provas/atividades específicas para alunos individuais.';
