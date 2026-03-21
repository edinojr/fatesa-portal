-- 1. Limpar gatilhos e funções problemáticas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar a função de forma ultra-segura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Tenta inserir, se der erro de duplicidade (já existe), não faz nada.
  INSERT INTO public.users (id, nome, email, tipo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Aluno'), 
    new.email, 
    -- Forçamos um valor padrão seguro se o cast falhar ou vier vazio
    CASE 
      WHEN new.raw_user_meta_data->>'student_type' = 'presencial' THEN 'presencial'::user_tipo
      ELSE 'online'::user_tipo
    END
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reativar o gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Permissões Críticas
-- Dá permissão para o sistema inserir na tabela de usuários
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
-- Alunos podem ver seus próprios perfis
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
