-- v8: Melhoria no gatilho de cadastro para resolver nucleo_id automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
  v_nucleo_id UUID;
BEGIN
  -- Segurança 1: Identificar se o email está pré-autorizado
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;

  -- Segurança 2: Determinar o tipo correto
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    -- Se não for staff, usa o tipo vindo do frontend ou padrão 'online'
    IF COALESCE(NEW.raw_user_meta_data->>'student_type', 'online') = 'presencial' THEN
      final_tipo := 'presencial'::user_tipo;
    ELSE
      final_tipo := 'online'::user_tipo;
    END IF;
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- NOVIDADE: Tentar resolver o nucleo_id pelo nome vindo do metadata
  IF NEW.raw_user_meta_data ? 'nucleo' THEN
     SELECT id INTO v_nucleo_id 
     FROM public.nucleos 
     WHERE LOWER(nome) = LOWER(NEW.raw_user_meta_data->>'nucleo')
     LIMIT 1;
  END IF;

  -- Segurança 3: Inserção/Atualização com Tratamento de Conflito de Email
  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso, nucleo, nucleo_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    final_tipo,
    final_caminhos,
    NEW.raw_user_meta_data->>'nucleo',
    v_nucleo_id
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo = EXCLUDED.nucleo,
    nucleo_id = EXCLUDED.nucleo_id,
    bloqueado = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
