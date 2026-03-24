-- Migration to support Module -> Lesson -> Activity hierarchy
-- Adds parent_aula_id to link activities to lessons
-- Adds min_grade to specify passing requirements (especially for exams)

ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS parent_aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS min_grade NUMERIC DEFAULT 0;

-- Update existing 'prova' entries to have a default min_grade of 7
UPDATE public.aulas SET min_grade = 7 WHERE tipo = 'prova';
