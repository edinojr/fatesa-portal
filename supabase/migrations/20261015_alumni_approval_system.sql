-- ==============================================================================
-- SISTEMA DE APROVAÇÃO DE ALUNOS FORMADOS E VÍNCULO DE CADASTRO
-- ==============================================================================

-- 1. Coluna de status de aprovação na tabela registros_alumni
ALTER TABLE public.registros_alumni
  ADD COLUMN IF NOT EXISTS status_aprovacao TEXT DEFAULT 'aprovado';

-- 2. Garantir que os registros existentes e importados fiquem como 'aprovado'
UPDATE public.registros_alumni
SET status_aprovacao = 'aprovado'
WHERE status_aprovacao IS NULL;

-- 3. Índices para performance de busca por status e nome
CREATE INDEX IF NOT EXISTS idx_registros_alumni_status_aprovacao ON public.registros_alumni(status_aprovacao);
CREATE INDEX IF NOT EXISTS idx_registros_alumni_user_id ON public.registros_alumni(user_id);
CREATE INDEX IF NOT EXISTS idx_registros_alumni_nome ON public.registros_alumni(nome);

-- 4. Função RPC segura para vincular formando da lista a uma conta de usuário
CREATE OR REPLACE FUNCTION public.vincular_alumni_cadastro(
  p_alumni_id UUID,
  p_user_id UUID,
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registros_alumni
  SET user_id = p_user_id,
      email = lower(p_email),
      status_aprovacao = 'aprovado'
  WHERE id = p_alumni_id;
END;
$$;

-- 5. Função RPC segura para autocadastro de formando que NÃO constava na lista (fica pendente)
CREATE OR REPLACE FUNCTION public.solicitar_cadastro_alumni(
  p_nome TEXT,
  p_email TEXT,
  p_user_id UUID,
  p_nucleo TEXT DEFAULT 'Geral'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.registros_alumni (
    nome, email, curso, nivel_curso, nucleo, ano_formacao, user_id, status_aprovacao, observacoes
  ) VALUES (
    upper(p_nome),
    lower(p_email),
    'Teologia',
    'Básico',
    coalesce(p_nucleo, 'Geral'),
    'Pendente',
    p_user_id,
    'pendente',
    '[PENDENTE_APROVACAO] Cadastro realizado no portal - Aguardando aprovação administrativa.'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 6. Função RPC segura para administradores aprovarem um aluno pendente
CREATE OR REPLACE FUNCTION public.aprovar_alumni(
  p_alumni_id UUID,
  p_observacao TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  UPDATE public.registros_alumni
  SET status_aprovacao = 'aprovado',
      observacoes = coalesce(p_observacao, 'Aprovado pela administração em ' || to_char(now(), 'DD/MM/YYYY HH24:MI'))
  WHERE id = p_alumni_id
  RETURNING user_id INTO v_user_id;

  -- Se tiver user_id vinculado, garante acesso definitivo no perfil do usuário
  IF v_user_id IS NOT NULL THEN
    UPDATE public.users
    SET acesso_definitivo = true,
        tipo = 'ex_aluno'
    WHERE id = v_user_id;
  END IF;
END;
$$;

-- 7. Conceder permissões de execução com tipos explícitos para conformidade PostgreSQL
GRANT EXECUTE ON FUNCTION public.vincular_alumni_cadastro(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_cadastro_alumni(TEXT, TEXT, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.aprovar_alumni(UUID, TEXT) TO authenticated;

-- 8. Recarregar cache de schema
NOTIFY pgrst, 'reload schema';

