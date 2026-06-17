-- =====================================================
-- VERIFICAR LOGS DE ERRO NO SUPABASE
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se há erros recentes relacionados a respostas_aulas
-- (Nota: Logs completos ficam no Dashboard > Logs)

-- 2. Verificar se a tabela respostas_aulas existe e está acessível
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'respostas_aulas';

-- 3. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public';

-- 4. Verificar se há triggers na tabela (que podem estar causando erros)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'respostas_aulas';

-- 5. Verificar se há functions que podem estar bloqueando
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%respostas%'
OR routine_name LIKE '%progresso%';

-- 6. Verificar a estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'respostas_aulas'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar se o Supabase está retornando erros
-- (Execute isto no browser console para ver erros):
-- Abra o Console do navegador (F12) e procure por erros vermelhos

-- 8. VERIFICAR SE O PROBLEMA É NO FRONTEND
-- Adicione este código no handleFinalizar do AvaliacaoFixacao.tsx para debug:
-- 
-- console.log('Debug - profile.id:', profile?.id);
-- console.log('Debug - lessonId:', lessonId);
-- console.log('Debug - respostasAluno:', respostasAluno);
-- console.log('Debug - stats.grade:', stats?.grade);
-- 
-- Se os valores estiverem undefined/null, o problema é no frontend.
