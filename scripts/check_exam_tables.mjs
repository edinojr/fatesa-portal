/**
 * Script para verificar se a tabela respostas_aulas existe e se há dados acessíveis.
 * Também testa outras possíveis tabelas de atividades.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Verificando tabelas de avaliação...\n');

  // 1. respostas_aulas
  const { data: r1, error: e1, count: c1 } = await supabase
    .from('respostas_aulas')
    .select('id', { count: 'exact', head: true });
  console.log('respostas_aulas:', e1 ? `ERRO: ${e1.message}` : `${c1 ?? 0} registros (RLS pode estar filtrando)`);

  // 2. Verificar se precisa autenticar - tenta ler 1 registro
  const { data: r1b, error: e1b } = await supabase
    .from('respostas_aulas')
    .select('id')
    .limit(1);
  console.log('respostas_aulas (select 1):', e1b ? `ERRO: ${e1b.message}` : `${r1b?.length ?? 0} registros retornados`);

  // 3. Tentar view de atividades (usada pelo professor)
  const tables = [
    'atividades_view',
    'view_respostas_professor', 
    'atividades_alunos',
    'progresso'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`${table}:`, error ? `ERRO: ${error.message}` : `${count ?? 0} registros`);
  }

  // 4. Check if there are exams in aulas table
  const { data: exams, error: exErr } = await supabase
    .from('aulas')
    .select('id, titulo, tipo, versao, is_bloco_final')
    .or('tipo.eq.prova,is_bloco_final.eq.true')
    .limit(20);
  
  console.log('\nProvas/Avaliações cadastradas:');
  if (exErr) {
    console.log('ERRO:', exErr.message);
  } else if (!exams?.length) {
    console.log('Nenhuma prova encontrada');
  } else {
    exams.forEach(ex => {
      console.log(`  - ${ex.titulo} (tipo: ${ex.tipo}, versão: ${ex.versao || 1}, bloco_final: ${ex.is_bloco_final})`);
    });
  }

  // 5. Check RLS policies hint
  console.log('\n⚠️  NOTA: Se a tabela respostas_aulas retornar 0 registros sem erro,');
  console.log('   isso indica que as políticas RLS (Row Level Security) estão');
  console.log('   bloqueando acesso sem autenticação.');
  console.log('   É necessário rodar esta query diretamente no Supabase Dashboard');
  console.log('   (SQL Editor) ou autenticar com um usuário admin.\n');

  // 6. Gerar SQL para rodar no Dashboard do Supabase
  console.log('='.repeat(80));
  console.log('📋 SQL PARA RODAR NO SUPABASE DASHBOARD (SQL Editor):');
  console.log('='.repeat(80));
  console.log('');
  console.log(`-- Buscar TODAS as avaliações que foram iniciadas (status = 'liberado')
-- mas NUNCA foram enviadas pelo aluno (ficaram "presas")
SELECT 
  ra.id AS submission_id,
  u.nome AS aluno_nome,
  u.email AS aluno_email,
  a.titulo AS avaliacao_titulo,
  a.tipo AS tipo_aula,
  a.is_bloco_final,
  a.versao,
  l.titulo AS modulo,
  ra.status,
  ra.nota,
  ra.tentativas,
  ra.start_time,
  ra.updated_at,
  ra.respostas IS NOT NULL AS tem_respostas
FROM respostas_aulas ra
JOIN users u ON u.id = ra.aluno_id
JOIN aulas a ON a.id = ra.aula_id
LEFT JOIN livros l ON l.id = a.livro_id
WHERE ra.status = 'liberado'
   OR (ra.status = 'pendente' AND ra.nota = 0)
ORDER BY ra.updated_at DESC;
`);

  console.log('');
  console.log(`-- Buscar TODAS as submissões de provas (para visão geral completa)
SELECT 
  ra.id AS submission_id,
  u.nome AS aluno_nome,
  u.email AS aluno_email,
  a.titulo AS avaliacao_titulo,
  a.tipo,
  a.versao,
  l.titulo AS modulo,
  ra.status,
  ra.nota,
  ra.tentativas,
  ra.start_time,
  ra.updated_at
FROM respostas_aulas ra
JOIN users u ON u.id = ra.aluno_id
JOIN aulas a ON a.id = ra.aula_id
LEFT JOIN livros l ON l.id = a.livro_id
WHERE a.tipo = 'prova' OR a.is_bloco_final = true
ORDER BY u.nome, a.titulo, ra.updated_at DESC;
`);

  console.log('');
  console.log(`-- Para DELETAR as submissões presas (liberando o aluno para refazer):
-- ⚠️ CUIDADO: Execute apenas após confirmar quais IDs devem ser removidos
-- DELETE FROM respostas_aulas WHERE status = 'liberado';
`);
}

checkTables().catch(console.error);
