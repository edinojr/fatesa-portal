SELECT '=== PASSO 1: Total de registros em respostas_aulas ===' as info;

SELECT 
  COUNT(*) as total_respostas,
  COUNT(DISTINCT aluno_id) as alunos_unicos,
  COUNT(DISTINCT aula_id) as aulas_unicas
FROM respostas_aulas;

SELECT '=== PASSO 2: Respostas com aula_id que NAO existe na tabela aulas (ORFAÃS) ===' as info;

SELECT 
  r.id,
  r.aluno_id,
  r.aula_id,
  r.nota,
  r.status,
  r.tentativas,
  r.created_at,
  r.updated_at,
  u.nome as aluno_nome,
  u.email as aluno_email
FROM respostas_aulas r
LEFT JOIN users u ON r.aluno_id = u.id
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
ORDER BY r.created_at DESC
LIMIT 50;

SELECT '=== PASSO 3: Respostas com aula_id que EXISTE na tabela aulas ===' as info;

SELECT 
  r.id,
  r.aluno_id,
  r.aula_id,
  r.nota,
  r.status,
  a.titulo as titulo_aula,
  a.tipo,
  a.livro_id,
  l.titulo as titulo_livro,
  u.nome as aluno_nome,
  r.created_at
FROM respostas_aulas r
JOIN aulas a ON r.aula_id = a.id
LEFT JOIN livros l ON a.livro_id = l.id
LEFT JOIN users u ON r.aluno_id = u.id
ORDER BY r.created_at DESC
LIMIT 50;

SELECT '=== PASSO 4: Quantidade de orfas vs validas ===' as info;

SELECT 
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as orfas,
  COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as com_aula_valida
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id;
