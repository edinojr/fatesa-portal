-- Adicionar coluna is_current para destacar o módulo que está sendo ensinado no momento
ALTER TABLE public.liberacoes_nucleo ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Garantir que apenas UM módulo seja vigente por curso/núcleo (opcional, mas recomendado)
-- Vamos gerenciar isso via código para maior flexibilidade por enquanto.

COMMENT ON COLUMN public.liberacoes_nucleo.is_current IS 'Indica se este é o módulo que a turma está estudando no momento (Vigente)';
