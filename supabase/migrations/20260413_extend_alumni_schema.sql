-- Migração: Estender a tabela de alumni para suportar dados de formatura e verificação
-- 1. Adicionar colunas necessárias para o cadastro de formado
ALTER TABLE public.registros_alumni 
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS codigo_verificacao UUID DEFAULT gen_random_uuid();

-- 2. Garantir que o nível do curso seja persistido
ALTER TABLE public.registros_alumni 
  ADD COLUMN IF NOT EXISTS nivel_curso TEXT DEFAULT 'Básico';

-- 3. Índice para busca rápida de verificação
CREATE INDEX IF NOT EXISTS idx_registros_alumni_verificacao ON public.registros_alumni(codigo_verificacao);

-- 4. Função para verificar certificado via RPC (pública)
CREATE OR REPLACE FUNCTION public.verificar_certificado(p_codigo UUID)
RETURNS TABLE (
  nome TEXT,
  curso TEXT,
  nivel_curso TEXT,
  ano_formacao TEXT,
  nucleo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.nome,
    r.curso,
    r.nivel_curso,
    r.ano_formacao,
    r.nucleo
  FROM public.registros_alumni r
  WHERE r.codigo_verificacao = p_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Comentários para documentação
COMMENT ON COLUMN public.registros_alumni.codigo_verificacao IS 'Código único de autenticidade impresso no certificado';
