SELECT 
    a.id,
    a.titulo,
    a.tipo
FROM public.aulas a
WHERE a.tipo IN ('avaliacao', 'prova')
ORDER BY a.titulo;