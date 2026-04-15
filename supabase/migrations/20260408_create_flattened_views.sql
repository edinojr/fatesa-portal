-- 1. Visão Detalhada de Submissões (Achatamento Principal)
-- Unifica Todas as Informações de Avaliação em uma única Linha
CREATE OR REPLACE VIEW public.view_submissions_detailed AS
SELECT 
    sub.id AS submission_id,
    sub.nota,
    sub.status,
    sub.respostas,
    sub.tentativas,
    sub.primeira_correcao_at,
    sub.comentario_professor,
    sub.created_at AS submitted_at,
    sub.updated_at AS last_updated,
    -- Informações da Aula
    a.id AS lesson_id,
    a.titulo AS lesson_title,
    a.tipo AS lesson_type,
    a.questionario,
    a.questionario_v2,
    a.questionario_v3,
    a.is_bloco_final,
    -- Informações do Livro/Módulo
    l.id AS book_id,
    l.titulo AS book_title,
    l.ordem AS book_order,
    -- Informações do Aluno
    u.id AS student_id,
    u.nome AS student_name,
    u.email AS student_email,
    u.ano_graduacao AS student_graduation_year,
    -- Informações do Núcleo/Polo
    n.id AS nucleus_id,
    n.nome AS nucleus_name
FROM 
    public.respostas_aulas sub
LEFT JOIN 
    public.aulas a ON sub.aula_id = a.id
LEFT JOIN 
    public.livros l ON a.livro_id = l.id
LEFT JOIN 
    public.users u ON sub.aluno_id = u.id
LEFT JOIN 
    public.nucleos n ON u.nucleo_id = n.id;

-- Permissões para que o frontend autenticado possa ler a View
GRANT SELECT ON public.view_submissions_detailed TO authenticated;

-- 2. Visão de Hierarquia de Conteúdo (Cursos + Livros + Aulas)
CREATE OR REPLACE VIEW public.view_content_hierarchy AS
SELECT 
    c.id AS course_id,
    c.nome AS course_name,
    l.id AS book_id,
    l.titulo AS book_title,
    l.ordem AS book_order,
    a.id AS lesson_id,
    a.titulo AS lesson_title,
    a.tipo AS lesson_type,
    a.ordem AS lesson_order,
    a.video_url,
    a.is_bloco_final
FROM 
    public.cursos c
JOIN 
    public.livros l ON l.curso_id = c.id
JOIN 
    public.aulas a ON a.livro_id = l.id;

GRANT SELECT ON public.view_content_hierarchy TO authenticated;

-- 3. Visão de Perfis de Alunos
CREATE OR REPLACE VIEW public.view_student_profiles_flat AS
SELECT 
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.ano_graduacao,
    u.tipo AS modalidade,
    u.acesso_definitivo,
    u.bloqueado,
    u.bolsista,
    n.nome AS nucleus_name,
    n.id AS nucleus_id,
    c.nome AS course_name,
    c.id AS course_id
FROM 
    public.users u
LEFT JOIN 
    public.nucleos n ON u.nucleo_id = n.id
LEFT JOIN 
    public.cursos c ON u.curso_id = c.id;

GRANT SELECT ON public.view_student_profiles_flat TO authenticated;
