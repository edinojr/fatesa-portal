-- ==============================================================================
-- FUNÇÃO SEGURA PARA ATUALIZAR NÚCLEO DO ALUNO
-- ==============================================================================

-- Esta função rodará com "SECURITY DEFINER", o que significa que ela ignora o RLS
-- mas só executará o que está dentro do código. Isso previne que alunos usem a 
-- API padrão do Supabase para mudar coisas do perfil deles (como virar "Admin").

CREATE OR REPLACE FUNCTION public.update_user_nucleo(p_nucleo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza exclusivamente a coluna nucleo_id do usuário que chamou a função.
  UPDATE public.users 
  SET nucleo_id = p_nucleo_id 
  WHERE id = auth.uid();
END;
$$;

-- Dá permissão para os usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.update_user_nucleo(UUID) TO authenticated;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
