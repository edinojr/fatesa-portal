-- Fix staff policy for liberacoes_nucleo to correctly allow professors and admins
-- This migration updates the RLS policy to check both the 'tipo' column and the 'caminhos_acesso' array,
-- ensuring that users who are flagged as professor via either mechanism can manage releases.

DROP POLICY IF EXISTS "Gestao_Total_Staff" ON public.liberacoes_nucleo;
CREATE POLICY "Gestao_Total_Staff" ON public.liberacoes_nucleo
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'professor')
        OR 'professor' = ANY(caminhos_acesso)
        OR 'admin' = ANY(caminhos_acesso)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'professor')
        OR 'professor' = ANY(caminhos_acesso)
        OR 'admin' = ANY(caminhos_acesso)
      )
  )
);
