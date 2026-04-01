-- Forum System Migration
-- Table for Forum Topics
CREATE TABLE IF NOT EXISTS public.forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'geral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for Forum Messages
CREATE TABLE IF NOT EXISTS public.forum_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_mensagens ENABLE ROW LEVEL SECURITY;

-- Topics Policies
CREATE POLICY "Anyone can view forum topics" 
ON public.forum_topics FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert forum topics" 
ON public.forum_topics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and staff can delete forum topics" 
ON public.forum_topics FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- Messages Policies
CREATE POLICY "Anyone can view forum messages" 
ON public.forum_mensagens FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert forum messages" 
ON public.forum_mensagens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and staff can delete forum messages" 
ON public.forum_mensagens FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forum_topics_aula_id ON public.forum_topics(aula_id);
CREATE INDEX IF NOT EXISTS idx_forum_mensagens_topic_id ON public.forum_mensagens(topic_id);
