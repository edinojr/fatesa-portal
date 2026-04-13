-- ==========================================================
-- SCRIPT DE CORREÇÃO FINAL: RLS, UUIDS E COLUNAS FALTANTES
-- ==========================================================

-- 1. Garantir colunas necessárias
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Garantir tabela de configurações para PIX
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Resetar e Recriar Políticas de Segurança (RLS) para evitar erros
-- Aulas
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins gerenciam aulas" ON public.aulas;
CREATE POLICY "Leitura pública de aulas" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam aulas" ON public.aulas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'admin' OR tipo = 'professor'))
);

-- Livros
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de livros" ON public.livros;
DROP POLICY IF EXISTS "Admins gerenciam livros" ON public.livros;
CREATE POLICY "Leitura pública de livros" ON public.livros FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam livros" ON public.livros FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'admin' OR tipo = 'professor'))
);

-- Cursos
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins gerenciam cursos" ON public.cursos;
CREATE POLICY "Leitura pública de cursos" ON public.cursos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam cursos" ON public.cursos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'admin' OR tipo = 'professor'))
);

-- Configurações
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de config" ON public.configuracoes;
DROP POLICY IF EXISTS "Admins gerenciam config" ON public.configuracoes;
CREATE POLICY "Leitura pública de config" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam config" ON public.configuracoes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- 4. Inserir chaves básicas se não existirem
INSERT INTO public.configuracoes (chave, valor) 
VALUES ('pix_key', 'financeiro@fatesa.edu.br'), ('pix_qr_url', '')
ON CONFLICT (chave) DO NOTHING;

-- 5. Atualizar UUIDS de mock se necessário (opcional)
-- update public.cursos set id = '00000000-0000-0000-0000-000000000001' where nome = 'Inglês Iniciante' and id != '00000000-0000-0000-0000-000000000001';
