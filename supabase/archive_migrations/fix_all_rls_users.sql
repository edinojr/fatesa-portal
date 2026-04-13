-- Vamos erradicar o "infinite recursion" de forma absoluta!
-- O erro acontecia porque a política antiga precisava consultar a tabela users para saber se você era Admin.
-- Agora, vamos ler o seu e-mail DIRETAMENTE da sessão (token JWT), sem tocar na tabela users!

-- 1. Destruir TODAS as políticas antigas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admin view all" ON public.users;
DROP POLICY IF EXISTS "admin_users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.users;

-- 2. Recriar as políticas da forma mais segura possível (sem Loop)

-- Política A: Usuário comum só vê a própria linha
CREATE POLICY "Users view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Política B: Você e o Apóstolo podem ver todas as linhas
-- Isso lê o e-mail logado diretamente da sessão, sem fazer Select na tabela users! Zero Loop!
CREATE POLICY "Admins view all profiles" 
ON public.users 
FOR SELECT 
USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- FIM!
