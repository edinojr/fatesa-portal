-- 1. Adiciona campos de controle para Prova Final
ALTER TABLE respostas_aulas ADD COLUMN IF NOT EXISTS tentativas int DEFAULT 1;
ALTER TABLE respostas_aulas ADD COLUMN IF NOT EXISTS primeira_correcao_at timestamp with time zone;

-- 2. Atualiza a permissão do aluno para ele poder atualizar o registro (tentar de novo) 
-- se ainda houver tentativas disponíveis
DROP POLICY IF EXISTS "Alunos refinam tentativas" ON respostas_aulas;
CREATE POLICY "Alunos refinam tentativas" ON respostas_aulas FOR UPDATE TO authenticated USING (
  (auth.uid() = aluno_id) AND (
    (nota IS NULL) OR (nota < 7 AND tentativas < 3)
  )
);
