-- ================================================================
-- CORRIGIR DUPLICATAS DE AVALIAÇÕES (linhas E aulas duplicadas)
-- ================================================================
-- Causa dupla observada:
--  A) LINHAS duplicadas em respostas_aulas (mesmo aluno_id + aula_id)
--     após scripts de mapeamento de IDs (ex.: 44_mapeamento_e_finalizacao).
--  B) AULAS duplicadas: o mesmo módulo tem DUAS aulas de avaliação com o
--     mesmo título/tipo/versão (criadas por re-importação/recriação).
--     Alunos têm submissão nas duas → ambas aparecem no dashboard do
--     admin/professor (Cristologia, História da Igreja, Teologia Prática,
--     Epístolas aos Hebreus, etc.).
--
-- Rode: PASSO 1 (diagnóstico) → me envie a saída.
-- Depois, se confirmado, rode PASSO 2 (linhas) e PASSO 3 (mesclagem de aulas).

-- ================================================================
-- PASSO 1: DIAGNÓSTICO
-- ================================================================

-- 1.1) Linhas duplicadas (mesmo aluno_id + aula_id)
SELECT '1.1) LINHAS DUPLICADAS EM respostas_aulas:' AS info;
SELECT COUNT(*) AS linhas_extra
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY aluno_id, aula_id ORDER BY id) AS rn
  FROM respostas_aulas
) d
WHERE d.rn > 1;

-- 1.2) AULAS de avaliação duplicadas no MESMO módulo
--      (mesmo livro_id + título + tipo + versão)
SELECT '1.2) AULAS DE AVALIAÇÃO DUPLICADAS NO MESMO MÓDULO:' AS info;
SELECT
  b.titulo AS modulo,
  a.titulo AS avaliacao,
  a.tipo,
  a.versao,
  COUNT(*) AS qtde_aulas_iguais,
  ARRAY_AGG(a.id::text ORDER BY a.created_at) AS ids_das_aulas,
  ARRAY_AGG(
    (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id)
    ORDER BY a.created_at
  ) AS submissoes_por_aula,
  ARRAY_AGG(
    CASE
      WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 'tem-gabarito'
      ELSE 'sem-gabarito'
    END
    ORDER BY a.created_at
  ) AS gabarito_por_aula
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao')
GROUP BY b.titulo, a.titulo, a.tipo, a.versao
HAVING COUNT(*) > 1
ORDER BY b.titulo, a.titulo;

-- 1.3) AULAS de avaliação dos módulos isolados (para conferir de olho)
SELECT '1.3) AVALIAÇÕES DOS MÓDULOS EM QUESTÃO (todas, para verificação):' AS info;
SELECT
  b.titulo AS modulo,
  a.id::text AS aula_id,
  a.titulo AS avaliacao,
  a.tipo,
  a.versao,
  a.ordem,
  (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) AS submissoes
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao')
  AND (
       b.titulo ILIKE '%cristolog%'
    OR b.titulo ILIKE '%história da igreja%' OR b.titulo ILIKE '%historia da igreja%'
    OR b.titulo ILIKE '%teologia pr%'
    OR b.titulo ILIKE '%hebreus%'
  )
ORDER BY b.titulo, a.titulo, a.versao;

-- 1.4) Índice único que impede novas duplicatas de linha (existe?)
SELECT '1.4) ÍNDICE ÚNICO (aluno_id, aula_id) EM respostas_aulas:' AS info;
SELECT indexname
FROM pg_indexes
WHERE tablename = 'respostas_aulas'
  AND indexdef ILIKE '%aluno_id%aula_id%';

-- ================================================================
-- PASSO 2: REMOVER LINHAS DUPLICADAS
-- Mantém por (aluno_id, aula_id) a linha mais completa/recente:
--   1) status ≠ 'liberado'   2) respostas preenchidas
--   3) com nota              4) updated_at mais recente
-- ================================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY aluno_id, aula_id
           ORDER BY
             (CASE WHEN status = 'liberado' THEN 0 ELSE 1 END) DESC,
             (CASE WHEN COALESCE(respostas::text, '') NOT IN ('', '{}', 'null') THEN 1 ELSE 0 END) DESC,
             (CASE WHEN nota IS NOT NULL THEN 1 ELSE 0 END) DESC,
             updated_at DESC NULLS LAST,
             created_at DESC NULLS LAST,
             tentativas DESC NULLS LAST,
             id::text DESC
         ) AS rn
  FROM respostas_aulas
)
DELETE FROM respostas_aulas r
USING ranked k
WHERE r.id = k.id AND k.rn > 1;
-- O Supabase reporta quantas linhas foram apagadas.

-- ================================================================
-- PASSO 3: MESCLAR AULAS DE AVALIAÇÃO DUPLICADAS
-- Para cada grupo de aulas iguais (mesmo módulo + título + tipo + versão):
--  - mantém a aula "melhor" (com gabarito > mais submissões > mais recente);
--  - migra respostas_aulas, progresso e liberações para a aula mantida;
--  - apaga as duplicadas.
-- Cada statement é AUTOCONTIDO (o CTE é recriado em cada um).
-- ================================================================

-- 3.1) Preview: aula apagada → aula mantida (conferir antes!)
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
), losers AS (
  SELECT a.id AS loser_id, b.keep_id AS keep_id,
         a.livro_id, a.titulo, a.tipo, a.versao
  FROM aulas a
  JOIN best b
    ON b.livro_id = a.livro_id AND b.titulo = a.titulo
   AND b.tipo = a.tipo AND b.versao = a.versao AND b.keep_id <> a.id
)
SELECT '3.1) AULAS QUE SERÃO APAGADAS (conferir antes):' AS info;
SELECT
  bb.titulo AS modulo,
  l.titulo AS avaliacao,
  l.tipo,
  l.versao,
  l.loser_id::text AS a_apagar,
  (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = l.loser_id) AS submissoes_migrar,
  l.keep_id::text AS para_onde
FROM losers l
JOIN livros bb ON bb.id = l.livro_id
ORDER BY bb.titulo, l.titulo;

-- 3.2a) Migrar respostas_aulas
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
), mapping AS (
  SELECT a.id AS loser_id, b.keep_id AS keep_id
  FROM aulas a
  JOIN best b
    ON b.livro_id = a.livro_id AND b.titulo = a.titulo
   AND b.tipo = a.tipo AND b.versao = a.versao AND b.keep_id <> a.id
)
UPDATE respostas_aulas r
SET aula_id = m.keep_id
FROM mapping m
WHERE r.aula_id = m.loser_id;

-- 3.2b) Migrar progresso
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
), mapping AS (
  SELECT a.id AS loser_id, b.keep_id AS keep_id
  FROM aulas a
  JOIN best b
    ON b.livro_id = a.livro_id AND b.titulo = a.titulo
   AND b.tipo = a.tipo AND b.versao = a.versao AND b.keep_id <> a.id
)
UPDATE progresso p
SET aula_id = m.keep_id
FROM mapping m
WHERE p.aula_id = m.loser_id;

-- 3.2c) Migrar liberações individuais de prova (se a tabela existir)
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
), mapping AS (
  SELECT a.id AS loser_id, b.keep_id AS keep_id
  FROM aulas a
  JOIN best b
    ON b.livro_id = a.livro_id AND b.titulo = a.titulo
   AND b.tipo = a.tipo AND b.versao = a.versao AND b.keep_id <> a.id
)
UPDATE liberacoes_excecao_atividade e
SET aula_id = m.keep_id
FROM mapping m
WHERE e.aula_id = m.loser_id;

-- 3.2d) Migrar liberações de núcleo
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
), mapping AS (
  SELECT a.id AS loser_id, b.keep_id AS keep_id
  FROM aulas a
  JOIN best b
    ON b.livro_id = a.livro_id AND b.titulo = a.titulo
   AND b.tipo = a.tipo AND b.versao = a.versao AND b.keep_id <> a.id
)
UPDATE liberacoes_nucleo n
SET item_id = m.keep_id
FROM mapping m
WHERE n.item_id = m.loser_id;

-- 3.3) Apagar as aulas duplicadas (que não são referenciadas como pai)
WITH best AS (
  SELECT DISTINCT
    a.livro_id, a.titulo, a.tipo, a.versao,
    FIRST_VALUE(a.id) OVER (
      PARTITION BY a.livro_id, a.titulo, a.tipo, a.versao
      ORDER BY
        (CASE WHEN a.questionario IS NOT NULL AND a.questionario::text NOT IN ('', '[]', 'null') THEN 1 ELSE 0 END) DESC,
        (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) DESC,
        a.created_at DESC NULLS LAST
    ) AS keep_id
  FROM aulas a
  WHERE a.tipo IN ('prova', 'avaliacao')
)
DELETE FROM aulas a
WHERE a.id IN (
  SELECT x.id FROM aulas x
  JOIN best b
    ON b.livro_id = x.livro_id AND b.titulo = x.titulo
   AND b.tipo = x.tipo AND b.versao = x.versao AND b.keep_id <> x.id
)
AND a.id NOT IN (SELECT DISTINCT parent_aula_id FROM aulas WHERE parent_aula_id IS NOT NULL);
-- Mostra quantas aulas duplicadas foram removidas.

-- ================================================================
-- PASSO 4 (OPCIONAL): PREVENÇÃO
-- ================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_respostas_aulas_aluno_aula
  ON respostas_aulas (aluno_id, aula_id);
-- Se esse comando der erro, ainda existem linhas duplicadas: rode o PASSO 2 de novo.