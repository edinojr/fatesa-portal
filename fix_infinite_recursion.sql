-- Corrigir a recursão infinita (Infinite Recursion) na tabela users
-- O erro ocorre porque a política de Admin tenta ler a tabela users enquanto a própria tabela está sendo lida.

-- 1. Excluir a política problemática
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- 2. Criar uma Função Segura (Security Definer) que burla a recursão do RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Criar a nova política usando a função livre de recursões
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  public.is_admin()
);
