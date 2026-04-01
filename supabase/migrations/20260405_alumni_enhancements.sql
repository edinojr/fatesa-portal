-- Add nivel_curso column to registros_alumni
ALTER TABLE public.registros_alumni ADD COLUMN IF NOT EXISTS nivel_curso TEXT DEFAULT 'Graduação';

-- Create an index for faster grouping/filtering
CREATE INDEX IF NOT EXISTS idx_alumni_ano_nivel ON public.registros_alumni(ano_formacao, nivel_curso);
