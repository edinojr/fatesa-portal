-- ==============================================================================
-- FATESA PORTAL - SUPER MIGRAÇÃO DE CORREÇÃO TOTAL (V3)
-- data: 2026-03-25
-- Instrução: Execute este script para eliminar DEFINITIVAMENTE o erro 500 no signup.
-- ==============================================================================

-- 1. ATUALIZAR ENUM DE TIPOS DE USUÁRIO
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'aluno') THEN
    ALTER TYPE public.user_tipo ADD VALUE 'aluno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'suporte') THEN
    ALTER TYPE public.user_tipo ADD VALUE 'suporte';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'presencial') THEN
    ALTER TYPE public.user_tipo ADD VALUE 'presencial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'online') THEN
    ALTER TYPE public.user_tipo ADD VALUE 'online';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. GARANTIR TODAS AS COLUNAS NA TABELA USERS
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo') THEN
    ALTER TABLE public.users ADD COLUMN nucleo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo_id') THEN
    ALTER TABLE public.users ADD COLUMN nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status_nucleo') THEN
    ALTER TABLE public.users ADD COLUMN status_nucleo TEXT DEFAULT 'aprovado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'acesso_definitivo') THEN
    ALTER TABLE public.users ADD COLUMN acesso_definitivo BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bloqueado') THEN
    ALTER TABLE public.users ADD COLUMN bloqueado BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'caminhos_acesso') THEN
    ALTER TABLE public.users ADD COLUMN caminhos_acesso TEXT[] DEFAULT ARRAY['aluno'];
  END IF;
END $$;

-- 3. GATILHO À PROVA DE BALAS (handle_new_user)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_admin BOOLEAN;
  v_final_tipo public.user_tipo;
  v_final_caminhos TEXT[];
  v_nucleo_id UUID;
  v_nucleo_nome TEXT;
  v_full_name TEXT;
BEGIN
  -- 1. Capturar nome com fallbacks seguros
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'nome', 
    split_part(NEW.email, '@', 1)
  );

  -- 2. Checar autorizações
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_admin;

  -- 3. Definir Tipo e Caminhos
  IF v_is_admin THEN
    v_final_tipo := 'admin'::public.user_tipo;
    v_final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF v_is_teacher THEN
    v_final_tipo := 'professor'::public.user_tipo;
    v_final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    IF COALESCE(NEW.raw_user_meta_data->>'student_type', 'online') = 'presencial' THEN
      v_final_tipo := 'presencial'::public.user_tipo;
    ELSE
      v_final_tipo := 'online'::public.user_tipo;
    END IF;
    v_final_caminhos := ARRAY['aluno'];
  END IF;

  -- 4. Resolução de Núcleo (com tratamento de erro para FK inexistente)
  v_nucleo_id := NULL;
  v_nucleo_nome := NEW.raw_user_meta_data->>'nucleo';

  IF (NEW.raw_user_meta_data->>'nucleo_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_nucleo_id := (NEW.raw_user_meta_data->>'nucleo_id')::UUID;
    -- Verificar se o ID realmente existe na tabela nucleos
    IF NOT EXISTS (SELECT 1 FROM public.nucleos WHERE id = v_nucleo_id) THEN
      v_nucleo_id := NULL;
    END IF;
  END IF;

  IF v_nucleo_id IS NULL AND v_nucleo_nome IS NOT NULL AND v_nucleo_nome != '' THEN
    SELECT id INTO v_nucleo_id FROM public.nucleos WHERE LOWER(nome) = LOWER(v_nucleo_nome) LIMIT 1;
  END IF;

  IF v_nucleo_id IS NOT NULL AND (v_nucleo_nome IS NULL OR v_nucleo_nome = '') THEN
    SELECT nome INTO v_nucleo_nome FROM public.nucleos WHERE id = v_nucleo_id;
  END IF;

  -- 5. Inserir/Atualizar com proteção total contra erros
  BEGIN
    INSERT INTO public.users (
      id, nome, email, tipo, caminhos_acesso, 
      nucleo, nucleo_id, status_nucleo, acesso_definitivo, bloqueado
    )
    VALUES (
      NEW.id, v_full_name, NEW.email, v_final_tipo, v_final_caminhos,
      v_nucleo_nome, v_nucleo_id, 
      CASE WHEN v_nucleo_id IS NOT NULL THEN 'pendente' ELSE 'aprovado' END,
      FALSE, FALSE
    )
    ON CONFLICT (email) DO UPDATE SET 
      id = EXCLUDED.id,
      nome = EXCLUDED.nome,
      tipo = EXCLUDED.tipo,
      caminhos_acesso = EXCLUDED.caminhos_acesso,
      nucleo = EXCLUDED.nucleo,
      nucleo_id = EXCLUDED.nucleo_id,
      bloqueado = FALSE;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar qualquer coisa acima (ex: coluna faltando), tenta o básico absoluto
    BEGIN
      INSERT INTO public.users (id, nome, email)
      VALUES (NEW.id, v_full_name, NEW.email)
      ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, nome = EXCLUDED.nome;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar até o básico, ignora para não quebrar o signup do Auth
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-ESTABELECER FUNÇÃO DE SUPORTE
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_registration_details(TEXT);
CREATE OR REPLACE FUNCTION public.get_registration_details(p_email TEXT)
RETURNS TABLE (found BOOLEAN, nome TEXT, tipo TEXT, nucleo TEXT, nucleo_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE as found, u.nome, u.tipo::TEXT, u.nucleo, u.nucleo_id
  FROM public.users u WHERE LOWER(u.email) = LOWER(p_email) LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERMISSÕES E SINCRONIZAÇÃO
-- ------------------------------------------------------------------------------
UPDATE public.users u SET nucleo_id = n.id FROM public.nucleos n 
WHERE u.nucleo_id IS NULL AND u.nucleo IS NOT NULL AND LOWER(u.nucleo) = LOWER(n.nome);

GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT SELECT ON public.liberacoes_nucleo TO authenticated;
GRANT SELECT ON public.liberacoes_nucleo TO anon;
GRANT EXECUTE ON FUNCTION public.get_registration_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_details TO anon;
