-- Migration: Add 'avaliacao' type to aula_tipo enum
-- Date: 2026-06-09
-- Purpose: Add assessment type for graded exams (V1, V2, V3)

-- Add 'avaliacao' value to the enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'aula_tipo' 
    AND e.enumlabel = 'avaliacao'
  ) THEN
    ALTER TYPE public.aula_tipo ADD VALUE 'avaliacao';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comment for documentation
COMMENT ON TYPE public.aula_tipo IS 'Enum for lesson types: gravada (video), ao_vivo (live), licao (lesson), material (material), atividade (activity), prova (exam), exercicio (fixation exercise), avaliacao (graded assessment)';
