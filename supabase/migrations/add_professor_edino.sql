-- Adicionando o 'Portal do Professor' nas opções de acesso do Edino (edi.ben.jr@gmail.com)
-- Ao fazer login novamente, o botão "Portal do Professor" aparecerá ao lado de "Aluno" e "Suporte".

UPDATE public.users 
SET caminhos_acesso = ARRAY['aluno', 'suporte', 'professor']
WHERE email = 'edi.ben.jr@gmail.com';
