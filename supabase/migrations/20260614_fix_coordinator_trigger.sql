-- Fix Coordinator Trigger and Profile Repair
-- Adds coordenador_polo support to handle_new_user trigger and profile repair

BEGIN;

-- 1. Update handle_new_user trigger to include coordenador_polo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nome TEXT;
  v_tipo TEXT;
  v_caminhos TEXT[];
BEGIN
  BEGIN
    v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
    v_tipo := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo', 'online');
    
    IF v_tipo NOT IN ('presencial', 'online', 'professor', 'admin', 'coordenador_polo') THEN
        v_tipo := 'online';
    END IF;

    IF v_tipo = 'admin' THEN 
        v_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
    ELSIF v_tipo = 'professor' THEN 
        v_caminhos := ARRAY['professor', 'aluno'];
    ELSIF v_tipo = 'coordenador_polo' THEN 
        v_caminhos := ARRAY['coordenador_polo', 'aluno'];
    ELSE 
        v_caminhos := ARRAY['aluno'];
    END IF;

    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso)
    VALUES (NEW.id, NEW.email, v_nome, v_tipo::public.user_tipo, v_caminhos)
    ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, nome = EXCLUDED.nome, tipo = EXCLUDED.tipo;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Repair existing coordinator profiles that may be missing caminhos_acesso
DO $$
DECLARE
    r RECORD;
    v_caminhos TEXT[];
BEGIN
    FOR r IN (
        SELECT id, tipo, caminhos_acesso
        FROM public.users
        WHERE tipo = 'coordenador_polo'
        AND (caminhos_acesso IS NULL OR caminhos_acesso = '{}' OR NOT ('coordenador_polo' = ANY(caminhos_acesso)))
    ) LOOP
        v_caminhos := ARRAY['coordenador_polo', 'aluno'];
        UPDATE public.users 
        SET caminhos_acesso = v_caminhos
        WHERE id = r.id;
        RAISE NOTICE 'Fixed caminhos_acesso for coordinator: %', r.id;
    END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';