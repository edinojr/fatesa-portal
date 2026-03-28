-- 1. Update enum 'aula_tipo' with 'licao' and 'material'
-- Since we can't easily drop/recreate enums in use, we use ADD VALUE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'aula_tipo' AND e.enumlabel = 'licao') THEN
    ALTER TYPE public.aula_tipo ADD VALUE 'licao';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'aula_tipo' AND e.enumlabel = 'material') THEN
    ALTER TYPE public.aula_tipo ADD VALUE 'material';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add 'ensino_tipo' to 'livros' (Modules) to differentiate Online/Presencial
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS ensino_tipo TEXT DEFAULT 'online';

-- 3. Add 'descricao' and 'ordem' (if missing) to 'aulas'
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 1;

-- 4. Add 'arquivo_url' and 'arquivo_tipo' for the new 'material' type in 'aulas'
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS arquivo_url TEXT;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS arquivo_tipo TEXT;

-- 5. Comments
COMMENT ON COLUMN public.livros.ensino_tipo IS 'Differentiates between online and presencial modules';
COMMENT ON COLUMN public.aulas.arquivo_url IS 'URL for materials in the new hierarchy';
