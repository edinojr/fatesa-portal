-- ==========================================================
-- REFORÇO DE SEGURANÇA E PERSISTÊNCIA: LIBERAÇÕES
-- ==========================================================

-- 1. Garantir que a restrição de unicidade exista para o UPSERT funcionar
ALTER TABLE public.liberacoes_nucleo DROP CONSTRAINT IF EXISTS liberacoes_nucleo_nucleo_id_item_id_item_type_key;
ALTER TABLE public.liberacoes_nucleo ADD CONSTRAINT liberacoes_nucleo_nucleo_id_item_id_item_type_key UNIQUE (nucleo_id, item_id, item_type);

-- 2. Atualizar a política de gerenciamento para Staff (Adicionando WITH CHECK)
DROP POLICY IF EXISTS "Staff can manage all releases" ON public.liberacoes_nucleo;
CREATE POLICY "Staff can manage all releases" ON public.liberacoes_nucleo 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND tipo IN ('admin', 'professor', 'suporte')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND tipo IN ('admin', 'professor', 'suporte')
    )
);

-- 3. Garantir que 'video' seja um tipo aceito na restrição (reforço)
ALTER TABLE public.liberacoes_nucleo DROP CONSTRAINT IF EXISTS liberacoes_nucleo_item_type_check;
ALTER TABLE public.liberacoes_nucleo ADD CONSTRAINT liberacoes_nucleo_item_type_check 
CHECK (item_type IN ('modulo', 'atividade', 'video'));

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
