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
AND a.tipo = 'atividade'
ORDER BY l.titulo, a.titulo;
