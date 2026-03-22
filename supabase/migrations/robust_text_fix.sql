-- SCRIPT DE RECONSTRUÇÃO TOTAL (TEXTO EM VEZ DE ENUM)
-- Este script remove a dependência do ENUM user_tipo, que pode ser o causador do erro 500.

-- 1. Remover gatilhos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Alterar a tabela para aceitar TEXTO (mais flexível)
ALTER TABLE public.users ALTER COLUMN tipo TYPE TEXT USING tipo::text;
-- Remover o default se ele estiver travado no enum
ALTER TABLE public.users ALTER COLUMN tipo SET DEFAULT 'online';

-- 3. Recriar a função simplificada (Sem casts complexos)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, tipo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Aluno'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'student_type', 'online')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reativar o gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Dar permissões totais para o sistema
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
