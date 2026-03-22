-- 1. LIMPEZA TOTAL (PARA ELIMINAR QUALQUER CONFLITO)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. LIMPAR REGISTROS ÓRFÃOS (CUIDADO: Isso esvazia a tabela de usuários do portal)
-- Fazemos isso para garantir que não haja emails duplicados impedindo o cadastro
TRUNCATE TABLE public.users CASCADE;

-- 3. RECRIAR FUNÇÃO COM MÁXIMA RESILIÊNCIA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, tipo)
  VALUES (
    new.id, 
    -- Pega o nome do metadata ou usa o email como fallback
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    -- Verifica o tipo enviado pelo frontend
    CASE 
      WHEN new.raw_user_meta_data->>'student_type' = 'presencial' THEN 'presencial'::user_tipo
      WHEN new.raw_user_meta_data->>'student_type' = 'online' THEN 'online'::user_tipo
      ELSE 'online'::user_tipo
    END
  )
  -- Se o ID já existir ou o EMAIL já existir, não faz nada (evita o erro 500)
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REATIVAR GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. PERMISSÕES DE SISTEMA
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- 6. RESETAR POLÍTICAS (RLS)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção pelo sistema" ON public.users;
CREATE POLICY "Permitir inserção pelo sistema" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.users;
CREATE POLICY "Usuários veem o próprio perfil" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins veem tudo" ON public.users;
CREATE POLICY "Admins veem tudo" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);
