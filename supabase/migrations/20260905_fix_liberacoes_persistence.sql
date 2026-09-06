-- ============================================================
-- FIX: persistência das liberações (liberacoes_nucleo)
-- 1) Dedupe de linhas globais duplicadas (nucleo_id NULL) — NULLs são
--    distintos na UNIQUE padrão, gerando duplicatas que quebram o
--    maybeSingle() da Lesson (PGRST116) e "somem" liberações.
-- 2) UNIQUE com NULLS NOT DISTINCT (PG15+): upserts globais passam a
--    conflitar corretamente em vez de duplicar.
-- 3) RLS em estado final: leitura para todos autenticados; escrita para
--    staff (admin/professor/suporte/colaborador OU caminhos_acesso).
--    Políticas FOR ALL antigas conflitantes são removidas.
-- 4) Reload do schema do PostgREST.
-- Rodar no SQL Editor do Supabase (ou via CLI). Idempotente.
-- ============================================================

-- 1) Dedupe de linhas com nucleo_id NULL (mantém a mais antiga)
DELETE FROM liberacoes_nucleo a
USING liberacoes_nucleo b
WHERE a.id > b.id
  AND a.nucleo_id IS NULL
  AND b.nucleo_id IS NULL
  AND a.item_id = b.item_id
  AND a.item_type = b.item_type;

-- 2) UNIQUE (nucleo_id, item_id, item_type) — com NULLS NOT DISTINCT quando PG15+
DO $$
DECLARE
  pg_major int := current_setting('server_version_num')::int / 10000;
BEGIN
  -- Remove constraints/uniques antigos dessa combinação
  EXECUTE $ddl$
    ALTER TABLE liberacoes_nucleo
      DROP CONSTRAINT IF EXISTS liberacoes_nucleo_nucleo_id_item_id_item_type_key
  $ddl$;
  EXECUTE $ddl$
    ALTER TABLE liberacoes_nucleo
      DROP CONSTRAINT IF EXISTS unique_nucleo_release
  $ddl$;
  DROP INDEX IF EXISTS liberacoes_nucleo_nucleo_item_type_uniq;

  IF pg_major >= 15 THEN
    EXECUTE $ddl$
      ALTER TABLE liberacoes_nucleo
        ADD CONSTRAINT liberacoes_nucleo_nucleo_id_item_id_item_type_key
        UNIQUE NULLS NOT DISTINCT (nucleo_id, item_id, item_type)
    $ddl$;
  ELSE
    EXECUTE $ddl$
      ALTER TABLE liberacoes_nucleo
        ADD CONSTRAINT liberacoes_nucleo_nucleo_id_item_id_item_type_key
        UNIQUE (nucleo_id, item_id, item_type)
    $ddl$;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) RLS em estado final
ALTER TABLE liberacoes_nucleo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "liberacoes_leitura_todos" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "liberacoes_gestao_staff" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "Gestao_Total_Staff" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "Staff_Or_Paths_Liberacoes_Nucleo" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "liberacoes_select_aluno_nucleo" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "liberacoes_select_staff" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "release_control_select" ON liberacoes_nucleo;
DROP POLICY IF EXISTS "release_control_all_staff" ON liberacoes_nucleo;

CREATE POLICY "liberacoes_leitura_todos" ON liberacoes_nucleo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "liberacoes_gestao_staff" ON liberacoes_nucleo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte', 'colaborador')
          OR u.caminhos_acesso && ARRAY['admin', 'professor', 'suporte', 'colaborador']
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte', 'colaborador')
          OR u.caminhos_acesso && ARRAY['admin', 'professor', 'suporte', 'colaborador']
        )
    )
  );

GRANT ALL ON liberacoes_nucleo TO authenticated;

-- 4) Reload do schema do PostgREST
NOTIFY pgrst, 'reload schema';
