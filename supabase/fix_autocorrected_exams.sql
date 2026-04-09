-- ==========================================================
-- RETORNAR ATIVIDADES AUTO-CORRIGIDAS PARA O PROFESSOR
-- ==========================================================

-- Esta consulta identifica e reseta para 'pendente' todas as atividades que:
-- 1. Estão marcadas como 'corrigida'
-- 2. Não possuem comentário do professor (indicando que foram automáticas)

UPDATE public.respostas_aulas
SET 
    status = 'pendente',
    nota = 0, -- Resetamos a nota para o professor dar a nota real
    primeira_correcao_at = NULL
WHERE 
    status = 'corrigida' 
    AND (comentario_professor IS NULL OR comentario_professor = '');

-- Feedback para o usuário ver quantas foram afetadas (opcional no console)
-- SELECT count(*) FROM public.respostas_aulas WHERE status = 'pendente' AND comentario_professor IS NULL;
