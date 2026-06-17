-- =====================================================
-- DIAGNÓSTICO FINAL: Verificar provas no banco
-- Versão segura - verifica estrutura primeiro
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Verificar estrutura da tabela respostas_aulas
SELECT 'ESTRUTURA respostas_aulas:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela progresso
SELECT 'ESTRUTURA progresso:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'progresso'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Contar registros
SELECT 'DADOS:' as info;
SELECT 
    (SELECT COUNT(*) FROM public.respostas_aulas) as total_respostas,
    (SELECT COUNT(*) FROM public.progresso) as total_progresso,
    (SELECT COUNT(*) FROM public.aulas WHERE tipo IN ('avaliacao', 'prova')) as total_provas_criadas,
    (SELECT COUNT(*) FROM public.users WHERE tipo = 'aluno') as total_alunos;

-- 4. Listar últimas respostas (se existirem)
SELECT 'ÚLTIMAS RESPOSTAS:' as info;
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
LIMIT 10;

-- 5. Listar progresso de provas (se existir)
SELECT 'PROGRESSO DE PROVAS:' as info;
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
LIMIT 10;

-- 6. Listar provas disponíveis
SELECT 'PROVAS DISPONÍVEIS:' as info;
SELECT 
    a.id,
    a.titulo,
    a.tipo
FROM public.aulas a
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY a.titulo;

-- 7. Verificar políticas RLS
SELECT 'POLÍTICAS RLS:' as info;
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'respostas_aulas';

-- 8. Verificar constraint UNIQUE
SELECT 'CONSTRAINT UNIQUE:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass 
AND contype = 'u';
