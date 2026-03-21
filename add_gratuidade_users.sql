-- Adicionando a coluna de Gratuidade (para alunos bolsistas isentos de pagamento) na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bolsista BOOLEAN DEFAULT false;

-- Permitir que Administradores atualizem esta coluna
-- (Nossa política de UPDATE atualizada anteriormente já cobre a tabela inteira, 
-- mas isso garante caso não tenham rodado o `allow_admin_updates.sql`)

-- O valor de custo agora foi validado com o cliente como sendo R$ 70,00 por livro.
