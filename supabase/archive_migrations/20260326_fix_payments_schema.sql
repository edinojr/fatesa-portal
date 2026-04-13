-- Migration: Fix Payments Schema
-- Add missing columns to 'pagamentos' table to resolve schema cache errors and allow per-module tracking.

DO $$ 
BEGIN
    -- 1. Add data_pagamento (actual payment date/time)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'data_pagamento') THEN
        ALTER TABLE public.pagamentos ADD COLUMN data_pagamento TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 2. Add livro_id (to link payment to a specific module)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'livro_id') THEN
        ALTER TABLE public.pagamentos ADD COLUMN livro_id UUID REFERENCES public.livros(id) ON DELETE SET NULL;
    END IF;

    -- 3. Add index for performance in module-based lookups
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_pagamentos_livro_id' AND n.nspname = 'public') THEN
        CREATE INDEX idx_pagamentos_livro_id ON public.pagamentos(livro_id);
    END IF;
END $$;

COMMENT ON COLUMN public.pagamentos.data_pagamento IS 'The actual timestamp when the payment was confirmed/validated.';
COMMENT ON COLUMN public.pagamentos.livro_id IS 'Link to the specific module (livro) this payment covers.';
