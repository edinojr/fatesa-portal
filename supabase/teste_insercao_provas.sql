-- =====================================================
-- TESTE DE INSERÇÃO: Simular o que o frontend faz
-- Execute este script LOGADO COMO UM ALUNO no Supabase
-- =====================================================

-- PASSO 1: Verificar seu usuário atual
SELECT auth.uid() as meu_user_id, 
       (SELECT tipo FROM public.users WHERE id = auth.uid()) as meu_tipo;

-- PASSO 2: Listar provas disponíveis para você
SELECT 
    a.id,
    a.titulo,
    a.tipo,
    l.titulo as livro
FROM public.aulas a
LEFT JOIN public.livros l ON a.livro_id = l.id
WHERE a.tipo IN ('avaliacao', 'prova')
LIMIT 10;

-- PASSO 3: Verificar se você já tem respostas salvas
SELECT 
    r.*,
    a.titulo as titulo_aula
FROM public.respostas_aulas r
LEFT JOIN public.aulas a ON r.aula_id = a.id
WHERE r.aluno_id = auth.uid();

-- PASSO 4: TESTE DE INSERÇÃO (descomente para testar)
-- ATENÇÃO: Isso vai inserir um registro de teste!
-- Descomente as linhas abaixo para testar

/*
INSERT INTO public.respostas_aulas (
    aluno_id,
    aula_id,
    respostas,
    nota,
    status,
    tentativas
) VALUES (
    auth.uid(),
    (SELECT id FROM public.aulas WHERE tipo IN ('avaliacao', 'prova') LIMIT 1),
    '{"q1": "resposta teste", "q2": "resposta teste 2"}'::jsonb,
    8.5,
    'corrigida',
    1
)
ON CONFLICT (aluno_id, aula_id) 
DO UPDATE SET 
    respostas = EXCLUDED.respostas,
    nota = EXCLUDED.nota,
    status = EXCLUDED.status,
    tentativas = EXCLUDED.tentativas,
    updated_at = now();
*/

-- PASSO 5: Verificar se a inserção funcionou
-- SELECT COUNT(*) as total_apos_teste FROM public.respostas_aulas WHERE aluno_id = auth.uid();

-- =====================================================
-- SE DER ERRO:
-- =====================================================
-- 1. "new row violates row-level security policy"
--    => RLS está bloqueando. Execute a migração 20260616_fix_respostas_rls_final.sql
--
-- 2. "duplicate key value violates unique constraint"
--    => Já existe registro para essa aula. Use ON CONFLICT (já está no código acima)
--
-- 3. "null value in column violates not-null constraint"
--    => Falta algum campo obrigatório (aluno_id ou aula_id)
--
-- 4. "value for check constraint is out of range"
--    => Status inválido. Use: 'pendente', 'corrigida', 'concluido', 'reprovado', 'liberado'
