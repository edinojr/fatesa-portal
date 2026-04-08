-- ==========================================================
-- DIAGNÓSTICO E LIMPEZA DE ESPAÇO NO SUPABASE
-- ==========================================================

-- 1. IDENTIFICAR ONDE ESTÁ O ESPAÇO (Tabelas e Índices)
SELECT
    schemaname AS esquema,
    relname AS tabela,
    pg_size_pretty(pg_total_relation_size(relid)) AS tamanho_total,
    pg_size_pretty(pg_relation_size(relid)) AS tamanho_dados,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS tamanho_indices
FROM
    pg_catalog.pg_statio_user_tables
ORDER BY
    pg_total_relation_size(relid) DESC;

-- 2. IDENTIFICAR ONDE ESTÁ O ESPAÇO (Storage/Arquivos)
SELECT 
    bucket_id,
    count(*) as total_arquivos,
    pg_size_pretty(sum(COALESCE((metadata->>'size')::int8, 0))) as tamanho_total
FROM 
    storage.objects
GROUP BY 
    bucket_id
ORDER BY 
    sum(COALESCE((metadata->>'size')::int8, 0)) DESC;

-- 3. VERIFICAR LOGS DE AUTENTICAÇÃO (Sempre cresce muito)
SELECT count(*) as total_logs_auth FROM auth.audit_log;

-- 4. LIMPEZA DE LOGS (Executar se o número acima for alto, ex: > 100.000)
-- DELETE FROM auth.audit_log WHERE created_at < now() - interval '3 months';

-- 5. RECOMENDAÇÃO DE VÁCUO COMPLETO
-- Se você apagou MUITOS dados e o tamanho no Dashboard não baixou, rode isso SOZINHO:
-- VACUUM FULL;
-- Nota: O VACUUM FULL bloqueia a tabela temporariamente por alguns segundos/minutos.

