SELECT 
  a.id,
  a.titulo,
  a.tipo,
  a.versao,
  l.titulo as livro
FROM aulas a
LEFT JOIN livros l ON a.livro_id = l.id
ORDER BY l.titulo, a.versao, a.titulo;
