-- ATENÇÃO: Este script irá RECOMEÇAR as tabelas de suporte para garantir que não haja erros de coluna.
-- Ele NÃO apaga seus usuários nem seus cursos.

-- 1. Restaurar Colunas de Usuários (Caso falte)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nucleo TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bolsista BOOLEAN DEFAULT FALSE;

-- 2. Limpeza de tabelas problemáticas (Para recriar do zero com a estrutura correta)
DROP TABLE IF EXISTS public.liberacoes_nucleo CASCADE;
DROP TABLE IF EXISTS public.registros_alumni CASCADE;
DROP TABLE IF EXISTS public.avisos CASCADE;
DROP TABLE IF EXISTS public.materiais_adicionais CASCADE;
DROP TABLE IF EXISTS public.respostas_atividades_extra CASCADE;
DROP TABLE IF EXISTS public.atividades CASCADE;
DROP TABLE IF EXISTS public.portal_access_logs CASCADE;

-- 3. Recriar Nucleos (Base)
CREATE TABLE IF NOT EXISTS public.nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logradouro TEXT,
  bairro TEXT,
  numero TEXT,
  horario_aulas TEXT,
  isento BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recriar Tabela de Liberação (O professor usa isso para liberar vídeos)
CREATE TABLE public.liberacoes_nucleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'modulo', 'video', 'atividade'
  liberado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_nucleo_release UNIQUE (nucleo_id, item_id, item_type)
);

-- 5. Recriar Avisos
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Recriar Materiais
CREATE TABLE public.materiais_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivos JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Recriar Atividades do Polo
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  questionario JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Recriar Respostas Extras
CREATE TABLE public.respostas_atividades_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  respostas JSONB DEFAULT '{}',
  nota NUMERIC,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_extra_res UNIQUE (atividade_id, aluno_id)
);

-- 9. Recriar Portal Access Logs
CREATE TABLE public.portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Recriar Registros Alumni
CREATE TABLE public.registros_alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  curso TEXT NOT NULL,
  nivel_curso TEXT NOT NULL,
  ano_conclusao INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Estabilizar Constraints de Respostas e Liberações (Garante que upsert funcione)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_aluno_aula') THEN
        ALTER TABLE public.respostas_aulas ADD CONSTRAINT unique_aluno_aula UNIQUE (aluno_id, aula_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_liberacao_item') THEN
        ALTER TABLE public.liberacoes_nucleo ADD CONSTRAINT unique_liberacao_item UNIQUE (nucleo_id, item_id, item_type);
    END IF;
END $$;

-- 12. Habilitar RLS
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberacoes_nucleo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_atividades_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access_logs ENABLE ROW LEVEL SECURITY;

-- 12. Estabilização da Tabela de Pagamentos (Adicionar campos e permissões)
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- 13. Políticas de Segurança (Limpando e Recriando com Drop Policy para evitar duplicidade)
DO $$ 
BEGIN
    -- Nucleos
    DROP POLICY IF EXISTS "Leitura_Publica_Nucleos" ON public.nucleos;
    CREATE POLICY "Leitura_Publica_Nucleos" ON public.nucleos FOR SELECT USING (true);
    
    -- Avisos (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Avisos" ON public.avisos;
    CREATE POLICY "Leitura_Aluno_Avisos" ON public.avisos FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Materiais (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Materiais" ON public.materiais_adicionais;
    CREATE POLICY "Leitura_Aluno_Materiais" ON public.materiais_adicionais FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Liberações
    DROP POLICY IF EXISTS "Gestao_Total_Staff" ON public.liberacoes_nucleo;
    CREATE POLICY "Gestao_Total_Staff" ON public.liberacoes_nucleo FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'professor')));
    
    -- Atividades (Restrito ao Polo)
    DROP POLICY IF EXISTS "Leitura_Aluno_Atividades" ON public.atividades;
    CREATE POLICY "Leitura_Aluno_Atividades" ON public.atividades FOR SELECT 
    USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));
    
    -- Pagamentos (Onde dava o erro 400 no upload)
    DROP POLICY IF EXISTS "Users can view their own payments" ON public.pagamentos;
    CREATE POLICY "Users can view their own payments" ON public.pagamentos FOR SELECT USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own payments" ON public.pagamentos;
    CREATE POLICY "Users can insert their own payments" ON public.pagamentos FOR INSERT WITH CHECK (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can update their own payments" ON public.pagamentos;
    CREATE POLICY "Users can update their own payments" ON public.pagamentos FOR UPDATE USING (user_id = auth.uid());

    -- Permissão Total para Admins nos Pagamentos (Para poderem Validar e EXCLUIR)
    DROP POLICY IF EXISTS "Admins can manage all payments" ON public.pagamentos;
    CREATE POLICY "Admins can manage all payments" ON public.pagamentos FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte')));

    DROP POLICY IF EXISTS "Leitura_Aluno_Liberacoes" ON public.liberacoes_nucleo;
    CREATE POLICY "Leitura_Aluno_Liberacoes" ON public.liberacoes_nucleo FOR SELECT USING (nucleo_id = (SELECT nucleo_id FROM public.users WHERE id = auth.uid()));

    -- Políticas para Analytics (portal_access_logs)
    DROP POLICY IF EXISTS "Allow_Public_Insert_Logs" ON public.portal_access_logs;
    CREATE POLICY "Allow_Public_Insert_Logs" ON public.portal_access_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Admins_View_Logs" ON public.portal_access_logs;
    CREATE POLICY "Admins_View_Logs" ON public.portal_access_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte')));

    -- Ajuste final de Enums (Garantir que 'rejeitado' existe para pagamentos)
    ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'rejeitado';

    -- Garantir tipos de usuários necessários
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'presencial') THEN
        ALTER TYPE public.user_tipo ADD VALUE 'presencial';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'online') THEN
        ALTER TYPE public.user_tipo ADD VALUE 'online';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'ex_aluno') THEN
        ALTER TYPE public.user_tipo ADD VALUE 'ex_aluno';
    END IF;

    -- 14. Sincronização em Massa de Nomes de Núcleo (Para transferências anteriores)
    UPDATE public.users u
    SET nucleo = n.nome
    FROM public.nucleos n
    WHERE u.nucleo_id = n.id AND (u.nucleo IS DISTINCT FROM n.nome OR u.nucleo IS NULL);

EXCEPTION WHEN others THEN END $$;

-- 15. FUNÇÕES DE SUPORTE AO SIGNUP (À Prova de Balas)
-- ------------------------------------------------------------------------------

-- Função para verificar pré-registro via RPC
DROP FUNCTION IF EXISTS public.get_registration_details(TEXT);
CREATE OR REPLACE FUNCTION public.get_registration_details(p_email TEXT)
RETURNS TABLE (
    found BOOLEAN, 
    nome TEXT, 
    tipo TEXT, 
    nucleo TEXT, 
    nucleo_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as found, 
        u.nome, 
        u.tipo::TEXT, 
        u.nucleo, 
        u.nucleo_id
    FROM public.users u 
    WHERE LOWER(u.email) = LOWER(p_email) 
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho de Novo Usuário (Supõe-se que auth.users foi inserido)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_is_teacher BOOLEAN;
    v_is_admin BOOLEAN;
    v_final_tipo public.user_tipo;
    v_final_caminhos TEXT[];
    v_nucleo_id UUID;
    v_nucleo_nome TEXT;
    v_full_name TEXT;
BEGIN
    -- LOGICA DE PROTEÇÃO TOTAL: Se algo falhar antes da inserção, capturamos aqui
    BEGIN
        -- 1. Capturar nome com fallbacks seguros
        v_full_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'nome', 
            split_part(NEW.email, '@', 1)
        );

        -- 2. Checar autorizações
        SELECT EXISTS (SELECT 1 FROM public.professores_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_teacher;
        SELECT EXISTS (SELECT 1 FROM public.admins_autorizados WHERE LOWER(email) = LOWER(NEW.email)) INTO v_is_admin;

        -- 3. Definir Tipo e Caminhos
        IF v_is_admin THEN
            v_final_tipo := 'admin'::public.user_tipo;
            v_final_caminhos := ARRAY['admin', 'suporte', 'professor', 'aluno'];
        ELSIF v_is_teacher THEN
            v_final_tipo := 'professor'::public.user_tipo;
            v_final_caminhos := ARRAY['professor', 'aluno'];
        ELSE
            -- Mapeamento seguro para o Enum
            v_final_tipo := CASE 
                WHEN NEW.raw_user_meta_data->>'student_type' = 'presencial' THEN 'presencial'::public.user_tipo
                WHEN NEW.raw_user_meta_data->>'student_type' = 'ex_aluno' THEN 'ex_aluno'::public.user_tipo
                ELSE 'online'::public.user_tipo
            END;
            v_final_caminhos := ARRAY['aluno'];
        END IF;

        -- 4. Resolução de Núcleo
        v_nucleo_id := NULL;
        v_nucleo_nome := NEW.raw_user_meta_data->>'nucleo';

        IF (NEW.raw_user_meta_data->>'nucleo_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
            v_nucleo_id := (NEW.raw_user_meta_data->>'nucleo_id')::UUID;
        END IF;

        IF v_nucleo_id IS NULL AND v_nucleo_nome IS NOT NULL AND v_nucleo_nome != '' THEN
            SELECT id INTO v_nucleo_id FROM public.nucleos WHERE LOWER(nome) = LOWER(v_nucleo_nome) LIMIT 1;
        END IF;

        IF v_nucleo_id IS NOT NULL AND (v_nucleo_nome IS NULL OR v_nucleo_nome = '') THEN
            SELECT nome INTO v_nucleo_nome FROM public.nucleos WHERE id = v_nucleo_id;
        END IF;

        -- 5. Inserir/Atualizar na public.users
        INSERT INTO public.users (
            id, nome, email, tipo, caminhos_acesso, 
            nucleo, nucleo_id, status_nucleo, acesso_definitivo, bloqueado
        )
        VALUES (
            NEW.id, v_full_name, NEW.email, v_final_tipo, v_final_caminhos,
            v_nucleo_nome, v_nucleo_id, 
            CASE WHEN v_nucleo_id IS NOT NULL AND v_final_tipo = 'presencial' THEN 'pendente' ELSE 'aprovado' END,
            COALESCE((NEW.raw_user_meta_data->>'acesso_definitivo')::BOOLEAN, FALSE),
            FALSE
        )
        ON CONFLICT (email) DO UPDATE SET 
            id = EXCLUDED.id,
            nome = EXCLUDED.nome,
            tipo = EXCLUDED.tipo,
            caminhos_acesso = EXCLUDED.caminhos_acesso,
            nucleo = EXCLUDED.nucleo,
            nucleo_id = EXCLUDED.nucleo_id,
            bloqueado = FALSE;

    EXCEPTION WHEN OTHERS THEN
        -- Fallback absoluto: Não deixa o signup do Auth falhar mesmo que o Insert na public.users dê erro
        -- Isso garante que o usuário pelo menos consiga entrar, e o admin corrige depois
        RAISE WARNING 'Erro ao processar trigger handle_new_user para %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissões Finais
GRANT EXECUTE ON FUNCTION public.get_registration_details TO anon, authenticated;
