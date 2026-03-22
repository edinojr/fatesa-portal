/*
  Admin Registration Support
*/

-- 1. Create admins_autorizados table
CREATE TABLE IF NOT EXISTS public.admins_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Update handle_new_user function to support admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
BEGIN
  -- Check if the email is pre-registered as a teacher
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE email = NEW.email) INTO is_teacher;
  -- Check if the email is pre-registered as an admin
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE email = NEW.email) INTO is_admin;

  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE 
      WHEN is_admin THEN 'admin'::user_tipo
      WHEN is_teacher THEN 'professor'::user_tipo 
      ELSE 'online'::user_tipo 
    END,
    CASE 
      WHEN is_admin THEN ARRAY['admin', 'suporte']
      WHEN is_teacher THEN ARRAY['professor'] 
      ELSE ARRAY['aluno'] 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
