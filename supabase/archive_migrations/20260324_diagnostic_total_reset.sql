-- ==============================================================================
-- FATESA PORTAL - DIAGNÓSTICO TOTAL DE CADASTRO (RESET COMPLETO)
-- ==============================================================================

-- 1. DESATIVAR TUDO
-- Removemos todos os possíveis nomes de gatilhos que possam estar em conflito
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- 2. FUNÇÃO "VÁZIA" PARA TESTE DE ISOLAMENTO
-- Esta função não faz NADA no banco de dados do portal. 
-- Ela apenas permite que o Auth do Supabase complete o cadastro.
CREATE OR REPLACE FUNCTION public.handle_new_user_diagnostic()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o cadastro funcionar com esta função, o problema está no comando INSERT da função original.
  -- Se o cadastro CONTINUAR dando erro 500, o problema é na configuração do próprio Supabase Auth.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VINCULAR O GATILHO DE DIAGNÓSTICO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_diagnostic();

-- 4. LIMPAR QUALQUER DADO CONFLITANTE (OPCIONAL - CUIDADO)
-- Se você quiser testar com um email que já falhou, é bom garantir que ele não existe no portal
-- DELETE FROM public.users WHERE email = 'email_que_voce_esta_testando@gmail.com';

-- 5. NOTA IMPORTANTE
-- Ao rodar este script, o usuário será criado no Supabase Auth, 
-- mas NÃO aparecerá na tabela de Usuários do Portal (Painel Admin).
-- Isso é apenas para identificar se o erro sumirá.
