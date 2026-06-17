-- =====================================================
-- EXPORTAÇÃO: Dados de provas para análise
-- Versão corrigida - usa apenas colunas que existem
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. EXPORTAR TODAS AS RESPOSTAS EM FORMATO CSV
SELECT 
    r.id,
    u.nome as aluno,
    u.email,
    a.titulo as prova,
    a.tipo,
    l.titulo as livro,
    r.nota,
    r.status,
    r.respostas::text as respostas_json,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
LEFT JOIN public.livros l ON a.livro_id = l.id
ORDER BY u.nome, a.titulo, r.created_at;

-- 2. EXPORTAR RESUMO POR ALUNO
SELECT 
    u.nome as aluno,
    u.email,
    COUNT(r.id) as provas_feitas,
    ROUND(AVG(r.nota), 2) as media,
    SUM(CASE WHEN r.nota >= 7.0 THEN 1 ELSE 0 END) as aprovacoes,
    SUM(CASE WHEN r.nota < 7.0 THEN 1 ELSE 0 END) as reprovacoes
FROM public.users u
LEFT JOIN public.respostas_aulas r ON u.id = r.aluno_id
WHERE u.tipo = 'aluno'
GROUP BY u.id, u.nome, u.email
ORDER BY u.nome;

-- 3. EXPORTAR RESUMO POR PROVA
SELECT 
    a.titulo as prova,
    a.tipo,
    l.titulo as livro,
    COUNT(r.id) as total_alunos,
    ROUND(AVG(r.nota), 2) as media_geral,
    SUM(CASE WHEN r.nota >= 7.0 THEN 1 ELSE 0 END) as aprovados,
    SUM(CASE WHEN r.nota < 7.0 THEN 1 ELSE 0 END) as reprovados
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
LEFT JOIN public.respostas_aulas r ON a.id = r.aula_id
WHERE a.tipo IN ('avaliacao', 'prova')
GROUP BY a.id, a.titulo, a.tipo, l.titulo
ORDER BY a.titulo;

-- 4. VERIFICAR INTEGRIDADE REFERENCIAL
-- Verificar se há respostas com aluno_id que não existe na tabela users
SELECT 
    r.id,
    r.aluno_id,
    'Aluno não encontrado' as problema
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
WHERE u.id IS NULL;

-- Verificar se há respostas com aula_id que não existe na tabela aulas
SELECT 
    r.id,
    r.aula_id,
    'Aula não encontrada' as problema
FROM public.respostas_aulas r
LEFT JOIN public.aulas a ON r.aula_id = a.id
WHERE a.id IS NULL;

-- Verificar se há progresso com aluno_id que não existe na tabela users
SELECT 
    p.id,
    p.aluno_id,
    'Aluno não encontrado' as problema
FROM public.progresso p
LEFT JOIN public.users u ON p.aluno_id = u.id
WHERE u.id IS NULL;

-- Verificar se há progresso com aula_id que não existe na tabela aulas
SELECT 
    p.id,
    p.aula_id,
    'Aula não encontrada' as problema
FROM public.progresso p
LEFT JOIN public.aulas a ON p.aula_id = a.id
WHERE a.id IS NULL;

-- 5. VERIFICAR SE HÁ RESPOSTAS SEM PROGRESSO (possível erro de sincronização)
SELECT 
    r.aluno_id,
    u.nome as aluno,
    r.aula_id,
    a.titulo as prova,
    r.nota,
    'Resposta existe mas progresso não' as problema
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
LEFT JOIN public.progresso p ON r.aluno_id = p.aluno_id AND r.aula_id = p.aula_id
WHERE p.id IS NULL;

-- 6. VERIFICAR SE HÁ PROGRESSO SEM RESPOSTA (possível erro de lógica)
SELECT 
    p.aluno_id,
    u.nome as aluno,
    p.aula_id,
    a.titulo as prova,
    'Progresso existe mas resposta não' as problema
FROM public.progresso p
LEFT JOIN public.users u ON p.aluno_id = u.id
LEFT JOIN public.aulas a ON p.aula_id = a.id
LEFT JOIN public.respostas_aulas r ON p.aluno_id = r.aluno_id AND p.aula_id = r.aula_id
WHERE r.id IS NULL
AND a.tipo IN ('avaliacao', 'prova');
