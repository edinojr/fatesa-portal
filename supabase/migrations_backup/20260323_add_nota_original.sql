-- Activity Enhancements: Add 'nota_original' to track the first attempt
-- Date: 2026-03-23

-- Add nota_original column to respostas_aulas
-- This stores the grade of the first successful attempt (not changed on subsequent edits)
ALTER TABLE public.respostas_aulas 
ADD COLUMN IF NOT EXISTS nota_original NUMERIC;

-- Comment for documentation
COMMENT ON COLUMN public.respostas_aulas.nota_original IS 'Stores the grade of the very first attempt, preserved even if answers are modified later for study.';

-- Optional: If there are existing records, we can populate nota_original with the current nota
UPDATE public.respostas_aulas SET nota_original = nota WHERE nota_original IS NULL AND nota IS NOT NULL;
