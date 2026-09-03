-- ==========================================================
-- RESET DEFINITIVO: "História da Igreja" E "Cristologia"
-- ==========================================================
-- Limpa TODAS as fontes de finalização para que os módulos
-- voltem como "em andamento" no painel dos alunos.
--
-- Fontes de finalização no código (useStudentCourses.ts):
--   1. modulos_finalizados_manual (array no perfil do aluno)
--   2. historico_notas com nota >= 7 (linha 250-264 re-adiciona
--      o livro_id a manualCompleted mesmo sem modulos_finalizados_manual)
--   3. respostas_aulas com status='corrigida' e nota >= 7 (prova)
--
-- Este script limpa as fontes 1 e 2 para alunos que NÃO têm
-- aprovação real por prova (fonte 3 é preservada).
-- ==========================================================

-- ----------------------------------------------------------
-- DIAGNÓSTICO: o que será afetado
-- ----------------------------------------------------------

-- 1) Módulos alvo
SELECT l.id, l.titulo, l.professor_active, l.ordem,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id) AS total_aulas,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id
     AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)) AS total_provas
FROM public.livros l
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%cristologia%';

-- 2) Registros em historico_notas para esses módulos
SELECT h.id, h.aluno_id, u.nome AS aluno_nome, h.modulo_nome, h.nota, h.data_conclusao
FROM public.historico_notas h
JOIN public.users u ON u.id = h.aluno_id
WHERE lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%historia da igreja%'
   OR lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%cristologia%'
ORDER BY u.nome;

-- 3) Alunos com finalização manual no perfil
SELECT u.id, u.nome, u.email,
  array_agg(l.titulo) AS modulos_finalizados_manual
FROM public.users u
CROSS JOIN public.livros l
WHERE u.tipo = 'aluno'
  AND COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]
  AND (lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
       OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%')
GROUP BY u.id, u.nome, u.email
ORDER BY u.nome;


-- ==========================================================
-- RESET DEFINITIVO: execute este bloco
-- ==========================================================

/*
BEGIN;

-- Tabela temporária com os IDs dos módulos alvo
CREATE TEMP TABLE _modulos_alvo ON COMMIT DROP AS
SELECT id AS livro_id, titulo
FROM public.livros
WHERE lower(translate(titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%';

-- ---------------------------------------------------
-- ETAPA 1: Remover de modulos_finalizados_manual
-- ---------------------------------------------------
-- Para alunos SEM aprovação por prova (preserva aprovados)
UPDATE public.users u
SET modulos_finalizados_manual = array_remove(
  COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]),
  m.livro_id
)
FROM _modulos_alvo m
WHERE COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[m.livro_id]
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = m.livro_id
      AND ra.status = 'corrigida'
      AND ra.nota IS NOT NULL AND ra.nota >= 7.0
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  );

-- ---------------------------------------------------
-- ETAPA 2: DELETAR historico_notas (A CAUSA OCULTA)
-- ---------------------------------------------------
-- O código em useStudentCourses.ts:250-264 re-adiciona o
-- livro_id a manualCompleted quando existe historico_notas
-- com nota >= 7 cujo título casa com o do livro.
-- Sem deletar estas linhas, o módulo volta a ficar finalizado
-- mesmo após limpar modulos_finalizados_manual.
-- Só deleta para alunos SEM aprovação por prova real.
DELETE FROM public.historico_notas h
USING _modulos_alvo m, public.users u
WHERE h.aluno_id = u.id
  AND lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      = lower(translate(m.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = h.aluno_id
      AND a.livro_id = m.livro_id
      AND ra.status = 'corrigida'
      AND ra.nota IS NOT NULL AND ra.nota >= 7.0
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  );

-- ---------------------------------------------------
-- ETAPA 3: Desbloquear módulos (professor_active = true)
-- ---------------------------------------------------
UPDATE public.livros l
SET professor_active = true
FROM _modulos_alvo m
WHERE l.id = m.livro_id
  AND (l.professor_active IS NULL OR l.professor_active = false);

-- ---------------------------------------------------
-- ETAPA 4: Liberar módulos para TODOS os núcleos
-- ---------------------------------------------------
INSERT INTO public.liberacoes_nucleo (nucleo_id, item_id, item_type, liberado, created_at)
SELECT NULL, m.livro_id, 'modulo', true, now()
FROM _modulos_alvo m
ON CONFLICT (nucleo_id, item_id, item_type) DO UPDATE
SET liberado = true;

-- ---------------------------------------------------
-- ETAPA 5: Exceção individual para cada aluno
-- ---------------------------------------------------
INSERT INTO public.liberacoes_excecao (user_id, livro_id, granted_at)
SELECT u.id, m.livro_id, now()
FROM public.users u
CROSS JOIN _modulos_alvo m
WHERE u.tipo = 'aluno'
  AND NOT EXISTS (
    SELECT 1 FROM public.respostas_aulas ra
    JOIN public.aulas a ON a.id = ra.aula_id
    WHERE ra.aluno_id = u.id
      AND a.livro_id = m.livro_id
      AND ra.status = 'corrigida'
      AND ra.nota IS NOT NULL AND ra.nota >= 7.0
      AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)
  )
ON CONFLICT (user_id, livro_id) DO NOTHING;

-- ---------------------------------------------------
-- RELATÓRIO
-- ---------------------------------------------------
SELECT 'ETAPA 1 - modulos_finalizados_manual limpos' AS acao, COUNT(*) AS total
FROM public.users u
CROSS JOIN _modulos_alvo m
WHERE u.tipo = 'aluno'
  AND NOT COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[m.livro_id]

UNION ALL

SELECT 'ETAPA 3 - módulos desbloqueados', COUNT(*)
FROM public.livros l JOIN _modulos_alvo m ON l.id = m.livro_id
WHERE l.professor_active = true

UNION ALL

SELECT 'ETAPA 4 - liberações nucleo', COUNT(*)
FROM public.liberacoes_nucleo ln JOIN _modulos_alvo m ON ln.item_id = m.livro_id
WHERE ln.item_type = 'modulo' AND ln.liberado = true

UNION ALL

SELECT 'ETAPA 5 - exceções individuais', COUNT(*)
FROM public.liberacoes_excecao le JOIN _modulos_alvo m ON le.livro_id = m.livro_id;

COMMIT;
*/
