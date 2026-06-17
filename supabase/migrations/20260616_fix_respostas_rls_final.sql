-- Fix definitivo para RLS da tabela respostas_aulas
-- Remove todas as políticas conflitantes e cria políticas simples e claras
-- Problema: Múltiplas migrações criaram políticas que se bloqueiam mutuamente

-- 1. Garante que a função is_staff_user existe
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND tipo IN ('admin', 'suporte', 'professor', 'coordenador_polo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remove TODAS as políticas antigas da tabela respostas_aulas
DROP POLICY IF EXISTS "Estudantes inserem" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem inicial" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes leem próprias notas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes atualizam retentativa" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes atualizam v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos refinam tentativas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos podem inserir respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos podem atualizar respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Staff podem deletar respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Suporte admin le tudo" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Professores e Admin operam tudo" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Staff can manage submissions" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Acesso respostas" ON public.respostas_aulas;

-- 3. Cria políticas simples e limpas

-- SELECT: Alunos veem suas próprias respostas, staff vê tudo
CREATE POLICY "respostas_select" ON public.respostas_aulas 
FOR SELECT USING (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- INSERT: Alunos podem inserir suas próprias respostas
CREATE POLICY "respostas_insert" ON public.respostas_aulas 
FOR INSERT WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- UPDATE: Alunos podem atualizar suas próprias respostas (para refazer provas)
CREATE POLICY "respostas_update" ON public.respostas_aulas 
FOR UPDATE USING (
    aluno_id = auth.uid() OR public.is_staff_user()
) WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- DELETE: Apenas staff pode deletar
CREATE POLICY "respostas_delete" ON public.respostas_aulas 
FOR DELETE USING (
    public.is_staff_user()
);

-- 4. Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
