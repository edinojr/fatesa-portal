-- ================================================================
-- REMOVER DUPLICATAS EM respostas_aulas
-- ================================================================
-- Causa: os scripts de mapeamento (ex.: 44_mapeamento_e_finalizacao)
-- fizeram UPDATE em respostas_aulas trocando aula_id antigos → novos.
-- Quando o aluno tinha um registro no aula antigo E outro no novo
-- (ex.: refez a prova após a recriação), os dois passaram a apontar
-- para o mesmo (aluno_id, aula_id) → a avaliação aparece 2x no
-- dashboard de administradores/professores.
--
-- Módulos afetados (exemplos): Cristologia, História da Igreja,
-- Teologia Prática, Hebreus, Doutrina do Espírito Santo, Epístolas.
--
-- O modelo do sistema é UMA linha por (aluno_id, aula_id). Duplicatas
-- nunca são desejadas. Mantém-se a linha mais "completa/recente":
--   1) status diferente de 'liberado' (submissão real)
--   2) respostas preenchidas
--   3) com nota
--   4) updated_at mais recente
--
-- Rode PASSO 1 (diagnóstico) primeiro e verifique o resultado.
-- Em seguida rode o PASSO 2 (remoção). O PASSO 3 é opcional (preventivo).

-- ================================================================
-- PASSO 1: DIAGNÓSTICO — quantas duplicatas e onde estão
-- ================================================================
SELECT 'TOTAL DE REGISTROS DUPLICADOS (linhas que serão apagadas):' AS info;
SELECT COUNT(*) AS linhas_duplicadas
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY aluno_id, aula_id ORDER BY id) AS rn
  FROM respostas_aulas
) d
WHERE d.rn > 1;

SELECT 'DETALHE POR ALUNO/MÓDULO/AVALIAÇÃO:' AS info;
SELECT
  u.nome AS aluno,
  l.titulo AS modulo,
  a.titulo AS avaliacao,
  a.versao,
  COUNT(*) AS qtde_linhas,
  ARRAY_AGG(r.status ORDER BY r.updated_at DESC) AS statuses
FROM respostas_aulas r
JOIN aulas a ON a.id = r.aula_id
LEFT JOIN livros l ON l.id = a.livro_id
JOIN users u ON u.id = r.aluno_id
WHERE r.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY aluno_id, aula_id ORDER BY id) AS rn
    FROM respostas_aulas
  ) d
  WHERE d.rn > 1
)
GROUP BY u.nome, l.titulo, a.titulo, a.versao
ORDER BY l.titulo, a.titulo, u.nome;

-- ================================================================
-- PASSO 2: REMOÇÃO — apaga as duplicatas, mantendo a melhor linha
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
-- O Supabase mostra nesse comando quantas linhas foram afetadas.

SELECT 'SOBRAS POR (aluno_id, aula_id) duplicado (deve ser sempre 1):' AS info;
SELECT COUNT(*) AS linhas_duplicadas_restantes
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY aluno_id, aula_id ORDER BY id) AS rn
  FROM respostas_aulas
) d
WHERE d.rn > 1;

-- ================================================================
-- PASSO 3 (OPCIONAL): PREVENÇÃO
-- ================================================================
-- Garante que novas duplicatas não voltem a acontecer. O app já usa
-- upsert com onConflict 'aluno_id,aula_id', então isso é só reforço.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_respostas_aulas_aluno_aula
--   ON respostas_aulas (aluno_id, aula_id);