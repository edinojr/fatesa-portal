-- ==============================================================================
-- FATESA: CORREÇÃO DE VERSÕES E NOMENCLATURA DAS AVALIAÇÕES (SQL PURO)
-- ==============================================================================
-- Esta versão NÃO utiliza blocos "DO $$" nem comandos "IF / END IF",
-- garantindo que execute com 100% de sucesso em qualquer editor SQL (inclusive Supabase).
-- Regras Acadêmicas Oficiais:
-- V1: Avaliação
-- V2: Avaliação Recuperação
-- V3: Avaliação Recuperação 2
-- ==============================================================================

WITH ranked_avaliacoes AS (
  SELECT 
    a.id,
    a.livro_id,
    a.titulo,
    b.titulo AS livro_titulo,
    LEAST(
      3,
      ROW_NUMBER() OVER (
        PARTITION BY a.livro_id 
        ORDER BY 
          (CASE 
            WHEN a.titulo ILIKE '%recupera%2%' OR a.titulo ILIKE '%v3%' OR a.versao = 3 THEN 3
            WHEN a.titulo ILIKE '%recupera%' OR a.titulo ILIKE '%v2%' OR a.versao = 2 THEN 2
            WHEN a.titulo ILIKE '%v1%' OR a.versao = 1 THEN 1
            ELSE 1
          END) ASC,
          COALESCE(a.ordem, 999) ASC,
          a.created_at ASC
      )
    )::INT AS nova_versao,
    trim(regexp_replace(
      regexp_replace(
        COALESCE(b.titulo, a.titulo, 'Avaliação'),
        '\s*-\s*V[1-3]:?\s*Avaliação.*$', '', 'i'
      ),
      '\s*-\s*Recuperação.*$', '', 'i'
    )) AS titulo_base
  FROM aulas a
  JOIN livros b ON b.id = a.livro_id
  WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
)
UPDATE aulas a
SET 
  versao = r.nova_versao,
  titulo = r.titulo_base || ' - ' || (
    CASE r.nova_versao
      WHEN 1 THEN 'V1: Avaliação'
      WHEN 2 THEN 'V2: Avaliação Recuperação'
      ELSE 'V3: Avaliação Recuperação 2'
    END
  )
FROM ranked_avaliacoes r
WHERE a.id = r.id;

-- ==============================================================================
-- VERIFICAÇÃO FINAL: EXIBE TODAS AS AVALIAÇÕES ATUALIZADAS
-- ==============================================================================
SELECT 
  b.titulo AS modulo,
  a.versao,
  a.titulo AS avaliacao_titulo,
  a.tipo,
  a.is_bloco_final
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
ORDER BY b.titulo, a.versao ASC;
