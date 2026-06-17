SELECT '=== PASSO 1: Aulas de avaliacao dos 4 modulos antigos ===' as info;

SELECT 
  a.id,
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
AND (a.tipo = 'avaliacao' OR a.titulo ILIKE '%avaliacao%' OR a.titulo ILIKE '%recuperação%')
ORDER BY l.titulo, a.titulo;

SELECT '=== PASSO 2: Respostas orfas com aluno_id e data (para mapear) ===' as info;

SELECT 
  r.aula_id as aula_id_antigo,
  r.aluno_id,
  r.nota,
  r.status,
  r.tentativas,
  r.created_at,
  u.nome as aluno
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
ORDER BY r.aluno_id, r.created_at;

SELECT '=== PASSO 3: Total de respostas orfas por aula_id antigo ===' as info;

SELECT 
  r.aula_id,
  COUNT(*) as total_alunos,
  MIN(r.created_at) as primeira,
  MAX(r.created_at) as ultima
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
GROUP BY r.aula_id
ORDER BY total_alunos DESC;
