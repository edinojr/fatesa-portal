-- Cria a tabela para armazenar as respostas e notas das atividades e provas
CREATE TABLE IF NOT EXISTS respostas_aulas (
  id uuid default uuid_generate_v4() primary key,
  aluno_id uuid references auth.users(id) not null,
  aula_id uuid references public.aulas(id) not null,
  respostas jsonb not null default '{}'::jsonb,
  nota numeric default null,
  status text default 'pendente' check (status in ('pendente', 'corrigida')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  UNIQUE (aluno_id, aula_id)
);

-- Políticas RLS genéricas para permitir operações autenticadas (Ajuste conforme suas restrições de RLS)
ALTER TABLE respostas_aulas ENABLE ROW LEVEL SECURITY;

-- Estudantes podem inserir suas respostas e ler suas próprias notas
CREATE POLICY "Estudantes inserem" ON respostas_aulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = aluno_id);
CREATE POLICY "Estudantes leem próprias notas" ON respostas_aulas FOR SELECT TO authenticated USING (auth.uid() = aluno_id);

-- Professores / Administradores podem ler todas e alterar nota e status
CREATE POLICY "Suporte admin le tudo" ON respostas_aulas FOR ALL TO authenticated USING (
    (SELECT tipo FROM users WHERE id = auth.uid()) IN ('admin', 'suporte', 'professor')
);
