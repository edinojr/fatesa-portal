-- ==============================================================================
-- FATESA: REMOVER AULAS DUPLICADAS DE AVALIAÇÃO (MANTER EXATAMENTE 1 V1, 1 V2, 1 V3)
-- ==============================================================================
-- Este script elimina as avaliações excedentes (como as V3 duplicadas em Cristologia,
-- Epístola aos Hebreus, Epístolas Paulinas I, História da Igreja e Teologia Prática),
-- migrando com total segurança as respostas dos alunos antes de remover as duplicatas.
-- ==============================================================================

-- 1. Migrar respostas_aulas das aulas duplicadas para a avaliação canônica mantida
WITH ranked_aulas AS (
  SELECT
    a.id,
    a.livro_id,
    a.versao,
    ROW_NUMBER() OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS rn,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
),
duplicadas AS (
  SELECT id AS loser_id, keep_id
  FROM ranked_aulas
  WHERE rn > 1
)
UPDATE respostas_aulas r
SET aula_id = d.keep_id
FROM duplicadas d
WHERE r.aula_id = d.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM respostas_aulas r2
    WHERE r2.aluno_id = r.aluno_id AND r2.aula_id = d.keep_id
  );

-- 2. Limpar eventuais respostas das duplicadas que seriam colisão (mantendo a mais completa)
WITH ranked_aulas AS (
  SELECT
    a.id,
    ROW_NUMBER() OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS rn
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
)
DELETE FROM respostas_aulas
WHERE aula_id IN (SELECT id FROM ranked_aulas WHERE rn > 1);

-- 3. Migrar progresso
WITH ranked_aulas AS (
  SELECT
    a.id,
    a.livro_id,
    a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS rn
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
),
duplicadas AS (
  SELECT id AS loser_id, keep_id
  FROM ranked_aulas
  WHERE rn > 1
)
UPDATE progresso p
SET aula_id = d.keep_id
FROM duplicadas d
WHERE p.aula_id = d.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM progresso p2
    WHERE p2.aluno_id = p.aluno_id AND p2.aula_id = d.keep_id
  );

-- 4. Limpar progresso das duplicadas
WITH ranked_aulas AS (
  SELECT
    a.id,
    ROW_NUMBER() OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS rn
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
)
DELETE FROM progresso
WHERE aula_id IN (SELECT id FROM ranked_aulas WHERE rn > 1);

-- 5. Deletar as aulas duplicadas excedentes
WITH ranked_aulas AS (
  SELECT
    a.id,
    ROW_NUMBER() OVER (
      PARTITION BY a.livro_id, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at ASC
    ) AS rn
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
)
DELETE FROM aulas
WHERE id IN (SELECT id FROM ranked_aulas WHERE rn > 1);

-- ==============================================================================
-- 6. CONFERÊNCIA FINAL: EXIBE EXATAMENTE 1 V1, 1 V2, 1 V3 POR MÓDULO
-- ==============================================================================
SELECT 
  b.titulo AS modulo,
  a.versao,
  a.titulo AS avaliacao_titulo,
  a.tipo,
  a.is_bloco_final
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
ORDER BY b.titulo, a.versao ASC;
