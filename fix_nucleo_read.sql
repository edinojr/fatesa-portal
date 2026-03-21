-- ==============================================================================
-- FIX DE LEITURA PARA OS NÚCLEOS
-- ==============================================================================

-- Remove políticas de leitura antigas se houverem
DROP POLICY IF EXISTS "Acesso público de leitura aos núcleos" ON public.nucleos;
DROP POLICY IF EXISTS "Professores podem ler nucleos" ON public.nucleos;

-- Garante que qualquer pessoa (incluindo Professores) pode LER a lista de núcleos inteira
CREATE POLICY "Leitura global de nucleos" ON public.nucleos FOR SELECT USING (true);

-- Garante que os professores consigam ler a tabela de vínculos inteira
DROP POLICY IF EXISTS "Admins e professores podem ler e alterar professor_nucleo" ON public.professor_nucleo;
CREATE POLICY "Admins e professores podem ler e alterar professor_nucleo" ON public.professor_nucleo FOR ALL USING (true);

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
