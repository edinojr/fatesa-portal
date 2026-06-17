SELECT 
    (SELECT COUNT(*) FROM public.respostas_aulas) as total_respostas,
    (SELECT COUNT(*) FROM public.progresso) as total_progresso,
    (SELECT COUNT(*) FROM public.aulas WHERE tipo IN ('avaliacao', 'prova')) as total_provas_criadas,
    (SELECT COUNT(*) FROM public.users WHERE tipo = 'aluno') as total_alunos;