-- Script para liberar manualmente o Módulo 2 Espírito Santo para a aluna mariahelanabellizzi@gmail.com
DO $$
DECLARE
    v_user_id UUID;
    v_livro_id UUID;
BEGIN
    -- 1. Buscar ID da aluna
    SELECT id INTO v_user_id FROM public.users WHERE email = 'mariahelanabellizzi@gmail.com';
    
    -- 2. Buscar ID do Módulo 2 Espírito Santo
    -- Tentando buscar por partes do título já que não temos o ID exato
    SELECT id INTO v_livro_id FROM public.livros 
    WHERE (titulo ILIKE '%Espírito Santo%' OR titulo ILIKE '%Espirito Santo%')
    AND (titulo ILIKE '%Módulo 2%' OR titulo ILIKE '%Modulo 2%')
    LIMIT 1;

    -- 3. Inserir na tabela de exceções
    IF v_user_id IS NOT NULL AND v_livro_id IS NOT NULL THEN
        INSERT INTO public.liberacoes_excecao (user_id, livro_id, granted_at)
        VALUES (v_user_id, v_livro_id, now())
        ON CONFLICT (user_id, livro_id) DO NOTHING;
        
        RAISE NOTICE 'Acesso liberado com sucesso para mariahelanabellizzi@gmail.com no Módulo 2 Espírito Santo.';
    ELSE
        IF v_user_id IS NULL THEN
            RAISE WARNING 'ALERTA: Aluna mariahelanabellizzi@gmail.com não encontrada na base de dados.';
        END IF;
        IF v_livro_id IS NULL THEN
            RAISE WARNING 'ALERTA: Módulo "Espírito Santo" não encontrado na base de dados.';
        END IF;
    END IF;
END $$;
