SELECT '=== Respostas orfas por aluno (top 20) ===' as info;

SELECT 
  u.nome,
  u.email,
  COUNT(*) as total_respostas_orfas,
  MIN(r.created_at) as primeira,
  MAX(r.created_at) as ultima
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
GROUP BY u.nome, u.email
ORDER BY total_respostas_orfas DESC
LIMIT 20;

SELECT '=== Amostra de 30 respostas orfas com detalhes ===' as info;

SELECT 
  r.aula_id as aula_id_antigo,
  r.nota,
  r.status,
  r.tentativas,
  r.respostas,
  r.created_at,
  u.nome as aluno,
  r.aluno_id
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
ORDER BY u.nome, r.created_at
LIMIT 30;

SELECT '=== Aulas atuais disponiveis (para mapear) ===' as info;

SELECT 
  a.id as novo_id,
  a.titulo,
  a.tipo,
  a.versao,
  l.titulo as livro,
  a.created_at
FROM aulas a
LEFT JOIN livros l ON a.livro_id = l.id
ORDER BY l.titulo, a.versao, a.titulo;

SELECT '=== Progresso tambem com IDs orfos? ===' as info;

SELECT 
  COUNT(*) as total_progresso,
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as progresso_orfas,
  COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as progresso_valido
FROM progresso p
LEFT JOIN aulas a ON p.aula_id = a.id;
