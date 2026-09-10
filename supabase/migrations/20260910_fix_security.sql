-- RPC para autorizar usuarios especiais com seguranca
CREATE OR REPLACE FUNCTION authorize_special_user(p_email text, p_nome text, p_tipo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND (tipo = 'admin' OR caminhos_acesso::jsonb ? 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem autorizar usuarios.';
  END IF;

  IF p_tipo = 'admin' THEN
    INSERT INTO public.admins_autorizados(email) VALUES(p_email);
  ELSIF p_tipo = 'professor' THEN
    INSERT INTO public.professores_autorizados(email, nome) VALUES(p_email, p_nome);
  ELSE
    RAISE EXCEPTION 'Tipo de usuario invalido.';
  END IF;
END;
$$;

-- RPC para atualizar status de pagamento
CREATE OR REPLACE FUNCTION update_payment_status(p_payment_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate caller is admin or professor
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND (tipo IN ('admin', 'professor') OR caminhos_acesso::jsonb ? 'admin' OR caminhos_acesso::jsonb ? 'professor')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Sem permissao para atualizar pagamento.';
  END IF;

  UPDATE public.payments
  SET status = p_status, updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$;

-- RPC para graduacao atomica
CREATE OR REPLACE FUNCTION graduate_student_atomic(p_student_id uuid, p_course_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND (tipo = 'admin' OR caminhos_acesso::jsonb ? 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem graduar estudantes.';
  END IF;

  -- Update student status and insert into graduations
  UPDATE public.students
  SET status = 'graduated', updated_at = NOW()
  WHERE id = p_student_id;

  INSERT INTO public.graduations(student_id, course_data, graduated_at)
  VALUES(p_student_id, p_course_data, NOW());
END;
$$;
