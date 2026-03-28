/*
  Fatesa Casa do Saber - Supabase Database Schema
*/

-- 1. Create Custom Enums
CREATE TYPE user_tipo AS ENUM ('presencial', 'online', 'professor', 'admin');
CREATE TYPE aula_tipo AS ENUM ('gravada', 'ao_vivo');
CREATE TYPE documento_tipo AS ENUM ('rg', 'cnh', 'residencia', 'exame', 'outro');
CREATE TYPE status_verificacao AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE pagamento_status AS ENUM ('aberto', 'pago', 'atrasado');

-- 2. Create Tables
-- Users Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cpf TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  curso_opcao TEXT,
  nucleo TEXT,
  tipo user_tipo NOT NULL DEFAULT 'online',
  bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  caminhos_acesso TEXT[] DEFAULT ARRAY['aluno'],
  acesso_definitivo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for pre-registered teachers
CREATE TABLE IF NOT EXISTS public.professores_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
BEGIN
  -- Check if the email is pre-registered as a teacher
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE email = NEW.email) INTO is_teacher;

  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE WHEN is_teacher THEN 'professor'::user_tipo ELSE 'online'::user_tipo END,
    CASE WHEN is_teacher THEN ARRAY['professor'] ELSE ARRAY['aluno'] END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enrollment Requests Table (for new leads)
CREATE TABLE IF NOT EXISTS public.solicitacoes_matricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  curso_opcao TEXT,
  modalidade user_tipo NOT NULL DEFAULT 'online',
  nucleo TEXT,
  status status_verificacao NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.solicitacoes_matricula ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request
CREATE POLICY "Anyone can submit enrollment requests" ON public.solicitacoes_matricula FOR INSERT WITH CHECK (true);
-- Only admins can see and manage them
CREATE POLICY "Admins can view and manage requests" ON public.solicitacoes_matricula FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Cursos Table
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_curso_nome UNIQUE (nome)
);

-- Livros Table
CREATE TABLE IF NOT EXISTS public.livros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  pdf_url TEXT,
  duracao_meses INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aulas Table
CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id UUID NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  video_url TEXT,
  tipo aula_tipo NOT NULL DEFAULT 'gravada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Matriculas Table
CREATE TABLE IF NOT EXISTS public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_matricula UNIQUE (aluno_id, curso_id)
);

-- Progresso Table
CREATE TABLE IF NOT EXISTS public.progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  concluida BOOLEAN DEFAULT FALSE,
  nota_questionario NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_progresso UNIQUE (aluno_id, aula_id)
);

-- Tentativas de Provas Table
CREATE TABLE IF NOT EXISTS public.tentativas_prova (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  livro_id UUID NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  nota NUMERIC,
  tentativas INTEGER DEFAULT 1,
  resetada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_prova ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users Policies:
-- Users can read their own data
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
-- Admins can read all data
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Cursos Policies:
-- Everyone (logged in) can view courses
CREATE POLICY "Anyone can view courses" ON public.cursos FOR SELECT USING (auth.uid() IS NOT NULL);

-- Livros Policies:
-- Students can only see books of courses they are enrolled in
CREATE POLICY "Students can view books of their courses" ON public.livros FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matriculas 
    WHERE public.matriculas.curso_id = public.livros.curso_id 
    AND public.matriculas.aluno_id = auth.uid()
  )
);
-- Admins/Professors can see all books
CREATE POLICY "Admins and Professors can view all books" ON public.livros FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- Aulas Policies:
-- Students can see lessons of books they have access to
CREATE POLICY "Students can view lessons" ON public.aulas FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.livros 
    JOIN public.matriculas ON public.matriculas.curso_id = public.livros.curso_id
    WHERE public.livros.id = public.aulas.livro_id
    AND public.matriculas.aluno_id = auth.uid()
  )
);
-- Admins/Professors can see all lessons
CREATE POLICY "Admins and Professors can view all lessons" ON public.aulas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- Matriculas Policies:
-- Users can see their own enrollments
CREATE POLICY "Users can view their own enrollments" ON public.matriculas FOR SELECT USING (aluno_id = auth.uid());
-- Admins/Professors can see all enrollments
CREATE POLICY "Admins and Professors can view all enrollments" ON public.matriculas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- Progresso Policies:
-- Users can see and update their own progress
CREATE POLICY "Users can view their own progress" ON public.progresso FOR SELECT USING (aluno_id = auth.uid());
CREATE POLICY "Users can insert/update their own progress" ON public.progresso FOR ALL USING (aluno_id = auth.uid());
-- Admins/Professors can see all progress
CREATE POLICY "Admins and Professors can view all progress" ON public.progresso FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- Tentativas Prova Policies:
-- Users can see their own attempts
CREATE POLICY "Users can view their own attempts" ON public.tentativas_prova FOR SELECT USING (aluno_id = auth.uid());
-- Admins/Professors can see all attempts
CREATE POLICY "Admins and Professors can view all attempts" ON public.tentativas_prova FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);

-- 5. Insert Initial Data
INSERT INTO public.cursos (nome) VALUES ('Básico'), ('Intermediário') ON CONFLICT DO NOTHING;

-- 6. Document and Payment Management System

-- Enums


-- Documentos Table
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo documento_tipo NOT NULL,
  url TEXT NOT NULL,
  status status_verificacao NOT NULL DEFAULT 'pendente',
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pagamentos Table
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  status pagamento_status NOT NULL DEFAULT 'aberto',
  comprovante_url TEXT,
  feedback TEXT,
  data_vencimento DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Documentos
CREATE POLICY "Users can view their own documents" ON public.documentos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own documents" ON public.documentos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins and Professors can view all documents" ON public.documentos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);
CREATE POLICY "Admins can update documents" ON public.documentos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- RLS Policies for Pagamentos
CREATE POLICY "Users can view their own payments" ON public.pagamentos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own payments (upload receipt)" ON public.pagamentos FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins and Professors can view all payments" ON public.pagamentos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor'))
);
CREATE POLICY "Admins can update payments" ON public.pagamentos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);
