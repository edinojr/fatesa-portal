-- Migration: Assessment System Improvements
-- Add columns for block assessments, multiple versions, and tracking student access/timer.

-- 1. Updates to 'aulas' table
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS is_bloco_final BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS questionario_v2 JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS questionario_v3 JSONB DEFAULT '[]';

COMMENT ON COLUMN public.aulas.is_bloco_final IS 'Marks this assessment as the final exam for its block.';
COMMENT ON COLUMN public.aulas.questionario_v2 IS 'Questions for the Recovery Exam (Attempt 2).';
COMMENT ON COLUMN public.aulas.questionario_v3 IS 'Questions for the Final Opportunity (Attempt 3).';

-- 2. Updates to 'respostas_aulas' table
-- First, drop the old constraint if it exists to allow new statuses
DO $$ 
BEGIN
    ALTER TABLE public.respostas_aulas DROP CONSTRAINT IF EXISTS respostas_aulas_status_check;
END $$;

ALTER TABLE public.respostas_aulas 
ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;

-- Add updated status check
ALTER TABLE public.respostas_aulas 
ADD CONSTRAINT respostas_aulas_status_check 
CHECK (status IN ('pendente', 'corrigida', 'concluido', 'reprovado', 'liberado'));

COMMENT ON COLUMN public.respostas_aulas.data_liberacao IS 'When the assessment was automatically unlocked for the student.';
COMMENT ON COLUMN public.respostas_aulas.start_time IS 'When the student confirmed the start of the 40-minute timer for the current attempt.';

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_respostas_aulas_liberacao ON public.respostas_aulas(data_liberacao);
