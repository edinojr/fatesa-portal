-- ==============================================================================
-- FATESA PORTAL - CORREÇÃO DE ESQUEMA E TIPOS DE USUÁRIO
-- data: 2026-03-25
-- ==============================================================================

-- 1. ADICIONAR COLUNA ISENTO NA TABELA NUCLEOS
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nucleos' AND column_name = 'isento') THEN
    ALTER TABLE public.nucleos ADD COLUMN isento BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. GARANTIR QUE OS TIPOS DE USUÁRIOS ESTÃO CORRETOS NA TABELA USERS
-- ------------------------------------------------------------------------------
-- Este comando garante que alunos que por algum motivo não tenham tipo definido
-- ou tenham tipos legados sejam tratados corretamente.
UPDATE public.users 
SET tipo = 'online' 
WHERE tipo IS NULL OR tipo::TEXT NOT IN ('admin', 'professor', 'suporte', 'presencial', 'online');

-- 3. PERMISSÕES
-- ------------------------------------------------------------------------------
GRANT SELECT, UPDATE ON public.nucleos TO authenticated;
GRANT SELECT ON public.nucleos TO anon;
