-- ==========================================================
-- DIAGNÓSTICO RÁPIDO: por que os módulos não aparecem?
-- ==========================================================
-- Cole isto no SQL Editor do Supabase e rode.
-- Cole o resultado de volta para eu analisar.
-- ==========================================================

-- 1) Estado dos módulos no banco
SELECT '1. MODULOS' AS origem,
  l.id AS modulo_id,
  l.titulo,
  l.professor_active,
  l.ordem,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id) AS total_aulas,
  (SELECT COUNT(*) FROM public.aulas a WHERE a.livro_id = l.id
     AND (a.tipo = 'prova' OR a.tipo = 'avaliacao' OR a.is_bloco_final = true)) AS total_provas
FROM public.livros l
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%cristologia%';

-- 2) historico_notas (A CAUSA OCULTA — se houver linhas aqui, é isto)
SELECT '2. HISTORICO_NOTAS' AS origem,
  h.id, h.aluno_id, u.nome AS aluno, h.modulo_nome, h.nota, h.data_conclusao
FROM public.historico_notas h
JOIN public.users u ON u.id = h.aluno_id
WHERE lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%historia da igreja%'
   OR lower(translate(h.modulo_nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      LIKE '%cristologia%'
ORDER BY u.nome;

-- 3) modulos_finalizados_manual (alunos que ainda têm o módulo marcado)
SELECT '3. MODULOS_FINALIZADOS_MANUAL' AS origem,
  u.id AS aluno_id, u.nome, u.email,
  array_agg(l.titulo) AS modulos_marcados
FROM public.users u
CROSS JOIN public.livros l
WHERE u.tipo = 'aluno'
  AND COALESCE(u.modulos_finalizados_manual, ARRAY[]::UUID[]) @> ARRAY[l.id]
  AND (lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
       OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%')
GROUP BY u.id, u.nome, u.email
ORDER BY u.nome;

-- 4) liberacoes_excecao (nossas inserções — confirmar que existem)
SELECT '4. LIBERACOES_EXCECAO' AS origem,
  COUNT(*) AS total_excecoes
FROM public.liberacoes_excecao le
JOIN public.livros l ON l.id = le.livro_id
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%';

-- 5) exclusoes_modulo_aluno (se houver, o módulo é escondido)
SELECT '5. EXCLUSOES' AS origem,
  u.nome AS aluno, l.titulo AS modulo
FROM public.exclusoes_modulo_aluno e
JOIN public.users u ON u.id = e.user_id
JOIN public.livros l ON l.id = e.livro_id
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%';

-- 6) respostas_aulas (provas submetidas para esses módulos)
SELECT '6. RESPOSTAS_AULAS' AS origem,
  u.nome AS aluno, a.titulo AS aula, ra.status, ra.nota
FROM public.respostas_aulas ra
JOIN public.users u ON u.id = ra.aluno_id
JOIN public.aulas a ON a.id = ra.aula_id
JOIN public.livros l ON l.id = a.livro_id
WHERE lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%historia da igreja%'
   OR lower(translate(l.titulo, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE '%cristologia%'
ORDER BY u.nome;
