-- ==============================================================================
-- ADIÇÃO DE COLUNAS PARA GESTÃO AVANÇADA DE NÚCLEOS
-- ==============================================================================

-- 1. Adicionando as colunas à tabela nucleos (se não existirem)
ALTER TABLE public.nucleos 
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS professor_responsavel TEXT,
ADD COLUMN IF NOT EXISTS horario_aulas TEXT;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
