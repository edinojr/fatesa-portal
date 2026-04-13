-- 1. GARANTIR QUE AS COLUNAS NECESSÁRIAS EXISTAM NA TABELA USERS
DO $$ 
BEGIN 
  -- Coluna nucleo (Texto - para compatibilidade e exibição rápida)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo') THEN
    ALTER TABLE public.users ADD COLUMN nucleo TEXT;
  END IF;
  
  -- Coluna nucleo_id (UUID - para integridade e novas funcionalidades)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo_id') THEN
    ALTER TABLE public.users ADD COLUMN nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. GATILHO ROBUSTO PARA RESOLVER NUCLEO_ID 
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
  v_nucleo_id UUID;
  v_nucleo_nome TEXT;
BEGIN
  -- Identificar se o email está pré-autorizado
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;

  -- Determinar o tipo correto
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    IF COALESCE(NEW.raw_user_meta_data->>'student_type', 'online') = 'presencial' THEN
      final_tipo := 'presencial'::user_tipo;
    ELSE
      final_tipo := 'online'::user_tipo;
    END IF;
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- RESOLUÇÃO DO NÚCLEO (COM VALIDAÇÃO DE UUID)
  v_nucleo_id := NULL;
  v_nucleo_nome := NEW.raw_user_meta_data->>'nucleo';

  -- Prioridade 1: Se o nucleo_id no metadata for um UUID válido
  IF (NEW.raw_user_meta_data->>'nucleo_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_nucleo_id := (NEW.raw_user_meta_data->>'nucleo_id')::UUID;
  END IF;

  -- Prioridade 2: Se ainda não temos ID, resolvemos pelo Nome
  IF v_nucleo_id IS NULL AND v_nucleo_nome IS NOT NULL AND v_nucleo_nome != '' THEN
    SELECT id INTO v_nucleo_id FROM public.nucleos WHERE LOWER(nome) = LOWER(v_nucleo_nome) LIMIT 1;
  END IF;

  -- Se resolveu o ID, garantir que o Nome (texto) esteja sincronizado para exibição
  IF v_nucleo_id IS NOT NULL AND (v_nucleo_nome IS NULL OR v_nucleo_nome = '') THEN
    SELECT nome INTO v_nucleo_nome FROM public.nucleos WHERE id = v_nucleo_id;
  END IF;

  -- Inserção/Atualização 
  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso, nucleo, nucleo_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    final_tipo,
    final_caminhos,
    v_nucleo_nome,
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

-- 3. RESET DE GATILHO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. FUNÇÃO DE APOIO AO SIGNUP (Retorna ID)
CREATE OR REPLACE FUNCTION public.get_registration_details(p_email TEXT)
RETURNS TABLE (
  found BOOLEAN,
  nome TEXT,
  tipo user_tipo,
  nucleo TEXT,
  nucleo_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as found,
    u.nome,
    u.tipo,
    u.nucleo,
    u.nucleo_id
  FROM public.users u
  WHERE LOWER(u.email) = LOWER(p_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. BACKFILL FINAL
UPDATE public.users u
SET nucleo_id = n.id
FROM public.nucleos n
WHERE u.nucleo_id IS NULL 
  AND u.nucleo IS NOT NULL
  AND LOWER(u.nucleo) = LOWER(n.nome);

GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
