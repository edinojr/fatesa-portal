
-- ==========================================
-- MASTER FIX - FATESA PORTAL (VERSION 2)
-- ==========================================

-- 1. ADD NEW ROLES TO ENUM (Individually)
-- PostgreSQL does not allow adding enum values inside a transaction block (DO $$).
-- Run these lines one by one if needed.
ALTER TYPE user_tipo ADD VALUE IF NOT EXISTS 'super_visitante';
ALTER TYPE user_tipo ADD VALUE IF NOT EXISTS 'ex_aluno';
ALTER TYPE user_tipo ADD VALUE IF NOT EXISTS 'colaborador';
ALTER TYPE user_tipo ADD VALUE IF NOT EXISTS 'suporte';

-- 2. ENSURE TABLES AND COLUMNS (Safe block)
DO $$
BEGIN
    -- Public Users structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'acesso_definitivo') THEN
        ALTER TABLE public.users ADD COLUMN acesso_definitivo BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo_id') THEN
        ALTER TABLE public.users ADD COLUMN nucleo_id UUID;
    END IF;
    
    -- Exam Versioning structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aulas' AND column_name = 'versao') THEN
        ALTER TABLE public.aulas ADD COLUMN versao INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'respostas_aulas' AND column_name = 'start_time') THEN
        ALTER TABLE public.respostas_aulas ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- 3. DROP AND RECREATE ROBUST REGISTRATION TRIGGER
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
  -- A. Detect roles from auth tables
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;
  
  -- B. Extract Metadata (Highly compatible search)
  meta_type := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo');
  meta_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  -- C. Set Role logic
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    -- Safe mapping for student types
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

  -- D. Secure Insert into public.users with cast checking
  INSERT INTO public.users (
    id, nome, email, tipo, caminhos_acesso, 
    nucleo, nucleo_id, acesso_definitivo
  )
  VALUES (
    NEW.id,
    meta_nome,
    NEW.email,
    final_tipo,
    final_caminhos,
    NEW.raw_user_meta_data->>'nucleo',
    NULLIF(NEW.raw_user_meta_data->>'nucleo_id', '')::UUID,
    (COALESCE(NEW.raw_user_meta_data->>'acesso_definitivo', 'false') = 'true')
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo = EXCLUDED.nucleo,
    nucleo_id = EXCLUDED.nucleo_id,
    acesso_definitivo = EXCLUDED.acesso_definitivo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
