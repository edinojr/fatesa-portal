-- =====================================================
-- DIAGNÓSTICO COMPLETO: Verificar provas no banco de dados
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. TOTAL DE REGISTROS NAS TABELAS PRINCIPAIS
SELECT 'respostas_aulas' as tabela, COUNT(*) as total FROM public.respostas_aulas
UNION ALL
SELECT 'progresso', COUNT(*) FROM public.progresso
UNION ALL
SELECT 'aulas', COUNT(*) FROM public.aulas
UNION ALL
SELECT 'users (alunos)', COUNT(*) FROM public.users WHERE tipo = 'aluno';

-- 2. VERIFICAR SE HÁ DADOS NA TABELA respostas_aulas
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT aluno_id) as alunos_unicos,
    COUNT(DISTINCT aula_id) as aulas_unicas,
    MIN(created_at) as primeira_resposta,
    MAX(updated_at) as ultima_resposta
FROM public.respostas_aulas;

-- 3. LISTAR TODAS AS RESPOSTAS EXISTENTES (se houver)
SELECT 
    r.aluno_id,
    u.nome as nome_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    a.tipo as tipo_aula,
    r.nota,
    r.status,
    r.tentativas,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
ORDER BY r.updated_at DESC
LIMIT 50;

-- 4. VERIFICAR SE HÁ PROVAS TIPO 'avaliacao' OU 'prova'
SELECT 
    a.id,
    a.titulo,
    a.tipo,
    a.livro_id,
    l.titulo as livro_titulo
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY a.titulo;

-- 5. VERIFICAR PROGRESSO DOS ALUNOS NAS PROVAS
SELECT 
    p.aluno_id,
    u.nome as nome_aluno,
    p.aula_id,
    a.titulo as titulo_aula,
    a.tipo as tipo_aula,
    p.concluida,
    p.nota_questionario,
    p.updated_at
FROM public.progresso p
LEFT JOIN public.users u ON p.aluno_id = u.id
LEFT JOIN public.aulas a ON p.aula_id = a.id
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY p.updated_at DESC
LIMIT 50;

-- 6. VERIFICAR SE HÁ ERROS DE RLS (testar inserção)
-- IMPORTANTE: Execute como um usuário autenticado (aluno)
-- Se der erro, significa que RLS está bloqueando

-- 7. VERIFICAR POLÍTICAS RLS ATIVAS
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'respostas_aulas'
ORDER BY cmd;

-- 8. VERIFICAR SE A CONSTRAINT UNIQUE EXISTE
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass 
AND contype = 'u';

-- 9. VERIFICAR SE HÁ TENTATIVAS DE INSERÇÃO BLOQUEADAS
-- (Verificar logs de erro do Supabase)
SELECT 
    'Verifique os logs do Supabase em: Dashboard > Logs > Postgres' as instrucao;

-- 10. TESTAR SE A FUNÇÃO is_staff_user FUNCIONA
SELECT public.is_staff_user() as is_staff_current_user;

-- 11. LISTAR ALUNOS CADASTRADOS
SELECT 
    id,
    nome,
    email,
    tipo,
    created_at
FROM public.users 
WHERE tipo = 'aluno'
ORDER BY nome
LIMIT 20;

-- 12. VERIFICAR SE HÁ AULAS COM QUESTÕES (questions JSONB)
SELECT 
    a.id,
    a.titulo,
    a.tipo,
    CASE 
        WHEN a.questions IS NOT NULL AND a.questions != '[]'::jsonb 
        THEN 'SIM' 
        ELSE 'NÃO' 
    END as tem_questoes,
    jsonb_array_length(a.questions) as total_questoes
FROM public.aulas a
WHERE a.tipo IN ('avaliacao', 'prova', 'exercicio')
ORDER BY a.tipo, a.titulo;
