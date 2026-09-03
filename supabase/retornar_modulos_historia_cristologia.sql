-- ==========================================================
-- RETORNAR MÓDULOS "História da Igreja" E "Cristologia" PARA OS ALUNOS
-- ==========================================================
-- Objetivo:
--   Remover a finalização manual indevida dos módulos
--   "História da Igreja" e "Cristologia" em TODOS os alunos,
--   e LIBERAR os módulos para que apareçam no painel "Meus Cursos".
--
-- Causa identificada:
--   Os próprios alunos marcaram esses módulos como concluídos
--   manualmente via o card "Módulos Concluídos" do Dashboard,
--   que adiciona o livro_id ao array `modulos_finalizados_manual`.
--   Depois que a finalização foi removida, os módulos continuaram
--   ocultos porque a lógica `isHidden` em useStudentCourses.ts:394
--   esconde módulos que: NÃO são o primeiro módulo, NÃO foram
--   iniciados pelo aluno, NÃO estão liberados via
--   liberacoes_nucleo/liberacoes_excecao, e NÃO são módulo em
--   manutenção.
--
-- O que este script faz (4 etapas):
--   1. Remove os IDs dos módulos do array `modulos_finalizados_manual`
--      de TODOS os alunos (desfaz a finalização manual indevida).
--   2. Garante `professor_active = true` nos módulos (desbloqueia
--      caso o professor tenha bloqueado).
--   3. Adiciona `liberacoes_excecao` para TODOS os alunos para esses
--      módulos — isto faz `hasException = true` no código, o que
--      força `isModuleReleased = true` e bypassa TODAS as condições
--      de `isHidden` em useStudentCourses.ts:394.
--   4. Adiciona `liberacoes_nucleo` (nucleo_id = null) para os
--      módulos — libera para todos os núcleos simultaneamente.
--
--   NÃO toca em:
--     - respostas_aulas (provas feitas)
--     - progresso (aulas assistidas)
--     - historico_notas (notas inseridas por admin)
--   O aluno continua de onde parou.
--
-- Como usar:
--   1. Rode o SELECT de diagnóstico para conferir os módulos.
--   2. Rode o bloco BEGIN/COMMIT para aplicar todas as correções.
--   3. Recomendado: faça backup antes (pg_dump).
-- ==========================================================


-- ----------------------------------------------------------
-- DIAGNÓSTICO 1: identificar os módulos alvo
-- ----------------------------------------------------------
SELECT
  l.id    AS modulo_id,
  l.titulo,
  l.professor_active,
  l.ordem,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id) AS total_aulas,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id
     AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)) AS total_provas,
  (SELECT COUNT(*) FROM public.users u
     WHERE u.tipo = 'aluno'
       AND COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]) AS alunos_finalizaram_manual
FROM public.livros l
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%cristologia%'
ORDER BY l.titulo;


-- ----------------------------------------------------------
-- DIAGNÓSTICO 2: listar alunos com finalização manual indevida
-- ----------------------------------------------------------
SELECT
  u.id     AS aluno_id,
  u.nome   AS aluno_nome,
  u.email  AS aluno_email,
  l.id     AS modulo_id,
  l.titulo AS modulo_titulo,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.respostas_aulas ra
      JOIN public.aulas a ON a.id = ra.aula_id
      WHERE ra.aluno_id = u.id
        AND a.livro_id = l.id
        AND ra.status = 'corrigida'
        AND (ra.nota IS NOT NULL AND ra.nota >= 7.0)
        AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
    ) THEN 'COM_APROVACAO_PROVA (NAO SERA TOCADO)'
    WHEN EXISTS (
      SELECT 1 FROM public.historico_notas h
      WHERE h.aluno_id = u.id
        AND h.nota IS NOT NULL
        AND h.nota >= 7.0
        AND lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
            = lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ) THEN 'COM_HISTORICO_APROVADO (NAO SERA TOCADO)'
    ELSE 'FINALIZACAO_MANUAL_INDEVIDA (SERA REMOVIDA + LIBERADA)'
  END AS situacao
FROM public.users u
CROSS JOIN public.livros l
WHERE u.tipo = 'aluno'
  AND (lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
       OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%')
  AND COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]
ORDER BY u.nome, l.titulo;


-- ----------------------------------------------------------
-- DIAGNÓSTICO 3: verificar liberações existentes
-- ----------------------------------------------------------
SELECT 'liberacoes_nucleo' AS tabela, ln.item_id, ln.item_type, ln.nucleo_id, ln.liberado
FROM public.liberacoes_nucleo ln
JOIN public.livros l ON l.id = ln.item_id
WHERE ln.item_type = 'modulo'
  AND (lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
       OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%')
UNION ALL
SELECT 'liberacoes_excecao' AS tabela, le.livro_id AS item_id, 'modulo' AS item_type, NULL AS nucleo_id, true AS liberado
FROM public.liberacoes_excecao le
JOIN public.livros l ON l.id = le.livro_id
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%';


-- ==========================================================
-- CORREÇÃO COMPLETA: remover finalização + liberar módulos
-- ==========================================================
-- Descomente o bloco abaixo para executar.
-- Recomendado: rode os SELECTs acima primeiro para conferir.

/*
BEGIN;

-- Tabela temporária com os IDs dos módulos alvo
CREATE TEMP TABLE _modulos_alvo ON COMMIT DROP AS
SELECT id AS livro_id, titulo
FROM public.livros
WHERE lower(translate(titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%';

-- ---------------------------------------------------
-- ETAPA 1: Remover finalização manual indevida
-- ---------------------------------------------------
-- Remove os livro_ids do array modulos_finalizados_manual de TODOS os alunos.
-- Preserva módulos aprovados por prova ou histórico (não os toca).
UPDATE public.users u
SET modulos_finalizados_manual = array_remove(
  COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]),
  m.livro_id
)
FROM _modulos_alvo m
WHERE COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[m.livro_id]
  -- NÃO remover de alunos que foram aprovados por prova
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = m.livro_id
      AND ra.status = 'corrigida'
      AND (ra.nota IS NOT NULL AND ra.nota >= 7.0)
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  )
  -- NÃO remover de alunos aprovados por histórico
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_notas h
    WHERE h.aluno_id = u.id
      AND h.nota IS NOT NULL
      AND h.nota >= 7.0
      AND lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
          = lower(translate(m.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
  );

-- ---------------------------------------------------
-- ETAPA 2: Desbloquear módulos (professor_active = true)
-- ---------------------------------------------------
-- Se o módulo estiver com professor_active = false, ele fica oculto
-- para todos os alunos (isBookBlockedByProfessor em useStudentCourses.ts:313).
UPDATE public.livros l
SET professor_active = true
FROM _modulos_alvo m
WHERE l.id = m.livro_id
  AND (l.professor_active IS NULL OR l.professor_active = false);

-- ---------------------------------------------------
-- ETAPA 3: Liberar módulos para TODOS os núcleos
-- ---------------------------------------------------
-- Adiciona registro em liberacoes_nucleo com nucleo_id = null,
-- que é visível para todos os alunos independente do núcleo.
-- Isto faz isModuleReleased = true via releasedModulos em
-- useStudentCourses.ts:79 e isManualModuleRelease em :316.
INSERT INTO public.liberacoes_nucleo (nucleo_id, item_id, item_type, liberado, created_at)
SELECT NULL, m.livro_id, 'modulo', true, now()
FROM _modulos_alvo m
ON CONFLICT (nucleo_id, item_id, item_type) DO UPDATE
SET liberado = true;

-- ---------------------------------------------------
-- ETAPA 4: Adicionar exceção individual para cada aluno
-- ---------------------------------------------------
-- Isto é a GARANTIA MÁXIMA: hasException = true em
-- useStudentCourses.ts:356 faz bypass de TODAS as condições
-- de isHidden (linha 394), força isModuleReleased = true (357),
-- e effectivelyLevelLocked = false (358).
-- Só adiciona para alunos que NÃO foram aprovados por prova/histórico.
INSERT INTO public.liberacoes_excecao (user_id, livro_id, granted_at)
SELECT u.id, m.livro_id, now()
FROM public.users u
CROSS JOIN _modulos_alvo m
WHERE u.tipo = 'aluno'
  -- Não adicionar exceção para alunos já aprovados por prova
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = m.livro_id
      AND ra.status = 'corrigida'
      AND (ra.nota IS NOT NULL AND ra.nota >= 7.0)
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  )
  -- Não adicionar exceção para alunos aprovados por histórico
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_notas h
    WHERE h.aluno_id = u.id
      AND h.nota IS NOT NULL
      AND h.nota >= 7.0
      AND lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
          = lower(translate(m.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
  )
ON CONFLICT (user_id, livro_id) DO NOTHING;

-- ---------------------------------------------------
-- RELATÓRIO FINAL
-- ---------------------------------------------------
SELECT 'ETAPA 1 - finalização manual removida' AS acao, COUNT(*) AS total
FROM public.users u
CROSS JOIN _modulos_alvo m
WHERE u.tipo = 'aluno'
  AND NOT COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[m.livro_id]

UNION ALL

SELECT 'ETAPA 2 - módulos desbloqueados (professor_active)', COUNT(*)
FROM public.livros l
JOIN _modulos_alvo m ON l.id = m.livro_id
WHERE l.professor_active = true

UNION ALL

SELECT 'ETAPA 3 - liberações nucleo criadas', COUNT(*)
FROM public.liberacoes_nucleo ln
JOIN _modulos_alvo m ON ln.item_id = m.livro_id
WHERE ln.item_type = 'modulo' AND ln.liberado = true

UNION ALL

SELECT 'ETAPA 4 - exceções individuais criadas', COUNT(*)
FROM public.liberacoes_excecao le
JOIN _modulos_alvo m ON le.livro_id = m.livro_id;

COMMIT;
*/


-- ==========================================================
-- OBSERVAÇÕES
-- ==========================================================
-- 1) Este script NÃO remove notas de exames aprovados (nota >= 7).
--    Módulos aprovados por prova ou histórico continuam intactos.
-- 2) Após o reset, os módulos "História da Igreja" e "Cristologia"
--    voltam a aparecer no painel "Meus Cursos" como "em andamento"
--    ou "em manutenção" (caso ainda não tenham prova configurada).
-- 3) A ETAPA 4 (liberacoes_excecao) é a garantia máxima: ela força
--    hasException = true no código, o que bypassa TODAS as condições
--    de isHidden em useStudentCourses.ts:394.
-- 4) Para evitar que o problema se repita, considere desabilitar o
--    card "Módulos Concluídos" no Dashboard (Dashboard.tsx:652) ou
--    restringi-lo para módulos com prova configurada.
