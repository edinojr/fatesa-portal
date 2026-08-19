-- =====================================================
-- AUDITORIA E PADRONIZAÇÃO DA TABELA aulas
-- Rode no SQL Editor do Supabase e cole a saída aqui.
-- =====================================================

-- ═══════════════════════════════════════════════════════
-- PARTE 1: DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════

-- 1.1) Total de aulas por tipo
SELECT '1.1 TOTAL POR TIPO' AS etapa, tipo, COUNT(*) AS total
FROM public.aulas
GROUP BY tipo
ORDER BY total DESC;

-- 1.2) Aulas com livro_id NULL (órfãs)
SELECT '1.2 ORFAS (livro_id NULL)' AS etapa, id, titulo, tipo, ordem
FROM public.aulas
WHERE livro_id IS NULL
ORDER BY created_at DESC;

-- 1.3) Aulas sem tipo ou tipo fora do padrão
SELECT '1.3 TIPO FORA DO PADRAO' AS etapa, id, titulo, tipo::text AS tipo, ordem
FROM public.aulas
WHERE tipo IS NULL
   OR tipo::text NOT IN ('licao','material','atividade','exercicio','prova','avaliacao','gravada','ao_vivo','aula_video')
ORDER BY tipo, ordem;

-- 1.4) Aulas com ordem NULL
SELECT '1.4 ORDEM NULL' AS etapa, id, titulo, tipo, livro_id
FROM public.aulas
WHERE ordem IS NULL
ORDER BY titulo;

-- 1.5) Lições/materiais sem arquivo_url, pdf_url ou conteudo (sem conteúdo)
SELECT '1.5 SEM CONTEUDO' AS etapa,
       a.id, a.titulo, a.tipo, a.ordem,
       l.titulo AS livro
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.tipo IN ('licao','material')
  AND (a.arquivo_url IS NULL OR a.arquivo_url = '')
  AND (a.pdf_url IS NULL OR a.pdf_url = '')
  AND (a.conteudo IS NULL OR a.conteudo = '[]'::jsonb)
ORDER BY l.titulo, a.ordem;

-- 1.6) URLs sem /public/ (causa erro 400)
SELECT '1.6 URL SEM /public/' AS etapa,
       id, titulo, tipo,
       LEFT(arquivo_url, 120) AS url_preview
FROM public.aulas
WHERE arquivo_url LIKE '%/storage/v1/object/livros/%'
  AND arquivo_url NOT LIKE '%/storage/v1/object/public/livros/%'
ORDER BY titulo;

-- 1.7) pdf_url sem /public/
SELECT '1.7 PDF URL SEM /public/' AS etapa,
       id, titulo,
       LEFT(pdf_url, 120) AS url_preview
FROM public.aulas
WHERE pdf_url LIKE '%/storage/v1/object/livros/%'
  AND pdf_url NOT LIKE '%/storage/v1/object/public/livros/%';

-- 1.8) Duplicatas de ordem dentro do mesmo livro+tipo
SELECT '1.8 DUPLICATAS DE ORDEM' AS etapa,
       a.livro_id, l.titulo AS livro, a.tipo, a.ordem,
       COUNT(*) AS duplicatas,
       string_agg(a.titulo, ' | ') AS titulos
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.ordem IS NOT NULL
GROUP BY a.livro_id, l.titulo, a.tipo, a.ordem
HAVING COUNT(*) > 1
ORDER BY l.titulo, a.tipo, a.ordem;

-- 1.9) Resumo geral
SELECT '1.9 RESUMO' AS etapa,
       COUNT(*) AS total_aulas,
       COUNT(*) FILTER (WHERE arquivo_url IS NOT NULL) AS com_arquivo,
       COUNT(*) FILTER (WHERE pdf_url IS NOT NULL) AS com_pdf,
       COUNT(*) FILTER (WHERE conteudo IS NOT NULL AND conteudo <> '[]'::jsonb) AS com_blocos,
       COUNT(*) FILTER (WHERE arquivo_url LIKE '%/storage/v1/object/livros/%' AND arquivo_url NOT LIKE '%/storage/v1/object/public/livros/%') AS urls_para_corrigir
FROM public.aulas;

-- ═══════════════════════════════════════════════════════
-- PARTE 2: CORREÇÕES AUTOMÁTICAS
-- ═══════════════════════════════════════════════════════

-- 2.1) Corrigir arquivo_url: adicionar /public/
UPDATE public.aulas
SET arquivo_url = REPLACE(arquivo_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE arquivo_url LIKE '%/storage/v1/object/livros/%'
  AND arquivo_url NOT LIKE '%/storage/v1/object/public/livros/%';

-- 2.2) Corrigir pdf_url: adicionar /public/
UPDATE public.aulas
SET pdf_url = REPLACE(pdf_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE pdf_url LIKE '%/storage/v1/object/livros/%'
  AND pdf_url NOT LIKE '%/storage/v1/object/public/livros/%';

-- 2.3) Corrigir capa_url em livros: adicionar /public/
UPDATE public.livros
SET capa_url = REPLACE(capa_url, '/storage/v1/object/livros/', '/storage/v1/object/public/livros/')
WHERE capa_url LIKE '%/storage/v1/object/livros/%'
  AND capa_url NOT LIKE '%/storage/v1/object/public/livros/%';

-- 2.4) Normalizar tipos (enum aula_tipo: gravada|ao_vivo|licao|material|atividade|prova|exercicio|avaliacao)
UPDATE public.aulas SET tipo = 'licao' WHERE tipo::text NOT IN ('gravada','ao_vivo','licao','material','atividade','prova','exercicio','avaliacao') AND tipo IS NOT NULL;

-- 2.5) Definir ordem=1 para aulas com ordem NULL (evita erro de ordenação)
UPDATE public.aulas
SET ordem = 1
WHERE ordem IS NULL;

-- 2.6) Garantir que toda lição tem livro_id (remover órfãs sem livro)
DELETE FROM public.aulas WHERE livro_id IS NULL;

-- ═══════════════════════════════════════════════════════
-- PARTE 3: VERIFICAÇÃO PÓS-CORREÇÃO
-- ═══════════════════════════════════════════════════════

SELECT '3.1 RESUMO POS-FIX' AS etapa,
       COUNT(*) AS total_aulas,
       COUNT(*) FILTER (WHERE arquivo_url LIKE '%/storage/v1/object/livros/%' AND arquivo_url NOT LIKE '%/storage/v1/object/public/livros/%') AS urls_ainda_erradas,
       COUNT(*) FILTER (WHERE livro_id IS NULL) AS ainda_orfas,
       COUNT(*) FILTER (WHERE ordem IS NULL) AS ainda_sem_ordem,
       COUNT(*) FILTER (WHERE tipo IS NULL) AS ainda_sem_tipo
FROM public.aulas;

SELECT '3.2 TIPOS POS-FIX' AS etapa, tipo::text AS tipo, COUNT(*) AS total
FROM public.aulas
GROUP BY tipo
ORDER BY total DESC;

NOTIFY pgrst, 'reload schema';