
-- 1. Add 'versao' column to the 'aulas' table to distinguish between opportunities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aulas' AND column_name = 'versao') THEN
        ALTER TABLE public.aulas ADD COLUMN versao INTEGER DEFAULT 1;
    END IF;
END
$$;

-- 2. Ensure 'respostas_aulas' has 'start_time' for timer persistence (Already should exist from previous versions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'respostas_aulas' AND column_name = 'start_time') THEN
        ALTER TABLE public.respostas_aulas ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- 3. Comment describing the logic
COMMENT ON COLUMN public.aulas.versao IS '1 = 1st Opportunity, 2 = 2nd Opportunity, 3 = 3rd Opportunity';
