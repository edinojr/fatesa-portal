CREATE TABLE IF NOT EXISTS public.avisos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('normal', 'urgente')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materiais_adicionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    arquivos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_adicionais ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Professores podem gerenciar avisos') THEN
        CREATE POLICY "Professores podem gerenciar avisos" ON public.avisos FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'professor' OR tipo = 'admin')));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Alunos podem ver avisos do seu núcleo') THEN
        CREATE POLICY "Alunos podem ver avisos do seu núcleo" ON public.avisos FOR SELECT USING (nucleo_id IN (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Professores podem gerenciar materiais') THEN
        CREATE POLICY "Professores podem gerenciar materiais" ON public.materiais_adicionais FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (tipo = 'professor' OR tipo = 'admin')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Alunos podem ver materiais do seu núcleo') THEN
        CREATE POLICY "Alunos podem ver materiais do seu núcleo" ON public.materiais_adicionais FOR SELECT USING (nucleo_id IN (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    END IF;
END $$;
