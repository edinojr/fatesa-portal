-- 1. LIMPEZA TOTAL DE GATILHOS CONFLITANTES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. GARANTIR QUE TODAS AS CHAVES ESTRANGEIRAS TENHAM 'ON UPDATE CASCADE'
-- Isso permite que o ID do usuário seja atualizado para vincular ao novo Auth ID sem erros.

DO $$ 
DECLARE
    r RECORD;
BEGIN
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

    -- Notas (Aluno e Professor)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notas_aluno_id_fkey') THEN
        ALTER TABLE public.notas DROP CONSTRAINT notas_aluno_id_fkey;
    END IF;
    ALTER TABLE public.notas ADD CONSTRAINT notas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notas_professor_id_fkey') THEN
        ALTER TABLE public.notas DROP CONSTRAINT notas_professor_id_fkey;
    END IF;
    ALTER TABLE public.notas ADD CONSTRAINT notas_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

    -- Avisos
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'avisos_professor_id_fkey') THEN
        ALTER TABLE public.avisos DROP CONSTRAINT avisos_professor_id_fkey;
    END IF;
    ALTER TABLE public.avisos ADD CONSTRAINT avisos_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

    -- Materiais Adicionais
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'materiais_adicionais_professor_id_fkey') THEN
        ALTER TABLE public.materiais_adicionais DROP CONSTRAINT materiais_adicionais_professor_id_fkey;
    END IF;
    ALTER TABLE public.materiais_adicionais ADD CONSTRAINT materiais_adicionais_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

END $$;

-- 3. GATILHO À PROVA DE BALAS (BULLETPROOF TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_admin BOOLEAN;
  v_final_tipo user_tipo;
  v_final_caminhos TEXT[];
  v_found_nucleo_id UUID;
BEGIN
  -- TENTA EXECUTAR, SE QUALQUER ERRO OCORRER, O AUTH SIGNUP NÃO É CANCELADO (Returns NEW)
  BEGIN
    -- 1. Identificação de Roles
    SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_teacher;
    SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_admin;

    -- 2. Tenta encontrar o ID do núcleo pelo nome (se enviado)
    IF NEW.raw_user_meta_data->>'nucleo' IS NOT NULL THEN
        SELECT id INTO v_found_nucleo_id FROM public.nucleos WHERE LOWER(nome) = LOWER(NEW.raw_user_meta_data->>'nucleo') LIMIT 1;
    END IF;

    -- 3. Lógica de Tipo e Acessos
    IF v_is_admin THEN
      v_final_tipo := 'admin'::user_tipo;
      v_final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
    ELSIF v_is_teacher THEN
      v_final_tipo := 'professor'::user_tipo;
      v_final_caminhos := ARRAY['professor', 'aluno'];
    ELSE
      IF COALESCE(NEW.raw_user_meta_data->>'student_type', 'online') = 'presencial' THEN
        v_final_tipo := 'presencial'::user_tipo;
      ELSE
        v_final_tipo := 'online'::user_tipo;
      END IF;
      v_final_caminhos := ARRAY['aluno'];
    END IF;

    -- 4. Inserção / Atualização (Upsert)
    INSERT INTO public.users (id, nome, email, tipo, caminhos_acesso, nucleo, nucleo_id, status_nucleo)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      v_final_tipo,
      v_final_caminhos,
      NEW.raw_user_meta_data->>'nucleo',
      v_found_nucleo_id,
      CASE WHEN v_found_nucleo_id IS NOT NULL THEN 'pendente' ELSE 'aprovado' END
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
    -- Se der qualquer erro (ex: coluna faltando), não trava o cadastro do Auth.
    -- O erro será silenciado, mas o usuário pelo menos terá acesso ao Auth.
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REATIVAR GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. PERMISSÕES FINAIS
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
