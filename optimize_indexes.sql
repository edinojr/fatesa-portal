-- Otimização de Índices para a Plataforma FATESA
-- Melhora a velocidade de buscas em tabelas que tendem a crescer com o tempo.

-- Índices para a tabela de usuários e seus vínculos
CREATE INDEX IF NOT EXISTS idx_users_nucleo_id ON public.users(nucleo_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo ON public.users(tipo);

-- Índices para a gestão de cursos e livros
CREATE INDEX IF NOT EXISTS idx_livros_curso_id ON public.livros(curso_id);
CREATE INDEX IF NOT EXISTS idx_aulas_livro_id ON public.aulas(livro_id);

-- Índices para o financeiro e documentos (reduz tempo de carregamento no Admin e Dashboard)
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON public.documentos(user_id);

-- Índices para o boletim e atividades
CREATE INDEX IF NOT EXISTS idx_atividades_nucleo_id ON public.atividades(nucleo_id);
CREATE INDEX IF NOT EXISTS idx_notas_aluno_id ON public.notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_atividade_id ON public.notas(atividade_id);

-- Comentário: Estes índices evitam que o banco precise escanear toda a tabela
-- para encontrar registros de um aluno específico ou de um núcleo específico.
