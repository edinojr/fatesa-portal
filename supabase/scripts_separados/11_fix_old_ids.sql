SELECT '=== SCRIPT DE CORRECAO: Atualizar aula_id nas respostas orfas ===' as info;
SELECT '=== EXECUTE ESTE SCRIPT SOMENTE APOS ANALISAR OS SCRIPTS 09 E 10 ===' as info;
SELECT '=== O script abaixo assume que voce ja identificou o mapeamento antigo -> novo ===' as info;

-- STEP 1: Verificar quantas respostas serao afetadas
SELECT COUNT(*) as total_respostas_para_corrigir
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL;

-- STEP 2: Listar as aulas atuais para identificar o mapeamento
SELECT 
  a.id as novo_id,
  a.titulo,
  a.tipo,
  a.versao,
  l.titulo as livro,
  a.created_at
FROM aulas a
LEFT JOIN livros l ON a.livro_id = l.id
ORDER BY l.titulo, a.versao, a.created_at;

-- STEP 3: Para cada aula orfa, voce precisa decidir qual e o novo_id correspondente
-- Exemplo de UPDATE (descomente e ajuste os UUIDs):
-- UPDATE respostas_aulas SET aula_id = 'NOVO_UUID_AQUI' WHERE aula_id = 'UUID_ANTIGO_AQUI';

-- STEP 4: Apos corrigir os IDs, verificar se progresso tambem precisa de correcao
SELECT 
  p.id,
  p.aluno_id,
  p.aula_id,
  p.concluida,
  p.nota_questionario,
  u.nome as aluno_nome,
  a.titulo as titulo_aula
FROM progresso p
LEFT JOIN aulas a ON p.aula_id = a.id
LEFT JOIN users u ON p.aluno_id = u.id
WHERE a.id IS NULL
ORDER BY u.nome;

SELECT '=== FIM ===' as info;
