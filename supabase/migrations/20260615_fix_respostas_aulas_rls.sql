-- Fix RLS for respostas_aulas to allow students to save progress and staff to manage them
-- This fixes the issue where students couldn't save exams/progress after 20260419_fix_rls_timeout.sql

-- 1. Ensure the is_staff_user function exists (it should, but for safety)
-- (The function is already created in 20260419_fix_rls_timeout.sql)

-- 2. Add policies for inserting and updating answers
-- Allow students to insert their own answers
CREATE POLICY "Alunos podem inserir respostas" ON public.respostas_aulas 
FOR INSERT WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- Allow students to update their own answers
CREATE POLICY "Alunos podem atualizar respostas" ON public.respostas_aulas 
FOR UPDATE USING (
    aluno_id = auth.uid() OR public.is_staff_user()
) WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- Allow staff to delete answers
CREATE POLICY "Staff podem deletar respostas" ON public.respostas_aulas 
FOR DELETE USING (
    public.is_staff_user()
);

-- Note: SELECT is already handled by "Acesso respostas" from 20260419_fix_rls_timeout.sql

NOTIFY pgrst, 'reload schema';
