-- =========================================================================
-- ORDENAÇÃO E NUMERAÇÃO OFICIAL DOS LIVROS DO CURSO (1 A 27)
-- Fatesa - Casa do Saber
-- =========================================================================

-- 1. ATUALIZAR TABELA LIVROS COM A ORDEM E NOMES NUMERADOS EM CAIXA ALTA
UPDATE public.livros SET ordem = 1, titulo = '1. BIBLIOLOGIA' WHERE id = 'cd525251-b438-4e21-aaea-bd5578017698';
UPDATE public.livros SET ordem = 2, titulo = '2. EPÍSTOLAS PAULINAS II' WHERE id = '7fe5d104-fcdc-4538-a881-75b7f2120381';
UPDATE public.livros SET ordem = 3, titulo = '3. EPÍSTOLAS PAULINAS III' WHERE id = '90741044-d796-4623-829f-5ee2fa78c59e';
UPDATE public.livros SET ordem = 4, titulo = '4. HERESIOLOGIA' WHERE id = 'd654cb4b-f445-4695-a3a7-ecf07b94df9c';
UPDATE public.livros SET ordem = 5, titulo = '5. TEOLOGIA DO OBREIRO' WHERE id = '84ffc99a-bc60-4a57-ba61-3761445a518d';
UPDATE public.livros SET ordem = 6, titulo = '6. PROFETAS MAIORES' WHERE id = 'be89a375-ef5e-4e9d-a132-6ecc6e1a05bb';
UPDATE public.livros SET ordem = 7, titulo = '7. PROFETAS MENORES' WHERE id = 'a3e1b4c3-8882-47d3-9494-b2f37ac3d827';
UPDATE public.livros SET ordem = 8, titulo = '8. ECLESIOLOGIA' WHERE id = 'e194cf56-d892-41d6-8728-620378c9a04c';
UPDATE public.livros SET ordem = 9, titulo = '9. DOUTRINA DA SALVAÇÃO' WHERE id = '0857f91a-517f-4c17-9ce8-06b6d1f2a017';
UPDATE public.livros SET ordem = 10, titulo = '10. APOCALIPSE' WHERE id = '9137d694-453f-409c-9ceb-520f3c9767b6';
UPDATE public.livros SET ordem = 11, titulo = '11. O PENTATEUCO' WHERE id = 'b22d4d11-ff80-4ea5-b3a3-d055484978f0';
UPDATE public.livros SET ordem = 12, titulo = '12. OS EVANGELHOS' WHERE id = 'b2ab5400-399a-4f46-ae08-62452ba09be3';
UPDATE public.livros SET ordem = 13, titulo = '13. ATOS DOS APÓSTOLOS' WHERE id = '16f66eb2-5994-420d-844d-14bacdab53e6';
UPDATE public.livros SET ordem = 14, titulo = '14. EPÍSTOLA AOS HEBREUS' WHERE id = '6a052574-6985-4bc6-ba16-2c58fbf02f69';
UPDATE public.livros SET ordem = 15, titulo = '15. A DOUTRINA DO ESPÍRITO SANTO' WHERE id = 'b225082a-ae60-457f-8bbe-7a286c14542d';
UPDATE public.livros SET ordem = 16, titulo = '16. EPÍSTOLAS PAULINAS I' WHERE id = '57616948-1a37-4f25-9cfc-48bbe97d7ae4';
UPDATE public.livros SET ordem = 17, titulo = '17. TEOLOGIA PRÁTICA' WHERE id = '419891a7-f5a1-4094-92b5-e24acf450f7a';
UPDATE public.livros SET ordem = 18, titulo = '18. HISTÓRIA DA IGREJA' WHERE id = '962ccb26-bdc5-4df0-b61d-a098d0b814a0';
UPDATE public.livros SET ordem = 19, titulo = '19. CRISTOLOGIA' WHERE id = 'd08df468-e41a-433c-9181-f0535994fe13';
UPDATE public.livros SET ordem = 20, titulo = '20. ESCATOLOGIA BÍBLICA' WHERE id = '684fe039-4d3e-4115-a090-5134ad0fea44';
UPDATE public.livros SET ordem = 21, titulo = '21. EPÍSTOLAS GERAIS' WHERE id = 'b32b7146-8959-458e-b721-c4541f8caaf4';
UPDATE public.livros SET ordem = 22, titulo = '22. DOUTRINA DE DEUS' WHERE id = 'd42258a5-d2eb-4668-8358-09e15339f523';
UPDATE public.livros SET ordem = 23, titulo = '23. ANJOS, HOMEM E PECADO' WHERE id = 'a5cbbb7d-5ea9-4dec-9af8-5364afc41313';
UPDATE public.livros SET ordem = 24, titulo = '24. HISTÓRIA DE ISRAEL I' WHERE id = 'aa9869b9-d51a-46f0-b655-200312fdf73a';
UPDATE public.livros SET ordem = 25, titulo = '25. HISTÓRIA DE ISRAEL II' WHERE id = '31976c86-66b3-42e5-882e-c7669b41d5c4';
UPDATE public.livros SET ordem = 26, titulo = '26. OS LIVROS POÉTICOS I – JÓ E SALMOS' WHERE id = 'e282d005-817d-4910-8258-453e6b1dd0b2';
UPDATE public.livros SET ordem = 27, titulo = '27. OS LIVROS POÉTICOS II – PROVÉRBIOS, ECLESIASTES E CANTARES' WHERE id = '34fd35c2-66dd-4175-ac10-55f74e6eb0d7';

-- 2. ATUALIZAR HISTÓRICO DE NOTAS (public.historico_notas)
UPDATE public.historico_notas SET modulo_nome = '1. BIBLIOLOGIA' WHERE modulo_nome ILIKE '%bibliologia%';
UPDATE public.historico_notas SET modulo_nome = '2. EPÍSTOLAS PAULINAS II' WHERE modulo_nome ILIKE '%paulinas%ii%' OR modulo_nome ILIKE '%paulinas%2%';
UPDATE public.historico_notas SET modulo_nome = '3. EPÍSTOLAS PAULINAS III' WHERE modulo_nome ILIKE '%paulinas%iii%' OR modulo_nome ILIKE '%paulinas%3%';
UPDATE public.historico_notas SET modulo_nome = '4. HERESIOLOGIA' WHERE modulo_nome ILIKE '%heresiologia%';
UPDATE public.historico_notas SET modulo_nome = '5. TEOLOGIA DO OBREIRO' WHERE modulo_nome ILIKE '%obreiro%';
UPDATE public.historico_notas SET modulo_nome = '6. PROFETAS MAIORES' WHERE modulo_nome ILIKE '%profetas maiores%';
UPDATE public.historico_notas SET modulo_nome = '7. PROFETAS MENORES' WHERE modulo_nome ILIKE '%profetas menores%';
UPDATE public.historico_notas SET modulo_nome = '8. ECLESIOLOGIA' WHERE modulo_nome ILIKE '%eclesiologia%';
UPDATE public.historico_notas SET modulo_nome = '9. DOUTRINA DA SALVAÇÃO' WHERE modulo_nome ILIKE '%salva%' AND modulo_nome NOT ILIKE '%atos%';
UPDATE public.historico_notas SET modulo_nome = '10. APOCALIPSE' WHERE modulo_nome ILIKE '%apocalipse%';
UPDATE public.historico_notas SET modulo_nome = '11. O PENTATEUCO' WHERE modulo_nome ILIKE '%pentateuco%';
UPDATE public.historico_notas SET modulo_nome = '12. OS EVANGELHOS' WHERE modulo_nome ILIKE '%evangelho%';
UPDATE public.historico_notas SET modulo_nome = '13. ATOS DOS APÓSTOLOS' WHERE modulo_nome ILIKE '%atos%';
UPDATE public.historico_notas SET modulo_nome = '14. EPÍSTOLA AOS HEBREUS' WHERE modulo_nome ILIKE '%hebreus%';
UPDATE public.historico_notas SET modulo_nome = '15. A DOUTRINA DO ESPÍRITO SANTO' WHERE modulo_nome ILIKE '%espirito%' OR modulo_nome ILIKE '%espírito%';
UPDATE public.historico_notas SET modulo_nome = '16. EPÍSTOLAS PAULINAS I' WHERE modulo_nome ILIKE '%paulinas%i' OR modulo_nome ILIKE '%paulinas%1';
UPDATE public.historico_notas SET modulo_nome = '17. TEOLOGIA PRÁTICA' WHERE modulo_nome ILIKE '%pratica%' OR modulo_nome ILIKE '%prática%';
UPDATE public.historico_notas SET modulo_nome = '18. HISTÓRIA DA IGREJA' WHERE modulo_nome ILIKE '%igreja%';
UPDATE public.historico_notas SET modulo_nome = '19. CRISTOLOGIA' WHERE modulo_nome ILIKE '%cristologia%';
UPDATE public.historico_notas SET modulo_nome = '20. ESCATOLOGIA BÍBLICA' WHERE modulo_nome ILIKE '%escatologia%';
UPDATE public.historico_notas SET modulo_nome = '21. EPÍSTOLAS GERAIS' WHERE modulo_nome ILIKE '%gerais%';
UPDATE public.historico_notas SET modulo_nome = '22. DOUTRINA DE DEUS' WHERE modulo_nome ILIKE '%deus%';
UPDATE public.historico_notas SET modulo_nome = '23. ANJOS, HOMEM E PECADO' WHERE modulo_nome ILIKE '%angelologia%' OR modulo_nome ILIKE '%anjos%';
UPDATE public.historico_notas SET modulo_nome = '24. HISTÓRIA DE ISRAEL I' WHERE (modulo_nome ILIKE '%israel%i' OR modulo_nome ILIKE '%israel%1') AND modulo_nome NOT ILIKE '%israel%ii%' AND modulo_nome NOT ILIKE '%israel%2%';
UPDATE public.historico_notas SET modulo_nome = '25. HISTÓRIA DE ISRAEL II' WHERE modulo_nome ILIKE '%israel%ii%' OR modulo_nome ILIKE '%israel%2%';
UPDATE public.historico_notas SET modulo_nome = '26. OS LIVROS POÉTICOS I – JÓ E SALMOS' WHERE (modulo_nome ILIKE '%poeticos%i' OR modulo_nome ILIKE '%poéticos%i' OR modulo_nome ILIKE '%poeticos%1' OR modulo_nome ILIKE '%poéticos%1') AND modulo_nome NOT ILIKE '%poeticos%ii%' AND modulo_nome NOT ILIKE '%poéticos%ii%';
UPDATE public.historico_notas SET modulo_nome = '27. OS LIVROS POÉTICOS II – PROVÉRBIOS, ECLESIASTES E CANTARES' WHERE modulo_nome ILIKE '%poeticos%ii%' OR modulo_nome ILIKE '%poéticos%ii%' OR modulo_nome ILIKE '%poeticos%2%' OR modulo_nome ILIKE '%poéticos%2%';
