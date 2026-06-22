-- Fatesa Release Buttons Fix - 2026-06-22
-- Fixes three problems:
--   1. livros table lacks UPDATE policy → toggleModuleActive fails with 400
--   2. livros table missing professor_active column → PATCH 400
--   3. liberacoes_nucleo CHECK constraint must accept 'video' item_type

-- =========================================
-- 1. Add UPDATE policy for livros (staff)
-- =========================================
DROP POLICY IF EXISTS "Staff can update livros" ON public.livros;
CREATE POLICY "Staff can update livros" ON public.livros
FOR UPDATE
USING (
    public.check_is_admin() OR
    public.get_auth_user_tipo() IN ('professor', 'coordenador_polo', 'suporte')
)
WITH CHECK (
    public.check_is_admin() OR
    public.get_auth_user_tipo() IN ('professor', 'coordenador_polo', 'suporte')
);

-- =========================================
-- 2. Add professor_active column (missing)
-- =========================================
ALTER TABLE public.livros ADD COLUMN IF NOT EXISTS professor_active boolean DEFAULT true;

-- =========================================
-- 3. Ensure CHECK constraint on liberacoes_nucleo includes 'video'
-- =========================================
ALTER TABLE public.liberacoes_nucleo DROP CONSTRAINT IF EXISTS liberacoes_nucleo_item_type_check;
ALTER TABLE public.liberacoes_nucleo ADD CONSTRAINT liberacoes_nucleo_item_type_check
CHECK (item_type IN ('modulo', 'atividade', 'video'));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
