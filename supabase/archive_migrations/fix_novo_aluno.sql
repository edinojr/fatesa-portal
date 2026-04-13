-- Atualizar o nome da Administradora que ficou como "Novo Aluno"
UPDATE public.users 
SET nome = 'AP Panisso (Administradora)' 
WHERE email = 'ap.panisso@gmail.com';

-- Atualizar todos que ficaram com nome "Novo Aluno" para apenas "Aluno"
UPDATE public.users 
SET nome = 'Aluno' 
WHERE nome = 'Novo Aluno';

-- Refazer a função de gatilho (Trigger) para que os próximos cadastros recebam 'Aluno' de padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_professor BOOLEAN;
BEGIN
  -- Verifica se o e-mail está na lista de professores autorizados
  SELECT EXISTS (
    SELECT 1 FROM public.professores_autorizados WHERE email = new.email
  ) INTO is_professor;

  IF is_professor THEN
    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Professor'), 
      'professor',
      ARRAY['professor']
    );
  ELSE
    -- ESTA É A LINHA QUE MUDOU PARA ALUNO
    INSERT INTO public.users (id, email, nome, tipo, caminhos_acesso)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Aluno'), 
      'online',
      ARRAY['aluno']
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
