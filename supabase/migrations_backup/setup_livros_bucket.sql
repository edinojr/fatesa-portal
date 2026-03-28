-- Adicionar a coluna de Capa na tabela livros
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS capa_url TEXT;

-- Garantir que temos um Bucket no Storage chamado 'livros'
INSERT INTO storage.buckets (id, name, public) VALUES ('livros', 'livros', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Acesso Público para leitura (Alunos precisam baixar os PDFs e ver capas)
DROP POLICY IF EXISTS "Public Access for livros" ON storage.objects;
CREATE POLICY "Public Access for livros" ON storage.objects FOR SELECT USING (bucket_id = 'livros');

-- Políticas para Administradores/Professores poderem enviar arquivos
DROP POLICY IF EXISTS "Admins can upload livros" ON storage.objects;
CREATE POLICY "Admins can upload livros" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'livros' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

DROP POLICY IF EXISTS "Admins can update livros" ON storage.objects;
CREATE POLICY "Admins can update livros" ON storage.objects FOR UPDATE USING (
  bucket_id = 'livros' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

DROP POLICY IF EXISTS "Admins can delete livros" ON storage.objects;
CREATE POLICY "Admins can delete livros" ON storage.objects FOR DELETE USING (
  bucket_id = 'livros' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);
