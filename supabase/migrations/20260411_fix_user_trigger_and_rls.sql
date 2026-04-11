-- ==========================================
-- FIX USER TRIGGER AND ADD SELF-HEALING RPC
-- ==========================================

-- 1. Fix handle_new_user function (Remove deleted 'nucleo' column)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
  meta_type TEXT;
  meta_nome TEXT;
BEGIN
  -- Determine identity via email
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;
  
  -- Metadata extraction
  meta_type := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo');
  meta_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  -- Set final role and access paths
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    CASE COALESCE(meta_type, 'online')
      WHEN 'presencial'      THEN final_tipo := 'presencial'::user_tipo;
      WHEN 'super_visitante' THEN final_tipo := 'super_visitante'::user_tipo;
      WHEN 'ex_aluno'        THEN final_tipo := 'ex_aluno'::user_tipo;
      WHEN 'colaborador'     THEN final_tipo := 'colaborador'::user_tipo;
      WHEN 'suporte'         THEN final_tipo := 'suporte'::user_tipo;
      WHEN 'admin'           THEN final_tipo := 'admin'::user_tipo;
      WHEN 'professor'       THEN final_tipo := 'professor'::user_tipo;
      ELSE                        final_tipo := 'online'::user_tipo;
    END CASE;
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- Upsert into public.users (Removed legacy 'nucleo' column)
  INSERT INTO public.users (
    id, nome, email, tipo, caminhos_acesso, 
    nucleo_id, acesso_definitivo
  )
  VALUES (
    NEW.id,
    meta_nome,
    NEW.email,
    final_tipo,
    final_caminhos,
    NULLIF(NEW.raw_user_meta_data->>'nucleo_id', '')::UUID,
    (COALESCE(NEW.raw_user_meta_data->>'acesso_definitivo', 'false') = 'true')
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo_id = EXCLUDED.nucleo_id,
    acesso_definitivo = EXCLUDED.acesso_definitivo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Self-Healing RPC function
-- This allows a user to "force-create" their profile if the trigger fails
CREATE OR REPLACE FUNCTION public.create_profile_if_missing(
  p_user_id UUID,
  p_email TEXT,
  p_nome TEXT,
  p_tipo TEXT,
  p_nucleo_id UUID DEFAULT NULL,
  p_caminhos_acesso TEXT[] DEFAULT ARRAY['aluno']
)
RETURNS public.users AS $$
DECLARE
  v_user public.users;
BEGIN
  -- Security Check: A user can only create/repair their own profile
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to create profile for another user';
  END IF;

  INSERT INTO public.users (id, email, nome, tipo, nucleo_id, caminhos_acesso)
  VALUES (p_user_id, p_email, p_nome, p_tipo::user_tipo, p_nucleo_id, p_caminhos_acesso)
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    nucleo_id = EXCLUDED.nucleo_id,
    caminhos_acesso = EXCLUDED.caminhos_acesso
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_if_missing TO authenticated;
