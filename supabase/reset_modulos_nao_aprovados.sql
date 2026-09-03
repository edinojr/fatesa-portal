-- ==========================================================
-- RESET DE MÓDULOS NÃO APROVADOS
-- ==========================================================
-- Objetivo:
--   Limpar TODO o estado de módulos onde o aluno NÃO foi aprovado
--   (sem aprovação por prova e sem liberação manual do administrador),
--   devolvendo o módulo ao painel do aluno para refazer o processo.
--
-- O que é resetado em cada módulo não-aprovado:
--   1. respostas_aulas (notas, tentativas, respostas enviadas)
--   2. progresso (aulas assistidas/concluídas)
--   3. modulos_finalizados_manual (remover o livro_id do array do aluno)
--   4. liberacoes_excecao (exceções individuais do módulo, para o aluno
--      não continuar com acesso liberado indevidamente)
--
-- Segurança:
--   - Roda dentro de uma transação (BEGIN/COMMIT)
--   - Não toca em módulos aprovados por prova (nota >= 7 em exame corrigido)
--   - Não toca em módulos aprovados manualmente pelo administrador
--   - Não toca em históricos aprovados (historico_notas com nota >= 7)
--
-- Como usar:
--   1. Rode o SELECT de diagnóstico abaixo para conferir o que será afetado.
--   2. Se estiver OK, rode o bloco BEGIN/COMMIT para aplicar o reset.
--   3. Recomendado: faça backup das tabelas antes (pg_dump).
-- ==========================================================


-- ----------------------------------------------------------
-- DIAGNÓSTICO: lista módulos não-aprovados por aluno
-- ----------------------------------------------------------
-- Mostra cada par (aluno, módulo) que terá os dados resetados.
-- Um módulo é "não-aprovado" quando:
--   * Não existe respostas_aulas com status='corrigida' e nota>=7
--     para nenhuma aula de prova/avaliação/bloco_final do módulo;
--   * E o livro_id NÃO está em modulos_finalizados_manual do aluno;
--   * E não existe historico_notas com nota>=7 para o módulo.

SELECT
  u.id       AS aluno_id,
  u.nome     AS aluno_nome,
  u.email    AS aluno_email,
  l.id       AS modulo_id,
  l.titulo   AS modulo_titulo,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.aulas a WHERE a.livro_id = l.id) THEN 'SEM_AULAS'
    WHEN NOT EXISTS (
      SELECT 1 FROM public.aulas a
      WHERE a.livro_id = l.id
        AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
    ) THEN 'SEM_PROVA'
    ELSE 'COM_PROVA_NAO_APROVADO'
  END AS situacao
FROM public.users u
CROSS JOIN public.livros l
WHERE u.tipo = 'aluno'
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = l.id
      AND ra.status = 'corrigida'
      AND (ra.nota IS NOT NULL AND ra.nota >= 7.0)
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  )
  AND NOT COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_notas h
    WHERE h.aluno_id = u.id
      AND h.nota IS NOT NULL
      AND h.nota >= 7.0
      AND lower(unaccent(h.modulo_nome)) = lower(unaccent(l.titulo))
  )
ORDER BY u.nome, l.titulo;


-- ==========================================================
-- RESET: aplicar limpeza dos dados
-- ==========================================================
-- Descomente o bloco abaixo para executar o reset.
-- Recomendado: rode o SELECT acima primeiro para conferir.

/*
BEGIN;

-- Tabela temporária com os pares (aluno_id, livro_id) que devem ser resetados
CREATE TEMP TABLE _modulos_para_resetar ON COMMIT DROP AS
SELECT u.id AS aluno_id, l.id AS livro_id
FROM public.users u
CROSS JOIN public.livros l
WHERE u.tipo = 'aluno'
  -- Não aprovado por prova:
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = l.id
      AND ra.status = 'corrigida'
      AND (ra.nota IS NOT NULL AND ra.nota >= 7.0)
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  )
  -- Não aprovado manualmente:
  AND NOT COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]
  -- Não aprovado por histórico:
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_notas h
    WHERE h.aluno_id = u.id
      AND h.nota IS NOT NULL
      AND h.nota >= 7.0
      AND lower(unaccent(h.modulo_nome)) = lower(unaccent(l.titulo))
  );

-- 1) Deletar respostas_aulas (submissões de provas/atividades) do módulo
DELETE FROM public.respostas_aulas ra
USING _modulos_para_resetar r, public.aulas a
WHERE ra.aluno_id = r.aluno_id
  AND a.id = ra.aula_id
  AND a.livro_id = r.livro_id;

-- 2) Deletar progresso (aulas assistidas/concluídas) do módulo
DELETE FROM public.progresso p
USING _modulos_para_resetar r, public.aulas a
WHERE p.aluno_id = r.aluno_id
  AND a.id = p.aula_id
  AND a.livro_id = r.livro_id;

-- 3) Remover o livro_id de modulos_finalizados_manual em cada aluno afetado
--    (usa array_remove para tirar o livro_id do array sem alterar os demais)
UPDATE public.users u
SET modulos_finalizados_manual = array_remove(
  COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]),
  r.livro_id
)
FROM _modulos_para_resetar r
WHERE u.id = r.aluno_id;

-- 4) Remover exceções individuais de liberação do módulo (liberacoes_excecao)
--    para o aluno não continuar com acesso liberado indevidamente
DELETE FROM public.liberacoes_excecao le
USING _modulos_para_resetar r
WHERE le.user_id = r.aluno_id
  AND le.livro_id = r.livro_id;

-- Resumo do que foi feito
SELECT
  'respostas_aulas deletadas' AS acao, count(*) AS total
  FROM public.respostas_aulas ra
  JOIN _modulos_para_resetar r ON ra.aluno_id = r.aluno_id
UNION ALL
SELECT
  'progresso deletado' AS acao, 0 AS total;

COMMIT;
*/

-- ==========================================================
-- OBSERVAÇÕES
-- ==========================================================
-- 1) Este script NÃO remove notas de exames aprovados (nota >= 7).
--    Módulos aprovados por prova continuam intactos.
-- 2) Módulos aprovados manualmente (modulos_finalizados_manual) e por
--    histórico (historico_notas com nota >= 7) também NÃO são resetados.
-- 3) Após o reset, o módulo volta a aparecer no painel do aluno como
--    "em andamento" ou "em manutenção" (caso não tenha prova configurada),
--    permitindo que o aluno refaça o processo.
-- 4) A lógica de exibição no painel (useStudentCourses.ts) garante
--    visibilidade mesmo sem ter iniciado o módulo, para módulos em manutenção.
