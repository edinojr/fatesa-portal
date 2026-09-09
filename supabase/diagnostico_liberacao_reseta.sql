-- ============================================================================
-- DIAGNÓSTICO: conteúdo liberado por núcleo "reseta" ao atualizar a página
-- do professor. Use este script no SQL Editor do Supabase (Dashboard → SQL).
-- Execute e me envie a saída (ou um resumo) para eu confirmar se é só UI
-- (painel do professor) ou um erro sistêmico (que afeta o aluno).
-- ============================================================================

-- 1) Persistência das liberações por núcleo
-- Se aparecerem linhas aqui, a liberação ESTÁ salva no banco (o "reset" é só visual).
-- Se NÃO aparecerem as linhas que você liberou, há um problema sistêmico de escrita/RLS.
SELECT 'LIBERACOES_NUCLEO (filtrar pelo seu polo)' AS etapa;
SELECT id, nucleo_id, item_id, item_type, liberado, created_at
FROM public.liberacoes_nucleo
WHERE liberado = true
ORDER BY created_at DESC
LIMIT 200;

-- 2) Estado global dos módulos (livros.professor_active)
SELECT id, ordem, titulo, professor_active
FROM public.livros
ORDER BY ordem;

-- 3) Estado das aulas de um módulo específico (troque o filtro pelo título real)
SELECT l.titulo AS modulo, a.id, a.titulo, a.tipo, a.ordem, a.professor_active
FROM public.aulas a
JOIN public.livros l ON l.id = a.livro_id
WHERE l.titulo ILIKE '%SEU_MODULO%'
ORDER BY a.ordem;

-- 4) RLS ativa na tabela liberacoes_nucleo (ver se o professor consegue LER)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'liberacoes_nucleo';

-- 5) RLS ativa em livros e aulas (leitura)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('livros', 'aulas')
ORDER BY tablename, cmd;
