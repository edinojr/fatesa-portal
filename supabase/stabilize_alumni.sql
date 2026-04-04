-- ESTABILIZAÇÃO FINAL ALUMNI (EXCEL/CSV READY)

BEGIN;

-- 1. Garantir que a tabela tenha todos os campos necessários
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS nucleo TEXT;
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS ano_formacao TEXT;
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS nivel_curso TEXT DEFAULT 'Graduação';
ALTER TABLE IF EXISTS public.registros_alumni ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Garantir o índice de unicidade por e-mail (necessário para o upsert)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_alumni_email') THEN
        ALTER TABLE public.registros_alumni ADD CONSTRAINT unique_alumni_email UNIQUE (email);
    END IF;
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.registros_alumni ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO ADMINISTRATIVO (ACESSO TOTAL PARA ADMINS)
DROP POLICY IF EXISTS "Staff_Manage_Alumni" ON public.registros_alumni;
DROP POLICY IF EXISTS "Staff manage alumni" ON public.registros_alumni;
DROP POLICY IF EXISTS "Gestão Total Staff" ON public.registros_alumni;
DROP POLICY IF EXISTS "Staff_Total_Access_Alumni" ON public.registros_alumni;

CREATE POLICY "Staff_Total_Access_Alumni" ON public.registros_alumni 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND tipo IN ('admin', 'professor', 'suporte')
    )
);

-- 5. POLÍTICA DE AUTOVÍNCULO (O Aluno pode ver e atualizar seu próprio registro)
DROP POLICY IF EXISTS "Alumni_Self_Identity" ON public.registros_alumni;
CREATE POLICY "Alumni_Self_Identity" ON public.registros_alumni
FOR UPDATE
USING (true)
WITH CHECK (user_id = auth.uid());

-- Permissão de leitura para auditoria pública (opcional para verificação de diploma)
DROP POLICY IF EXISTS "Public_Read_Alumni" ON public.registros_alumni;
CREATE POLICY "Public_Read_Alumni" ON public.registros_alumni FOR SELECT USING (true);

-- 6. PERMISSÕES DE STORAGE (BUCKET: alumni_formados)
-- Registra o bucket se ele não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('alumni_formados', 'alumni_formados', false)
ON CONFLICT (id) DO NOTHING;

-- Deleta políticas antigas de storage para evitar erros de duplicidade
DROP POLICY IF EXISTS "Admin_Upload_Alumni" ON storage.objects;
DROP POLICY IF EXISTS "Admin_Select_Alumni" ON storage.objects;

-- Criar políticas para o staff gerenciar os arquivos de alumni
CREATE POLICY "Admin_Upload_Alumni" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'alumni_formados' 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND tipo IN ('admin', 'professor', 'suporte')
    )
);

CREATE POLICY "Admin_Select_Alumni" ON storage.objects 
FOR SELECT TO authenticated 
USING (
    bucket_id = 'alumni_formados' 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND tipo IN ('admin', 'professor', 'suporte')
    )
);

-- 7. RECARREGAR CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;
