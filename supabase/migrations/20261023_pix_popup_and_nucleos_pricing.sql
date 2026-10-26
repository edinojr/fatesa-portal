-- ==============================================================================
-- MIGRAÇÃO: CONFIGURAÇÕES PIX SANTANDER E MENSALIDADES POR NÚCLEO
-- Data: 23/10/2026
-- Objetivo:
-- 1. Adicionar valor_mensalidade na tabela nucleos
-- 2. Atualizar chave Pix para o telefone 11958259144, banco Santander e favorecido MARIA HELENA PIRANI CAVALLERO
-- 3. Documentar isenção dos meses de Janeiro e Julho
-- ==============================================================================

-- 1. Adicionar coluna de valor_mensalidade à tabela nucleos (se não existir)
ALTER TABLE public.nucleos 
ADD COLUMN IF NOT EXISTS valor_mensalidade NUMERIC DEFAULT 0;

-- 2. Inserir ou atualizar os parâmetros oficiais do PIX na tabela configuracoes
INSERT INTO public.configuracoes (chave, valor)
VALUES 
  ('pix_key', '11958259144'),
  ('pix_tipo_chave', 'Telefone'),
  ('pix_beneficiario', 'MARIA HELENA PIRANI CAVALLERO'),
  ('pix_banco', 'Banco Santander')
ON CONFLICT (chave) 
DO UPDATE SET valor = EXCLUDED.valor;

-- Comentário explicativo sobre a política de cobrança:
COMMENT ON TABLE public.pagamentos IS 'Pagamentos e mensalidades dos alunos. Meses de Janeiro e Julho são isentos. Pop-up PIX ativo a partir de Novembro para todos os alunos pagantes até validação do comprovante.';
