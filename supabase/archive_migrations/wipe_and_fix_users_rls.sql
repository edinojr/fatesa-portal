-- ==============================================================================
-- ATENÇÃO: SCRIPT SUPREMO PARA ELIMINAR QUALQUER POLÍTICA FANTASMA DE RLS
-- ==============================================================================

-- 1. Início de um bloco de código PL/pgSQL
DO $$
DECLARE
    pol record;
BEGIN
    -- Este comando vai rodar no banco de dados, procurar TODO NOME de política de segurança da tabela "users" e DELETAR automaticamente.
    -- Isso garante que até mesmo as políticas com nomes estranhos que nós não sabemos sejam apagadas.
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END
$$;

-- 2. Recriar apenas as políticas limpas e controladas via JWT (Para evitar qualquer erro de recursão)
CREATE POLICY "Users view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Lê diretamente da Sessão em vez de ler da tabela users! Sem loop infinito!
CREATE POLICY "Admins view all profiles by JWT" 
ON public.users 
FOR SELECT 
USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- FIM.
