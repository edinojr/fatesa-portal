-- 1. Tabela de Núcleos (Polos da Fatesa)
CREATE TABLE IF NOT EXISTS public.nucleos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de vínculo entre Professores e Núcleos (Um professor pode atuar em vários polos)
CREATE TABLE IF NOT EXISTS public.professor_nucleo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(professor_id, nucleo_id)
);

-- 3. Adicionar coluna 'nucleo_id' aos alunos
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;

-- 4. Tabela de Atividades (criadas pelo professor para a sua turma/núcleo)
CREATE TABLE IF NOT EXISTS public.atividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_limite TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Notas
CREATE TABLE IF NOT EXISTS public.notas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nota NUMERIC(5,2) NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(aluno_id, atividade_id) -- Apenas 1 nota por atividade para cada aluno
);

-- Segurança e Políticas de Acesso (RLS)
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_nucleo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

-- Regras Núcleos
CREATE POLICY "Acesso público de leitura aos núcleos" ON public.nucleos FOR SELECT USING (true);
CREATE POLICY "Admins podem alterar nucleos" ON public.nucleos FOR ALL USING ((auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com'));

-- Regras Vínculo Professor_Núcleo
CREATE POLICY "Admins e professores podem ler e alterar professor_nucleo" ON public.professor_nucleo FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com') OR auth.uid() = professor_id
);

-- Regras Atividades
CREATE POLICY "Acesso de leitura atividades" ON public.atividades FOR SELECT USING (true);
CREATE POLICY "Professores gerenciam atividades" ON public.atividades FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professor_nucleo WHERE professor_id = auth.uid() AND nucleo_id = atividades.nucleo_id) OR
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- Regras Notas
CREATE POLICY "Alunos leem as proprias notas / Professores leem tudo" ON public.notas FOR SELECT USING (
  auth.uid() = aluno_id OR 
  EXISTS (SELECT 1 FROM public.professor_nucleo pn JOIN public.users u ON u.nucleo_id = pn.nucleo_id WHERE pn.professor_id = auth.uid() AND u.id = notas.aluno_id) OR
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

CREATE POLICY "Professores alteram notas de sua turma" ON public.notas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professor_nucleo pn JOIN public.users u ON u.nucleo_id = pn.nucleo_id WHERE pn.professor_id = auth.uid() AND u.id = notas.aluno_id) OR
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);
