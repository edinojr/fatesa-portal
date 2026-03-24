-- Consolidated Schema Fix: Ensure all columns for Modules and Lessons exist
-- Date: 2026-03-23

-- 1. Updates for 'livros' (Modules)
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS capa_url TEXT;
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS ensino_tipo TEXT DEFAULT 'online';
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Updates for 'aulas' (Lessons & Activities)
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS parent_aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS min_grade NUMERIC DEFAULT 0;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 1;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS arquivo_url TEXT;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS arquivo_tipo TEXT;

-- 3. Fix deletion conflict (Cascading deletes for student responses)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'respostas_aulas_aula_id_fkey') THEN
        ALTER TABLE public.respostas_aulas DROP CONSTRAINT respostas_aulas_aula_id_fkey;
    END IF;
END $$;

ALTER TABLE public.respostas_aulas
ADD CONSTRAINT respostas_aulas_aula_id_fkey 
FOREIGN KEY (aula_id) 
REFERENCES public.aulas(id) 
ON DELETE CASCADE;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'respostas_aulas_aluno_id_fkey') THEN
        ALTER TABLE public.respostas_aulas DROP CONSTRAINT respostas_aulas_aluno_id_fkey;
    END IF;
END $$;

ALTER TABLE public.respostas_aulas
ADD CONSTRAINT respostas_aulas_aluno_id_fkey 
FOREIGN KEY (aluno_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 4. Final comments
COMMENT ON TABLE public.livros IS 'Ensures all module fields including cover and teaching mode.';
COMMENT ON TABLE public.aulas IS 'Ensures all lesson fields including hierarchy and materials.';
