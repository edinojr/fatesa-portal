-- Migration: Clear all evaluations from modules
-- Date: 2026-06-08

-- Delete student responses to lesson questionnaires
DELETE FROM public.respostas_aulas;

-- Delete student responses to extra activity questionnaires
DELETE FROM public.respostas_atividades_extra;

-- Delete book/module final exam attempts
DELETE FROM public.tentativas_prova;

-- Delete grades from the 'notas' table
DELETE FROM public.notas;

-- Reset questionnaire grades in the progress table
UPDATE public.progresso SET nota_questionario = NULL;
