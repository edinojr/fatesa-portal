-- Adicionar colunas para suporte a editor de lição rico e materiais por aula
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS conteudo JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS materiais JSONB DEFAULT '[]';

-- Comentário: 
-- 'conteudo' armazenará a estrutura de blocos (texto, imagens).
-- 'materiais' armazenará a lista de arquivos complementares para download.
