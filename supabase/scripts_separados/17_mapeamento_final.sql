SELECT '=== AULAS ATUAIS DOS 4 MODULOS ===' as info;

SELECT 
  a.id as novo_id,
  a.titulo,
  a.tipo,
  l.titulo as livro
FROM aulas a
JOIN livros l ON a.livro_id = l.id
WHERE l.titulo IN (
  'Epístola aos Hebreus',
  'Doutrina do Espirito Santo.',
  'Epistolas Paulinas I',
  'Teologia Prática'
)
AND a.tipo = 'avaliacao'
ORDER BY l.titulo, a.titulo;

SELECT '=== IDs ANTIGOS ORFÃOS (para mapear) ===' as info;

SELECT 
  r.aula_id as id_antigo,
  COUNT(*) as total_alunos,
  MIN(r.created_at) as primeira_data,
  MAX(r.created_at) as ultima_data,
  ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
GROUP BY r.aula_id
ORDER BY total_alunos DESC;
