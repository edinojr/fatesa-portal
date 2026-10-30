-- =========================================================================
-- PADRONIZAÇÃO DE DADOS DE ALUNOS EM CAIXA ALTA (LETRAS MAIÚSCULAS)
-- Fatesa - Casa do Saber
-- =========================================================================

-- 1. ATUALIZAR DADOS EXISTENTES NA TABELA DE USUÁRIOS (public.users)
UPDATE public.users
SET 
  nome = UPPER(TRIM(nome)),
  endereco = CASE WHEN endereco IS NOT NULL THEN UPPER(TRIM(endereco)) ELSE NULL END,
  rg = CASE WHEN rg IS NOT NULL THEN UPPER(TRIM(rg)) ELSE NULL END,
  curso_opcao = CASE WHEN curso_opcao IS NOT NULL THEN UPPER(TRIM(curso_opcao)) ELSE NULL END,
  nucleo = CASE WHEN nucleo IS NOT NULL THEN UPPER(TRIM(nucleo)) ELSE NULL END
WHERE nome IS NOT NULL;

-- 2. ATUALIZAR DADOS EXISTENTES NA TABELA DE FORMADOS (public.registros_alumni)
UPDATE public.registros_alumni
SET 
  nome = UPPER(TRIM(nome)),
  curso = CASE WHEN curso IS NOT NULL THEN UPPER(TRIM(curso)) ELSE NULL END,
  nivel_curso = CASE WHEN nivel_curso IS NOT NULL THEN UPPER(TRIM(nivel_curso)) ELSE NULL END,
  nucleo = CASE WHEN nucleo IS NOT NULL THEN UPPER(TRIM(nucleo)) ELSE NULL END,
  rg = CASE WHEN rg IS NOT NULL THEN UPPER(TRIM(rg)) ELSE NULL END,
  endereco = CASE WHEN endereco IS NOT NULL THEN UPPER(TRIM(endereco)) ELSE NULL END,
  bairro = CASE WHEN bairro IS NOT NULL THEN UPPER(TRIM(bairro)) ELSE NULL END,
  cidade = CASE WHEN cidade IS NOT NULL THEN UPPER(TRIM(cidade)) ELSE NULL END,
  uf = CASE WHEN uf IS NOT NULL THEN UPPER(TRIM(uf)) ELSE NULL END
WHERE nome IS NOT NULL;

-- 3. ATUALIZAR DADOS EXISTENTES NAS SOLICITAÇÕES DE MATRÍCULA (public.solicitacoes_matricula)
UPDATE public.solicitacoes_matricula
SET 
  nome = UPPER(TRIM(nome)),
  endereco = CASE WHEN endereco IS NOT NULL THEN UPPER(TRIM(endereco)) ELSE NULL END,
  curso_opcao = CASE WHEN curso_opcao IS NOT NULL THEN UPPER(TRIM(curso_opcao)) ELSE NULL END,
  nucleo = CASE WHEN nucleo IS NOT NULL THEN UPPER(TRIM(nucleo)) ELSE NULL END
WHERE nome IS NOT NULL;

-- 4. ATUALIZAR METADADOS EM AUTH.USERS (raw_user_meta_data->>'full_name')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{full_name}',
      to_jsonb(UPPER(TRIM(raw_user_meta_data->>'full_name')))
    )
    WHERE raw_user_meta_data->>'full_name' IS NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignora se permissão sobre auth.users for restrita ao postgres superuser
  NULL;
END $$;

-- 5. TRIGGER DE GARANTIA AUTOMÁTICA EM public.users
CREATE OR REPLACE FUNCTION public.trg_uppercase_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nome IS NOT NULL THEN
    NEW.nome := UPPER(TRIM(NEW.nome));
  END IF;
  IF NEW.endereco IS NOT NULL THEN
    NEW.endereco := UPPER(TRIM(NEW.endereco));
  END IF;
  IF NEW.rg IS NOT NULL THEN
    NEW.rg := UPPER(TRIM(NEW.rg));
  END IF;
  IF NEW.curso_opcao IS NOT NULL THEN
    NEW.curso_opcao := UPPER(TRIM(NEW.curso_opcao));
  END IF;
  IF NEW.nucleo IS NOT NULL THEN
    NEW.nucleo := UPPER(TRIM(NEW.nucleo));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_uppercase ON public.users;
CREATE TRIGGER trg_users_uppercase
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_uppercase_users();

-- 6. TRIGGER DE GARANTIA AUTOMÁTICA EM public.registros_alumni
CREATE OR REPLACE FUNCTION public.trg_uppercase_registros_alumni()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nome IS NOT NULL THEN NEW.nome := UPPER(TRIM(NEW.nome)); END IF;
  IF NEW.curso IS NOT NULL THEN NEW.curso := UPPER(TRIM(NEW.curso)); END IF;
  IF NEW.nivel_curso IS NOT NULL THEN NEW.nivel_curso := UPPER(TRIM(NEW.nivel_curso)); END IF;
  IF NEW.nucleo IS NOT NULL THEN NEW.nucleo := UPPER(TRIM(NEW.nucleo)); END IF;
  IF NEW.rg IS NOT NULL THEN NEW.rg := UPPER(TRIM(NEW.rg)); END IF;
  IF NEW.endereco IS NOT NULL THEN NEW.endereco := UPPER(TRIM(NEW.endereco)); END IF;
  IF NEW.bairro IS NOT NULL THEN NEW.bairro := UPPER(TRIM(NEW.bairro)); END IF;
  IF NEW.cidade IS NOT NULL THEN NEW.cidade := UPPER(TRIM(NEW.cidade)); END IF;
  IF NEW.uf IS NOT NULL THEN NEW.uf := UPPER(TRIM(NEW.uf)); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registros_alumni_uppercase ON public.registros_alumni;
CREATE TRIGGER trg_registros_alumni_uppercase
  BEFORE INSERT OR UPDATE ON public.registros_alumni
  FOR EACH ROW EXECUTE FUNCTION public.trg_uppercase_registros_alumni();

-- 7. TRIGGER DE GARANTIA AUTOMÁTICA EM public.solicitacoes_matricula
CREATE OR REPLACE FUNCTION public.trg_uppercase_solicitacoes_matricula()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nome IS NOT NULL THEN NEW.nome := UPPER(TRIM(NEW.nome)); END IF;
  IF NEW.endereco IS NOT NULL THEN NEW.endereco := UPPER(TRIM(NEW.endereco)); END IF;
  IF NEW.curso_opcao IS NOT NULL THEN NEW.curso_opcao := UPPER(TRIM(NEW.curso_opcao)); END IF;
  IF NEW.nucleo IS NOT NULL THEN NEW.nucleo := UPPER(TRIM(NEW.nucleo)); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitacoes_matricula_uppercase ON public.solicitacoes_matricula;
CREATE TRIGGER trg_solicitacoes_matricula_uppercase
  BEFORE INSERT OR UPDATE ON public.solicitacoes_matricula
  FOR EACH ROW EXECUTE FUNCTION public.trg_uppercase_solicitacoes_matricula();

-- 8. ATUALIZAR FUNÇÃO HANDLE_NEW_USER (CASO EXISTA) PARA REGISTRAR SEMPRE EM CAIXA ALTA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE email = NEW.email) INTO is_teacher;

  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso)
  VALUES (
    NEW.id,
    COALESCE(UPPER(TRIM(NEW.raw_user_meta_data->>'full_name')), ''),
    LOWER(TRIM(NEW.email)),
    CASE WHEN is_teacher THEN 'professor'::user_tipo ELSE 'online'::user_tipo END,
    CASE WHEN is_teacher THEN ARRAY['professor'] ELSE ARRAY['aluno'] END
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
