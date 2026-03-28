-- 1. ADICIONAR CASCADE NAS CHAVES ESTRANGEIRAS QUE APONTAM PARA USERS(ID)
-- Isso permite o gatilho de cadastro atualizar o ID do Usuário se houver conflito de email
-- (ex: quando um aluno é pré-cadastrado manualmente e depois tenta se 'ativar' via signup)

-- Documentos
ALTER TABLE IF EXISTS public.documentos 
  DROP CONSTRAINT IF EXISTS documentos_user_id_fkey,
  ADD CONSTRAINT documentos_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Pagamentos
ALTER TABLE IF EXISTS public.pagamentos 
  DROP CONSTRAINT IF EXISTS pagamentos_user_id_fkey,
  ADD CONSTRAINT pagamentos_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Matriculas
ALTER TABLE IF EXISTS public.matriculas 
  DROP CONSTRAINT IF EXISTS matriculas_aluno_id_fkey,
  ADD CONSTRAINT matriculas_aluno_id_fkey 
  FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Progresso
ALTER TABLE IF EXISTS public.progresso 
  DROP CONSTRAINT IF EXISTS progresso_aluno_id_fkey,
  ADD CONSTRAINT progresso_aluno_id_fkey 
  FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Tentativas Prova
ALTER TABLE IF EXISTS public.tentativas_prova 
  DROP CONSTRAINT IF EXISTS tentativas_prova_aluno_id_fkey,
  ADD CONSTRAINT tentativas_prova_aluno_id_fkey 
  FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. GATILHO COMPLETO E DEFINITIVO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_teacher BOOLEAN;
  is_admin BOOLEAN;
  final_tipo user_tipo;
  final_caminhos TEXT[];
BEGIN
  -- Segurança 1: Identificar se o email está pré-autorizado
  SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_teacher;
  SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO is_admin;

  -- Segurança 2: Determinar o tipo correto
  IF is_admin THEN
    final_tipo := 'admin'::user_tipo;
    final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
  ELSIF is_teacher THEN
    final_tipo := 'professor'::user_tipo;
    final_caminhos := ARRAY['professor', 'aluno'];
  ELSE
    -- Se não for staff, usa o tipo vindo do frontend ou padrão 'online'
    IF COALESCE(NEW.raw_user_meta_data->>'student_type', 'online') = 'presencial' THEN
      final_tipo := 'presencial'::user_tipo;
    ELSE
      final_tipo := 'online'::user_tipo;
    END IF;
    final_caminhos := ARRAY['aluno'];
  END IF;

  -- Segurança 3: Inserção/Atualização com Tratamento de Conflito de Email
  -- O uso de EXCLUDED.id agora é seguro graças aos CASCADEs acima
  INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso, nucleo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    final_tipo,
    final_caminhos,
    NEW.raw_user_meta_data->>'nucleo'
  )
  ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    caminhos_acesso = EXCLUDED.caminhos_acesso,
    nucleo = EXCLUDED.nucleo,
    bloqueado = FALSE; -- Garante que ao se cadastrar o acesso não esteja bloqueado (reset)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular o gatilho se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
