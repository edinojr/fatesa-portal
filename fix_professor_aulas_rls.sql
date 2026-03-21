-- Fix: Allow users with 'professor' in caminhos_acesso to view aulas and livros
-- The current RLS policy only checks tipo IN ('admin', 'professor'),
-- but some professors have tipo='online' with caminhos_acesso containing 'professor'.

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Admins and Professors can view all lessons" ON public.aulas;
DROP POLICY IF EXISTS "Admins and Professors can view all books" ON public.livros;

-- Recreate with caminhos_acesso check included
CREATE POLICY "Admins and Professors can view all lessons" ON public.aulas FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (
      tipo IN ('admin', 'professor')
      OR 'professor' = ANY(caminhos_acesso)
      OR 'suporte' = ANY(caminhos_acesso)
    )
  )
);

CREATE POLICY "Admins and Professors can view all books" ON public.livros FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (
      tipo IN ('admin', 'professor')
      OR 'professor' = ANY(caminhos_acesso)
      OR 'suporte' = ANY(caminhos_acesso)
    )
  )
);
