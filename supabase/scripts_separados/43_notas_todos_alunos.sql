-- Script 43: Notas de todos os alunos - Avaliações V1, V2 e V3
-- Mostra APENAS provas/avaliações, sem questionários ou exercícios

SELECT
  u.nome AS aluno,
  u.email,
  c.nome AS curso,
  l.titulo AS modulo,
  l.ordem AS modulo_ordem,
  a.titulo AS avaliacao,
  a.versao,
  a.min_grade,
  ra.status,
  ra.nota,
  ra.tentativas,
  CASE
    WHEN ra.status = 'corrigida' AND ra.nota >= a.min_grade THEN 'APROVADO'
    WHEN ra.status = 'corrigida' AND ra.nota < a.min_grade THEN 'REPROVADO'
    ELSE 'PENDENTE'
  END AS situacao,
  ra.created_at AS data_submissao
FROM public.respostas_aulas ra
JOIN public.aulas a ON a.id = ra.aula_id
JOIN public.livros l ON l.id = a.livro_id
JOIN public.cursos c ON c.id = l.curso_id
JOIN public.users u ON u.id = ra.aluno_id
WHERE a.tipo IN ('prova', 'avaliacao')
   OR a.is_bloco_final = true
ORDER BY c.nome, l.ordem, u.nome, a.versao, ra.created_at DESC;
