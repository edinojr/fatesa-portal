-- ==========================================================
-- RETORNAR AVALIAÇÕES AUTO-CORRIGIDAS PARA REVISÃO DO PROFESSOR
-- ==========================================================
-- Esta query identifica avaliações (tipo 'avaliacao') que foram
-- salvas automaticamente como 'corrigida' sem comentário do professor,
-- e as retorna para 'pendente' para que os professores revisem.

UPDATE public.respostas_aulas
SET 
    status = 'pendente',
    primeira_correcao_at = NULL
WHERE 
    aula_id IN (
        SELECT id FROM public.aulas WHERE tipo = 'avaliacao'
    )
    AND status = 'corrigida'
    AND (comentario_professor IS NULL OR comentario_professor = '');

-- Verificar quantas foram afetadas
SELECT COUNT(*) AS registros_afetados FROM public.respostas_aulas
WHERE 
    aula_id IN (
        SELECT id FROM public.aulas WHERE tipo = 'avaliacao'
    )
    AND status = 'pendente'
    AND (comentario_professor IS NULL OR comentario_professor = '');
