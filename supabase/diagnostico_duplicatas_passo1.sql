-- 1.1) Quantas linhas duplicadas em respostas_aulas (mesmo aluno_id + aula_id)
SELECT COUNT(*) AS linhas_extra
FROM (
  SELECT row_number() OVER (PARTITION BY aluno_id, aula_id ORDER BY id) AS rn
  FROM respostas_aulas
) d
WHERE d.rn > 1;

-- 1.2) Avaliações duplicadas como AULA (mesmo módulo + título + tipo + versão)
SELECT
  b.titulo AS modulo,
  a.titulo AS avaliacao,
  a.tipo,
  a.versao,
  COUNT(*) AS qtde
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao')
GROUP BY b.titulo, a.titulo, a.tipo, a.versao
HAVING COUNT(*) > 1
ORDER BY b.titulo, a.titulo;

-- 1.3) Todas as avaliações dos módulos citados (Cristologia, História da Igreja,
--      Teologia Prática, Hebreus) com nº de submissões em cada uma
SELECT
  b.titulo AS modulo,
  a.id::text AS aula_id,
  a.titulo AS avaliacao,
  a.tipo,
  a.versao,
  a.ordem,
  (SELECT COUNT(*) FROM respostas_aulas r WHERE r.aula_id = a.id) AS submissoes
FROM aulas a
JOIN livros b ON b.id = a.livro_id
WHERE a.tipo IN ('prova', 'avaliacao')
  AND (
       b.titulo ILIKE '%cristolog%'
    OR b.titulo ILIKE '%hist%'
    OR b.titulo ILIKE '%teologia pr%'
    OR b.titulo ILIKE '%hebreus%'
  )
ORDER BY b.titulo, a.titulo, a.versao;

-- 1.4) Detalhe das linhas duplicadas por aluno (quem aparece 2x)
SELECT
  u.nome AS aluno,
  b.titulo AS modulo,
  a.titulo AS avaliacao,
  a.versao,
  COUNT(*) AS linhas
FROM respostas_aulas r
JOIN aulas a ON a.id = r.aula_id
JOIN livros b ON b.id = a.livro_id
JOIN users u ON u.id = r.aluno_id
GROUP BY u.nome, b.titulo, a.titulo, a.versao, r.aluno_id, r.aula_id
HAVING COUNT(*) > 1
ORDER BY b.titulo, a.titulo;