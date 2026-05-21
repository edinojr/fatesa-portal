-- Script para investigar e corrigir o aluno vmlq04922@gmail.com
-- que aparece como aprovado sem ter feito a prova de recuperação

-- 1. Encontrar o ID do aluno
SELECT id, nome, email, nucleo_id, curso_id, status_nucleo 
FROM users 
WHERE email = 'vmlq04922@gmail.com';

-- 2. Verificar todas as submissões de provas deste aluno
SELECT 
    ra.id as submission_id,
    ra.aula_id,
    ra.nota,
    ra.status,
    ra.tentativas,
    ra.created_at,
    ra.updated_at,
    a.titulo as prova_titulo,
    a.versao,
    a.tipo,
    a.is_bloco_final,
    l.titulo as modulo_titulo
FROM respostas_aulas ra
JOIN aulas a ON ra.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
WHERE ra.aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
ORDER BY ra.created_at DESC;

-- 3. Verificar progresso deste aluno
SELECT 
    p.aula_id,
    p.concluida,
    p.updated_at,
    a.titulo as aula_titulo,
    a.versao,
    a.tipo,
    l.titulo as modulo_titulo
FROM progresso p
JOIN aulas a ON p.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
WHERE p.aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
ORDER BY p.updated_at DESC;

-- 4. Verificar liberações individuais deste aluno
SELECT 
    lea.id,
    lea.aula_id,
    lea.granted_at,
    lea.granted_by,
    a.titulo as prova_titulo,
    a.versao,
    l.titulo as modulo_titulo
FROM liberacoes_excecao_atividade lea
JOIN aulas a ON lea.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
WHERE lea.user_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com');

-- 5. Verificar liberações de módulo deste aluno
SELECT 
    le.id,
    le.livro_id,
    le.granted_at,
    l.titulo as modulo_titulo
FROM liberacoes_excecao le
JOIN livros l ON le.livro_id = l.id
WHERE le.user_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com');

-- CORREÇÃO: Se houver registros de progresso indevidos, removê-los
-- Descomente as linhas abaixo após verificar os dados acima

-- Remover progresso indevido de provas que o aluno não fez
-- DELETE FROM progresso 
-- WHERE aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
-- AND aula_id IN (
--     SELECT ra.aula_id 
--     FROM respostas_aulas ra 
--     WHERE ra.aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
--     AND ra.status = 'liberado'  -- Prova iniciada mas não enviada
--     AND ra.nota IS NULL OR ra.nota = 0
-- );

-- Remover submissões que estão com status 'liberado' mas nunca foram enviadas
-- DELETE FROM respostas_aulas
-- WHERE aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
-- AND status = 'liberado'
-- AND (respostas IS NULL OR respostas = '{}')
-- AND nota IS NULL OR nota = 0;

-- Se o aluno foi marcado como aprovado indevidamente no progresso, resetar
-- UPDATE progresso SET concluida = false
-- WHERE aluno_id = (SELECT id FROM users WHERE email = 'vmlq04922@gmail.com')
-- AND aula_id IN (
--     SELECT a.id FROM aulas a
--     JOIN livros l ON a.livro_id = l.id
--     WHERE a.tipo = 'prova' OR a.is_bloco_final = true
--     AND l.curso_id = (SELECT curso_id FROM users WHERE email = 'vmlq04922@gmail.com')
-- );
