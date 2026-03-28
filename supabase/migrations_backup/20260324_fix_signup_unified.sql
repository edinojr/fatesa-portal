-- 1. LIMPEZA DE GATILHOS E FUNÇÕES CONFLITANTES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. GARANTIR TABELAS DE AUTORIZAÇÃO
CREATE TABLE IF NOT EXISTS public.professores_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admins_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FUNÇÃO UNIFICADA E RESILIENTE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
BEGIN
  -- Identificação de Papéis (Roles)
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;

  -- Definição de Tipo e Caminhos
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    -- Verifica o tipo enviado pelo frontend (presencial ou online)
    IF NEW.raw_user_meta_data->>'student_type' = 'presencial' THEN
      final_tipo := 'presencial'::user_tipo;
    ELSE
      final_tipo := 'online'::user_tipo;
    END IF;
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- Inserção com Tratamento de Conflito (Evita Erro 500 se o email já existir no portal)
  INSERT INTO public.users (
    id, 
    nome, 
    email, 
    tipo, 
    caminhos_acesso, 
    nucleo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    final_tipo,
    final_caminhos,
    NEW.raw_user_meta_data->>'nucleo'
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id, -- Crucial para vincular o perfil existente ao novo Auth ID
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo = EXCLUDED.nucleo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REATIVAR GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. PERMISSÕES E RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Garantir que o sistema possa inserir
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
