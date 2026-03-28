-- Migration to support generic file attachments for all content types
-- Date: 2026-03-23

ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.aulas.arquivo_url IS 'Generic URL for file attachments (PDF/EPUB/etc) associated with the content';
