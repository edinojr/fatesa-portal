-- =====================================================
-- CORREÇÃO: Liberar Avaliações Bloqueadas Incorretamente
-- =====================================================
-- Problema Identificado:
-- 1. Linha 185-191: Se versao > 1, libera automaticamente SEM verificar se passou na versão anterior
-- 2. Lógica de V2/V3 (linha 259-322) só executa se !isStaff, mas isReleased já foi definido
-- 3. Bloqueio hierárquico V1 -> V2 -> V3 não está funcionando

-- SOLUÇÃO:
-- 1. Corrigir a lógica de liberação para respeitar a hierarquia
-- 2. Atualizar registros que estão bloqueados incorretamente

-- Passo 1: Verificar o estado atual das avaliações
SELECT 
    a.id as aula_id,
    a.titulo,
    a.versao,
    a.tipo,
    r.aluno_id,
    r.nota,
    r.status,
    u.nome as aluno_nome
FROM public.aulas a
JOIN public.respostas_aulas r ON r.aula_id = a.id
JOIN public.users u ON u.id = r.aluno_id
WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true
ORDER BY a.versao, r.aluno_id;

-- Passo 2: Liberar avaliações que foram bloqueadas por erro de lógica
-- Esta query libera avaliações V2/V3 cujo aluno passou na versão anterior
WITH provas_por_livro AS (
    SELECT 
        a.livro_id,
        a.id as aula_id,
        a.versao,
        r.nota,
        r.status,
        r.aluno_id
    FROM public.aulas a
    JOIN public.respostas_aulas r ON r.aula_id = a.id
    WHERE a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true
),
alunos_aprovados AS (
    SELECT DISTINCT livro_id, aluno_id
    FROM provas_por_livro
    WHERE status = 'corrigida' AND nota >= 7.0
)
UPDATE public.liberacoes_nucleo ln
SET liberado = true,
    updated_at = now()
WHERE EXISTS (
    SELECT 1 FROM alunos_aprovados aa
    WHERE aa.livro_id = ln.item_id
    AND aa.aluno_id IN (
        SELECT aluno_id FROM progresso WHERE aula_id IN (
            SELECT id FROM aulas WHERE livro_id = ln.item_id
        ) LIMIT 1
    )
);

-- Passo 3: Verificar se faltam políticas RLS para liberacoes_nucleo
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'liberacoes_nucleo';

-- Passo 4: Garantir que a tabela de exceções existe e tem permissão
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename = 'liberacoes_excecao_atividade';

-- Passo 5: Criar política de leitura pública para liberacoes_nucleo se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'liberacoes_nucleo' AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "Public can read releases" ON public.liberacoes_nucleo
        FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Passo 6: Verificar permissões de acesso por núcleo
SELECT 
    u.id as user_id,
    u.nome,
    u.tipo,
    u.nucleo_id,
    COUNT(ln.id) as liberacoes_count
FROM public.users u
LEFT JOIN public.liberacoes_nucleo ln ON ln.nucleo_id = u.nucleo_id
GROUP BY u.id, u.nome, u.tipo, u.nucleo_id
ORDER BY u.tipo, u.nome;