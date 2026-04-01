-- Analytics System Migration
-- Table to store portal access logs
CREATE TABLE IF NOT EXISTS public.portal_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('registrado', 'visitante')),
    path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.portal_access_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert access logs (clients track themselves)
CREATE POLICY "Anyone can insert access logs" 
ON public.portal_access_logs FOR INSERT 
WITH CHECK (true);

-- Admins can view analytics
CREATE POLICY "Admins can view analytics" 
ON public.portal_access_logs FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.portal_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_type ON public.portal_access_logs(user_type);
