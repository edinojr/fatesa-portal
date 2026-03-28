-- ==============================================================================
-- ADICIONANDO STATUS DE NÚCLEO AO PERFIL DO USUÁRIO
-- ==============================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status_nucleo TEXT DEFAULT 'aprovado';

-- Comentário: Deixamos 'aprovado' por padrão para não bloquear quem já está no 
-- sistema, mas a função de vínculo vai setar como 'pendente' para novos.

-- Atualizando a função RPC para sempre setar como pendente ao trocar/vincular
CREATE OR REPLACE FUNCTION public.update_user_nucleo(p_nucleo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza o núcleo e reseta o status para pendente (aguardando aprovação)
  UPDATE public.users 
  SET nucleo_id = p_nucleo_id,
      status_nucleo = 'pendente'
  WHERE id = auth.uid();
END;
$$;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
