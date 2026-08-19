-- Verificar e forçar bucket público
SELECT id, name, public FROM storage.buckets WHERE id = 'livros';

-- Forçar público (caso ainda não esteja)
UPDATE storage.buckets SET public = true WHERE id = 'livros';

-- Confirmar
SELECT id, name, public FROM storage.buckets WHERE id = 'livros';
