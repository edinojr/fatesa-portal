-- 1. Remover políticas restritivas antigas que exigiam matrícula
DROP POLICY IF EXISTS "Students can view books of their courses" ON public.livros;
DROP POLICY IF EXISTS "Students can view lessons" ON public.aulas;

-- 2. Criar novas políticas de leitura global para usuários autenticados
-- Permite que qualquer aluno logado veja o catálogo de livros
DROP POLICY IF EXISTS "Leitura global de livros para autenticados" ON public.livros;
CREATE POLICY "Leitura global de livros para autenticados" 
ON public.livros 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permite que qualquer aluno logado veja as aulas/lições
DROP POLICY IF EXISTS "Leitura global de aulas para autenticados" ON public.aulas;
CREATE POLICY "Leitura global de aulas para autenticados" 
ON public.aulas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Garantir que a tabela de cursos também tenha leitura global (caso ainda não tenha)
DROP POLICY IF EXISTS "Leitura global de cursos para autenticados" ON public.cursos;
CREATE POLICY "Leitura global de cursos para autenticados" 
ON public.cursos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);
