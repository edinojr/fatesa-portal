-- Add field for students to manually mark modules as completed (e.g., completed before platform, or offline)
-- This allows students to select which modules they already finished

BEGIN;

-- Add array column to store manually completed livro_ids
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS modulos_finalizados_manual UUID[] DEFAULT ARRAY[]::UUID[];

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_modulos_finalizados_manual ON public.users USING GIN (modulos_finalizados_manual);

COMMIT;

NOTIFY pgrst, 'reload schema';