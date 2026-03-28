-- ==============================================================================
-- FATESA PORTAL - GESTÃO DE ALUNOS PELO PROFESSOR
-- data: 2026-03-25
-- ==============================================================================

-- 1. ATUALIZAR RPC delete_user_entirely PARA PERMITIR PROFESSORES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_entirely(target_user_id UUID)
RETURNS void AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
  v_caller_id UUID;
  v_target_nucleo_id UUID;
  v_is_authorized BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  SELECT tipo INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  
  -- Se for admin, permite tudo
  IF v_caller_role = 'admin' OR auth.jwt()->>'email' = 'edi.ben.jr@gmail.com' THEN
    DELETE FROM auth.users WHERE id = target_user_id;
    RETURN;
  END IF;

  -- Se for professor, verifica se o aluno pertence a um núcleo gerenciado por ele
  IF v_caller_role = 'professor' THEN
    -- Pega o papel e o núcleo do alvo
    SELECT tipo, nucleo_id INTO v_target_role, v_target_nucleo_id FROM public.users WHERE id = target_user_id;
    
    -- Segurança extra: Professores NUNCA deletam admins, suporte ou outros professores
    IF v_target_role IN ('admin', 'suporte', 'professor') THEN
      RAISE EXCEPTION 'Acesso negado. Professores não podem excluir administradores ou outros professores.';
    END IF;

    -- Verifica vínculo na tabela professor_nucleo
    SELECT EXISTS (
      SELECT 1 FROM public.professor_nucleo 
      WHERE professor_id = v_caller_id AND nucleo_id = v_target_nucleo_id
    ) INTO v_is_authorized;

    IF v_is_authorized THEN
      DELETE FROM auth.users WHERE id = target_user_id;
    ELSE
      RAISE EXCEPTION 'Acesso negado. Você só pode excluir alunos dos seus núcleos.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Acesso negado. Apenas administradores e professores podem excluir usuários.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATUALIZAR POLÍTICAS DE RLS PARA PERMITIR UPDATE PELO PROFESSOR
-- ------------------------------------------------------------------------------
-- Permitir que professores atualizem o perfil de alunos em seus núcleos
DROP POLICY IF EXISTS "Professores podem atualizar seus alunos" ON public.users;
CREATE POLICY "Professores podem atualizar seus alunos" ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.professor_nucleo pn
    WHERE pn.professor_id = auth.uid() 
    AND pn.nucleo_id = public.users.nucleo_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professor_nucleo pn
    WHERE pn.professor_id = auth.uid() 
    AND pn.nucleo_id = public.users.nucleo_id
  )
);

-- 3. GARANTIR QUE PROFESSORES POSSAM DELETAR PERFIS DIRETAMENTE (CASO O CASCATA FALHE)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Professores podem deletar seus alunos" ON public.users;
CREATE POLICY "Professores podem deletar seus alunos" ON public.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.professor_nucleo pn
    WHERE pn.professor_id = auth.uid() 
    AND pn.nucleo_id = public.users.nucleo_id
  )
  AND tipo NOT IN ('admin', 'suporte', 'professor') -- Impede exclusão de staff por professores
);
