-- 1. Create Table for Portal Access Logs (Analytics)
CREATE TABLE IF NOT EXISTS public.portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_type TEXT NOT NULL, -- 'registrado' ou 'visitante'
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Analytics
ALTER TABLE public.portal_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert access logs" ON public.portal_access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view access logs" ON public.portal_access_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- 2. Create Table for Nucleus Content Releases
-- This table controls which modules/activities are released for each polo
CREATE TABLE IF NOT EXISTS public.liberacoes_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL, -- ID do livro, aula ou atividade
  item_type TEXT NOT NULL, -- 'modulo', 'video', 'atividade'
  liberado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- IMPORTANT: Unique constraint to allow UPSERT (onConflict)
  CONSTRAINT unique_nucleo_release UNIQUE (nucleo_id, item_id, item_type)
);

-- Enable RLS for Releases
ALTER TABLE public.liberacoes_nucleo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view releases" ON public.liberacoes_nucleo FOR SELECT USING (true);
CREATE POLICY "Admins and Professors can manage releases" ON public.liberacoes_nucleo FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- Note: To fix 'bucket not found' for comprovantes and forum:
-- You MUST create the buckets 'comprovantes' and 'forum' in the Supabase Dashboard.
-- Go to Storage -> New Bucket -> Name: 'comprovantes' -> Public: Yes.
-- Go to Storage -> New Bucket -> Name: 'forum' -> Public: Yes.
