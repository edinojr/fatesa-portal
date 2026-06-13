-- Migration: Add "Os Evangelhos" module to Curso Básico
-- Date: 2026-06-12

-- Insert "Os Evangelhos" as a new book in the "Básico" course
-- Using ordem 28 (after the existing 27 modules)
INSERT INTO public.livros (curso_id, ordem, titulo, ensino_tipo)
SELECT id, 28, 'Os Evangelhos', 'online'
FROM public.cursos
WHERE nome = 'Básico'
AND NOT EXISTS (
  SELECT 1 FROM public.livros 
  WHERE titulo = 'Os Evangelhos' 
  AND curso_id = (SELECT id FROM public.cursos WHERE nome = 'Básico')
)
ON CONFLICT DO NOTHING;
