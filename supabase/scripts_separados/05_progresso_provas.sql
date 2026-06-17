SELECT 
    p.id,
    p.aluno_id,
    p.aula_id,
    p.concluida,
    p.nota_questionario,
    p.updated_at
FROM public.progresso p
JOIN public.aulas a ON p.aula_id = a.id
WHERE a.tipo IN ('avaliacao', 'prova')
LIMIT 50;