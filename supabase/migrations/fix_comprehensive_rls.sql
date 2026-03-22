-- ==============================================================================
-- FIX COMPREHENSIVE: RLS, TRIGGER E PERMISSÕES DE STORAGE
-- ==============================================================================

-- 1. CORREÇÃO DO TRIGGER DE CRIAÇÃO DE USUÁRIO (Compatibilidade com SignUp e Admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome, tipo, acesso_definitivo, nucleo_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo', 'aluno'),
    COALESCE((NEW.raw_user_meta_data->>'acesso_definitivo')::boolean, false),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'nucleo') IS NOT NULL AND (NEW.raw_user_meta_data->>'nucleo') <> '' 
      THEN (NEW.raw_user_meta_data->>'nucleo')::uuid 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. LIMPEZA DE POLÍTICAS EXISTENTES (LIVROS, AULAS, USERS)
DROP POLICY IF EXISTS "Admins and Professors can view all lessons" ON public.aulas;
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;
DROP POLICY IF EXISTS "Admins and Professors can view all courses" ON public.cursos;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admin view all" ON public.users;
DROP POLICY IF EXISTS "Admins manage all users" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;

-- 3. POLÍTICA DE VISUALIZAÇÃO DE USUÁRIOS (Admin/Professor/Staff vê tudo)
CREATE POLICY "Staff view all users" 
ON public.users 
FOR SELECT 
USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.admins_autorizados)
  OR (auth.jwt()->>'email') IN (SELECT email FROM public.professores_autorizados)
  OR id = auth.uid()
);

-- 4. POLÍTICA DE GESTÃO DE USUÁRIOS (Apenas Admins gerenciam)
CREATE POLICY "Admins manage users" 
ON public.users 
FOR ALL 
USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.admins_autorizados)
);

-- 5. POLÍTICAS DE CONTEÚDO (CRUD Livre para Admins e Professores)
CREATE POLICY "Staff manage courses" ON public.cursos FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.admins_autorizados) OR 
  (auth.jwt()->>'email') IN (SELECT email FROM public.professores_autorizados)
);

CREATE POLICY "Staff manage books" ON public.livros FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.admins_autorizados) OR 
  (auth.jwt()->>'email') IN (SELECT email FROM public.professores_autorizados)
);

CREATE POLICY "Staff manage lessons" ON public.aulas FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.admins_autorizados) OR 
  (auth.jwt()->>'email') IN (SELECT email FROM public.professores_autorizados)
);

-- 6. PERMISSÃO PARA USUÁRIOS COMUNS VEREM CONTEÚDO (SELECT)
CREATE POLICY "Anyone authenticated can view courses" ON public.cursos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can view books" ON public.livros FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can view lessons" ON public.aulas FOR SELECT USING (auth.role() = 'authenticated');

-- 7. RECURSO NUCLEAR: Desabilitar RLS se necessário? (Não recomendado, mas vamos garantir que as tabelas aceitem as políticas)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
