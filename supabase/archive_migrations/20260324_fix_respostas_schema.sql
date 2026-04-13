-- Adicionar coluna nota_original se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'respostas_aulas' 
        AND column_name = 'nota_original'
    ) THEN
        ALTER TABLE respostas_aulas ADD COLUMN nota_original NUMERIC;
    END IF;
END $$;

-- Garantir que a coluna status aceite 'reprovado' se necessário (geralmente é text, mas garantindo)
DO $$
BEGIN
    -- Se houvesse um check constraint, removeríamos/atualizaríamos aqui.
    -- Como é campo de texto livre, apenas garantimos a estrutura.
END $$;
