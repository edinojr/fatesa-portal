-- Script 39d: Verificar estrutura da tabela historico_notas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'historico_notas'
ORDER BY ordinal_position;
