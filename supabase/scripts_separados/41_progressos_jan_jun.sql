SELECT
  p.id,
  p.aluno_id,
  u.nome AS aluno_nome,
  u.email AS aluno_email,
  p.aula_id,
  a.titulo AS aula_titulo,
  l.titulo AS modulo_titulo,
  c.nome AS curso_nome,
  p.concluida,
  p.nota_questionario,
  p.updated_at AS data_progresso
FROM public.progresso p
JOIN public.users u ON u.id = p.aluno_id
JOIN public.aulas a ON a.id = p.aula_id
LEFT JOIN public.livros l ON l.id = a.livro_id
LEFT JOIN public.cursos c ON c.id = l.curso_id
WHERE p.updated_at >= '2026-01-01'::timestamp
  AND p.updated_at < '2026-07-01'::timestamp
ORDER BY p.updated_at DESC;
