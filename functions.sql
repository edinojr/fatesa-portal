-- 1. Function to handle lesson progress
CREATE OR REPLACE FUNCTION public.concluir_aula(
  p_aluno_id UUID,
  p_aula_id UUID,
  p_nota NUMERIC,
  p_nota_minima NUMERIC DEFAULT 7.0
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update progress
  INSERT INTO public.progresso (aluno_id, aula_id, concluida, nota_questionario)
  VALUES (p_aluno_id, p_aula_id, (p_nota >= p_nota_minima), p_nota)
  ON CONFLICT (aluno_id, aula_id)
  DO UPDATE SET
    concluida = (p_nota >= p_nota_minima),
    nota_questionario = p_nota,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to handle exam attempts and progress reset
CREATE OR REPLACE FUNCTION public.registrar_tentativa_prova(
  p_aluno_id UUID,
  p_livro_id UUID,
  p_nota NUMERIC,
  p_nota_minima NUMERIC DEFAULT 7.0
)
RETURNS VOID AS $$
DECLARE
  v_tentativas INTEGER;
BEGIN
  -- Upsert attempt data
  INSERT INTO public.tentativas_prova (aluno_id, livro_id, nota, tentativas, resetada)
  VALUES (p_aluno_id, p_livro_id, p_nota, 1, FALSE)
  ON CONFLICT (aluno_id, livro_id)
  DO UPDATE SET
    nota = EXCLUDED.nota,
    tentativas = public.tentativas_prova.tentativas + 1,
    resetada = FALSE
  RETURNING tentativas INTO v_tentativas;

  -- Logic for reset after 3 failures
  IF v_tentativas >= 3 AND p_nota < p_nota_minima THEN
    -- Reset 'concluida' status for all lessons in this book
    UPDATE public.progresso
    SET concluida = FALSE,
        updated_at = timezone('utc'::text, now())
    WHERE aluno_id = p_aluno_id
    AND aula_id IN (
      SELECT id FROM public.aulas WHERE livro_id = p_livro_id
    );

    -- Update attempt record to mark as reset and restart counter
    UPDATE public.tentativas_prova
    SET tentativas = 0,
        resetada = TRUE
    WHERE aluno_id = p_aluno_id AND livro_id = p_livro_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users to call these functions
GRANT EXECUTE ON FUNCTION public.concluir_aula(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_tentativa_prova(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
