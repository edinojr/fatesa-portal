-- Migration for Content Hierarchy (Module -> Lesson -> Activity)
-- Date: 2026-03-23

-- 1. Ensure enum 'aula_tipo' includes 'atividade' and 'prova'
-- Use DO block to handle potential duplicate values gracefully
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'aula_tipo' AND e.enumlabel = 'atividade') THEN
    ALTER TYPE public.aula_tipo ADD VALUE 'atividade';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'aula_tipo' AND e.enumlabel = 'prova') THEN
    ALTER TYPE public.aula_tipo ADD VALUE 'prova';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add columns to 'aulas' table for hierarchy, ordering, and details
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS parent_aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS min_grade NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '[]';

-- 3. Update existing 'prova' entries to have a default min_grade of 7
UPDATE public.aulas SET min_grade = 7 WHERE tipo = 'prova' AND (min_grade IS NULL OR min_grade = 0);

-- 4. Comments for documentation
COMMENT ON COLUMN public.aulas.parent_aula_id IS 'Link to the parent lesson for activities/exams';
COMMENT ON COLUMN public.aulas.min_grade IS 'Minimum grade required for passing (especially for exams)';
COMMENT ON COLUMN public.aulas.ordem IS 'Display sequence within the book or module';
