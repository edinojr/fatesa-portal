-- Sincronizar o e-mail edi.ben.jr@gmail.com caso esteja na aba Auth, mas faltando no banco de perfis
INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso, bloqueado)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Edino'),
  'online'::user_tipo,
  ARRAY['aluno', 'suporte'],
  false
FROM auth.users
WHERE email = 'edi.ben.jr@gmail.com' 
AND id NOT IN (SELECT id FROM public.users);

-- Se o usuário já existir mas não tiver as permissões certas, aplicar agora:
UPDATE public.users 
SET caminhos_acesso = ARRAY['aluno', 'suporte'],
    tipo = 'admin'
WHERE email = 'edi.ben.jr@gmail.com';
