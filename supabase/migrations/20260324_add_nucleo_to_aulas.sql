-- Migration: Add nucleo_id to aulas
-- Date: 2026-03-24

ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.aulas.nucleo_id IS 'Specific center this activity/lesson belongs to (optional, null = global)';

-- Update RLS for aulas (allowing professors to manage their nucleo's activities)
-- Note: existing RLS might already allow insert/update if handle with care, but let's be explicit if needed.
-- Assuming admins manage global, and professors manage their own.
