-- Migration: Add control columns to nucleos
ALTER TABLE public.nucleos 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS modules_blocked BOOLEAN DEFAULT false;
