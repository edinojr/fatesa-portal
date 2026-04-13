-- ==============================================================================
-- FIX PARA RLS DE PROFESSORES MANUSEAREM NÚCLEOS E ALUNOS
-- ==============================================================================

-- 1. Permitir que Professores criem novos Núcleos
-- Ao invés de usar WITH CHECK, para 'INSERT' nós usaremos 'WITH CHECK' mesmo.
CREATE POLICY "Professores podem criar nucleos" 
ON public.nucleos 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'professor')
);

-- (Opcional) Segurança adicional: permitir que professores atualizem apenas os núcleos
-- aos quais eles estão vinculados, se necessário no futuro. No momento eles apenas precisam criar.

-- 2. Permitir que os Professores leiam os perfis dos alunos que pertencem às suas turmas (núcleos)
CREATE POLICY "Professores veem alunos de seus nucleos" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.professor_nucleo pn
    WHERE pn.professor_id = auth.uid() AND pn.nucleo_id = users.nucleo_id
  )
);

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
