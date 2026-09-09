-- ==============================================================================
-- FIX RLS RESPOSTAS_AULAS: permite admin editar e excluir avaliacoes
-- ------------------------------------------------------------------------------
-- PROBLEMA: o usuario de suporte (edi.ben.jr@gmail.com) possui tipo = 'online'
--   mas caminhos_acesso = [admin, suporte, professor, aluno]. A UI libera o painel
--   por caminhos_acesso, porem todas as politicas de respostas_aulas validam staff
--   apenas por tipo ('admin','suporte','professor',...) via is_staff_user() ou
--   direto na condicao -> editar nota/comentario (UPDATE) e excluir avaliacao
--   (DELETE) retornam 403 (row-level security).
--
-- SOLUCAO: padronizar is_staff_user() para aceitar staff por tipo OU por
--   caminhos_acesso (mesmo padrao de check_is_staff / alumni / historico_notas /
--   ProtectedRoute.tsx) e recriar as politicas de respostas_aulas de forma limpa.
--
-- APLICAR UMA VEZ no Supabase Dashboard > SQL Editor > Run. Idempotente.
-- ==============================================================================

BEGIN;

-- 1. Helper padronizado: staff por tipo OU por caminhos_acesso
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        tipo IN ('admin', 'suporte', 'professor', 'coordenador_polo')
        OR caminhos_acesso && ARRAY['admin', 'suporte', 'professor', 'coordenador_polo']::TEXT[]
      )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_staff_user() TO authenticated;

-- 2. Remove TODAS as politicas antigas de respostas_aulas (garante estado limpo)
DROP POLICY IF EXISTS "respostas_select" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_insert" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_update" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_delete" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes inserem inicial" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes leem próprias notas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes atualizam retentativa" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Estudantes atualizam v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos refinam tentativas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos podem inserir respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Alunos podem atualizar respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Staff podem deletar respostas" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Suporte admin le tudo" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Professores e Admin operam tudo" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Staff can manage submissions" ON public.respostas_aulas;
DROP POLICY IF EXISTS "Acesso respostas" ON public.respostas_aulas;

DROP POLICY IF EXISTS "respostas_select_v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_insert_v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_update_v2" ON public.respostas_aulas;
DROP POLICY IF EXISTS "respostas_delete_v2" ON public.respostas_aulas;

-- 3. Cria politicas simples e claras (staff por tipo OU caminhos_acesso)
CREATE POLICY "respostas_select_v2" ON public.respostas_aulas
FOR SELECT USING (
    aluno_id = auth.uid() OR public.is_staff_user()
);

CREATE POLICY "respostas_insert_v2" ON public.respostas_aulas
FOR INSERT WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- Editar nota/comentario: aluno corrige a propria ou staff gerencia
CREATE POLICY "respostas_update_v2" ON public.respostas_aulas
FOR UPDATE USING (
    aluno_id = auth.uid() OR public.is_staff_user()
) WITH CHECK (
    aluno_id = auth.uid() OR public.is_staff_user()
);

-- Excluir avaliacao: apenas staff (admin/suporte/professor, inclusive via caminhos_acesso)
CREATE POLICY "respostas_delete_v2" ON public.respostas_aulas
FOR DELETE USING (
    public.is_staff_user()
);

-- 4. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;