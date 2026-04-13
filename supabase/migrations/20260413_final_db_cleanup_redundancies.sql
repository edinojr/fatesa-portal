-- ==========================================================
-- MUDANÇA DE LAYOUT FATESA - LIMPEZA DE TABELAS LEGADAS
-- Data: 2026-04-13
-- Descrição: Remove as tabelas do antigo sistema de avaliação 
-- pólo (atividades e notas) e tabelas órfãs que não possuem
-- caminhos ativos no frontend (matriculas e tentativas_prova).
-- ==========================================================

-- 1. Remoção das Tabelas de Avaliação Manual Extra (Pólo)
-- Motivo: Sistema atual consolidou avaliações e exercícios no
-- Fichário do Aluno pelas tabelas `aulas` e `respostas_aulas`.
DROP TABLE IF EXISTS public.respostas_atividades_extra CASCADE;
DROP TABLE IF EXISTS public.notas CASCADE;
DROP TABLE IF EXISTS public.atividades CASCADE;

-- 2. Remoção de Tabelas Órfãs do Módulo Inicial
-- Motivo: Funcionalidades substituídas pelas colunas nativas de
-- usuários (caminhos_acesso) e pela contagem interna nas respostas.
DROP TABLE IF EXISTS public.tentativas_prova CASCADE;
DROP TABLE IF EXISTS public.matriculas CASCADE;

-- As Views atreladas possivelmente quebrarão e serão tratadas 
-- caso dependam dessas tabelas, mas confirmou-se que a plataforma 
-- atual usa apenas `respostas_aulas` e `aulas` para notas.

-- ==========================================================
-- Conclusão: Limpeza Suprema Finalizada.
-- ==========================================================
