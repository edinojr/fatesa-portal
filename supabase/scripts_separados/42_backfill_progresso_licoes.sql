-- Script 42: Backfill progresso para aulas do tipo 'licao' onde o aluno
-- já respondeu exercícios (respostas_aulas existe) mas não tem progresso registrado.
--
-- Isso resolve o problema de progresso "só dos últimos 7 dias": antes da
-- adição do botão "Marcar como Concluída" para licao/material, essas aulas
-- nunca geravam registros na tabela progresso.

-- PASSO 1: Verificar quantos registros serão afetados (dry-run)
SELECT 'ANTES' as fase, COUNT(*) as total_licoes_sem_progresso FROM (
  SELECT DISTINCT ra.aluno_id, ra.aula_id
  FROM public.respostas_aulas ra
  JOIN public.aulas a ON a.id = ra.aula_id
  WHERE a.tipo = 'licao'
    AND NOT EXISTS (
      SELECT 1 FROM public.progresso p
      WHERE p.aluno_id = ra.aluno_id
        AND p.aula_id = ra.aula_id
        AND p.concluida = true
    )
) sub;

-- PASSO 2: Inserir registros faltantes no progresso
INSERT INTO public.progresso (aluno_id, aula_id, concluida, updated_at)
SELECT DISTINCT ra.aluno_id, ra.aula_id, true, COALESCE(MIN(ra.created_at), now())
FROM public.respostas_aulas ra
JOIN public.aulas a ON a.id = ra.aula_id
WHERE a.tipo = 'licao'
  AND NOT EXISTS (
    SELECT 1 FROM public.progresso p
    WHERE p.aluno_id = ra.aluno_id
      AND p.aula_id = ra.aula_id
      AND p.concluida = true
  )
GROUP BY ra.aluno_id, ra.aula_id
ON CONFLICT (aluno_id, aula_id) DO UPDATE
SET concluida = true, updated_at = EXCLUDED.updated_at;

-- PASSO 3: Verificar quantos registros foram inseridos
SELECT 'DEPOIS' as fase, COUNT(*) as total_licoes_com_progresso FROM (
  SELECT DISTINCT ra.aluno_id, ra.aula_id
  FROM public.respostas_aulas ra
  JOIN public.aulas a ON a.id = ra.aula_id
  WHERE a.tipo = 'licao'
    AND EXISTS (
      SELECT 1 FROM public.progresso p
      WHERE p.aluno_id = ra.aluno_id
        AND p.aula_id = ra.aula_id
        AND p.concluida = true
    )
) sub;

-- PASSO 4: Progresso + notas nos módulos específicos
SELECT
  l.titulo AS modulo,
  u.nome AS aluno,
  a.titulo AS aula,
  a.tipo,
  p.concluida,
  p.nota_questionario,
  ra.status,
  ra.nota AS nota_exercicio,
  p.updated_at AS progresso_at
FROM public.progresso p
JOIN public.users u ON u.id = p.aluno_id
JOIN public.aulas a ON a.id = p.aula_id
JOIN public.livros l ON l.id = a.livro_id
LEFT JOIN public.respostas_aulas ra ON ra.aluno_id = p.aluno_id AND ra.aula_id = p.aula_id
WHERE l.titulo IN ('Epístolas aos Hebreus', 'Doutrina do Espírito Santo', 'Epístolas Paulinas')
ORDER BY l.titulo, u.nome, a.ordem;

-- PASSO 5: Verificar progresso total por aluno (para confirmar a melhoria)
SELECT
  u.nome,
  COUNT(p.id) FILTER (WHERE p.concluida = true) as aulas_concluidas,
  COUNT(p.id) as total_progresso
FROM public.users u
JOIN public.progresso p ON p.aluno_id = u.id
GROUP BY u.id, u.nome
ORDER BY aulas_concluidas DESC
LIMIT 20;

-- PASSO 6: Resumo por módulo (quantos alunos têm progresso em cada)
SELECT
  l.titulo AS modulo,
  COUNT(DISTINCT p.aluno_id) as alunos_com_progresso,
  COUNT(DISTINCT p.aula_id) as aulas_com_progresso,
  COUNT(DISTINCT ra.aluno_id) FILTER (WHERE ra.id IS NOT NULL) as alunos_com_exercicios
FROM public.livros l
JOIN public.aulas a ON a.livro_id = l.id
LEFT JOIN public.progresso p ON p.aula_id = a.id AND p.concluida = true
LEFT JOIN public.respostas_aulas ra ON ra.aula_id = a.id
WHERE l.titulo IN ('Epístolas aos Hebreus', 'Doutrina do Espírito Santo', 'Epístolas Paulinas')
GROUP BY l.id, l.titulo
ORDER BY l.titulo;
