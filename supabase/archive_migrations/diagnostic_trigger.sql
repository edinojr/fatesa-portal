-- SCRIPT DE DIAGNÓSTICO E ISOLAMENTO
-- Este script desativa a inserção automática para testarmos se o erro é no Banco ou no Auth.

-- 1. Desativar qualquer gatilho anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Criar uma função de teste que NÃO insere nada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas retorna o novo usuário sem tentar gravar na tabela 'public.users'
  -- Se o cadastro funcionar com este script, sabemos que o problema era o comando INSERT.
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reativar o gatilho de teste
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Limpar a tabela de usuários (Para evitar conflitos de email unico)
DELETE FROM public.users;
