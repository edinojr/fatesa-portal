/*
  Add epub_url column to livros table
*/

-- Add the column
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS epub_url TEXT;

-- Update RLS policies if necessary (usually not needed if using standard SELECT *)
-- Students can already view all columns of books they have access to.
-- Admins/Professors can already view all columns.
