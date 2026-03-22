-- SCRIPT DE RECONSTRUÇÃO TOTAL - VERSÃO 3 (NUCLEAR RESET)
-- Este script remove TODAS as políticas de segurança antes de mudar o tipo da coluna.

-- 1. Desativar Gatilhos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. REMOVER ABSOLUTAMENTE TODAS AS POLÍTICAS DA TABELA USERS
-- (Listamos todos os nomes possíveis usados nos scripts anteriores)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Permitir inserção pelo sistema" ON public.users;
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Admins veem tudo" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- 3. REMOVER POLÍTICAS DE OUTRAS TABELAS QUE DEPENDEM DE "users.tipo"
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;
DROP POLICY IF EXISTS "Admins and Professors can view all lessons" ON public.aulas;
DROP POLICY IF EXISTS "Admins and Professors can view all enrollments" ON public.matriculas;
DROP POLICY IF EXISTS "Admins and Professors can view all progress" ON public.progresso;
DROP POLICY IF EXISTS "Admins and Professors can view all attempts" ON public.tentativas_prova;

-- 4. AGORA O POSTGRES VAI DEIXAR ALTERAR A COLUNA
ALTER TABLE public.users ALTER COLUMN tipo TYPE TEXT USING tipo::text;
ALTER TABLE public.users ALTER COLUMN tipo SET DEFAULT 'online';

-- 5. RECRIAR FUNÇÃO DE CADASTRO (MÁXIMA SIMPLICIDADE)
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

-- 6. REATIVAR O GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. REATIVAR AS POLÍTICAS (AGORA COM A COLUNA EM TEXTO)
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins veem tudo" ON public.users FOR ALL USING (
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

-- 8. PERMISSÕES DE SUPORTE
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
