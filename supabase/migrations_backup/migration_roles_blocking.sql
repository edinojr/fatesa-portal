-- Adicionar coluna 'bloqueado' para controle administrativo
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE;

-- Adicionar coluna 'caminhos_acesso' para usuários com múltiplos papéis (Ex: Suporte + Aluno)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS caminhos_acesso TEXT[] DEFAULT '{}';

-- Atualizar e-mails especiais com seus caminhos de acesso e tipos
UPDATE public.users 
SET caminhos_acesso = '{"aluno", "suporte"}', tipo = 'suporte' 
WHERE email = 'edi.ben.jr@gmail.com';

UPDATE public.users 
SET caminhos_acesso = '{"aluno", "admin"}', tipo = 'admin' 
WHERE email = 'ap.panisso@gmail.com';

-- Comentário para documentação:
-- 'caminhos_acesso' permitirá que a interface de Login ofereça uma escolha para estes usuários.
