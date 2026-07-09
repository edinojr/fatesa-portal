-- Migração: Exclusão Individual de Módulos por Aluno
-- Descrição: Permite que professores/admins excluam (ocultem) módulos específicos
-- para alunos individuais que não precisam cursá-los.

CREATE TABLE IF NOT EXISTS public.exclusoes_modulo_aluno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    livro_id UUID REFERENCES public.livros(id) ON DELETE CASCADE,
    excluded_at TIMESTAMPTZ DEFAULT now(),
    excluded_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, livro_id)
);

ALTER TABLE public.exclusoes_modulo_aluno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exclusoes modulo aluno: leitura por todos" ON public.exclusoes_modulo_aluno;
CREATE POLICY "Exclusoes modulo aluno: leitura por todos" ON public.exclusoes_modulo_aluno
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Exclusoes modulo aluno: professores e admins podem gerenciar" ON public.exclusoes_modulo_aluno;
CREATE POLICY "Exclusoes modulo aluno: professores e admins podem gerenciar" ON public.exclusoes_modulo_aluno
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.tipo IN ('admin', 'professor', 'suporte') OR users.caminhos_acesso && ARRAY['admin', 'professor', 'suporte'])
        )
    );

CREATE INDEX IF NOT EXISTS idx_exclusoes_modulo_aluno_user_id ON public.exclusoes_modulo_aluno(user_id);
CREATE INDEX IF NOT EXISTS idx_exclusoes_modulo_aluno_livro_id ON public.exclusoes_modulo_aluno(livro_id);

COMMENT ON TABLE public.exclusoes_modulo_aluno IS 'Armazena exclusões manuais de módulos (livros) para alunos específicos que não precisam cursá-los.';

NOTIFY pgrst, 'reload schema';
