-- ==============================================================================
-- TABELA DE CONFIGURAÇÕES (PARA CHAVE PIX E OUTROS PARÂMETROS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa logada (aluno, professor, admin) pode LER a chave PIX e QR Code
CREATE POLICY "Leitura_publica_config" ON public.configuracoes FOR SELECT USING (true);

-- Apenas os administradores podem mudar o valor da chave ou do QR code
CREATE POLICY "Admin_modifica_config" ON public.configuracoes FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('ap.panisso@gmail.com', 'edi.ben.jr@gmail.com')
);

-- Inserir os registros base (vazio por padrão até o administrador atualizar no painel)
INSERT INTO public.configuracoes (chave, valor) VALUES 
('pix_key', ''),
('pix_qr_url', '') ON CONFLICT DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
