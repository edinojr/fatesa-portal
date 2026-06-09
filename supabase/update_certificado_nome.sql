-- Função para atualizar nome no certificado
-- Execute este SQL no Supabase para alterar o nome do certificado

-- Primeiro, verifique o registro atual
SELECT id, nome, email, curso, nivel_curso 
FROM registros_alumni 
WHERE nome ILIKE '%JORGE%' OR nome ILIKE '%MORENO%';

-- Atualize o nome para "EDINO FERREIRA BENTO JUNIOR"
UPDATE registros_alumni 
SET nome = 'EDINO FERREIRA BENTO JUNIOR'
WHERE nome ILIKE '%JORGE%' OR nome ILIKE '%MORENO%';

-- Verifique se a atualização foi bem-sucedida
SELECT id, nome, email, curso, nivel_curso 
FROM registros_alumni 
WHERE nome ILIKE '%EDINO%';
