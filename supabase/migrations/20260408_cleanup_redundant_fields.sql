-- 1. Migrar dados remanescentes (garantir que nucleo_id está preenchido)
-- Esta query tenta vincular o nucleo_id baseado no texto se ele ainda estiver nulo
UPDATE public.users u
SET nucleo_id = n.id
FROM public.nucleos n
WHERE u.nucleo_id IS NULL 
  AND LOWER(u.nucleo) = LOWER(n.nome);

-- 2. Remover a coluna redundante de texto
ALTER TABLE public.users DROP COLUMN IF EXISTS nucleo;

-- 3. Adicionar comentário para documentar a mudança
COMMENT ON COLUMN public.users.nucleo_id IS 'Referência oficial ao núcleo/polo. A coluna de texto legada foi removida para garantir integridade via Views.';
