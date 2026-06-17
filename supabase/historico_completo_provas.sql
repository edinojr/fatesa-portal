-- =====================================================
-- CONSULTA COMPLETA: Todas as provas desde o início
-- Versão corrigida - usa apenas colunas que existem
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Verificar a estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. HISTÓRICO COMPLETO DE RESPOSTAS (todas as provas realizadas)
SELECT 
    r.id,
    r.aluno_id,
    u.nome as nome_aluno,
    u.email as email_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    a.tipo as tipo_aula,
    l.titulo as livro_titulo,
    r.respostas,
    r.nota,
    r.status,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
LEFT JOIN public.livros l ON a.livro_id = l.id
ORDER BY r.created_at ASC;

-- 3. HISTÓRICO COMPLETO DE PROGRESSO EM PROVAS
SELECT 
    p.id,
    p.aluno_id,
    u.nome as nome_aluno,
    p.aula_id,
    a.titulo as titulo_aula,
    a.tipo as tipo_aula,
    l.titulo as livro_titulo,
    p.concluida,
    p.nota_questionario,
    p.updated_at
FROM public.progresso p
LEFT JOIN public.users u ON p.aluno_id = u.id
LEFT JOIN public.aulas a ON p.aula_id = a.id
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY p.updated_at ASC;

-- 4. TODAS AS AULAS DO TIPO PROVA/AVALIAÇÃO
SELECT 
    a.id,
    a.titulo,
    a.tipo,
    a.livro_id,
    l.titulo as livro_titulo,
    a.bloco_id,
    a.is_bloco_final,
    a.min_grade,
    CASE 
        WHEN a.questions IS NOT NULL AND a.questions != '[]'::jsonb 
        THEN jsonb_array_length(a.questions)
        ELSE 0
    END as total_questoes,
    a.created_at,
    a.updated_at
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY a.created_at ASC;

-- 5. RESUMO POR ALUNO (quantas provas fez, média de notas)
SELECT 
    u.id as aluno_id,
    u.nome as nome_aluno,
    u.email,
    COUNT(r.id) as total_provas_realizadas,
    ROUND(AVG(r.nota), 2) as media_notas,
    MIN(r.nota) as menor_nota,
    MAX(r.nota) as maior_nota,
    SUM(CASE WHEN r.nota >= 7.0 THEN 1 ELSE 0 END) as provas_aprovadas,
    SUM(CASE WHEN r.nota < 7.0 THEN 1 ELSE 0 END) as provas_reprovadas,
    MIN(r.created_at) as primeira_prova,
    MAX(r.created_at) as ultima_prova
FROM public.users u
LEFT JOIN public.respostas_aulas r ON u.id = r.aluno_id
WHERE u.tipo = 'aluno'
GROUP BY u.id, u.nome, u.email
ORDER BY u.nome;

-- 6. RESUMO POR AULA/PROVA (quantos alunos fizeram, média de notas)
SELECT 
    a.id as aula_id,
    a.titulo as titulo_aula,
    a.tipo,
    l.titulo as livro_titulo,
    COUNT(r.id) as total_alunos_que_fizeram,
    ROUND(AVG(r.nota), 2) as media_notas,
    MIN(r.nota) as menor_nota,
    MAX(r.nota) as maior_nota,
    SUM(CASE WHEN r.nota >= 7.0 THEN 1 ELSE 0 END) as aprovados,
    SUM(CASE WHEN r.nota < 7.0 THEN 1 ELSE 0 END) as reprovados,
    MIN(r.created_at) as primeira_tentativa,
    MAX(r.created_at) as ultima_tentativa
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
LEFT JOIN public.respostas_aulas r ON a.id = r.aula_id
WHERE a.tipo IN ('avaliacao', 'prova')
GROUP BY a.id, a.titulo, a.tipo, l.titulo
ORDER BY a.titulo;

-- 7. PROVAS COM NOTA NULL (pode indicar erro de salvamento)
SELECT 
    r.id,
    r.aluno_id,
    u.nome as nome_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    r.nota,
    r.status,
    r.respostas,
    r.created_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
WHERE r.nota IS NULL
ORDER BY r.created_at DESC;

-- 8. PROVAS COM STATUS 'pendente' (podem estar incompletas)
SELECT 
    r.id,
    r.aluno_id,
    u.nome as nome_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    r.nota,
    r.status,
    r.created_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
WHERE r.status = 'pendente'
ORDER BY r.created_at DESC;

-- 9. PROVAS DUPLICADAS (mesmo aluno, mesma aula, múltiplos registros)
SELECT 
    r.aluno_id,
    u.nome as nome_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    COUNT(*) as total_registros,
    ARRAY_AGG(r.id ORDER BY r.created_at) as ids_registros,
    ARRAY_AGG(r.nota ORDER BY r.created_at) as notas,
    ARRAY_AGG(r.created_at ORDER BY r.created_at) as datas
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
GROUP BY r.aluno_id, u.nome, r.aula_id, a.titulo
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 10. ESTATÍSTICAS GERAIS
SELECT 
    (SELECT COUNT(*) FROM public.users WHERE tipo = 'aluno') as total_alunos,
    (SELECT COUNT(*) FROM public.aulas WHERE tipo IN ('avaliacao', 'prova')) as total_provas_criadas,
    (SELECT COUNT(*) FROM public.respostas_aulas) as total_respostas_salvas,
    (SELECT COUNT(DISTINCT aluno_id) FROM public.respostas_aulas) as alunos_com_respostas,
    (SELECT COUNT(*) FROM public.progresso p 
     JOIN public.aulas a ON p.aula_id = a.id 
     WHERE a.tipo IN ('avaliacao', 'prova')) as progresso_provas,
    (SELECT MIN(created_at) FROM public.respostas_aulas) as primeira_resposta_banco,
    (SELECT MAX(created_at) FROM public.respostas_aulas) as ultima_resposta_banco;

-- 11. DADOS POR MÊS
SELECT 
    'Janeiro/2026' as mes,
    COUNT(*) as total
FROM public.respostas_aulas
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
UNION ALL
SELECT 
    'Fevereiro/2026',
    COUNT(*)
FROM public.respostas_aulas
WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01'
UNION ALL
SELECT 
    'Março/2026',
    COUNT(*)
FROM public.respostas_aulas
WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01'
UNION ALL
SELECT 
    'Abril/2026',
    COUNT(*)
FROM public.respostas_aulas
WHERE created_at >= '2026-04-01' AND created_at < '2026-05-01'
UNION ALL
SELECT 
    'Maio/2026',
    COUNT(*)
FROM public.respostas_aulas
WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01'
UNION ALL
SELECT 
    'Junho/2026',
    COUNT(*)
FROM public.respostas_aulas
WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01';
