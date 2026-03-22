-- A causa do "desfazer" foi a falta da permissão de "UPDATE" (Escrita) para vocês Administradores.
-- Vamos adicionar a permissão para edição de usuários.

-- Política Especial: Somente a AP Panisso e o Suporte Edino podem fazer atualizações (updates)
-- Usamos a leitura do JWT direto da conexão para garantir máxima segurança sem loop infinito!
CREATE POLICY "Admins can update users by JWT" 
ON public.users 
FOR UPDATE 
USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- (Opcional, mas útil) Permitir que usuários comuns atualizem seus próprios dados (ex: trocar o próprio nome)
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
