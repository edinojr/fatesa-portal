-- ==============================================================================
-- SINCRONIZAÇÃO COMPLETA: PROGRESSO DOS ALUNOS E NOTAS MANUAIS
-- ==============================================================================

-- 1. Função RPC para sincronizar o progresso e notas de formados e manuais
CREATE OR REPLACE FUNCTION public.sincronizar_progresso_notas_alumni()
RETURNS TABLE(
  usuarios_atualizados INTEGER,
  notas_sincronizadas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_users_count INTEGER := 0;
  v_notas_count INTEGER := 0;
  v_basic_book_ids UUID[];
  rec_alumni RECORD;
  rec_user RECORD;
  v_item JSONB;
  v_modulo_nome TEXT;
  v_nota NUMERIC;
  v_data DATE;
BEGIN
  -- Coleta todos os IDs dos 27 livros do Curso Básico
  SELECT array_agg(l.id)
  INTO v_basic_book_ids
  FROM public.livros l
  JOIN public.cursos c ON l.curso_id = c.id
  WHERE lower(c.nome) LIKE '%básico%' OR lower(c.nivel) LIKE '%basico%' OR lower(c.nivel) LIKE '%básico%';

  -- Caso a busca por curso não retorne, pega os 27 primeiros livros por ordem
  IF v_basic_book_ids IS NULL OR array_length(v_basic_book_ids, 1) < 20 THEN
    SELECT array_agg(id)
    INTO v_basic_book_ids
    FROM (
      SELECT id FROM public.livros ORDER BY ordem LIMIT 27
    ) sub;
  END IF;

  -- 1. Vincular registros_alumni que possuem email correspondente em public.users
  UPDATE public.registros_alumni ra
  SET user_id = u.id
  FROM public.users u
  WHERE ra.user_id IS NULL
    AND lower(trim(ra.email)) = lower(trim(u.email));

  -- 2. Para cada formado aprovado com usuário vinculado:
  FOR rec_alumni IN
    SELECT ra.id, ra.user_id, ra.nome, ra.email, ra.curso, ra.historico
    FROM public.registros_alumni ra
    WHERE ra.user_id IS NOT NULL
      AND (ra.status_aprovacao = 'aprovado' OR ra.status_aprovacao IS NULL)
  LOOP
    -- Garantir tipo 'ex_aluno', acesso definitivo e os módulos do básico no perfil
    UPDATE public.users u
    SET tipo = 'ex_aluno',
        acesso_definitivo = true,
        modulos_finalizados_manual = (
          SELECT array_agg(DISTINCT elem)
          FROM unnest(coalesce(u.modulos_finalizados_manual, ARRAY[]::UUID[]) || coalesce(v_basic_book_ids, ARRAY[]::UUID[])) AS elem
        )
    WHERE u.id = rec_alumni.user_id;

    v_users_count := v_users_count + 1;

    -- Se tiver histórico com notas manuais em formato JSON, sincroniza na tabela historico_notas
    IF rec_alumni.historico IS NOT NULL AND jsonb_typeof(to_jsonb(rec_alumni.historico)) = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(to_jsonb(rec_alumni.historico))
      LOOP
        v_modulo_nome := trim(v_item->>'modulo');
        BEGIN
          v_nota := (v_item->>'nota')::numeric;
        EXCEPTION WHEN OTHERS THEN
          v_nota := 10.0;
        END;

        BEGIN
          v_data := to_date(v_item->>'data', 'DD/MM/YYYY');
        EXCEPTION WHEN OTHERS THEN
          v_data := CURRENT_DATE;
        END;

        IF v_modulo_nome IS NOT NULL AND v_modulo_nome <> '' THEN
          -- Insere se não existir para este aluno e módulo
          IF NOT EXISTS (
            SELECT 1 FROM public.historico_notas hn
            WHERE hn.aluno_id = rec_alumni.user_id
              AND lower(trim(hn.modulo_nome)) = lower(trim(v_modulo_nome))
          ) THEN
            INSERT INTO public.historico_notas (
              aluno_id,
              curso_nome,
              modulo_nome,
              nota,
              data_conclusao,
              observacao
            ) VALUES (
              rec_alumni.user_id,
              coalesce(rec_alumni.curso, 'Teologia Básico'),
              v_modulo_nome,
              v_nota,
              coalesce(v_data, CURRENT_DATE),
              'Importado do histórico manual de formados'
            );
            v_notas_count := v_notas_count + 1;
          ELSE
            -- Atualiza se a nota estiver diferente
            UPDATE public.historico_notas
            SET nota = v_nota,
                updated_at = now()
            WHERE aluno_id = rec_alumni.user_id
              AND lower(trim(modulo_nome)) = lower(trim(v_modulo_nome))
              AND (nota IS NULL OR nota <> v_nota);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_users_count, v_notas_count;
END;
$$;

-- Permissão de execução
GRANT EXECUTE ON FUNCTION public.sincronizar_progresso_notas_alumni() TO authenticated, anon;

-- 2. Executar a sincronização imediatamente
SELECT * FROM public.sincronizar_progresso_notas_alumni();

-- 3. Atualizar cache do Supabase API
NOTIFY pgrst, 'reload schema';
