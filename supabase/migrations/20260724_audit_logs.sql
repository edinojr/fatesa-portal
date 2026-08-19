-- ==============================================================================
-- #3 AUDIT LOGS — Rastreio de ações administrativas críticas
-- ==============================================================================
-- Cria a tabela audit_logs + trigger genérico AFTER INSERT/UPDATE/DELETE em
-- tabelas sensíveis: liberacoes de provas, exceções, respostas/notas, pagamentos,
-- users (bloqueio/escopos), registros_alumni (certificados), historico_notas,
-- frequencia e documentos.
--
-- Aplicar via: supabase db execute / psql conectado ao banco do projeto.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  usuario_email TEXT,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  registro_id TEXT,
  payload JSONB,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_usuario_id_idx ON public.audit_logs (usuario_id);
CREATE INDEX IF NOT EXISTS audit_logs_tabela_idx ON public.audit_logs (tabela, operacao);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins/suporte podem ler; ninguém altera manualmente via client.
DROP POLICY IF EXISTS audit_logs_read_admin ON public.audit_logs;
CREATE POLICY audit_logs_read_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.tipo IN ('admin','suporte')
             OR (u.caminhos_acesso)::text[] && ARRAY['admin','suporte'])
    )
  );

DROP POLICY IF EXISTS audit_logs_no_write ON public.audit_logs;
CREATE POLICY audit_logs_no_write ON public.audit_logs
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ------------------------------------------------------------------------------
-- Função trigger genérica (SECURITY DEFINER para enxergar todas as tabelas)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_email TEXT;
  v_payload JSONB;
  v_changes JSONB;
  v_id TEXT;
  v_row RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_payload := to_jsonb(OLD);
    v_changes := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_row := NEW;
    v_payload := to_jsonb(NEW);
    v_changes := NULL;
  ELSE  -- UPDATE
    v_row := NEW;
    v_payload := to_jsonb(NEW);
    v_changes := to_jsonb(NEW) - to_jsonb(OLD);
    -- Se nada mudou, não loga (skip no-op updates)
    IF v_changes = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;

  -- Extrai id (PK típica)
  BEGIN
    v_id := to_jsonb(v_row) ->> 'id';
  EXCEPTION WHEN OTHERS THEN v_id := NULL; END;

  -- Busca e-mail do usuário ator (se auth.uid resolver)
  BEGIN
    SELECT email INTO v_email FROM public.users WHERE id = v_user;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  INSERT INTO public.audit_logs
    (usuario_id, usuario_email, tabela, operacao, registro_id, payload, changes, created_at)
  VALUES
    (v_user, v_email, TG_TABLE_NAME, TG_OP, v_id, v_payload, v_changes, now());

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ------------------------------------------------------------------------------
-- Helpers para (re)criar triggers de auditoria em lote
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'liberacoes_nucleo',
    'liberacoes_excecao',
    'liberacoes_excecao_atividade',
    'respostas_aulas',
    'pagamentos',
    'users',
    'registros_alumni',
    'historico_notas',
    'frequencia',
    'documentos'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'audit_' || t, t);
      EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
                     'FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();',
                     'audit_' || t, t);
      RAISE NOTICE 'Trigger audit_% criado em %', t, t;
    ELSE
      RAISE NOTICE 'Tabela % não existe — trigger ignorado', t;
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.audit_logs IS 'Rastreio de ações administrativas críticas (liberação, notas, pagamentos, bloqueios, certificados) — nunca limpar manualmente sem backup.';