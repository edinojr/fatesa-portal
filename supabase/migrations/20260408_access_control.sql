-- Migração: Controle de Acesso por Data de Ingresso
-- Descrição: Adiciona data de liberação às provas/módulos e cria tabela de exceções individuais por aluno.

-- 1. Adicionar coluna released_at em liberacoes_nucleo se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liberacoes_nucleo' AND column_name = 'released_at') THEN
        ALTER TABLE public.liberacoes_nucleo ADD COLUMN released_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. Criar tabela de exceções (autorizações manuais por aluno)
CREATE TABLE IF NOT EXISTS public.liberacoes_excecao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    livro_id UUID REFERENCES public.livros(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now(),
    granted_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, livro_id)
);

-- 3. Habilitar RLS para a nova tabela
ALTER TABLE public.liberacoes_excecao ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas básicas de RLS
DROP POLICY IF EXISTS "Liberacoes excecao: leitura por todos" ON public.liberacoes_excecao;
CREATE POLICY "Liberacoes excecao: leitura por todos" ON public.liberacoes_excecao
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Liberacoes excecao: professores e admins podem gerenciar" ON public.liberacoes_excecao;
CREATE POLICY "Liberacoes excecao: professores e admins podem gerenciar" ON public.liberacoes_excecao
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.tipo IN ('admin', 'professor', 'suporte') OR users.caminhos_acesso && ARRAY['admin', 'professor', 'suporte'])
        )
    );

COMMENT ON TABLE public.liberacoes_excecao IS 'Armazena autorizações manuais de acesso a módulos (livros) para alunos específicos.';
