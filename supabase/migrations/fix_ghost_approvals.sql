-- CORREÇÃO AUTOMÁTICA: Alunos aprovados sem fazer prova de recuperação
-- Este script identifica e corrige alunos que aparecem como aprovados
-- sem terem realizado a prova de recuperação

-- PASSO 1: Identificar alunos com submissões de prova com status 'liberado' e nota 0/null
-- Estes são registros de provas iniciadas mas nunca enviadas
SELECT 
    u.id as aluno_id,
    u.nome as aluno_nome,
    u.email as aluno_email,
    ra.id as submission_id,
    ra.aula_id,
    ra.status,
    ra.nota,
    ra.respostas,
    a.titulo as prova_titulo,
    a.versao,
    l.titulo as modulo_titulo,
    p.concluida as progresso_concluida
FROM respostas_aulas ra
JOIN users u ON ra.aluno_id = u.id
JOIN aulas a ON ra.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
LEFT JOIN progresso p ON p.aluno_id = u.id AND p.aula_id = a.id
WHERE ra.status = 'liberado'
AND (ra.respostas IS NULL OR ra.respostas = '{}' OR ra.respostas::text = '{}')
AND (ra.nota IS NULL OR ra.nota = 0)
AND (a.tipo = 'prova' OR a.is_bloco_final = true)
ORDER BY u.email, a.versao;

-- PASSO 2: Identificar registros na tabela progresso que marcam como concluído
-- sem haver submissão corrigida correspondente
SELECT 
    u.id as aluno_id,
    u.nome as aluno_nome,
    u.email as aluno_email,
    p.aula_id,
    p.concluida,
    a.titulo as prova_titulo,
    a.versao,
    a.tipo,
    l.titulo as modulo_titulo,
    ra.status as submission_status,
    ra.nota as submission_nota
FROM progresso p
JOIN users u ON p.aluno_id = u.id
JOIN aulas a ON p.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
LEFT JOIN respostas_aulas ra ON ra.aluno_id = u.id AND ra.aula_id = a.id
WHERE p.concluida = true
AND (a.tipo = 'prova' OR a.is_bloco_final = true)
AND (
    ra.id IS NULL  -- Não tem submissão
    OR ra.status != 'corrigida'  -- Ou submissão não está corrigida
    OR (ra.status = 'corrigida' AND ra.nota < 7.0)  -- Ou está reprovado
);

-- PASSO 3: CORREÇÃO - Remover submissões fantasmas (iniciadas mas nunca enviadas)
-- ATENÇÃO: Execute apenas após verificar os dados do PASSO 1
DELETE FROM respostas_aulas
WHERE id IN (
    SELECT ra.id
    FROM respostas_aulas ra
    JOIN aulas a ON ra.aula_id = a.id
    WHERE ra.status = 'liberado'
    AND (ra.respostas IS NULL OR ra.respostas = '{}' OR ra.respostas::text = '{}')
    AND (ra.nota IS NULL OR ra.nota = 0)
    AND (a.tipo = 'prova' OR a.is_bloco_final = true)
);

-- PASSO 4: CORREÇÃO - Resetar progresso indevido de provas
-- ATENÇÃO: Execute apenas após verificar os dados do PASSO 2
UPDATE progresso
SET concluida = false, updated_at = now()
WHERE id IN (
    SELECT p.id
    FROM progresso p
    JOIN aulas a ON p.aula_id = a.id
    LEFT JOIN respostas_aulas ra ON ra.aluno_id = p.aluno_id AND ra.aula_id = a.id
    WHERE p.concluida = true
    AND (a.tipo = 'prova' OR a.is_bloco_final = true)
    AND (
        ra.id IS NULL
        OR ra.status != 'corrigida'
        OR (ra.status = 'corrigida' AND ra.nota < 7.0)
    )
);

-- PASSO 5: Verificar alunos específicos que podem ter sido afetados
-- Incluindo vmlq04922@gmail.com
SELECT 
    u.email,
    u.nome,
    COUNT(DISTINCT CASE WHEN ra.status = 'liberado' THEN ra.id END) as provas_iniciadas_nao_enviadas,
    COUNT(DISTINCT CASE WHEN ra.status = 'corrigida' AND ra.nota >= 7.0 THEN ra.id END) as provas_aprovadas,
    COUNT(DISTINCT CASE WHEN ra.status = 'corrigida' AND ra.nota < 7.0 THEN ra.id END) as provas_reprovadas,
    COUNT(DISTINCT p.id) as modulos_marcados_concluidos
FROM users u
LEFT JOIN respostas_aulas ra ON ra.aluno_id = u.id
LEFT JOIN progresso p ON p.aluno_id = u.id AND p.concluida = true
WHERE u.email IN ('vmlq04922@gmail.com')
GROUP BY u.email, u.nome;
