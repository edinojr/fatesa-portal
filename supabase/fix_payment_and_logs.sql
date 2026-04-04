-- 1. Garante que 'aprovado' e 'rejeitado' existam no enum de status de pagamento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'pagamento_status' AND e.enumlabel = 'aprovado') THEN
        ALTER TYPE public.pagamento_status ADD VALUE 'aprovado';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'pagamento_status' AND e.enumlabel = 'rejeitado') THEN
        ALTER TYPE public.pagamento_status ADD VALUE 'rejeitado';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Políticas de RLS para portal_access_logs (Analytics)
-- Permite que qualquer um (anon ou auth) insira logs
DROP POLICY IF EXISTS "Allow public insert to portal_access_logs" ON public.portal_access_logs;
CREATE POLICY "Allow public insert to portal_access_logs" 
ON public.portal_access_logs FOR INSERT 
TO public
WITH CHECK (true);

-- Permite que apenas admins e suporte vejam os logs
DROP POLICY IF EXISTS "Allow admins to select portal_access_logs" ON public.portal_access_logs;
CREATE POLICY "Allow admins to select portal_access_logs" 
ON public.portal_access_logs FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte')));

-- 3. Ajuste de usuários que já deveriam estar com acesso definitivo (opcional, mas bom para limpeza)
-- Se o usuário tem um pagamento com status 'aprovado' ou 'pago' (antigo), poderíamos ativá-lo.
-- Mas vamos focar nos novos fluxos.

-- 4. Garantir que a tabela pagamentos tenha políticas para admins gerenciarem tudo
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.pagamentos;
CREATE POLICY "Admins can manage all payments" ON public.pagamentos FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo IN ('admin', 'suporte')));
