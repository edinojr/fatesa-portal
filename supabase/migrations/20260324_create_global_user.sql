-- ==============================================================================
-- FATESA PORTAL - CRIAÇÃO DE USUÁRIO GLOBAL (ADMIN/PROF/ALUNO)
-- ==============================================================================

DO $$ 
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'edi.ben.jr@gmail.com';
  v_pass TEXT := 'Mari@Jose1955';
  v_nome TEXT := 'Edino Ferreira Bento Junior';
BEGIN
  -- 1. LIMPEZA (OPCIONAL) - Remove se já existir para evitar conflitos
  -- (Apenas se você quiser garantir uma criação limpa)
  -- DELETE FROM auth.users WHERE email = v_email;

  -- 2. INSERIR NO AUTH.USERS (Se não existir)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, recovery_sent_at, last_sign_in_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, 
      updated_at, confirmation_token, email_change, 
      email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nome', v_nome, 'tipo', 'admin', 'acesso_definitivo', true),
      now(), now(), '', '', '', ''
    );

    -- Criar identidade do usuário
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', v_email),
      'email',
      now(), now(), now()
    );

    RAISE NOTICE 'Usuário Auth criado com sucesso.';
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    RAISE NOTICE 'Usuário já existe no Auth. Sincronizando perfil...';
  END IF;

  -- 3. AUTORIZAÇÕES (WHITELISTS)
  INSERT INTO public.admins_autorizados (email) 
  VALUES (v_email) ON CONFLICT (email) DO NOTHING;

  INSERT INTO public.professores_autorizados (email, nome) 
  VALUES (v_email, v_nome) ON CONFLICT (email) DO NOTHING;

  -- 4. PERFIL PÚBLICO
  -- Define como ADMIN com caminhos globais
  INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso, acesso_definitivo)
  VALUES (
    v_user_id,
    v_email,
    v_nome,
    'admin'::public.user_tipo,
    ARRAY['admin', 'professor', 'estudante', 'aluno'], -- Permissões globais
    true
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    tipo = 'admin',
    caminhos_acesso = ARRAY['admin', 'professor', 'estudante', 'aluno'],
    acesso_definitivo = true;

  RAISE NOTICE 'Perfil Global criado/atualizado para %', v_email;
END $$;
