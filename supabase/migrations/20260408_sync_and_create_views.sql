-- ==========================================================
-- SINCROIZAÇÃO GERAL E CRIAÇÃO DE VISÕES (REPARO TOTAL)
-- ==========================================================

-- 1. SINCRONIZAÇÃO TOTAL DE COLUNAS (Users)
-- Garante que o banco de dados tenha todas as colunas necessárias para o Portal V3
DO $$ 
BEGIN 
    -- Adicionar CPF se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cpf') THEN
        ALTER TABLE public.users ADD COLUMN cpf TEXT;
    END IF;

    -- Adicionar Telefone se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telefone') THEN
        ALTER TABLE public.users ADD COLUMN telefone TEXT;
    END IF;

    -- Adicionar Endereço se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'endereco') THEN
        ALTER TABLE public.users ADD COLUMN endereco TEXT;
    END IF;

    -- Adicionar nucleo_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nucleo_id') THEN
        ALTER TABLE public.users ADD COLUMN nucleo_id UUID REFERENCES public.nucleos(id);
    END IF;

    -- Adicionar ano_graduacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ano_graduacao') THEN
        ALTER TABLE public.users ADD COLUMN ano_graduacao TEXT;
    END IF;

    -- Adicionar curso_id e curso_opcao se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'curso_id') THEN
        ALTER TABLE public.users ADD COLUMN curso_id UUID REFERENCES public.cursos(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'curso_opcao') THEN
        ALTER TABLE public.users ADD COLUMN curso_opcao TEXT;
    END IF;

END $$;

-- 2. CRIAÇÃO DAS VISÕES RESILIENTES (Achatamento de Dados)

-- Visão de Submissões Detalhadas para o Painel do Professor
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

-- Visão de Perfis de Alunos Flat (Resiliente)
CREATE OR REPLACE VIEW public.view_student_profiles_flat AS
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
    -- Busca o curso mais recente via tabela de Marículas
    (SELECT c.nome FROM public.cursos c 
     JOIN public.matriculas m ON m.curso_id = c.id 
     WHERE m.aluno_id = u.id 
     ORDER BY m.created_at DESC LIMIT 1) AS course_name
FROM 
    public.users u
LEFT JOIN public.nucleos n ON u.nucleo_id = n.id;

-- 3. PERMISSÕES DE ACESSO
GRANT SELECT ON public.view_submissions_detailed TO authenticated;
GRANT SELECT ON public.view_student_profiles_flat TO authenticated;

-- Forçar recarga da API (Opcional)
NOTIFY pgrst, 'reload config';
