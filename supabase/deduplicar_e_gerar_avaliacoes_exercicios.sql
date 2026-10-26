-- ==============================================================================
-- FATESA: AUDITORIA, DEDUPLICAÇÃO DE AVALIAÇÕES E AUTO-CORREÇÃO DE SUBMISSÕES
-- ==============================================================================
-- 1. Auto-corrige submissões de provas que ficaram com status 'pendente' ou 'nota is null'
-- 2. Deduplica questões repetidas nos questionários das avaliações
-- ==============================================================================

-- PARTE 1: DIAGNÓSTICO DE SUBMISSÕES PENDENTES
SELECT '1. SUBMISSÕES PENDENTES DE PROVAS:' AS info;
SELECT COUNT(*) AS total_pendentes
FROM respostas_aulas r
JOIN aulas a ON a.id = r.aula_id
WHERE a.tipo IN ('prova', 'avaliacao') AND (r.status = 'pendente' OR r.nota IS NULL);

-- PARTE 2: AUTO-CORREÇÃO DE SUBMISSÕES PENDENTES
-- Para submissões com respostas preenchidas em provas com gabarito
DO $$
DECLARE
  sub RECORD;
  q_item JSONB;
  q_list JSONB;
  user_ans JSONB;
  earned NUMERIC;
  total NUMERIC;
  final_grade NUMERIC;
  q_key TEXT;
  q_type TEXT;
  q_correct TEXT;
  ans_val TEXT;
  matching_pairs JSONB;
  pair_count INT;
  pair_score NUMERIC;
  p_idx INT;
  p_rec JSONB;
  user_chosen_idx TEXT;
  chosen_right TEXT;
  correct_right TEXT;
  corrected_count INT := 0;
BEGIN
  FOR sub IN
    SELECT r.id AS sub_id, r.aluno_id, r.aula_id, r.respostas, a.questionario, a.min_grade, a.livro_id
    FROM respostas_aulas r
    JOIN aulas a ON a.id = r.aula_id
    WHERE a.tipo IN ('prova', 'avaliacao')
      AND (r.status = 'pendente' OR r.nota IS NULL)
      AND r.respostas IS NOT NULL
      AND jsonb_typeof(r.respostas) = 'object'
      AND a.questionario IS NOT NULL
      AND jsonb_typeof(a.questionario) = 'array'
  LOOP
    q_list := sub.questionario;
    user_ans := sub.respostas;
    earned := 0;
    total := 0;

    FOR q_item IN SELECT * FROM jsonb_array_elements(q_list)
    LOOP
      q_key := COALESCE(q_item->>'id', '');
      q_type := COALESCE(q_item->>'type', 'multiple_choice');

      IF q_type = 'matching' THEN
        matching_pairs := q_item->'matchingPairs';
        IF matching_pairs IS NOT NULL AND jsonb_typeof(matching_pairs) = 'array' THEN
          pair_count := jsonb_array_length(matching_pairs);
          pair_score := 0;
          FOR p_idx IN 0 .. (pair_count - 1)
          LOOP
            p_rec := matching_pairs->p_idx;
            correct_right := lower(trim(COALESCE(p_rec->>'right', '')));
            user_chosen_idx := user_ans->q_key->>p_idx::text;
            IF user_chosen_idx IS NOT NULL AND user_chosen_idx ~ '^\d+$' AND user_chosen_idx::int < pair_count THEN
              chosen_right := lower(trim(COALESCE((matching_pairs->(user_chosen_idx::int))->>'right', '')));
              IF chosen_right = correct_right AND chosen_right <> '' THEN
                pair_score := pair_score + 0.5;
              END IF;
            END IF;
          END LOOP;
          earned := earned + LEAST(3.0, pair_score);
          total := total + LEAST(3.0, pair_count * 0.5);
        END IF;
      ELSE
        total := total + 0.5;
        IF q_type IN ('multiple_choice', 'mult_choice') THEN
          q_correct := lower(trim(COALESCE(q_item->>'correct', q_item->>'correctOption', '')));
          ans_val := lower(trim(COALESCE(user_ans->>q_key, '')));
          IF ans_val = q_correct AND ans_val <> '' THEN
            earned := earned + 0.5;
          END IF;
        ELSIF q_type = 'true_false' THEN
          q_correct := lower(trim(COALESCE(q_item->>'isTrue', q_item->>'correctAnswer', '')));
          ans_val := lower(trim(COALESCE(user_ans->>q_key, '')));
          IF ans_val = q_correct AND ans_val <> '' THEN
            earned := earned + 0.5;
          END IF;
        END IF;
      END IF;
    END LOOP;

    IF total > 0 THEN
      final_grade := round(((earned / total) * 10)::numeric, 1);
      UPDATE respostas_aulas
      SET nota = final_grade,
          status = 'corrigida',
          primeira_correcao_at = COALESCE(primeira_correcao_at, NOW()),
          updated_at = NOW()
      WHERE id = sub.sub_id;
      corrected_count := corrected_count + 1;

      -- Finalizar módulo se aprovado
      IF final_grade >= COALESCE(sub.min_grade, 7.0) AND sub.livro_id IS NOT NULL THEN
        UPDATE users
        SET modulos_finalizados_manual = array_append(
          COALESCE(modulos_finalizados_manual, ARRAY[]::UUID[]),
          sub.livro_id
        )
        WHERE id = sub.aluno_id
          AND NOT (COALESCE(modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[sub.livro_id]);
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total de submissões auto-corrigidas: %', corrected_count;
END $$;

-- PARTE 3: DEDUPLICAÇÃO DE QUESTÕES NOS QUESTIONÁRIOS
-- Função para deduplicar arrays JSONB de questões por enunciado
CREATE OR REPLACE FUNCTION public.deduplicar_questionario(q_json jsonb)
RETURNS jsonb AS $$
DECLARE
  q_elem jsonb;
  norm_text text;
  seen_keys text[] := ARRAY[]::text[];
  result_array jsonb := '[]'::jsonb;
BEGIN
  IF q_json IS NULL OR jsonb_typeof(q_json) <> 'array' THEN
    RETURN q_json;
  END IF;

  FOR q_elem IN SELECT * FROM jsonb_array_elements(q_json)
  LOOP
    norm_text := lower(trim(regexp_replace(COALESCE(q_elem->>'text', ''), '[^a-zA-Z0-9]+', ' ', 'g')));
    IF norm_text <> '' AND NOT (seen_keys @> ARRAY[norm_text]) THEN
      seen_keys := array_append(seen_keys, norm_text);
      result_array := result_array || jsonb_build_array(q_elem);
    END IF;
  END LOOP;

  RETURN result_array;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Executa a deduplicação em todas as aulas de avaliação
UPDATE aulas
SET questionario = public.deduplicar_questionario(questionario)
WHERE tipo IN ('prova', 'avaliacao')
  AND questionario IS NOT NULL
  AND jsonb_typeof(questionario) = 'array'
  AND jsonb_array_length(questionario) > jsonb_array_length(public.deduplicar_questionario(questionario));

SELECT 'DEDUPLICAÇÃO E AUTO-CORREÇÃO CONCLUÍDAS COM SUCESSO.' AS status;
