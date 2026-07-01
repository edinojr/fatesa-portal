-- =====================================================================
-- CORREÇÃO COMPLETA: Liberações, Finalizações e Bloqueios - FATESA
-- =====================================================================
-- 
-- OBJETIVOS:
-- 1. Finalizar módulos para alunos aprovados (nota >= min_grade)
-- 2. Bloquear Bibliologia para alunos presenciais
-- 3. Liberar apenas: Epístola aos Hebreus, Doutrina do Espírito Santo,
--    Epístolas Paulinas I, Teologia Prática
-- 4. Fechar todos os demais módulos (professor_active = false)
-- 5. Remover liberações incorretas dos núcleos
-- 6. Não emitir pop-ups de alerta (status_liberacao = false)
--
-- ATENÇÃO: Execute em ordem, PASSO a PASSO.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASSO 0: Diagnóstico - estado atual
-- =====================================================================

SELECT 'PASSO 0: DIAGNÓSTICO INICIAL' as info;

SELECT '--- MÓDULOS QUE SERÃO BLOQUEADOS (professor_active = false) ---' as info;
SELECT id, ordem, titulo, professor_active
FROM livros
WHERE id NOT IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',  -- Epístola aos Hebreus
    'b225082a-ae60-457f-8bbe-7a286c14542d',  -- Doutrina do Espirito Santo
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',  -- Epistolas Paulinas I
    '419891a7-f5a1-4094-92b5-e24acf450f7a'   -- Teologia Prática
)
AND curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
ORDER BY ordem;

SELECT '--- LIBERAÇÕES QUE SERÃO REMOVIDAS (módulos não autorizados) ---' as info;
SELECT ln.id, ln.nucleo_id, n.nome AS nucleo_nome, ln.item_id, l.titulo AS modulo_titulo, ln.item_type
FROM liberacoes_nucleo ln
LEFT JOIN nucleos n ON n.id = ln.nucleo_id
LEFT JOIN livros l ON l.id = ln.item_id
WHERE ln.item_type = 'modulo'
AND ln.item_id NOT IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',  -- Epístola aos Hebreus
    'b225082a-ae60-457f-8bbe-7a286c14542d',  -- Doutrina do Espirito Santo
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',  -- Epistolas Paulinas I
    '419891a7-f5a1-4094-92b5-e24acf450f7a'   -- Teologia Prática
);

SELECT '--- MODULOS COM ALUNOS APROVADOS (que precisam ser finalizados) ---' as info;
SELECT l.titulo AS modulo, COUNT(DISTINCT ra.aluno_id) AS alunos_aprovados
FROM respostas_aulas ra
JOIN aulas a ON a.id = ra.aula_id
JOIN livros l ON l.id = a.livro_id
WHERE ra.status = 'corrigida'
  AND ra.nota IS NOT NULL
  AND (a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true)
  AND ra.nota >= COALESCE(a.min_grade, 7)
GROUP BY l.id, l.titulo
ORDER BY l.titulo;

-- =====================================================================
-- PASSO 1: Finalizar módulos para alunos aprovados
-- =====================================================================

SELECT 'PASSO 1: FINALIZANDO MÓDULOS PARA ALUNOS APROVADOS...' as info;

-- 1a: Criar tabela temporária com alunos aprovados por módulo
DROP TABLE IF EXISTS _tmp_aprovados;
CREATE TEMP TABLE _tmp_aprovados AS
WITH notas_por_modulo AS (
    SELECT
        ra.aluno_id,
        a.livro_id,
        MAX(ra.nota) AS melhor_nota,
        BOOL_OR(ra.nota >= COALESCE(a.min_grade, 7)) AS aprovado
    FROM respostas_aulas ra
    JOIN aulas a ON a.id = ra.aula_id
    WHERE ra.status = 'corrigida'
      AND ra.nota IS NOT NULL
      AND (a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true)
    GROUP BY ra.aluno_id, a.livro_id
)
SELECT
    nm.aluno_id,
    nm.livro_id,
    nm.melhor_nota,
    l.titulo AS modulo_titulo
FROM notas_por_modulo nm
JOIN livros l ON l.id = nm.livro_id
WHERE nm.aprovado = true
ORDER BY nm.aluno_id, l.titulo;

SELECT 'Alunos aprovados que serão finalizados:' as info;
SELECT t.aluno_id, u.nome, u.email, t.modulo_titulo, t.melhor_nota
FROM _tmp_aprovados t
JOIN users u ON u.id = t.aluno_id
ORDER BY u.nome, t.modulo_titulo;

-- 1b: Marcar TODAS as aulas do módulo como concluídas no progresso
INSERT INTO progresso (aluno_id, aula_id, concluida, updated_at)
SELECT
    t.aluno_id,
    a.id AS aula_id,
    true,
    now()
FROM _tmp_aprovados t
JOIN aulas a ON a.livro_id = t.livro_id
WHERE NOT EXISTS (
    SELECT 1 FROM progresso p
    WHERE p.aluno_id = t.aluno_id
      AND p.aula_id = a.id
)
ON CONFLICT (aluno_id, aula_id) DO UPDATE
SET concluida = true, updated_at = EXCLUDED.updated_at;

-- 1c: Atualizar modulos_finalizados_manual na tabela users
UPDATE users SET
    modulos_finalizados_manual = ARRAY(
        SELECT DISTINCT unnest(
            COALESCE(modulos_finalizados_manual, ARRAY[]::UUID[]) || ARRAY(SELECT t.livro_id FROM _tmp_aprovados t WHERE t.aluno_id = users.id)
        )
    )
WHERE id IN (SELECT DISTINCT aluno_id FROM _tmp_aprovados);

SELECT 'PASSO 1: CONCLUÍDO - Alunos finalizados: ' || COUNT(DISTINCT aluno_id)::text as info FROM _tmp_aprovados;

-- =====================================================================
-- PASSO 2: Bloquear Bibliologia para alunos presenciais
-- =====================================================================

SELECT 'PASSO 2: BLOQUEANDO BIBLIOLOGIA PARA ALUNOS PRESENCIAIS...' as info;

-- 2a: Remover liberações de módulo Bibliologia para TODOS os núcleos
DELETE FROM liberacoes_nucleo
WHERE item_type = 'modulo'
  AND item_id = 'cd525251-b438-4e21-aaea-bd5578017698';  -- Bibliologia

-- 2b: Remover liberações de atividades/vídeos da Bibliologia para TODOS os núcleos
DELETE FROM liberacoes_nucleo
WHERE item_id IN (
    SELECT id FROM aulas WHERE livro_id = 'cd525251-b438-4e21-aaea-bd5578017698'
)
AND item_type IN ('atividade', 'video');

-- 2c: Desativar professor_active para Bibliologia (para presencial, mas vamos
-- desativar globalmente já que o módulo não deve ser liberado agora)
UPDATE livros SET professor_active = false
WHERE id = 'cd525251-b438-4e21-aaea-bd5578017698';

-- 2d: Desativar status_liberacao das aulas de Bibliologia para não emitir pop-ups
UPDATE aulas SET status_liberacao = false
WHERE livro_id = 'cd525251-b438-4e21-aaea-bd5578017698';

SELECT 'PASSO 2: CONCLUÍDO - Bibliologia bloqueada' as info;

-- =====================================================================
-- PASSO 3: Bloquear TODOS os demais módulos (exceto os 4 liberados)
-- =====================================================================

SELECT 'PASSO 3: BLOQUEANDO DEMAIS MÓDULOS...' as info;

-- Lista dos 4 módulos que devem permanecer liberados
-- Epístola aos Hebreus, Doutrina do Espírito Santo, Epístolas Paulinas I, Teologia Prática

-- 3a: Desativar professor_active para TODOS os módulos que NÃO são os 4 liberados
UPDATE livros SET professor_active = false
WHERE id NOT IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',  -- Epístola aos Hebreus
    'b225082a-ae60-457f-8bbe-7a286c14542d',  -- Doutrina do Espirito Santo
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',  -- Epistolas Paulinas I
    '419891a7-f5a1-4094-92b5-e24acf450f7a'   -- Teologia Prática
)
AND curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
AND professor_active = true;

-- 3b: Remover liberações de módulo para TODOS os módulos não autorizados
DELETE FROM liberacoes_nucleo
WHERE item_type = 'modulo'
AND item_id NOT IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',  -- Epístola aos Hebreus
    'b225082a-ae60-457f-8bbe-7a286c14542d',  -- Doutrina do Espirito Santo
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',  -- Epistolas Paulinas I
    '419891a7-f5a1-4094-92b5-e24acf450f7a'   -- Teologia Prática
)
AND item_id IN (SELECT id FROM livros WHERE curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1));

-- 3c: Remover liberações de atividades/vídeos dos módulos bloqueados
DELETE FROM liberacoes_nucleo
WHERE item_id IN (
    SELECT a.id FROM aulas a
    JOIN livros l ON l.id = a.livro_id
    WHERE l.id NOT IN (
        '6a052574-6985-4bc6-ba16-2c58fbf02f69',
        'b225082a-ae60-457f-8bbe-7a286c14542d',
        '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
        '419891a7-f5a1-4094-92b5-e24acf450f7a'
    )
    AND l.curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
)
AND item_type IN ('atividade', 'video');

-- 3d: Desativar status_liberacao das aulas dos módulos bloqueados (não emitir pop-ups)
UPDATE aulas SET status_liberacao = false
WHERE livro_id IN (
    SELECT id FROM livros
    WHERE id NOT IN (
        '6a052574-6985-4bc6-ba16-2c58fbf02f69',
        'b225082a-ae60-457f-8bbe-7a286c14542d',
        '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
        '419891a7-f5a1-4094-92b5-e24acf450f7a'
    )
    AND curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
)
AND status_liberacao = true;

SELECT 'PASSO 3: CONCLUÍDO - Demais módulos bloqueados' as info;

-- =====================================================================
-- PASSO 4: Garantir que os 4 módulos liberados estejam corretos
-- =====================================================================

SELECT 'PASSO 4: GARANTINDO MÓDULOS LIBERADOS...' as info;

-- 4a: Garantir professor_active = true para os 4 módulos liberados
UPDATE livros SET professor_active = true
WHERE id IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',  -- Epístola aos Hebreus
    'b225082a-ae60-457f-8bbe-7a286c14542d',  -- Doutrina do Espirito Santo
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',  -- Epistolas Paulinas I
    '419891a7-f5a1-4094-92b5-e24acf450f7a'   -- Teologia Prática
);

-- 4b: Garantir que as aulas dos 4 módulos liberados tenham status_liberacao = true
UPDATE aulas SET status_liberacao = true
WHERE livro_id IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',
    'b225082a-ae60-457f-8bbe-7a286c14542d',
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
    '419891a7-f5a1-4094-92b5-e24acf450f7a'
)
AND status_liberacao = false;

-- 4c: Manter as liberações existentes por núcleo para os 4 módulos
-- (não remover o que já está liberado, apenas garantir que existe)

SELECT 'PASSO 4: CONCLUÍDO' as info;

-- =====================================================================
-- PASSO 5: Limpar liberações de provas que não devem ser liberadas
-- =====================================================================

SELECT 'PASSO 5: BLOQUEANDO LIBERAÇÃO DE PROVAS...' as info;

-- Remover liberações de atividades (provas) para módulos que não devem ter provas liberadas
-- Mantém apenas liberações de atividades para os 4 módulos liberados
DELETE FROM liberacoes_nucleo
WHERE item_type = 'atividade'
AND item_id IN (
    SELECT a.id FROM aulas a
    JOIN livros l ON l.id = a.livro_id
    WHERE l.id NOT IN (
        '6a052574-6985-4bc6-ba16-2c58fbf02f69',
        'b225082a-ae60-457f-8bbe-7a286c14542d',
        '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
        '419891a7-f5a1-4094-92b5-e24acf450f7a'
    )
    AND l.curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
    AND (a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true)
);

SELECT 'PASSO 5: CONCLUÍDO' as info;

-- =====================================================================
-- PASSO 6: VERIFICAÇÃO FINAL
-- =====================================================================

SELECT 'PASSO 6: VERIFICAÇÃO FINAL' as info;

-- 6a: Contagem de alunos com módulos finalizados
SELECT 'Alunos que tiveram módulos finalizados:' as info;
SELECT COUNT(DISTINCT aluno_id) AS total_alunos,
       COUNT(*) AS total_aprovacoes
FROM _tmp_aprovados;

-- 6b: Módulos que continuam ativos
SELECT 'Módulos com professor_active = true (liberados):' as info;
SELECT id, ordem, titulo, professor_active
FROM livros
WHERE professor_active = true
  AND curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
ORDER BY ordem;

-- 6c: Módulos bloqueados
SELECT 'Módulos com professor_active = false (bloqueados):' as info;
SELECT id, ordem, titulo, professor_active
FROM livros
WHERE professor_active = false
  AND curso_id = (SELECT id FROM cursos WHERE nome = 'Teologia Básica' LIMIT 1)
ORDER BY ordem;

-- 6d: Liberações restantes (apenas módulos)
SELECT 'Liberações de módulo restantes:' as info;
SELECT ln.nucleo_id, n.nome AS nucleo, ln.item_id, l.titulo AS modulo
FROM liberacoes_nucleo ln
LEFT JOIN nucleos n ON n.id = ln.nucleo_id
LEFT JOIN livros l ON l.id = ln.item_id
WHERE ln.item_type = 'modulo'
ORDER BY n.nome, l.titulo;

-- 6e: Total de liberações restantes
SELECT 'Total de liberações restantes:' as info;
SELECT item_type, COUNT(*) AS total
FROM liberacoes_nucleo
GROUP BY item_type
ORDER BY item_type;

-- 6f: Status das aulas dos módulos liberados
SELECT 'Status das aulas dos módulos liberados:' as info;
SELECT l.titulo AS modulo, a.titulo, a.tipo, a.status_liberacao, a.professor_active
FROM aulas a
JOIN livros l ON l.id = a.livro_id
WHERE l.id IN (
    '6a052574-6985-4bc6-ba16-2c58fbf02f69',
    'b225082a-ae60-457f-8bbe-7a286c14542d',
    '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
    '419891a7-f5a1-4094-92b5-e24acf450f7a'
)
ORDER BY l.ordem, a.ordem;

-- 6g: Limpar tabela temporária
DROP TABLE IF EXISTS _tmp_aprovados;

SELECT '=== SCRIPT CONCLUÍDO COM SUCESSO ===' as info;

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
