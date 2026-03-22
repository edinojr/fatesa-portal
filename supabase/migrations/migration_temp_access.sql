-- Migration: Add temporary access fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS acesso_definitivo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_expiracao_temp TIMESTAMP WITH TIME ZONE;

-- Update the handle_new_user function to set temporary access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, tipo, acesso_definitivo, data_expiracao_temp)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Aluno'), 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'student_type')::user_tipo, 'online'::user_tipo),
    FALSE, -- Start as temporary
    now() + interval '3 days' -- Expire in 3 days
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
