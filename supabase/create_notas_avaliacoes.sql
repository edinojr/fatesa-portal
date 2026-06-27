-- Script de referência: Criar tabela notas_avaliacoes (opcional)
-- A dependência desta tabela foi REMOVIDA do código frontend.
-- Este script existe apenas para registro histórico caso se queira
-- persistir notas de provas separadamente no futuro.

CREATE TABLE IF NOT EXISTS public.notas_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  tipo_prova TEXT NOT NULL CHECK (tipo_prova IN ('V1', 'V2', 'V3')),
  nota NUMERIC(5,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'corrigida')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_aluno_modulo_prova UNIQUE (aluno_id, modulo_id, tipo_prova)
);

-- Enable RLS
ALTER TABLE public.notas_avaliacoes ENABLE ROW LEVEL SECURITY;

-- Alunos podem ver suas próprias notas
DROP POLICY IF EXISTS "Alunos veem suas notas" ON public.notas_avaliacoes;
CREATE POLICY "Alunos veem suas notas" ON public.notas_avaliacoes
  FOR SELECT USING (auth.uid() = aluno_id);

-- Staff pode ver e gerenciar todas as notas
DROP POLICY IF EXISTS "Staff gerencia notas" ON public.notas_avaliacoes;
CREATE POLICY "Staff gerencia notas" ON public.notas_avaliacoes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND tipo IN ('admin', 'professor', 'suporte')
    )
  );
