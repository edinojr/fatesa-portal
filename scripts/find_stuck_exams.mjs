/**
 * Script para encontrar todas as avaliações que ficaram com status "liberado"
 * (iniciadas pelo aluno mas nunca enviadas/salvas).
 * 
 * Essas provas estão bloqueando o aluno de refazer ou acessar recuperações.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findStuckExams() {
  console.log('='.repeat(80));
  console.log('RELATÓRIO: Avaliações Iniciadas e NÃO Enviadas (status = "liberado")');
  console.log('='.repeat(80));
  console.log('');

  // 1. Buscar todas as respostas com status "liberado" (iniciadas mas não enviadas)
  const { data: stuckSubs, error } = await supabase
    .from('respostas_aulas')
    .select(`
      id,
      aluno_id,
      aula_id,
      status,
      nota,
      start_time,
      updated_at,
      tentativas,
      respostas
    `)
    .eq('status', 'liberado');

  if (error) {
    console.error('Erro ao buscar respostas:', error.message);
    return;
  }

  if (!stuckSubs || stuckSubs.length === 0) {
    console.log('✅ Nenhuma avaliação "presa" encontrada com status "liberado".');
    console.log('');
    
    // Vamos buscar também submissões com status pendente que podem estar travando
    console.log('Verificando submissões com status "pendente" (enviadas, aguardando correção)...');
    const { data: pendingSubs, error: pendingError } = await supabase
      .from('respostas_aulas')
      .select(`
        id,
        aluno_id,
        aula_id,
        status,
        nota,
        start_time,
        updated_at,
        tentativas
      `)
      .eq('status', 'pendente');
    
    if (pendingError) {
      console.error('Erro:', pendingError.message);
      return;
    }

    if (pendingSubs && pendingSubs.length > 0) {
      // Buscar dados dos alunos e aulas
      const alunoIds = [...new Set(pendingSubs.map(s => s.aluno_id))];
      const aulaIds = [...new Set(pendingSubs.map(s => s.aula_id))];

      const { data: alunos } = await supabase.from('users').select('id, nome, email').in('id', alunoIds);
      const { data: aulas } = await supabase.from('aulas').select('id, titulo, tipo, is_bloco_final, versao, livro_id, livros(titulo)').in('id', aulaIds);

      const alunoMap = {};
      (alunos || []).forEach(a => { alunoMap[a.id] = a; });
      const aulaMap = {};
      (aulas || []).forEach(a => { aulaMap[a.id] = a; });

      console.log(`\nEncontradas ${pendingSubs.length} submissão(ões) com status "pendente":\n`);
      pendingSubs.forEach((sub, i) => {
        const aluno = alunoMap[sub.aluno_id] || {};
        const aula = aulaMap[sub.aula_id] || {};
        console.log(`--- Submissão ${i + 1} ---`);
        console.log(`  ID Submissão:  ${sub.id}`);
        console.log(`  Aluno:         ${aluno.nome || 'Desconhecido'} (${aluno.email || sub.aluno_id})`);
        console.log(`  Avaliação:     ${aula.titulo || sub.aula_id}`);
        console.log(`  Tipo:          ${aula.tipo || '?'} | Bloco Final: ${aula.is_bloco_final ? 'Sim' : 'Não'} | Versão: ${aula.versao || 1}`);
        console.log(`  Módulo:        ${aula.livros?.titulo || aula.livro_id || '?'}`);
        console.log(`  Status:        ${sub.status}`);
        console.log(`  Nota:          ${sub.nota !== null ? sub.nota : 'Sem nota'}`);
        console.log(`  Tentativas:    ${sub.tentativas || 0}`);
        console.log(`  Início:        ${sub.start_time || 'N/A'}`);
        console.log(`  Atualizado:    ${sub.updated_at || 'N/A'}`);
        console.log('');
      });
    }
    return;
  }

  // Buscar dados dos alunos e aulas para enriquecer o relatório
  const alunoIds = [...new Set(stuckSubs.map(s => s.aluno_id))];
  const aulaIds = [...new Set(stuckSubs.map(s => s.aula_id))];

  const { data: alunos } = await supabase.from('users').select('id, nome, email').in('id', alunoIds);
  const { data: aulas } = await supabase.from('aulas').select('id, titulo, tipo, is_bloco_final, versao, livro_id, livros(titulo)').in('id', aulaIds);

  const alunoMap = {};
  (alunos || []).forEach(a => { alunoMap[a.id] = a; });
  const aulaMap = {};
  (aulas || []).forEach(a => { aulaMap[a.id] = a; });

  console.log(`Encontradas ${stuckSubs.length} avaliação(ões) "presa(s)" com status "liberado":\n`);

  stuckSubs.forEach((sub, i) => {
    const aluno = alunoMap[sub.aluno_id] || {};
    const aula = aulaMap[sub.aula_id] || {};
    const hasAnswers = sub.respostas && Object.keys(sub.respostas).length > 0;
    
    console.log(`--- Avaliação ${i + 1} ---`);
    console.log(`  ID Submissão:  ${sub.id}`);
    console.log(`  Aluno:         ${aluno.nome || 'Desconhecido'} (${aluno.email || sub.aluno_id})`);
    console.log(`  Avaliação:     ${aula.titulo || sub.aula_id}`);
    console.log(`  Tipo:          ${aula.tipo || '?'} | Bloco Final: ${aula.is_bloco_final ? 'Sim' : 'Não'} | Versão: ${aula.versao || 1}`);
    console.log(`  Módulo:        ${aula.livros?.titulo || aula.livro_id || '?'}`);
    console.log(`  Status:        ${sub.status} (PRESA - NÃO ENVIADA)`);
    console.log(`  Nota:          ${sub.nota !== null ? sub.nota : 'Sem nota'}`);
    console.log(`  Tentativas:    ${sub.tentativas || 0}`);
    console.log(`  Tem Respostas: ${hasAnswers ? 'SIM (' + Object.keys(sub.respostas).length + ' questões)' : 'NÃO (vazio)'}`);
    console.log(`  Início:        ${sub.start_time || 'N/A'}`);
    console.log(`  Atualizado:    ${sub.updated_at || 'N/A'}`);
    
    // Calcular tempo desde o início
    if (sub.start_time) {
      const started = new Date(sub.start_time);
      const now = new Date();
      const diffMs = now - started;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      console.log(`  Tempo Presa:   ${diffDays > 0 ? diffDays + ' dias' : diffHours + ' horas'} desde o início`);
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('RESUMO:');
  console.log(`  Total de avaliações presas: ${stuckSubs.length}`);
  console.log(`  Alunos afetados: ${alunoIds.length}`);
  console.log('');
  console.log('AÇÃO RECOMENDADA:');
  console.log('  Para liberar o aluno para refazer, estas submissões devem ser DELETADAS');
  console.log('  do banco de dados (tabela respostas_aulas), pois possuem status "liberado"');
  console.log('  que bloqueia o sistema de recuperação.');
  console.log('='.repeat(80));
}

findStuckExams().catch(console.error);
