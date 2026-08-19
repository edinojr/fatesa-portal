-- ==============================================================================
-- Seeds ap.panisso@gmail.com as authorized admin (replaces previous hardcoded
-- email check in src/pages/Login.tsx).
-- Apply via: supabase db execute / psql
-- ==============================================================================

INSERT INTO public.admins_autorizados (email)
VALUES ('ap.panisso@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Atualiza o perfil existente (se houver) para garantir tipo admin + escopos
UPDATE public.users
SET tipo = 'admin',
    caminhos_acesso = ARRAY['admin', 'suporte', 'professor', 'aluno']
WHERE email = 'ap.panisso@gmail.com';

-- Se ainda não houver perfil público, o fluxo de auto-reparo (create_profile_if_missing)
-- em src/pages/Login.tsx criará no próximo login com base na whitelist admins_autorizados.