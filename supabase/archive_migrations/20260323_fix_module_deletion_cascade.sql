-- Fix Module Deletion Conflict: Add missing ON DELETE CASCADE to 'respostas_aulas'
-- Date: 2026-03-23

-- 1. Identify and drop the current FK for 'aula_id' on 'respostas_aulas'
-- We'll use a DO block to safely handle constraint names if they differ
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'respostas_aulas_aula_id_fkey') THEN
        ALTER TABLE public.respostas_aulas DROP CONSTRAINT respostas_aulas_aula_id_fkey;
    END IF;
END $$;

-- 2. Re-add the FK for 'aula_id' with ON DELETE CASCADE
ALTER TABLE public.respostas_aulas
ADD CONSTRAINT respostas_aulas_aula_id_fkey 
FOREIGN KEY (aula_id) 
REFERENCES public.aulas(id) 
ON DELETE CASCADE;

-- 3. Also add ON DELETE CASCADE for 'aluno_id' to prevent similar issues when deleting students
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'respostas_aulas_aluno_id_fkey') THEN
        ALTER TABLE public.respostas_aulas DROP CONSTRAINT respostas_aulas_aluno_id_fkey;
    END IF;
END $$;

ALTER TABLE public.respostas_aulas
ADD CONSTRAINT respostas_aulas_aluno_id_fkey 
FOREIGN KEY (aluno_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 4. Comment for documentation
COMMENT ON TABLE public.respostas_aulas IS 'Handles module deletion conflicts by cascading through responses.';
