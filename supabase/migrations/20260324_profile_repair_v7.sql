-- ==============================================================================
-- FATESA PORTAL - REPARAÇÃO DE PERFIS E SINCRONIZAÇÃO (V7)
-- ==============================================================================

-- 1. SINCRONIZAR PERFIS FALTANTES
-- Este bloco cria perfis para qualquer usuário que exista no Auth mas NÃO no Portal
-- (Resolve o problema dos usuários criados durante o teste de diagnóstico)

DO $$ 
DECLARE
    r RECORD;
    v_nome TEXT;
    v_tipo TEXT;
    v_caminhos TEXT[];
BEGIN
    FOR r IN (
        SELECT au.* 
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    ) LOOP
        -- Tenta extrair o nome dos metadados ou usa o email
        v_nome := COALESCE(
            r.raw_user_meta_data->>'full_name', 
            r.raw_user_meta_data->>'nome', 
            split_part(r.email, '@', 1)
        );

        -- Lógica de tipo simplificada para a reparação
        v_tipo := COALESCE(r.raw_user_meta_data->>'student_type', r.raw_user_meta_data->>'tipo', 'online');
        
        -- Garante que o tipo seja válido para o enum
        IF v_tipo NOT IN ('presencial', 'online', 'professor', 'admin') THEN
            v_tipo := 'online';
        END IF;

        -- Define caminhos básicos
        IF v_tipo = 'admin' THEN
          v_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
        ELSIF v_tipo = 'professor' THEN
          v_caminhos := ARRAY['professor', 'aluno'];
        ELSE
          v_caminhos := ARRAY['aluno'];
        END IF;

        -- Insere o perfil faltante
        INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso)
        VALUES (r.id, r.email, v_nome, v_tipo::public.user_tipo, v_caminhos)
        ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id;
        
        RAISE NOTICE 'Perfil reparado para: %', r.email;
    END LOOP;
END $$;

-- 2. GARANTIR QUE O GATILHO V6 ESTÁ ATIVO
-- (Reforçamos a versão definitiva do gatilho)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nome TEXT;
  v_tipo TEXT;
  v_caminhos TEXT[];
BEGIN
  BEGIN
    v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
    v_tipo := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo', 'online');
    
    IF v_tipo NOT IN ('presencial', 'online', 'professor', 'admin') THEN
        v_tipo := 'online';
    END IF;

    IF v_tipo = 'admin' THEN v_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
    ELSIF v_tipo = 'professor' THEN v_caminhos := ARRAY['professor', 'aluno'];
    ELSE v_caminhos := ARRAY['aluno'];
    END IF;

    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso)
    VALUES (NEW.id, NEW.email, v_nome, v_tipo::public.user_tipo, v_caminhos)
    ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, nome = EXCLUDED.nome, tipo = EXCLUDED.tipo;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REAFIRMAR PERMISSÕES (IMPORTANTE PARA O ERRO 406/Not Acceptable)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Garante que usuários autenticados possam ver seus próprios perfis
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.users;
CREATE POLICY "Usuários podem ver o próprio perfil" ON public.users FOR SELECT USING (auth.uid() = id);

-- Garante que o trigger possa inserir (via SECURITY DEFINER acima já deve funcionar)
GRANT ALL ON public.users TO postgres, service_role, authenticated, anon;
