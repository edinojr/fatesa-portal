-- Adiciona política RLS para usuários do tipo 'suporte' na tabela users
-- O problema: a política users_admin_view usa check_is_admin() que só retorna true para tipo = 'admin',
-- mas o painel Admin também permite acesso de usuários tipo 'suporte', causando erro 403
-- em todas as consultas SELECT na tabela users para esses usuários.

-- Adiciona política específica para suporte (seguindo o mesmo padrão da users_professor_view)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'users_suporte_view'
  ) THEN
    CREATE POLICY "users_suporte_view" ON public.users
    FOR SELECT USING (public.get_auth_user_tipo() = 'suporte');
  END IF;
END
$$;
