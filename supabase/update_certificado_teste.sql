-- Atualizar nome do certificado de teste
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar registros existentes
SELECT id, nome, email, curso, nivel_curso, created_at 
FROM registros_alumni 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Atualizar o nome (substitua o ID pelo registro correto)
-- Primeiro encontre o registro com nome "JORGE AUGUSTO DE SOUSA MORENO"
UPDATE registros_alumni 
SET nome = 'EDINO FERREIRA BENTO JUNIOR'
WHERE nome ILIKE '%JORGE%' AND nome ILIKE '%MORENO%';

-- 3. Verificar se foi atualizado
SELECT id, nome, email, curso, nivel_curso 
FROM registros_alumni 
WHERE nome ILIKE '%EDINO%';
