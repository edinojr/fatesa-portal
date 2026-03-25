-- v9: Função segura para verificar pré-registro antes da ativação (Signup)
CREATE OR REPLACE FUNCTION public.get_registration_details(p_email TEXT)
RETURNS TABLE (
  found BOOLEAN,
  nome TEXT,
  tipo user_tipo,
  nucleo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as found,
    u.nome,
    u.tipo,
    u.nucleo
  FROM public.users u
  WHERE LOWER(u.email) = LOWER(p_email)
  LIMIT 1;
  
  -- Se não encontrar nada, a tabela retornada será vazia, o que é tratado no JS
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que qualquer um possa chamar para verificar se o email já existe
GRANT EXECUTE ON FUNCTION public.get_registration_details(TEXT) TO anon, authenticated;
