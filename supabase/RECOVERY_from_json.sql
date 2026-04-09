-- ==========================================================
-- RECURSO DE EMERGÊNCIA: RECUPERAÇÃO DE NOTAS MANUAIS
-- ==========================================================
-- Este script extrai as marcações de correção feitas pelos professores
-- que estão salvas dentro do campo de respostas (JSON) e restaura
-- as notas e o status de 'corrigida'.

DO $$
DECLARE
    afetados integer;
BEGIN
    -- 1. Criar backup temporário das respostas se ainda não existir (segurança extra)
    CREATE TABLE IF NOT EXISTS public.respostas_aulas_emergency_backup AS 
    SELECT * FROM public.respostas_aulas;

    -- 2. Atualizar notas baseadas na contagem de acertos humanos salvos no JSON
    UPDATE public.respostas_aulas r
    SET 
        status = 'corrigida',
        nota = (
            SELECT 
                CASE 
                    WHEN jsonb_array_length(NULLIF(a.questionario, '[]'::jsonb)) > 0 
                    THEN ROUND(
                        (CAST((SELECT count(*) FROM jsonb_each(r.respostas) WHERE key LIKE '%_avaliacao' AND value::text = 'true') AS NUMERIC) / 
                         CAST(jsonb_array_length(NULLIF(a.questionario, '[]'::jsonb)) AS NUMERIC)
                        ) * 10, 
                    1)
                    ELSE 10
                END
            FROM public.aulas a 
            WHERE a.id = r.aula_id
        )
    WHERE 
        r.respostas::text LIKE '%_avaliacao%';

    GET DIAGNOSTICS afetados = ROW_COUNT;
    RAISE NOTICE 'Notas restauradas para % alunos que possuíam correção manual.', afetados;
END $$;

-- Verificação final: Mostrar os primeiros 10 restaurados
SELECT 
    id, 
    nota as nota_restaurada, 
    status,
    (SELECT count(*) FROM jsonb_each(respostas) WHERE key LIKE '%_avaliacao' AND value::text = 'true') as total_acertos_extraidos
FROM 
    public.respostas_aulas
WHERE 
    respostas::text LIKE '%_avaliacao%'
LIMIT 10;
