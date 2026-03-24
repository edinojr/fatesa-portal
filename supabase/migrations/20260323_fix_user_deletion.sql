-- Migration to allow secure user deletion from the admin panel
-- This function deletes the user from auth.users, which triggers cascades into public.users and related tables.

-- 1. Create the function with SECURITY DEFINER (runs as postgres)
CREATE OR REPLACE FUNCTION public.delete_user_entirely(target_user_id UUID)
RETURNS void AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Security Check: Only allow if the caller is an admin
  SELECT tipo INTO caller_role FROM public.users WHERE id = auth.uid();
  
  IF caller_role = 'admin' OR auth.jwt()->>'email' = 'edi.ben.jr@gmail.com' THEN
    -- This actually removes the user from the authentication system
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions
REVOKE EXECUTE ON FUNCTION public.delete_user_entirely(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_entirely(UUID) TO authenticated;
-- Also grant to service_role just in case
GRANT EXECUTE ON FUNCTION public.delete_user_entirely(UUID) TO service_role;

-- 3. Add a more robust DELETE policy for public.users just in case
-- (Ensures admins can always delete the profile directly if needed)
DROP POLICY IF EXISTS "Admins podem deletar profiles" ON public.users;
CREATE POLICY "Admins podem deletar profiles" ON public.users FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'admin' OR email = 'edi.ben.jr@gmail.com'))
);

-- 4. Comment for documentation
COMMENT ON FUNCTION public.delete_user_entirely(UUID) IS 'Exclui permanentemente um usuário de auth.users (cascateando para public.users). Requer privilégios de admin.';
