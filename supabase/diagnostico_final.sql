-- =====================================================
-- DIAGNÓSTICO: Por que módulos não aparecem como finalizados
-- =====================================================

-- 1) USUÁRIO LOGADO
SELECT 'USUARIO' AS etapa, id, email, tipo FROM public.users WHERE id = auth.uid();

-- 2) HISTÓRICO DE NOTAS (todos registros)
SELECT 'HISTORICO' AS etapa,
       modulo_nome, nota, curso_nome, data_conclusao
FROM public.historico_notas
WHERE aluno_id = auth.uid()
ORDER BY data_conclusao DESC;

-- 3) LIVROS cadastrados
SELECT 'LIVROS' AS etapa, id, titulo, curso_id FROM public.livros ORDER BY titulo;

-- 4) RESPOSTAS_AULAS (submissões)
SELECT 'RESPOSTAS' AS etapa,
       aula_id, nota, status,
       (SELECT titulo FROM public.aulas WHERE id = ra.aula_id) AS aula,
       (SELECT l.titulo FROM public.aulas a JOIN public.livros l ON a.livro_id = l.id WHERE a.id = ra.aula_id) AS livro
FROM public.respostas_aulas ra
WHERE ra.aluno_id = auth.uid()
ORDER BY ra.created_at DESC;