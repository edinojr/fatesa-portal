SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'respostas_aulas';