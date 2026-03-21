-- SCRIPT DE RECONSTRUÇÃO TOTAL (TEXTO EM VEZ DE ENUM) - VERSÃO 2
-- Este script remove a rigidez dos ENUMs e limpa as políticas que travam a alteração.

-- 1. Remover gatilhos e funções que dependem da estrutura antiga
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. REMOVER POLÍTICAS QUE DEPENDEM DA COLUNA "tipo"
-- (O Postgres não deixa mudar o tipo da coluna se houver políticas usando ela)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;
DROP POLICY IF EXISTS "Admins and Professors can view all lessons" ON public.aulas;
DROP POLICY IF EXISTS "Admins and Professors can view all enrollments" ON public.matriculas;
DROP POLICY IF EXISTS "Admins and Professors can view all progress" ON public.progresso;
DROP POLICY IF EXISTS "Admins and Professors can view all attempts" ON public.tentativas_prova;

-- 3. ALTERAR A TABELA PARA TEXTO
-- Mudamos para text para evitar erros de conversão do Postgres (Enum para String)
ALTER TABLE public.users ALTER COLUMN tipo TYPE TEXT USING tipo::text;
ALTER TABLE public.users ALTER COLUMN tipo SET DEFAULT 'online';

-- 4. RECRIAR FUNÇÃO DE CADASTRO (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, tipo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Aluno'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'student_type', 'online')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REATIVAR O GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RECRIAR POLÍTICAS (AGORA USANDO TEXTO)
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

CREATE POLICY "Admins and Professors can view all books" ON public.livros FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

CREATE POLICY "Admins and Professors can view all lessons" ON public.aulas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

CREATE POLICY "Admins and Professors can view all enrollments" ON public.matriculas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

CREATE POLICY "Admins and Professors can view all progress" ON public.progresso FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

CREATE POLICY "Admins and Professors can view all attempts" ON public.tentativas_prova FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 7. PERMISSÕES FINAIS
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
