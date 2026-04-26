-- Fatesa Content Restoration & RLS Fix - 2026-04-25
-- Objetivo: Resolver recursividade infinita no RLS e restaurar acesso a conteúdos após remoção da tabela matriculas.

BEGIN;

-- 1. FIX RECURSION IN USERS TABLE
-- Removemos as políticas problemáticas que causaram o loop infinito
DROP POLICY IF EXISTS "Coordenadores veem alunos do seu nucleo" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- Nova política para Admins (Usa check direto para evitar recursão profunda)
CREATE POLICY "Admins can view all profiles" ON public.users 
FOR SELECT USING (
    (SELECT tipo FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Nova política para Coordenadores (Otimizada)
CREATE POLICY "Coordenadores veem alunos do seu nucleo" ON public.users
FOR SELECT USING (
    EXISTS (
        SELECT 1 
        FROM (SELECT id, tipo, nucleo_id FROM public.users WHERE id = auth.uid()) AS me
        WHERE me.tipo = 'coordenador_polo' 
        AND public.users.nucleo_id = me.nucleo_id
        AND (public.users.tipo = 'online' OR public.users.tipo = 'presencial')
    )
);

-- 2. FIX LIVROS & AULAS (SUBSTITUIR MATRICULAS POR USERS.CURSO_ID)
-- Como a tabela 'matriculas' foi removida, precisamos atualizar as políticas que dependiam dela.

-- LIVROS
DROP POLICY IF EXISTS "Students can view books of their courses" ON public.livros;
CREATE POLICY "Students can view books of their courses" ON public.livros
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (curso_id = public.livros.curso_id OR curso_opcao = (SELECT nome FROM public.cursos WHERE id = public.livros.curso_id))
    )
);

-- AULAS
DROP POLICY IF EXISTS "Students can view lessons" ON public.aulas;
CREATE POLICY "Students can view lessons" ON public.aulas
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.livros l
        JOIN public.users u ON (u.curso_id = l.curso_id OR u.curso_opcao = (SELECT nome FROM public.cursos WHERE id = l.curso_id))
        WHERE l.id = public.aulas.livro_id
        AND u.id = auth.uid()
    )
);

-- 3. FIX VIEWS
-- Nota: Usamos DROP VIEW CASCADE e recriamos com security_invoker = true para garantir conformidade com RLS.

DROP VIEW IF EXISTS public.view_submissions_detailed CASCADE;
CREATE VIEW public.view_submissions_detailed WITH (security_invoker = true) AS
SELECT 
    sub.id AS submission_id,
    sub.nota,
    sub.status,
    sub.respostas,
    sub.tentativas,
    sub.primeira_correcao_at,
    sub.comentario_professor,
    sub.created_at AS submitted_at,
    -- Informações da Aula
    a.titulo AS lesson_title,
    a.tipo AS lesson_type,
    -- Informações do Aluno
    u.nome AS student_name,
    u.email AS student_email,
    -- Informações do Núcleo
    n.nome AS nucleus_name,
    n.id AS nucleus_id
FROM 
    public.respostas_aulas sub
JOIN 
    public.aulas a ON sub.aula_id = a.id
JOIN 
    public.users u ON sub.aluno_id = u.id
LEFT JOIN 
    public.nucleos n ON u.nucleo_id = n.id;

GRANT SELECT ON public.view_submissions_detailed TO authenticated;

DROP VIEW IF EXISTS public.view_student_profiles_flat CASCADE;

CREATE VIEW public.view_student_profiles_flat 
WITH (security_invoker = true)
AS 
SELECT 
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.endereco,
    u.cpf,
    u.tipo AS modalidade,
    u.bloqueado,
    n.nome AS nucleus_name,
    n.id AS nucleus_id,
    -- Busca o curso diretamente na tabela users (novo padrão)
    COALESCE(
        (SELECT nome FROM public.cursos WHERE id = u.curso_id),
        u.curso_opcao
    ) AS course_name
FROM 
    public.users u
LEFT JOIN public.nucleos n ON u.nucleo_id = n.id;

-- Reaplica permissões (Removidas pelo DROP VIEW CASCADE)
GRANT SELECT ON public.view_student_profiles_flat TO authenticated;

COMMIT;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
