-- =====================================================
-- DIAGNÓSTICO DE ERROS: Por que as provas não são salvas?
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR SE A TABELA RESPONSTAS_AULAS EXISTE
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'respostas_aulas';

-- 2. VERIFICAR ESTRUTURA DA TABELA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VERIFICAR CONSTRAINTS
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass;

-- 4. VERIFICAR POLÍTICAS RLS ATIVAS
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'respostas_aulas'
ORDER BY cmd, policyname;

-- 5. VERIFICAR SE A CONSTRAINT UNIQUE EXISTE
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass 
AND contype = 'u';

-- 6. TESTAR SE A FUNÇÃO is_staff_user FUNCIONA
SELECT public.is_staff_user() as is_staff_current_user;

-- 7. VERIFICAR SE HÁ TRIGGERS NA TABELA
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'respostas_aulas';

-- 8. VERIFICAR SE HÁ FUNCTIONS RELACIONADAS
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%respostas%' 
     OR routine_name LIKE '%progresso%'
     OR routine_name LIKE '%avaliacao%'
     OR routine_name LIKE '%prova%');

-- 9. VERIFICAR SE HÁ INDEX NA TABELA
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'respostas_aulas';

-- 10. VERIFICAR SE HÁ PERMISSÕES DE GRANT
SELECT 
    grantee,
    privilege_type,
    is_grantable,
    with_hierarchy
FROM information_schema.role_table_grants
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public';

-- 11. VERIFICAR SE HÁ DADOS NA TABELA
SELECT 
    COUNT(*) as total_registros,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro
FROM public.respostas_aulas;

-- 12. SE NÃO HOUVER DADOS, VERIFICAR POR QUE
-- (Execute como um aluno autenticado)
SELECT 
    auth.uid() as user_id_atual,
    (SELECT tipo FROM public.users WHERE id = auth.uid()) as tipo_usuario,
    public.is_staff_user() as is_staff;

-- 13. TESTE DE INSERÇÃO SIMULADO (descomente para testar)
/*
INSERT INTO public.respostas_aulas (
    aluno_id,
    aula_id,
    respostas,
    nota,
    status,
    tentativas
) VALUES (
    auth.uid(),
    (SELECT id FROM public.aulas WHERE tipo IN ('avaliacao', 'prova') LIMIT 1),
    '{"teste": true}'::jsonb,
    8.5,
    'corrigida',
    1
);
*/

-- 14. SE DER ERRO, VERIFIQUE:
-- 1. "new row violates row-level security policy"
--    => RLS está bloqueando. Execute 20260616_fix_respostas_rls_final.sql
--
-- 2. "duplicate key value violates unique constraint"
--    => Já existe registro. Use ON CONFLICT no código
--
-- 3. "null value in column violates not-null constraint"
--    => Falta campo obrigatório
--
-- 4. "value for check constraint is out of range"
--    => Status inválido. Use: 'pendente', 'corrigida', 'concluido', 'reprovado', 'liberado'
--
-- 5. "permission denied for table respostas_aulas"
--    => Falta permissão GRANT. Execute:
--    GRANT SELECT, INSERT, UPDATE ON public.respostas_aulas TO authenticated;
