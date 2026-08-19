-- =====================================================
-- FIX: Limpar conteudo HTML legado em lições que agora têm PDF
-- =====================================================
-- Causa: ao substituir lições HTML por PDFs, o campo 'conteudo'
-- (JSONB com blocos HTML) não foi limpo, fazendo o PDF sobrepor
-- o conteúdo HTML antigo na visualização.
-- Esta migration limpa o 'conteudo' de todas as aulas que têm PDF.
-- =====================================================

-- 1. Limpar 'conteudo' em aulas que têm arquivo_url apontando para PDF
UPDATE public.aulas
SET conteudo = NULL
WHERE arquivo_url IS NOT NULL
  AND arquivo_url ~* '\.pdf(\?|$)'
  AND conteudo IS NOT NULL;

-- 2. Limpar 'conteudo' em aulas que têm pdf_url (campo alternativo)
UPDATE public.aulas
SET conteudo = NULL
WHERE pdf_url IS NOT NULL
  AND pdf_url ~* '\.pdf(\?|$)'
  AND conteudo IS NOT NULL;

-- 3. Relatório: verificar se ainda há duplicação (deve retornar 0 linhas)
SELECT 'Aulas com PDF E conteudo HTML (deve ser 0)' AS check_nome,
       COUNT(*) AS total
FROM public.aulas
WHERE (
  (arquivo_url ~* '\.pdf(\?|$)') OR
  (pdf_url ~* '\.pdf(\?|$)')
) AND conteudo IS NOT NULL;

NOTIFY pgrst, 'reload schema';
