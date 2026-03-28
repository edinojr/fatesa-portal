-- Criando a tabela de Professores Autorizados que faltava no banco
CREATE TABLE IF NOT EXISTS public.professores_autorizados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando RLS para segurança
ALTER TABLE public.professores_autorizados ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Apenas Suporte e Administração podem ver/inserir/deletar)
CREATE POLICY "Admins podem gerenciar professores" 
ON public.professores_autorizados 
FOR ALL 
USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- Permite que a trigger de cadastro leia quem é professor
CREATE POLICY "Acesso publico apenas leitura para checagem" 
ON public.professores_autorizados 
FOR SELECT 
USING (true);
