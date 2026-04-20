-- Fatesa Nucleos RLS Fix - 2026-04-19
-- Garante que professores e admins possam ver e gerenciar núcleos sem loops recursivos.

-- 1. Assegurar que a função is_staff_user() exista (já deve existir da migração anterior, mas garantimos aqui)
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

-- 2. Atualizar as políticas da tabela NUCLEOS
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público de leitura aos núcleos" ON public.nucleos;
DROP POLICY IF EXISTS "Admins podem alterar nucleos" ON public.nucleos;
DROP POLICY IF EXISTS "Professores podem criar nucleos" ON public.nucleos;
DROP POLICY IF EXISTS "Professores podem gerenciar seus proprios nucleos" ON public.nucleos;

-- Todos os usuários autenticados podem ver os núcleos (necessário para inscrição e gestão)
CREATE POLICY "Leitura nucleos autenticado" ON public.nucleos 
FOR SELECT USING (auth.role() = 'authenticated');

-- Somente Staff (Admin/Professor) pode inserir ou alterar núcleos
CREATE POLICY "Staff gerencia nucleos" ON public.nucleos 
FOR ALL USING (public.is_staff_user());

-- 3. Garantir acesso à tabela vinculativa PROFESSOR_NUCLEO
ALTER TABLE public.professor_nucleo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professores veem seus vínculos" ON public.professor_nucleo;
DROP POLICY IF EXISTS "Staff ve todos os vínculos" ON public.professor_nucleo;

CREATE POLICY "Acesso professor_nucleo" ON public.professor_nucleo 
FOR SELECT USING (
    professor_id = auth.uid() OR public.is_staff_user()
);

CREATE POLICY "Staff gerencia professor_nucleo" ON public.professor_nucleo 
FOR ALL USING (public.is_staff_user());

-- Notificar o PostgREST
NOTIFY pgrst, 'reload schema';
