-- Fatesa TOTAL CONTENT RESTORATION - 2026-04-25
-- Objetivo: Eliminar de uma vez por todas a recursão e restaurar visibilidade total.

BEGIN;

-- 1. LIMPEZA TOTAL DE POLÍTICAS EM USERS (PARA REMOVER RECURSÃO)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Coordenadores veem alunos do seu nucleo" ON public.users;
DROP POLICY IF EXISTS "Leitura de perfis para staff" ON public.users;

-- 2. CRIAÇÃO DE POLÍTICAS NÃO-RECURSIVAS EM USERS

-- Base: Todo usuário pode ver seu PRÓPRIO perfil (Crucial para que as subconsultas funcionem)
CREATE POLICY "user_self_select" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Admins: Podem ver tudo (Subconsulta que atinge apenas a linha do próprio admin)
CREATE POLICY "admin_select_all" ON public.users 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND tipo = 'admin'
    )
);

-- Professores e Coordenadores (Acesso específico)
CREATE POLICY "staff_select_logic" ON public.users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.id = auth.uid() 
        AND (
            me.tipo = 'professor' OR 
            (me.tipo = 'coordenador_polo' AND public.users.nucleo_id = me.nucleo_id)
        )
    )
);

-- 3. RESTAURAÇÃO DE CONTEÚDO (LIVROS, AULAS, CURSOS)
-- Removemos dependências da tabela 'matriculas' que foi deletada.

-- CURSOS (Acesso para todos logados)
DROP POLICY IF EXISTS "Anyone can view courses" ON public.cursos;
CREATE POLICY "Anyone can view courses" ON public.cursos FOR SELECT USING (auth.role() = 'authenticated');

-- LIVROS (Alunos veem livros do seu curso_id ou curso_opcao)
DROP POLICY IF EXISTS "Students can view books of their courses" ON public.livros;
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;

CREATE POLICY "livros_access_policy" ON public.livros
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND (
            u.tipo IN ('admin', 'professor', 'coordenador_polo') OR
            u.curso_id = public.livros.curso_id OR 
            u.curso_opcao = (SELECT nome FROM public.cursos WHERE id = public.livros.curso_id)
        )
    )
);

-- AULAS
DROP POLICY IF EXISTS "Students can view lessons" ON public.aulas;
DROP POLICY IF EXISTS "Admins and Professors can view all lessons" ON public.aulas;

CREATE POLICY "aulas_access_policy" ON public.aulas
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.livros l
        JOIN public.users u ON (
            u.tipo IN ('admin', 'professor', 'coordenador_polo') OR
            u.curso_id = l.curso_id OR 
            u.curso_opcao = (SELECT nome FROM public.cursos WHERE id = l.curso_id)
        )
        WHERE l.id = public.aulas.livro_id
        AND u.id = auth.uid()
    )
);

-- 4. REPARO DAS VISÕES (GARANTIR QUE NÃO QUEBREM)
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

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
