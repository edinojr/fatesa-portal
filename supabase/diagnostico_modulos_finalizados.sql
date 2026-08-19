-- =====================================================
-- DIAGNÓSTICO: Por que módulos finalizados não aparecem?
-- =====================================================

-- 1) Criar a tabela ausente exclusoes_modulo_aluno (estava dando 404)
CREATE TABLE IF NOT EXISTS public.exclusoes_modulo_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  livro_id UUID REFERENCES public.livros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, livro_id)
);
ALTER TABLE public.exclusoes_modulo_aluno ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_self_exclusions" ON public.exclusoes_modulo_aluno;
CREATE POLICY "user_self_exclusions" ON public.exclusoes_modulo_aluno
  FOR SELECT USING (auth.uid() = user_id);

-- 2) Verifica o seu usuário
SELECT 'USUARIO' AS etapa, id, email, tipo FROM public.users WHERE id = auth.uid();

-- 3) Verifica TODOS os registros do seu histórico de notas
SELECT 'HISTORICO NOTAS' AS etapa,
       id, modulo_nome, nota, curso_nome, data_conclusao
FROM public.historico_notas
WHERE aluno_id = auth.uid()
ORDER BY data_conclusao DESC;

-- 4) Verifica TODOS os módulos (livros) com seus títulos exatos
SELECT 'LIVROS' AS etapa, id, titulo, curso_id
FROM public.livros
ORDER BY titulo;

-- 5) Cruzamento: quais históricos NÃO bateram com nenhum livro?
SELECT 'NAO_BATEU' AS etapa,
       h.modulo_nome,
       h.nota,
       (SELECT string_agg(l.titulo, ' || ') FROM public.livros l) AS todos_titulos
FROM public.historico_notas h
WHERE h.aluno_id = auth.uid()
  AND h.nota >= 7
  AND NOT EXISTS (
    SELECT 1 FROM public.livros l
    WHERE lower(unaccent(l.titulo)) = lower(unaccent(h.modulo_nome))
       OR lower(unaccent(replace(l.titulo, '.', ''))) = lower(unaccent(replace(h.modulo_nome, '.', '')))
  );

-- 6) Verifica submissões de provas
SELECT 'SUBMISSOES' AS etapa,
       ra.aula_id, ra.nota, ra.status,
       a.titulo AS aula_titulo, a.tipo,
       l.titulo AS livro_titulo
FROM public.respostas_aulas ra
JOIN public.aulas a ON ra.aula_id = a.id
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE ra.aluno_id = auth.uid()
ORDER BY ra.created_at DESC;