SELECT 
    r.id,
    r.aluno_id,
    u.nome as nome_aluno,
    r.aula_id,
    a.titulo as titulo_aula,
    a.tipo,
    r.nota,
    r.status,
    r.respostas,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
LEFT JOIN public.users u ON r.aluno_id = u.id
LEFT JOIN public.aulas a ON r.aula_id = a.id
WHERE r.created_at < '2026-06-01'
ORDER BY r.created_at DESC;