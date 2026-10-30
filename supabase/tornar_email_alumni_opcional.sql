-- MIGRAÇÃO: Tornar campos secundários opcionais em registros_alumni
-- Garantir que apenas 'nome' e 'nivel_curso' sejam estritamente obrigatórios.

BEGIN;

-- 1. Permitir email nulo na tabela registros_alumni
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN email DROP NOT NULL;

-- 2. Permitir que curso e ano_formacao sejam nulos/opcionais se houver qualquer restrição
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN curso DROP NOT NULL;
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN ano_formacao DROP NOT NULL;
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN nucleo DROP NOT NULL;
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN matricula DROP NOT NULL;
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN observacoes DROP NOT NULL;

-- 3. Garantir default no nível de curso caso não informado
ALTER TABLE IF EXISTS public.registros_alumni ALTER COLUMN nivel_curso SET DEFAULT 'Básico';

COMMIT;
