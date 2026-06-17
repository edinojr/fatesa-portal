-- Script de diagnóstico para verificar o estado das políticas RLS em respostas_aulas
-- Execute este script no Supabase SQL Editor para verificar se as políticas estão corretas

-- 1. Lista todas as políticas ativas na tabela respostas_aulas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'respostas_aulas'
ORDER BY cmd, policyname;

-- 2. Verifica se a função is_staff_user existe e funciona
SELECT public.is_staff_user() as is_staff;

-- 3. Verifica a constraint CHECK de status
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.respostas_aulas'::regclass 
AND contype = 'c';

-- 4. Conta registros na tabela (para verificar se dados estão sendo salvos)
SELECT COUNT(*) as total_respostas FROM public.respostas_aulas;

-- 5. Lista as últimas 10 respostas salvas (para verificar se há dados recentes)
SELECT 
    aluno_id,
    aula_id,
    status,
    nota,
    created_at,
    updated_at
FROM public.respostas_aulas 
ORDER BY updated_at DESC 
LIMIT 10;
