SELECT 
    r.id,
    r.aluno_id,
    r.aula_id,
    r.nota,
    r.status,
    r.created_at,
    r.updated_at
FROM public.respostas_aulas r
ORDER BY r.updated_at DESC
LIMIT 50;