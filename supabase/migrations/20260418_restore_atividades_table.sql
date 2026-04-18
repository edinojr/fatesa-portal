-- ==========================================================
-- RESTAURAÇÃO DA TABELA DE ATIVIDADES DO NÚCLEO
-- ==========================================================

-- 1. Criar a tabela de atividades (manuais/presenciais)
CREATE TABLE IF NOT EXISTS public.atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    questionario JSONB DEFAULT '[]'::jsonb
);

-- 2. Habilitar RLS
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Acesso leitura atividades" ON public.atividades;
CREATE POLICY "Acesso leitura atividades" ON public.atividades 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professores gerenciam atividades" ON public.atividades;
CREATE POLICY "Professores gerenciam atividades" ON public.atividades 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.professor_nucleo pn
        WHERE pn.professor_id = auth.uid() 
        AND pn.nucleo_id = public.atividades.nucleo_id
    ) OR 
    (SELECT tipo FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 4. Ajustar tabela de Notas para referenciar Atividades
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notas' AND column_name = 'atividade_id'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_atividades_nucleo_id ON public.atividades(nucleo_id);

-- Notificar PostgREST para atualizar o schema cache
NOTIFY pgrst, 'reload schema';
