
-- 1. Create Alumni Records Table (Historical Formed Students)
CREATE TABLE IF NOT EXISTS public.registros_alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  curso TEXT,
  nucleo TEXT,
  ano_formacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS for Alumni Records
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;

-- Only admins/staff can manage alumni records
CREATE POLICY "Admins and staff can manage alumni records" ON public.registros_alumni FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor', 'suporte'))
);

-- 3. Update the handle_new_user function to be ROBUST against different metadata formats
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  is_support BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
  meta_type TEXT;
  meta_nome TEXT;
BEGIN
  -- 1. Identificação de Papéis (Prioridade sobre Metadata)
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;
  
  -- 2. Extração de Metadata (Suporte a múltiplos nomes de chaves)
  -- student_type (Cadastro Aluno) OR tipo (Cadastro Admin)
  meta_type := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo');
  -- full_name (Cadastro Aluno) OR nome (Cadastro Admin)
  meta_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  -- 3. Definição de Tipo
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
  ELSE
    -- Se não for admin/prof autorizado, usa o tipo da metadata com fallback seguro
    CASE COALESCE(meta_type, 'online')
      WHEN 'presencial' THEN final_tipo := 'presencial'::user_tipo;
      WHEN 'super_visitante' THEN final_tipo := 'super_visitante'::user_tipo;
      WHEN 'ex_aluno' THEN final_tipo := 'ex_aluno'::user_tipo;
      WHEN 'colaborador' THEN final_tipo := 'colaborador'::user_tipo;
      WHEN 'admin' THEN final_tipo := 'admin'::user_tipo;
      WHEN 'professor' THEN final_tipo := 'professor'::user_tipo;
      WHEN 'suporte' THEN final_tipo := 'suporte'::user_tipo;
      ELSE final_tipo := 'online'::user_tipo;
    END CASE;
  END IF;

  -- 4. Definição de Caminhos (Paths)
  IF final_tipo = 'admin' THEN
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF final_tipo = 'professor' THEN
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSIF final_tipo = 'suporte' THEN
    final_caminhos := ARRAY['suporte', 'professor', 'aluno'];
  ELSE
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- 5. Inserção ou Atualização (Tratamento de Conflitos)
  INSERT INTO public.users (
    id, 
    nome, 
    email, 
    tipo, 
    caminhos_acesso, 
    nucleo,
    acesso_definitivo
  )
  VALUES (
    NEW.id,
    meta_nome,
    NEW.email,
    final_tipo,
    final_caminhos,
    NEW.raw_user_meta_data->>'nucleo',
    COALESCE((NEW.raw_user_meta_data->>'acesso_definitivo')::BOOLEAN, false)
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo = EXCLUDED.nucleo,
    acesso_definitivo = EXCLUDED.acesso_definitivo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
