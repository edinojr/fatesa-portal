-- Migration: Content Release Control (Videos and Exams)
-- Date: 2026-03-28

-- 1. Update the item_type check constraint in liberacoes_nucleo
-- We need to drop the existing check constraint and add a new one that includes 'video'
DO $$
BEGIN
    -- Try to find and drop the anonymous check constraint if it exists
    -- Usually, inline constraints have names like 'liberacoes_nucleo_item_type_check'
    ALTER TABLE public.liberacoes_nucleo DROP CONSTRAINT IF EXISTS liberacoes_nucleo_item_type_check;
EXCEPTION
    WHEN undefined_object THEN
        -- If it's not found by that name, ignore and proceed
        NULL;
END $$;

-- Add the new constraint
ALTER TABLE public.liberacoes_nucleo 
  ADD CONSTRAINT liberacoes_nucleo_item_type_check 
  CHECK (item_type IN ('modulo', 'atividade', 'video'));

-- 2. Ensure all existing video lessons are blocked by default for new students (Optional, but good for logic)
-- Current default for 'liberado' is TRUE in the table definition.
-- However, we want 'video' to be 'false' if not explicitly present for a nucleus.
-- We don't need to change the default in the table, just the logic in the code.

-- 3. Comment for documentation
COMMENT ON COLUMN public.liberacoes_nucleo.item_type IS 'Type of item being released: modulo (book/module), atividade (exam/exercise), or video (lesson video)';
