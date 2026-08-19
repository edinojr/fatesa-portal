-- ==============================================================================
-- #8 EMISSÃO AUTOMÁTICA DE CERTIFICADO
-- ==============================================================================
-- Trigger em respostas_aulas que, ao registrar aprovação de prova final
-- (status='corrigida' e nota >= min_grade), conta módulos aprovados do nível
-- (basico/medio). Se o aluno atingiu o número exigido (27 básico / 8 médio) e
-- ainda não possui registro em registros_alumni para aquele nível, emite
-- automaticamente o certificado (registro_alumni + codigo_verificacao UUID).
--
-- Dados de RG/CEP/endereço/telefone ficam NULL até o aluno ou admin completar
-- via portal. O codigo_verificacao já é válido para o PDF emitido pela UI.
--
-- Aplicar via: supabase db execute / psql.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_auto_graduate()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user          UUID;
  v_aula_id       UUID;
  v_book_nivel    TEXT;
  v_required      INT;
  v_finished      INT;
  v_existing      UUID;
  v_user_name     TEXT;
  v_user_email    TEXT;
  v_curso_nome    TEXT;
  v_nucleo_nome   TEXT;
  v_year          TEXT;
BEGIN
  -- Ignora updates que não alteraram nota ou status (no-op)
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.nota IS NOT DISTINCT FROM OLD.nota THEN
    RETURN NEW;
  END IF;

  -- Só dispara em correção concluída
  IF COALESCE(NEW.status, '') <> 'corrigida' THEN
    RETURN NEW;
  END IF;

  v_user    := NEW.aluno_id;
  v_aula_id := NEW.aula_id;

  -- Descobre o nível do curso da aula respondida
  SELECT c.nivel INTO v_book_nivel
  FROM public.aulas a
  JOIN public.livros l ON l.id = a.livro_id
  JOIN public.cursos c ON c.id = l.curso_id
  WHERE a.id = v_aula_id;

  IF v_book_nivel IS NULL THEN RETURN NEW; END IF;
  IF v_book_nivel NOT IN ('basico', 'medio') THEN RETURN NEW; END IF;

  -- Limite exigido por nível (mirrors src/config/graduation.ts)
  v_required := CASE v_book_nivel WHEN 'basico' THEN 27 WHEN 'medio' THEN 8 ELSE 0 END;
  IF v_required = 0 THEN RETURN NEW; END IF;

  -- Conta módulos (livros) aprovados neste nível: existência de uma prova final
  -- (is_bloco_final OR tipo IN ('prova','avaliacao')) corrigida com nota>=min_grade
  SELECT COUNT(DISTINCT l.id) INTO v_finished
  FROM public.respostas_aulas r
  JOIN public.aulas a ON a.id = r.aula_id
  JOIN public.livros l ON l.id = a.livro_id
  JOIN public.cursos c ON c.id = l.curso_id
  WHERE r.aluno_id = v_user
    AND r.status   = 'corrigida'
    AND r.nota    >= COALESCE(a.min_grade, 7)
    AND (a.is_bloco_final = true OR a.tipo IN ('prova', 'avaliacao'))
    AND c.nivel   = v_book_nivel;

  IF v_finished < v_required THEN RETURN NEW; END IF;

  -- Já existe alumni para este user? (por user_id ou email)
  SELECT id INTO v_existing
  FROM public.registros_alumni
  WHERE (user_id IS NOT NULL AND user_id = v_user)
     OR (email IS NOT NULL AND email = (SELECT email FROM public.users WHERE id = v_user))
  LIMIT 1;

  IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

  -- Dados do aluno + curso + núcleo
  SELECT u.nome, u.email INTO v_user_name, v_user_email FROM public.users u WHERE u.id = v_user;
  SELECT c.nome INTO v_curso_nome
    FROM public.aulas a
    JOIN public.livros l ON l.id = a.livro_id
    JOIN public.cursos c ON c.id = l.curso_id
    WHERE a.id = v_aula_id;
  SELECT n.nome INTO v_nucleo_nome
    FROM public.nucleos n
    JOIN public.users u ON u.nucleo_id = n.id
    WHERE u.id = v_user;

  v_year := TO_CHAR(now(), 'YYYY');

  -- Cria registro de alumni automático (codigo_verificacao gerado; dados de RG/CEP pendentes)
  INSERT INTO public.registros_alumni (
    user_id, nome, email, curso, nivel_curso, nucleo, ano_formacao,
    codigo_verificacao, observacoes, created_at
  ) VALUES (
    v_user,
    COALESCE(v_user_name, 'Aluno'),
    v_user_email,
    v_curso_nome,
    CASE v_book_nivel WHEN 'basico' THEN 'Básico' WHEN 'medio' THEN 'Médio' END,
    COALESCE(v_nucleo_nome, 'Polo Central'),
    v_year,
    gen_random_uuid(),
    'Emissão automática via trigger ao atingir ' || v_finished || ' módulos do nível ' || v_book_nivel || ' em ' || v_year || '. Dados de RG/CEP pendentes de complemento pelo aluno.',
    now()
  );

  -- Marca ano de graduação no perfil (sem alterar tipo do usuário — ex_aluno fica a critério do admin)
  UPDATE public.users
    SET ano_graduacao = COALESCE(ano_graduacao, v_year)
    WHERE id = v_user AND ano_graduacao IS NULL;

  RAISE NOTICE 'Certificado automático emitido para usuário % (nível %)', v_user, v_book_nivel;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_graduate ON public.respostas_aulas;
CREATE TRIGGER trg_auto_graduate
  AFTER INSERT OR UPDATE ON public.respostas_aulas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_graduate();

COMMENT ON FUNCTION public.fn_auto_graduate() IS 'Emite registro_alumni + codigo_verificacao automaticamente quando aluno atinge requiredModules do nível (basico=27, medio=8).';