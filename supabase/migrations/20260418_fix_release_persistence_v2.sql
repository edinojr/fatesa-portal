-- ==========================================================
-- REPARO CRÍTICO: PERSISTÊNCIA DE LIBERAÇÕES (FIX V2)
-- ==========================================================

-- 1. Garantir que a tabela e a restrição de unicidade existam
CREATE TABLE IF NOT EXISTS public.liberacoes_nucleo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    liberado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(nucleo_id, item_id, item_type)
);

-- 2. Resetar e simplificar políticas de RLS
ALTER TABLE public.liberacoes_nucleo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view releases for their nucleo" ON public.liberacoes_nucleo;
CREATE POLICY "Students can view releases for their nucleo" ON public.liberacoes_nucleo 
FOR SELECT USING (true); -- Permitir leitura para todos autenticados (segurança pelo nucleo_id no hook)

DROP POLICY IF EXISTS "Staff can manage all releases" ON public.liberacoes_nucleo;
DROP POLICY IF EXISTS "Professors manage releases" ON public.liberacoes_nucleo;

CREATE POLICY "Staff manage releases" ON public.liberacoes_nucleo 
FOR ALL 
TO authenticated
USING (
    (SELECT tipo FROM public.users WHERE id = auth.uid()) IN ('admin', 'professor', 'suporte')
)
WITH CHECK (
    (SELECT tipo FROM public.users WHERE id = auth.uid()) IN ('admin', 'professor', 'suporte')
);

-- 3. Garantir permissões de escrita para a API
GRANT ALL ON public.liberacoes_nucleo TO authenticated;
GRANT ALL ON public.liberacoes_nucleo TO service_role;

-- 4. Notificar PostgREST para limpar o cache de schema
NOTIFY pgrst, 'reload schema';
