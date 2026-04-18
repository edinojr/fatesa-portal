-- ============================================================
-- REPARO: view_submissions_detailed
-- Garante que a view tenha todos os campos necessários:
--   student_id, lesson_id, book_id — essenciais para o portal
-- Usa LEFT JOINs para não perder submissões órfãs (aulas/livros deletados)
-- ============================================================

CREATE OR REPLACE VIEW public.view_submissions_detailed AS
SELECT
    sub.id            AS submission_id,
    sub.aluno_id      AS student_id,      -- campo crítico para filtrar por aluno
    sub.nota,
    sub.status,
    sub.respostas,
    sub.tentativas,
    sub.primeira_correcao_at,
    sub.comentario_professor,
    sub.created_at    AS submitted_at,
    sub.updated_at    AS last_updated,
    -- Informações da Aula
    a.id              AS lesson_id,       -- campo crítico para associar submissão à aula
    a.titulo          AS lesson_title,
    a.tipo            AS lesson_type,
    a.questionario,
    a.questionario_v2,
    a.questionario_v3,
    a.is_bloco_final,
    a.versao          AS lesson_versao,
    -- Informações do Livro/Módulo
    l.id              AS book_id,         -- campo crítico para associar ao módulo
    l.titulo          AS book_title,
    l.ordem           AS book_order,
    -- Informações do Aluno
    u.id              AS user_id,
    u.nome            AS student_name,
    u.email           AS student_email,
    u.nucleo_id       AS student_nucleo_id,
    u.ano_graduacao   AS student_graduation_year,
    -- Informações do Núcleo/Polo
    n.id              AS nucleus_id,
    n.nome            AS nucleus_name
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

-- Permissões
GRANT SELECT ON public.view_submissions_detailed TO authenticated;
GRANT SELECT ON public.view_submissions_detailed TO anon;

NOTIFY pgrst, 'reload schema';
