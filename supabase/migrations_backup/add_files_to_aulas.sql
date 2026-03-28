-- Adicionar suporte a arquivos (PDF/EPUB) diretamente nas aulas
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS epub_url TEXT;

-- Garantir que as aulas herdem as mesmas permissões de storage se necessário
-- (As políticas existentes em storage.objects já cobrem o bucket 'livros')
