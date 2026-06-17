-- Script 40b: Verificar e limpar progresso órfão também
-- Verificar se existem registros em progresso com aula_id que não existe

SELECT 
    p.aula_id,
    COUNT(*) as total
FROM progresso p
LEFT JOIN aulas a ON p.aula_id = a.id
WHERE a.id IS NULL
GROUP BY p.aula_id;
