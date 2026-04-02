-- 1. BASE STRUCTURE: Nucleos and Professor-Nucleo Links
CREATE TABLE IF NOT EXISTS public.nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logradouro TEXT,
  bairro TEXT,
  numero TEXT,
  horario_aulas TEXT,
  isento BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.professor_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_prof_nucleo UNIQUE (professor_id, nucleo_id)
);

-- 2. USER ENHANCEMENTS
-- Link student to their Nucleo and add Bolsista/Scholarship flag
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bolsista BOOLEAN DEFAULT FALSE;
-- Add status for alumni/formados registration
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status_nucleo TEXT DEFAULT 'aprovado';

-- 3. CONTENT: Avisos (Announcements)
CREATE TABLE IF NOT EXISTS public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL, -- Field updated from 'texto' to match frontend
  prioridade TEXT DEFAULT 'normal', -- 'urgente' ou 'normal'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CONTENT: Materiais Complementares (Extra Materials)
CREATE TABLE IF NOT EXISTS public.materiais_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivos JSONB DEFAULT '[]', -- Field updated from 'arquivo_url' to JSONB list
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CONTENT: Atividades Extras do Polo (Extra Polo Activities)
CREATE TABLE IF NOT EXISTS public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  questionario JSONB DEFAULT '[]', -- Field for matching/quiz questions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CONTENT: Respostas das Atividades Extras
CREATE TABLE IF NOT EXISTS public.respostas_atividades_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  respostas JSONB DEFAULT '{}',
  nota NUMERIC,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'corrigida'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_extra_res UNIQUE (atividade_id, aluno_id)
);

-- 7. RELEASES & TRACKING (From Previous Fix)
CREATE TABLE IF NOT EXISTS public.liberacoes_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  liberado BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT unique_nucleo_release UNIQUE (nucleo_id, item_id, item_type)
);

CREATE TABLE IF NOT EXISTS public.portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ALUMNI MANAGEMENT (Graduating Students)
CREATE TABLE IF NOT EXISTS public.registros_alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  curso TEXT NOT NULL,
  nivel_curso TEXT NOT NULL, -- Added recently for grouping (Graduation, Post-grad)
  ano_conclusao INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. AULAS ENHANCEMENTS (For Grading Logic)
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS is_bloco_final BOOLEAN DEFAULT FALSE;

-- 10. ENABLE RLS FOR EVERYTHING
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_nucleo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_atividades_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;

-- 11. BASIC RLS POLICIES (Allowing logged-in users to read)
DO $$ 
BEGIN
    CREATE POLICY "Anyone can view nucleos" ON public.nucleos FOR SELECT USING (true);
    CREATE POLICY "Anyone can view avisos" ON public.avisos FOR SELECT USING (true);
    CREATE POLICY "Anyone can view materiais" ON public.materiais_adicionais FOR SELECT USING (true);
    CREATE POLICY "Anyone can view atividades" ON public.atividades FOR SELECT USING (true);
    CREATE POLICY "Anyone can view alumni" ON public.registros_alumni FOR SELECT USING (true);
EXCEPTION WHEN others THEN END $$;

-- 12. PERMISSIVE POLICIES FOR ADMINS/PROFESSORS
DO $$ 
BEGIN
    CREATE POLICY "Admins manage all" ON public.nucleos FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin'));
    CREATE POLICY "Admins manage avisos" ON public.avisos FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor')));
EXCEPTION WHEN others THEN END $$;
