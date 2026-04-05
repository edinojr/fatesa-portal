-- Adiciona coluna 'nivel' à tabela cursos
-- Cursos existentes sem nivel são classificados como 'basico' (padrão histórico)
ALTER TABLE public.cursos 
  ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT 'basico' CHECK (nivel IN ('basico', 'medio'));

-- Atualiza cursos existentes que têm nivel NULL para 'basico'
UPDATE public.cursos 
  SET nivel = 'basico' 
  WHERE nivel IS NULL;

-- Garante o índice para filtros por nivel
CREATE INDEX IF NOT EXISTS idx_cursos_nivel ON public.cursos(nivel);
