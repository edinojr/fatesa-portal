-- Script 40c: Verificação final após limpeza
-- Deve retornar 0 registros órfãos

SELECT 
    COUNT(*) as total_orfaos
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL;
