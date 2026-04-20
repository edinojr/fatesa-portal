-- Fatesa Fix RLS Timeout - 2026-04-19
-- Corrige o erro 504 (upstream request timeout) causado por loops recursivos de RLS.

-- 1. Criar uma função SECURITY DEFINER para checar o tipo do usuário sem engatilhar o RLS de public.users
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo TEXT;
    v_email TEXT;
BEGIN
    SELECT tipo, email INTO v_tipo, v_email FROM public.users WHERE id = auth.uid();
    
    IF v_tipo IN ('admin', 'suporte', 'professor') OR v_email = 'edi.ben.jr@gmail.com' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 2. Atualizar as políticas da tabela USERS
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Acesso perfis" ON public.users 
FOR SELECT USING (
    auth.uid() = id OR public.is_staff_user()
);

-- 3. Atualizar as políticas da tabela PAGAMENTOS
DROP POLICY IF EXISTS "Staff can view all payments" ON public.pagamentos;
DROP POLICY IF EXISTS "Admins and Professors can view all payments" ON public.pagamentos;

CREATE POLICY "Acesso pagamentos" ON public.pagamentos 
FOR SELECT USING (
    user_id = auth.uid() OR public.is_staff_user()
);

-- 4. Atualizar as políticas da tabela DOCUMENTOS
DROP POLICY IF EXISTS "Staff can view all documents" ON public.documentos;

CREATE POLICY "Acesso documentos" ON public.documentos 
FOR SELECT USING (
    user_id = auth.uid() OR public.is_staff_user()
);

-- 5. Atualizar as políticas da tabela RESPOSTAS_AULAS
DROP POLICY IF EXISTS "Staff can manage submissions" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Suporte admin le tudo" ON public.respostas_aulas;

CREATE POLICY "Acesso respostas" ON public.respostas_aulas 
FOR SELECT USING (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
