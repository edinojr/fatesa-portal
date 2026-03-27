-- 1. Add 'questionario' column to 'atividades' table
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '[]';

-- 2. Create the 'respostas_atividades_extra' table
CREATE TABLE IF NOT EXISTS public.respostas_atividades_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  respostas JSONB NOT NULL DEFAULT '{}',
  nota NUMERIC(5,2),
  tentativas INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'corrigida')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(aluno_id, atividade_id)
);

-- 3. Enable Row Level Security
ALTER TABLE public.respostas_atividades_extra ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Students can see their own responses
CREATE POLICY "Students can view their own extra responses" ON public.respostas_atividades_extra 
FOR SELECT USING (auth.uid() = aluno_id);

-- Students can insert their own responses
CREATE POLICY "Students can submit extra responses" ON public.respostas_atividades_extra 
FOR INSERT WITH CHECK (auth.uid() = aluno_id);

-- Professors and Admins can manage all extra responses
CREATE POLICY "Staff can manage extra responses" ON public.respostas_atividades_extra 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- 5. Comment for documentation
COMMENT ON COLUMN public.atividades.questionario IS 'Interactive questionnaire for extra nucleus activities';
COMMENT ON TABLE public.respostas_atividades_extra IS 'Stores student submissions for nucleus-specific extra activities';
