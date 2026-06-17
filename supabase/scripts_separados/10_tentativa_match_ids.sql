SELECT '=== PASSO 5: Todas as aulas atuais (para comparar) ===' as info;

SELECT 
  a.id,
  a.titulo,
  a.tipo,
  a.versao,
  a.livro_id,
  l.titulo as livro_titulo,
  a.created_at
FROM aulas a
LEFT JOIN livros l ON a.livro_id = l.id
ORDER BY a.created_at ASC;

SELECT '=== PASSO 6: Respostas orfas agrupadas por titulo (tentativa de match) ===' as info;

SELECT 
  r.aula_id as aula_id_antigo,
  r.nota,
  r.status,
  r.tentativas,
  r.created_at,
  u.nome as aluno_nome
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
LEFT JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
ORDER BY u.nome, r.created_at;

SELECT '=== PASSO 7: Verificar se existe tabela de historico_notas ===' as info;

SELECT 
  hn.*,
  u.nome as aluno_nome
FROM historico_notas hn
LEFT JOIN users u ON hn.aluno_id = u.id
ORDER BY hn.created_at DESC
LIMIT 30;
