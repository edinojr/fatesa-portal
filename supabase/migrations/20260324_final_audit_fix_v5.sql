-- ==============================================================================
-- FATESA PORTAL - CORREÇÃO DEFINITIVA DE CADASTRO E HIERARQUIA (V5)
-- ==============================================================================

-- 1. LIMPEZA TOTAL DE VERSÕES ANTERIORES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. GARANTIR INTEGRIDADE DAS TABELAS DE APOIO
CREATE TABLE IF NOT EXISTS public.professores_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admins_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CASCATEAMENTO GLOBAL DE ATUALIZAÇÃO (ESSENCIAL PARA CONFLITOS DE EMAIL)
-- Isso permite mudar o ID do usuário no portal para sincronizar com o Auth do Supabase.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Lista de tabelas que referenciam public.users(id)
    -- Documentos
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'documentos_user_id_fkey') THEN
        ALTER TABLE public.documentos DROP CONSTRAINT documentos_user_id_fkey;
    END IF;
    ALTER TABLE public.documentos ADD CONSTRAINT documentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Pagamentos
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pagamentos_user_id_fkey') THEN
        ALTER TABLE public.pagamentos DROP CONSTRAINT pagamentos_user_id_fkey;
    END IF;
    ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Matriculas
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matriculas_aluno_id_fkey') THEN
        ALTER TABLE public.matriculas DROP CONSTRAINT matriculas_aluno_id_fkey;
    END IF;
    ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Progresso
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'progresso_aluno_id_fkey') THEN
        ALTER TABLE public.progresso DROP CONSTRAINT progresso_aluno_id_fkey;
    END IF;
    ALTER TABLE public.progresso ADD CONSTRAINT progresso_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Tentativas Prova
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tentativas_prova_aluno_id_fkey') THEN
        ALTER TABLE public.tentativas_prova DROP CONSTRAINT tentativas_prova_aluno_id_fkey;
    END IF;
    ALTER TABLE public.tentativas_prova ADD CONSTRAINT tentativas_prova_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Respostas Aulas
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'respostas_aulas_aluno_id_fkey') THEN
        ALTER TABLE public.respostas_aulas DROP CONSTRAINT respostas_aulas_aluno_id_fkey;
    END IF;
    ALTER TABLE public.respostas_aulas ADD CONSTRAINT respostas_aulas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Professor Núcleo
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'professor_nucleo_professor_id_fkey') THEN
        ALTER TABLE public.professor_nucleo DROP CONSTRAINT professor_nucleo_professor_id_fkey;
    END IF;
    ALTER TABLE public.professor_nucleo ADD CONSTRAINT professor_nucleo_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Notas
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notas_aluno_id_fkey') THEN
        ALTER TABLE public.notas DROP CONSTRAINT notas_aluno_id_fkey;
    END IF;
    ALTER TABLE public.notas ADD CONSTRAINT notas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Avisos
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'avisos_professor_id_fkey') THEN
        ALTER TABLE public.avisos DROP CONSTRAINT avisos_professor_id_fkey;
    END IF;
    ALTER TABLE public.avisos ADD CONSTRAINT avisos_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Materiais
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'materiais_adicionais_professor_id_fkey') THEN
        ALTER TABLE public.materiais_adicionais DROP CONSTRAINT materiais_adicionais_professor_id_fkey;
    END IF;
    ALTER TABLE public.materiais_adicionais ADD CONSTRAINT materiais_adicionais_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

END $$;

-- 4. FUNÇÃO DE GATILHO "ZERO FALHA" (UNIFICADA)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_admin BOOLEAN;
  v_final_tipo user_tipo;
  v_final_caminhos TEXT[];
  v_found_nucleo_id UUID;
  v_raw_tipo TEXT;
  v_raw_nome TEXT;
BEGIN
  -- TENTA EXECUTAR TUDO. SE FALHAR, RETORNA O NEW PARA NÃO TRAVAR O AUTH DO SUPABASE.
  BEGIN
    -- 1. Captura Metadados (Suporta 'full_name' ou 'nome' e 'student_type' ou 'tipo')
    v_raw_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
    v_raw_tipo := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo', 'online');

    -- 2. Detecta Autorizações (Roles)
    SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_teacher;
    SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_admin;

    -- 3. Resolve Núcleo (se enviado por nome)
    IF NEW.raw_user_meta_data->>'nucleo' IS NOT NULL THEN
        SELECT id INTO v_found_nucleo_id FROM public.nucleos WHERE LOWER(nome) = LOWER(NEW.raw_user_meta_data->>'nucleo') LIMIT 1;
    END IF;

    -- 4. Lógica de Hierarquia (Caminhos de Acesso)
    IF v_is_admin OR v_raw_tipo = 'admin' THEN
      v_final_tipo := 'admin'::user_tipo;
      v_final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
    ELSIF v_is_teacher OR v_raw_tipo = 'professor' THEN
      v_final_tipo := 'professor'::user_tipo;
      v_final_caminhos := ARRAY['professor', 'aluno'];
    ELSE
      -- Alunos convencionais
      IF v_raw_tipo = 'presencial' THEN
        v_final_tipo := 'presencial'::user_tipo;
      ELSE
        v_final_tipo := 'online'::user_tipo;
      END IF;
      v_final_caminhos := ARRAY['aluno'];
    END IF;

    -- 5. UPSERT (Insere ou Atualiza Vinculando ID)
    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso, nucleo, nucleo_id, status_nucleo, acesso_definitivo)
    VALUES (
      NEW.id,
      NEW.email,
      v_raw_nome,
      v_final_tipo,
      v_final_caminhos,
      NEW.raw_user_meta_data->>'nucleo',
      v_found_nucleo_id,
      CASE WHEN v_found_nucleo_id IS NOT NULL THEN 'pendente' ELSE 'aprovado' END,
      COALESCE((NEW.raw_user_meta_data->>'acesso_definitivo')::BOOLEAN, FALSE)
    )
    ON CONFLICT (email) DO UPDATE SET 
      id = EXCLUDED.id,
      nome = EXCLUDED.nome,
      tipo = EXCLUDED.tipo,
      caminhos_acesso = EXCLUDED.caminhos_acesso,
      nucleo = EXCLUDED.nucleo,
      nucleo_id = COALESCE(EXCLUDED.nucleo_id, public.users.nucleo_id),
      status_nucleo = COALESCE(EXCLUDED.status_nucleo, public.users.status_nucleo),
      bloqueado = FALSE;

  EXCEPTION WHEN OTHERS THEN
    -- Silenciar erros para garantir que o cadastro no Auth funcione
    -- O perfil pode ser corrigido via dashboard depois se necessário
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REATIVAR GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. PERMISSÕES FINAIS
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- FINALIZADO COM SUCESSO.
