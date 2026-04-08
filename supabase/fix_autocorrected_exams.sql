-- SCRIPT PARA REDIRECIONAR PROVAS AUTO-CORRIGIDAS PARA OS PROFESSORES
-- Este script identifica provas (is_bloco_final ou tipo 'prova') que foram marcadas como 'corrigida'
-- mas não possuem evidência de correção manual (comentário ou data de primeira correção).

UPDATE public.respostas_aulas ra
SET 
  status = 'pendente',
  nota = 0, -- Resetamos a nota para garantir que o professor atribua a nota correta
  updated_at = now()
FROM public.aulas a
WHERE ra.aula_id = a.id
  AND (a.is_bloco_final = true OR a.tipo = 'prova')
  AND ra.status = 'corrigida'
  AND (ra.comentario_professor IS NULL OR ra.comentario_professor = '')
  AND ra.primeira_correcao_at IS NULL;

-- Log de quantas linhas foram afetadas (opcional, dependendo do ambiente)
-- SELECT count(*) FROM public.respostas_aulas ra JOIN public.aulas a ON ra.aula_id = a.id WHERE ... (mesmos filtros)
