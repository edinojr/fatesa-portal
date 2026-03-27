
-- 1. Create Forum Tables
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forum_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_mensagens ENABLE ROW LEVEL SECURITY;

-- 3. Topic Policies
-- Everyone can view all topics
CREATE POLICY "Anyone can view topics" ON public.forum_topics FOR SELECT USING (true);
-- Authenticated users can create topics
CREATE POLICY "Authenticated users can create topics" ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Only the author or staff can delete/update
CREATE POLICY "Authors and staff can manage topics" ON public.forum_topics FOR ALL USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- 4. Message Policies
-- Everyone can view messages
CREATE POLICY "Anyone can view forum messages" ON public.forum_mensagens FOR SELECT USING (true);
-- Authenticated users can post messages
CREATE POLICY "Authenticated users can post messages" ON public.forum_mensagens FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Only the author or staff can delete/update messages
CREATE POLICY "Authors and staff can manage messages" ON public.forum_mensagens FOR ALL USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- 5. Storage Setup for Forum Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('forum', 'forum', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for forum bucket
CREATE POLICY "Anyone can view forum images" ON storage.objects FOR SELECT USING (bucket_id = 'forum');
CREATE POLICY "Authenticated users can upload forum images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'forum' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authors and staff can delete forum images" ON storage.objects FOR DELETE USING (
  bucket_id = 'forum' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte')))
);
