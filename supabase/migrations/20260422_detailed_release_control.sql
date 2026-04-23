-- Migration: Add detailed release control columns to aulas
-- Date: 2026-04-22

ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS status_liberacao BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS professor_active BOOLEAN DEFAULT true;

-- Update existing records to ensure they are consistent
UPDATE public.aulas 
SET status_liberacao = true, 
    data_liberacao = created_at,
    professor_active = true
WHERE status_liberacao IS NULL;

COMMENT ON COLUMN public.aulas.status_liberacao IS 'Flag indicating if the exam/lesson is released for pop-ups and display';
COMMENT ON COLUMN public.aulas.data_liberacao IS 'Scheduling date for the lesson/exam release';
COMMENT ON COLUMN public.aulas.professor_active IS 'Master switch for component visibility (Videos and Exams)';
