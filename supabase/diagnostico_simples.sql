-- =====================================================
-- DIAGNÓSTICO SIMPLES: Verificar provas no banco
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Verificar a estrutura da tabela respostas_aulas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Contar registros na tabela
SELECT COUNT(*) as total_respostas FROM public.respostas_aulas;

-- 3. Listar as últimas 20 respostas salvas
SELECT 
    r.id,
    r.aluno_id,
    r.aula_id,
    r.nota,
    r.status,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
ORDER BY r.updated_at DESC
LIMIT 20;

-- 4. Verificar se há provas criadas no sistema
SELECT 
    COUNT(*) as total_provas
FROM public.aulas 
WHERE tipo IN ('avaliacao', 'prova');

-- 5. Listar todas as provas disponíveis
SELECT 
    a.id,
    a.titulo,
    a.tipo
FROM public.aulas a
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY a.titulo;

-- 6. Verificar se há alunos cadastrados
SELECT 
    COUNT(*) as total_alunos
FROM public.users 
WHERE tipo = 'aluno';

-- 7. Listar alguns alunos
SELECT 
    id,
    nome,
    email
FROM public.users 
WHERE tipo = 'aluno'
LIMIT 10;

-- 8. Verificar políticas RLS ativas
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'respostas_aulas';

-- 9. Verificar se a constraint UNIQUE existe
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass 
AND contype = 'u';

-- 10. Verificar se a tabela progresso tem dados de provas
SELECT 
    p.id,
    p.aluno_id,
    p.aula_id,
    p.concluida,
    p.nota_questionario,
    p.updated_at
FROM public.progresso p
JOIN public.aulas a ON p.aula_id = a.id
WHERE a.tipo IN ('avaliacao', 'prova')
LIMIT 20;
