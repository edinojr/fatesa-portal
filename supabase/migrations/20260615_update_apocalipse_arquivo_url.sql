-- Atualizar arquivo_url das lições do Apocalipse para apontar para os HTMLs estáticos
-- O path segue o padrão: /licoes/Curso Básico/Apocalipse/<filename>.html

UPDATE public.aulas
SET arquivo_url = CASE ordem
  WHEN 0 THEN '/licoes/Curso Básico/Apocalipse/Panorama.html'
  WHEN 1 THEN '/licoes/Curso Básico/Apocalipse/Lição 01 - Uma Visão Panorâmica do Livro do Apocalipse.html'
  WHEN 2 THEN '/licoes/Curso Básico/Apocalipse/Lição 02 - As Coisas Que Tens Visto e As Que São.html'
  WHEN 3 THEN '/licoes/Curso Básico/Apocalipse/Lição 03 - As Sete Cartas do Apocalipse - Primeira Parte.html'
  WHEN 4 THEN '/licoes/Curso Básico/Apocalipse/Lição 04 - As Sete Cartas do Apocalipse - Segunda Parte.html'
  WHEN 5 THEN '/licoes/Curso Básico/Apocalipse/Lição 05 - As Coisas... Que Depois Destas Hão de Acontecer - Primeira Parte.html'
  WHEN 6 THEN '/licoes/Curso Básico/Apocalipse/Lição 06 - As Coisas... Que Depois Destas Hão de Acontecer - Segunda Parte.html'
  WHEN 7 THEN '/licoes/Curso Básico/Apocalipse/Lição 07 - As Coisas... Que Depois Destas Hão de Acontecer - Terceira Parte.html'
  WHEN 8 THEN '/licoes/Curso Básico/Apocalipse/Lição 08 - As Coisas... Que Depois Destas Hão de Acontecer - Quarta Parte.html'
  WHEN 9 THEN '/licoes/Curso Básico/Apocalipse/Lição 09 - A Manifestação de Jesus em Glória e o Milênio.html'
  WHEN 10 THEN '/licoes/Curso Básico/Apocalipse/Lição 10 - Os Acontecimentos Finais.html'
  ELSE arquivo_url
END
WHERE livro_id IN (
  SELECT id FROM public.livros WHERE LOWER(titulo) = 'apocalipse'
)
AND tipo IN ('licao', 'material', 'gravada', 'ao_vivo');
