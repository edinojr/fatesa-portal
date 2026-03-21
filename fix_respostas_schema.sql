-- 1. Garante que a coluna nucleo_id exista (isto é crucial para não dar erro de envio)
ALTER TABLE respostas_aulas ADD COLUMN IF NOT EXISTS nucleo_id uuid REFERENCES public.nucleos(id);

-- 2. Cria a nova regra para o aluno poder ATUALIZAR (REFAZER)
-- Usando um nome diferente para evitar o erro de 'already exists'
DROP POLICY IF EXISTS "Estudantes atualizam v2" ON respostas_aulas;
CREATE POLICY "Estudantes atualizam v2" ON respostas_aulas FOR UPDATE TO authenticated USING (auth.uid() = aluno_id);

-- 3. Garante que o Aluno também possa INSERIR se a linha for nova (após o professor deletar)
-- Usando um nome novo pra garantir
DROP POLICY IF EXISTS "Estudantes inserem v2" ON respostas_aulas;
CREATE POLICY "Estudantes inserem v2" ON respostas_aulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = aluno_id);

-- 4. Nova regra de Admin para permitir DELETE
DROP POLICY IF EXISTS "SuperAdmin Delete" ON respostas_aulas;
CREATE POLICY "SuperAdmin Delete" ON respostas_aulas FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.tipo IN ('admin', 'suporte', 'professor') OR users.email = 'edi.ben.jr@gmail.com')
  )
);
