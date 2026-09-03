-- ==============================================================================
-- CORREÇÃO ALUMNI v3: RLS reconhece staff por caminhos_acesso (além de tipo)
-- ------------------------------------------------------------------------------
-- PROBLEMA (403 persistente): o usuário de suporte (edi.ben.jr@gmail.com) possui
--   tipo = 'online' mas caminhos_accesso = [admin, suporte, professor, aluno].
--   A UI libera o painel por caminhos_acesso, porém a política
--   "Staff_Total_Access_Alumni" valida apenas tipo IN ('admin','professor',
--   'suporte') -> toda escrita em registros_alumni retorna 403.
--
-- SOLUÇÃO: estender a verificação para aceitar também o overlap em
--   caminhos_acresso — o mesmo padrão já usado pelas políticas da tabela
--   historico_notas neste projeto.
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "Staff_Total_Access_Alumni" ON public.registros_alumni;
CREATE POLICY "Staff_Total_Access_Alumni" ON public.registros_alumni
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte')
          OR u.caminhos_acesso && ARRAY['admin', 'suporte', 'professor']::TEXT[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.tipo IN ('admin', 'professor', 'suporte')
          OR u.caminhos_acesso && ARRAY['admin', 'suporte', 'professor']::TEXT[]
        )
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Alternativa complementar (opcional): tornar a conta de suporte um admin de
-- fato também em "tipo" (afeta outras políticas do sistema que só olham tipo):
-- UPDATE public.users SET tipo = 'admin' WHERE email = 'edi.ben.jr@gmail.com';
