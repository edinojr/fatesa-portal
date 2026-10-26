-- ==============================================================================
-- FATESA: CORREÇÃO DE VERSÕES E NOMENCLATURA DAS AVALIAÇÕES (V1, V2, V3)
-- ==============================================================================
-- Regras Acadêmicas Oficiais:
-- V1: Avaliação
-- V2: Avaliação Recuperação
-- V3: Avaliação Recuperação 2
-- Hierarquia: Somente 1 tentativa por avaliação. Se passar na V1 (1ª tentativa),
-- não precisa refazer a avaliação nem realizar recuperação.
-- ==============================================================================

DO $$
DECLARE
  rec RECORD;
  current_livro_id UUID := NULL;
  current_v INT := 1;
  base_title TEXT;
  clean_title TEXT;
  target_label TEXT;
BEGIN
  -- Percorre todas as avaliações agrupadas por módulo (livro_id)
  FOR rec IN
    SELECT 
      a.id,
      a.livro_id,
      a.titulo,
      a.tipo,
      a.versao,
      a.ordem,
      a.created_at,
      b.titulo AS livro_titulo,
      ROW_NUMBER() OVER (
        PARTITION BY a.livro_id 
        ORDER BY 
          -- Prioridade de versão detectada
          (CASE 
            WHEN a.titulo ILIKE '%recupera%2%' OR a.titulo ILIKE '%v3%' OR a.versao = 3 THEN 3
            WHEN a.titulo ILIKE '%recupera%' OR a.titulo ILIKE '%v2%' OR a.versao = 2 THEN 2
            WHEN a.titulo ILIKE '%v1%' OR a.versao = 1 THEN 1
            ELSE 1
          END) ASC,
          COALESCE(a.ordem, 999) ASC,
          a.created_at ASC
      ) AS rank_in_module
    FROM aulas a
    JOIN livros b ON b.id = a.livro_id
    WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = TRUE
    ORDER BY a.livro_id, rank_in_module ASC
  LOOP
    current_v := rec.rank_in_module;
    IF current_v > 3 THEN
      current_v := 3;
    END IF;

    -- Extrai o título base do módulo sem sufixos anteriores
    base_title := regexp_replace(
      COALESCE(rec.livro_titulo, rec.titulo, 'Avaliação'), 
      '\s*-\s*V[1-3]:?\s*Avaliação.*$', '', 'i'
    );
    base_title := regexp_replace(base_title, '\s*-\s*Recuperação.*$', '', 'i');
    base_title := trim(base_title);

    IF current_v = 1 THEN
      target_label := 'V1: Avaliação';
    ELSIF current_v = 2 THEN
      target_label := 'V2: Avaliação Recuperação';
    ELSE
      target_label := 'V3: Avaliação Recuperação 2';
    END IF;

    clean_title := base_title || ' - ' || target_label;

    UPDATE aulas
    SET versao = current_v,
        titulo = clean_title
    WHERE id = rec.id;

    RAISE NOTICE 'Aula ID % (%) atualizada para versão % com título "%"', rec.id, rec.livro_titulo, current_v, clean_title;
  END LOOP;
END $$;

-- Verificação das versões após atualização
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
