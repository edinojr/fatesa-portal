-- ==========================================================
-- SCRIPT PARA CORRIGIR O ERRO 403 FORBIDDEN NO PROGRESSO
-- ==========================================================

-- Este script remove as políticas genéricas (FOR ALL) que causam falhas de UPSERT (403 Forbidden)
-- e as substitui por políticas explícitas e granulares (INSERT, UPDATE, SELECT).

DROP POLICY IF EXISTS "Users can insert/update their own progress" ON public.progresso;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.progresso;
DROP POLICY IF EXISTS "Admins and Professors can view all progress" ON public.progresso;

DROP POLICY IF EXISTS "Progresso - Leitura" ON public.progresso;
DROP POLICY IF EXISTS "Progresso - Inserir" ON public.progresso;
DROP POLICY IF EXISTS "Progresso - Atualizar" ON public.progresso;

-- 1. Permite que o aluno leia seu próprio progresso, ou administradores/professores leiam todos
CREATE POLICY "Progresso - Leitura" ON public.progresso 
FOR SELECT USING (
  aluno_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 2. Permite que o aluno crie (insira) o seu próprio progresso
CREATE POLICY "Progresso - Inserir" ON public.progresso 
FOR INSERT WITH CHECK (
  aluno_id = auth.uid()
);

-- 3. Permite que o aluno atualize o seu próprio progresso
CREATE POLICY "Progresso - Atualizar" ON public.progresso 
FOR UPDATE USING (
  aluno_id = auth.uid()
) WITH CHECK (
  aluno_id = auth.uid()
);
