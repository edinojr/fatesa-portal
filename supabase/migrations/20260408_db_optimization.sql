-- 1. Manutenção Preventiva do Banco
-- O comando VACUUM foi removido daqui pois deve ser executado SOZINHO no editor SQL.
-- Se desejar rodar, use apenas: VACUUM ANALYZE;

-- 2. Limpeza de Dados Temporários (Se houver)
-- Se você tiver uma tabela de logs, por exemplo, pode limpar dados com mais de 6 meses
-- DELETE FROM public.logs WHERE created_at < now() - interval '6 months';

-- 1. Verificação de Tabelas Pesadas (Postgres)
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM
    pg_catalog.pg_statio_user_tables
ORDER BY
    pg_total_relation_size(relid) DESC;

-- 2. Verificação de Tamanho por Bucket (Storage - Arquivos)
-- Ajuda a identificar se o problema está nos PDFs, comprovantes ou fotos.
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

-- 3. Sugestão de Desativação de Realtime (Instrução)
-- O Realtime é ativado por publicação. Verifique as publicações no menu Database > Replication
-- Isso não reduz o espaço em disco, mas reduz drasticamente o consumo de banda (Egress).
