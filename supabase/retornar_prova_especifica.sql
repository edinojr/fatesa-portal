-- ==========================================================
-- SCRIPT PARA RETORNAR UMA PROVA ESPECÍFICA PARA CORREÇÃO
-- ==========================================================

-- 1. Primeiro, se você quiser apenas listar as provas recentes que foram corrigidas para identificar o ID do aluno:
/*
SELECT r.id as resposta_id, u.nome as nome_aluno, u.email as email_aluno, a.titulo as aula_titulo, r.status, r.nota
FROM public.respostas_aulas r
JOIN public.users u ON r.aluno_id = u.id
JOIN public.aulas a ON r.aula_id = a.id
WHERE r.status = 'corrigida'
ORDER BY r.updated_at DESC
LIMIT 10;
*/

-- 2. Para retornar a prova de um aluno específico para 'pendente', 
-- substitua 'NOME_DO_ALUNO' pelo nome (ou parte do nome) do aluno abaixo:

UPDATE public.respostas_aulas
SET 
    status = 'pendente',
    nota = 0,
    primeira_correcao_at = NULL,
    comentario_professor = NULL
WHERE 
    aluno_id IN (SELECT id FROM public.users WHERE nome ILIKE '%NOME_DO_ALUNO%' OR email ILIKE '%EMAIL_DO_ALUNO%')
    AND status = 'corrigida';

-- Nota: Este script fará com que a prova selecionada volte a aparecer 
-- na aba "Pendente" do painel de correção do professor.
