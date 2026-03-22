-- Refina as políticas de RLS para a tabela respostas_aulas
-- Garante que o aluno só possa atualizar se tiver tentativas (< 3) e nota < 7
-- E se estiver dentro do prazo de 30 dias após a primeira correção

-- 1. Limpa políticas duplicadas/antigas que podem estar permitindo acesso excessivo
DROP POLICY IF EXISTS "Alunos refinam tentativas" ON respostas_aulas;
DROP POLICY IF EXISTS "Estudantes atualizam v2" ON respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem" ON respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem v2" ON respostas_aulas;

-- 2. Nova Política de Inserção (apenas se não existir registro para a aula)
CREATE POLICY "Estudantes inserem inicial" ON respostas_aulas 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = aluno_id);

-- 3. Nova Política de Atualização (Regra de Retentativa)
CREATE POLICY "Estudantes atualizam retentativa" ON respostas_aulas
FOR UPDATE TO authenticated
USING (
  (auth.uid() = aluno_id) AND (
    -- Permite se ainda não foi corrigida (nota null) 
    -- OU se nota < 7 E tentativas < 3 E (está nos primeiros 30 dias se já foi corrigida uma vez)
    (nota IS NULL) OR (
      (nota < 7) AND 
      (tentativas < 3) AND 
      (
        primeira_correcao_at IS NULL OR 
        (EXTRACT(EPOCH FROM (now() - primeira_correcao_at)) / 86400 <= 30)
      )
    )
  )
);

-- 4. Garante que o aluno possa ver suas próprias respostas
DROP POLICY IF EXISTS "Estudantes leem próprias notas" ON respostas_aulas;
CREATE POLICY "Estudantes leem próprias notas" ON respostas_aulas 
FOR SELECT TO authenticated 
USING (auth.uid() = aluno_id);

-- 5. Política para Professores e Admins (Mantém acesso total)
DROP POLICY IF EXISTS "Suporte admin le tudo" ON respostas_aulas;
CREATE POLICY "Professores e Admin operam tudo" ON respostas_aulas 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.tipo IN ('admin', 'suporte', 'professor') OR users.email = 'edi.ben.jr@gmail.com')
  )
);
