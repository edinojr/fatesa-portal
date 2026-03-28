-- 1. Limpar políticas antigas de Livros, Cursos e Aulas
DROP POLICY IF EXISTS "Users can view books" ON public.livros;
DROP POLICY IF EXISTS "Students can view books of their courses" ON public.livros;
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;
DROP POLICY IF EXISTS "Admins can manage books" ON public.livros;

DROP POLICY IF EXISTS "Anyone can view courses" ON public.cursos;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.cursos;

-- 2. Habilitar RLS (caso não esteja)
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para LIVROS (Leitura pública, Escrita para Admin/Professor)
CREATE POLICY "Leitura pública de livros" ON public.livros FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam livros" ON public.livros FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 4. Políticas para CURSOS
CREATE POLICY "Leitura pública de cursos" ON public.cursos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam cursos" ON public.cursos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 5. Políticas para AULAS
CREATE POLICY "Leitura pública de aulas" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam aulas" ON public.aulas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 6. Inserir Mock Data (UUIDs Reais)
INSERT INTO public.cursos (id, nome) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Curso Teológico Básico')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.livros (id, curso_id, titulo, ordem)
VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Livro 1: Introdução à Bíblia', 1)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna de question�rio �s aulas para permitir edi��o din�mica
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '[]'::jsonb;

