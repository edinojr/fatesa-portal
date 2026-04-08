-- 1. Manutenção Preventiva do Banco
-- Otimiza o armazenamento físico e reconstrói índices para melhorar a performance
VACUUM ANALYZE;

-- 2. Limpeza de Dados Temporários (Se houver)
-- Se você tiver uma tabela de logs, por exemplo, pode limpar dados com mais de 6 meses
-- DELETE FROM public.logs WHERE created_at < now() - interval '6 months';

-- 3. Verificação de Tabelas Pesadas
-- Esta query ajuda a identificar quais tabelas estão ocupando mais espaço
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM
    pg_catalog.pg_statio_user_tables
ORDER BY
    pg_total_relation_size(relid) DESC;

-- 4. Sugestão de Desativação de Realtime (Instrução)
-- Executar isso no Dashboard do Supabase para reduzir egress de Realtime:
-- O Realtime é ativado por publicação. Verifique as publicações no menu Database > Replication
