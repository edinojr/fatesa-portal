-- Update document types enum to include 'certidao'
ALTER TYPE public.documento_tipo ADD VALUE IF NOT EXISTS 'certidao';
