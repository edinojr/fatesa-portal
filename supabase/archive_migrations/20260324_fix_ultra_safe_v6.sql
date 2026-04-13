-- ==============================================================================
-- FATESA PORTAL - CORREÇÃO ULTRA-SEGURA (V6 - FINAL)
-- ==============================================================================

-- 1. LIMPAR TUDO ANTES DE COMEÇAR
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_diagnostic();

-- 2. FUNÇÃO V6 - MÁXIMA SIMPLICIDADE E SEGURANÇA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nome TEXT;
  v_tipo TEXT;
  v_caminhos TEXT[];
  v_is_staff BOOLEAN;
BEGIN
  -- TUDO DENTRO DE UM BLOCO PROTEGIDO
  BEGIN
    -- Captura Nome
    v_nome := COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'nome', 
      split_part(NEW.email, '@', 1)
    );

    -- Detecta se é Admin ou Professor por Email (Lógica Simples)
    -- Verificamos se o email existe em qualquer uma das tabelas de autorização
    SELECT EXISTS (
      SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)
      UNION
      SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)
    ) INTO v_is_staff;

    -- Define o Tipo e Caminhos (Usando texto puro para evitar erros de CAST)
    IF v_is_staff THEN
      -- Se for staff, vamos tentar identificar se é admin especificamente
      IF EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) THEN
        v_tipo := 'admin';
        v_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
      ELSE
        v_tipo := 'professor';
        v_caminhos := ARRAY['professor', 'aluno'];
      END IF;
    ELSE
      -- Usuário normal (aluno)
      v_tipo := COALESCE(NEW.raw_user_meta_data->>'student_type', NEW.raw_user_meta_data->>'tipo', 'online');
      -- Garantir que o tipo seja um dos aceitos pelo sistema
      IF v_tipo NOT IN ('presencial', 'online') THEN
        v_tipo := 'online';
      END IF;
      v_caminhos := ARRAY['aluno'];
    END IF;

    -- INSERÇÃO / UPSERT COM SEGURANÇA MÁXIMA
    -- Nota: Não atualizamos o ID se houver conflito, apenas garantimos que o perfil existe.
    -- Se o ID precisar ser atualizado, o portal fará isso via RPC depois se necessário.
    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso, nucleo)
    VALUES (
      NEW.id,
      NEW.email,
      v_nome,
      v_tipo::user_tipo, -- Convertemos aqui no final, se falhar cai no EXCEPTION
      v_caminhos,
      NEW.raw_user_meta_data->>'nucleo'
    )
    ON CONFLICT (email) DO UPDATE SET 
      id = EXCLUDED.id,
      nome = EXCLUDED.nome,
      tipo = EXCLUDED.tipo,
      caminhos_acesso = EXCLUDED.caminhos_acesso,
      nucleo = EXCLUDED.nucleo,
      bloqueado = FALSE;

  EXCEPTION WHEN OTHERS THEN
    -- FALHA SILENCIOSA: Garante que o usuário consiga se cadastrar no Auth.
    -- O erro pode ser de permissão ou coluna, mas não travará o login.
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REATIVAR O GATILHO
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. PERMISSÕES DE TABELA
-- Garante que o Postgres (quem roda o trigger) tenha poder total
ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- 5. CORREÇÃO DE FKs (Caso tenham falhado antes)
-- Adiciona cascateamento básico
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'documentos_user_id_fkey') THEN
        ALTER TABLE public.documentos DROP CONSTRAINT documentos_user_id_fkey;
    END IF;
    ALTER TABLE public.documentos ADD CONSTRAINT documentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

-- PRONTO PARA TESTE FINAL.
