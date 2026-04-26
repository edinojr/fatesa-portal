-- Fatesa TOTAL RESTORATION V2 - 2026-04-25
-- Objetivo: Quebrar recursão infinita usando SECURITY DEFINER e restaurar visibilidade.

-- 1. FUNÇÕES DE SUPORTE (SECURITY DEFINER)
-- Estas funções rodam com privilégios de 'postgres', ignorando o RLS e quebrando o loop.

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND tipo = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_user_tipo()
RETURNS TEXT AS $$
    SELECT tipo FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_user_nucleo_id()
RETURNS UUID AS $$
    SELECT nucleo_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

BEGIN;

-- 2. LIMPEZA DE POLÍTICAS
DROP POLICY IF EXISTS "user_self_select" ON public.users;
DROP POLICY IF EXISTS "admin_select_all" ON public.users;
DROP POLICY IF EXISTS "staff_select_logic" ON public.users;
DROP POLICY IF EXISTS "Coordenadores veem alunos do seu nucleo" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- 3. NOVAS POLÍTICAS EM USERS (IMUNES A RECURSÃO)

-- Alunos/Usuários veem a si mesmos
CREATE POLICY "users_self_view" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Admins veem tudo (Usa a função para quebrar o loop)
CREATE POLICY "users_admin_view" ON public.users 
FOR SELECT USING (public.check_is_admin());

-- Coordenadores veem alunos do seu núcleo
CREATE POLICY "users_coordinator_view" ON public.users
FOR SELECT USING (
    public.get_auth_user_tipo() = 'coordenador_polo' 
    AND nucleo_id = public.get_auth_user_nucleo_id()
    AND tipo IN ('online', 'presencial')
);

-- Professores veem alunos
CREATE POLICY "users_professor_view" ON public.users
FOR SELECT USING (public.get_auth_user_tipo() = 'professor');

-- 4. POLÍTICAS DE CONTEÚDO (LIVROS, AULAS, CURSOS)

-- LIVROS
DROP POLICY IF EXISTS "livros_access_policy" ON public.livros;
CREATE POLICY "livros_access_policy" ON public.livros
FOR SELECT USING (
    public.check_is_admin() OR 
    public.get_auth_user_tipo() IN ('professor', 'coordenador_polo') OR
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND (u.curso_id = public.livros.curso_id OR u.curso_opcao = (SELECT nome FROM public.cursos WHERE id = public.livros.curso_id))
    )
);

-- AULAS
DROP POLICY IF EXISTS "aulas_access_policy" ON public.aulas;
CREATE POLICY "aulas_access_policy" ON public.aulas
FOR SELECT USING (
    public.check_is_admin() OR 
    public.get_auth_user_tipo() IN ('professor', 'coordenador_polo') OR
    EXISTS (
        SELECT 1 FROM public.livros l
        JOIN public.users u ON (u.curso_id = l.curso_id OR u.curso_opcao = (SELECT nome FROM public.cursos WHERE id = l.curso_id))
        WHERE l.id = public.aulas.livro_id AND u.id = auth.uid()
    )
);

-- CURSOS
DROP POLICY IF EXISTS "Anyone can view courses" ON public.cursos;
CREATE POLICY "Anyone can view courses" ON public.cursos FOR SELECT USING (true);

-- 5. REPARO DAS VISÕES (Com security_invoker)
DROP VIEW IF EXISTS public.view_student_profiles_flat CASCADE;
CREATE VIEW public.view_student_profiles_flat WITH (security_invoker = true) AS
SELECT 
    u.id, u.nome, u.email, u.telefone, u.endereco, u.cpf, u.tipo AS modalidade, u.bloqueado,
    n.nome AS nucleus_name, n.id AS nucleus_id,
    COALESCE((SELECT nome FROM public.cursos WHERE id = u.curso_id), u.curso_opcao) AS course_name
FROM public.users u
LEFT JOIN public.nucleos n ON u.nucleo_id = n.id;

GRANT SELECT ON public.view_student_profiles_flat TO authenticated;

COMMIT;

-- Sincronizar permissões de funções
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_tipo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_nucleo_id() TO authenticated;

NOTIFY pgrst, 'reload schema';
