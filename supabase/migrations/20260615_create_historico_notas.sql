-- Tabela de histórico de notas inserido manualmente por admins
-- Permite registrar notas de módulos concluídos e histórico acadêmico completo

CREATE TABLE IF NOT EXISTS public.historico_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    curso_nome TEXT NOT NULL,
    modulo_nome TEXT NOT NULL,
    nota NUMERIC(5,2) NOT NULL,
    data_conclusao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    inserido_por UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_notas ENABLE ROW LEVEL SECURITY;

-- Políticas: admins e professores podem gerenciar, alunos veem apenas os seus
DROP POLICY IF EXISTS "Historico notas: leitura para admin/professor" ON public.historico_notas;
CREATE POLICY "Historico notas: leitura para admin/professor" ON public.historico_notas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.tipo IN ('admin', 'suporte') OR users.caminhos_acesso && ARRAY['admin', 'suporte'])
        )
    );

DROP POLICY IF EXISTS "Historico notas: aluno ve seus proprios" ON public.historico_notas;
CREATE POLICY "Historico notas: aluno ve seus proprios" ON public.historico_notas
    FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Historico notas: admin pode inserir/atualizar" ON public.historico_notas;
CREATE POLICY "Historico notas: admin pode inserir/atualizar" ON public.historico_notas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.tipo IN ('admin', 'suporte') OR users.caminhos_acesso && ARRAY['admin', 'suporte'])
        )
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_historico_notas_aluno_id ON public.historico_notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_notas_curso ON public.historico_notas(curso_nome);

COMMENT ON TABLE public.historico_notas IS 'Histórico de notas inserido manualmente por admins para alunos que finalizaram módulos ou o curso inteiro.';
