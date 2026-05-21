-- CORREÇÃO ESPECÍFICA: Aluno vmlq04922@gmail.com
-- Remove submissões fantasmas e reseta progresso indevido

-- 1. Encontrar e remover submissões de prova com status 'liberado' sem respostas
DELETE FROM respostas_aulas
WHERE aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
AND status = 'liberado'
AND (respostas IS NULL OR respostas = '{}' OR respostas::text = '{}')
AND aula_id IN (
    SELECT id FROM aulas WHERE tipo = 'prova' OR is_bloco_final = true
);

-- 2. Resetar progresso de provas que não foram corrigidas
UPDATE progresso
SET concluida = false, updated_at = now()
WHERE aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
AND aula_id IN (
    SELECT a.id 
    FROM aulas a 
    WHERE a.tipo = 'prova' OR a.is_bloco_final = true
)
AND aula_id NOT IN (
    SELECT ra.aula_id 
    FROM respostas_aulas ra 
    WHERE ra.aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
    AND ra.status = 'corrigida'
    AND ra.nota >= 7.0
);

-- 3. Verificar resultado após correção
SELECT 
    ra.id as submission_id,
    ra.status,
    ra.nota,
    a.titulo as prova_titulo,
    a.versao,
    p.concluida as progresso_concluida
FROM respostas_aulas ra
JOIN aulas a ON ra.aula_id = a.id
LEFT JOIN progresso p ON p.aluno_id = ra.aluno_id AND p.aula_id = a.id
WHERE ra.aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
ORDER BY a.versao;
