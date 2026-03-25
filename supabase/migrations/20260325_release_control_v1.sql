-- Migration: Release Control per Núcleo
-- Date: 2026-03-25

-- 1. Create the liberacoes_nucleo table
CREATE TABLE IF NOT EXISTS public.liberacoes_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL, -- ID of the libro or aula
  item_type TEXT NOT NULL CHECK (item_type IN ('modulo', 'atividade')),
  liberado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(nucleo_id, item_id, item_type)
);

-- 2. Enable RLS
ALTER TABLE public.liberacoes_nucleo ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Students can read releases for their own núcleo
CREATE POLICY "Students can view releases for their nucleo" ON public.liberacoes_nucleo 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (
      public.users.nucleo_id = public.liberacoes_nucleo.nucleo_id 
      OR public.users.tipo IN ('admin', 'professor', 'suporte')
    )
  )
);

-- Professors and Admins can manage all releases
CREATE POLICY "Staff can manage all releases" ON public.liberacoes_nucleo 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND tipo IN ('admin', 'professor', 'suporte')
  )
);

-- 4. Initial index for performance
CREATE INDEX IF NOT EXISTS idx_liberacoes_nucleo_lookup ON public.liberacoes_nucleo (nucleo_id, item_id);

-- 5. Comment for documentation
COMMENT ON TABLE public.liberacoes_nucleo IS 'Manages manual release of modules and activities per learning center (núcleo)';
