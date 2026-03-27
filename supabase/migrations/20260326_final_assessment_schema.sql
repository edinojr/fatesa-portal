-- Migration: Final Assessment Improvements (Feedback & Modular Blocking)
-- Date: 2026-03-26

-- 1. Add feedback column and final block flag to 'respostas_aulas'
ALTER TABLE public.respostas_aulas 
ADD COLUMN IF NOT EXISTS comentario_professor TEXT,
ADD COLUMN IF NOT EXISTS bloqueio_final BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.respostas_aulas.comentario_professor IS 'Written feedback/evaluation from the professor.';
COMMENT ON COLUMN public.respostas_aulas.bloqueio_final IS 'Flag set when a student fails all 3 attempts, blocking them until they finish subsequent modules.';

-- 2. Ensure data_liberacao and start_time are available (from previous plan, but safe to repeat)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'respostas_aulas' AND column_name = 'data_liberacao') THEN
        ALTER TABLE public.respostas_aulas ADD COLUMN data_liberacao TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'respostas_aulas' AND column_name = 'start_time') THEN
        ALTER TABLE public.respostas_aulas ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
