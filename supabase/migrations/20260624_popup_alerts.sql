CREATE TABLE IF NOT EXISTS public.popup_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'warning', 'error', 'maintenance')),
    ativo BOOLEAN DEFAULT true,
    data_inicio TIMESTAMPTZ DEFAULT now(),
    data_fim TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.popup_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins podem gerenciar popups') THEN
        CREATE POLICY "Admins podem gerenciar popups" ON public.popup_alerts FOR ALL USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Usuários autenticados podem ver popups ativos') THEN
        CREATE POLICY "Usuários autenticados podem ver popups ativos" ON public.popup_alerts FOR SELECT USING (
            ativo = true 
            AND (data_inicio IS NULL OR data_inicio <= now())
            AND (data_fim IS NULL OR data_fim >= now())
        );
    END IF;
END $$;
