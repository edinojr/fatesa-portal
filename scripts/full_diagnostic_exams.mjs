/**
 * Script completo para diagnosticar o problema das avaliações.
 * Busca TODAS as submissões e verifica quais podem estar bloqueando recuperações.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fullDiagnostic() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO COMPLETO: Todas as submissões de avaliações (respostas_aulas)');
  console.log('='.repeat(80));
  console.log('');

  // 1. Buscar TODAS as submissões
  const { data: allSubs, error } = await supabase
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
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar respostas:', error.message);
    return;
  }

  if (!allSubs || allSubs.length === 0) {
    console.log('❌ Nenhuma submissão encontrada na tabela respostas_aulas.');
    return;
  }

  // 2. Buscar dados enriquecidos
  const alunoIds = [...new Set(allSubs.map(s => s.aluno_id))];
  const aulaIds = [...new Set(allSubs.map(s => s.aula_id))];

  const { data: alunos } = await supabase.from('users').select('id, nome, email').in('id', alunoIds);
  const { data: aulas } = await supabase.from('aulas').select('id, titulo, tipo, is_bloco_final, versao, livro_id, livros(titulo)').in('id', aulaIds);

  const alunoMap = {};
  (alunos || []).forEach(a => { alunoMap[a.id] = a; });
  const aulaMap = {};
  (aulas || []).forEach(a => { aulaMap[a.id] = a; });

  // 3. Estatísticas por status
  const byStatus = {};
  allSubs.forEach(s => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  });

  console.log('📊 ESTATÍSTICAS POR STATUS:');
  Object.entries(byStatus).forEach(([status, count]) => {
    const icon = status === 'liberado' ? '🔴' : status === 'pendente' ? '🟡' : status === 'corrigida' ? '🟢' : '⚪';
    console.log(`  ${icon} ${status}: ${count}`);
  });
  console.log(`  📌 Total: ${allSubs.length}`);
  console.log('');

  // 4. Identificar submissões problemáticas
  // a) Status "liberado" (iniciadas e não enviadas)
  const liberado = allSubs.filter(s => s.status === 'liberado');
  // b) Status "pendente" (enviadas mas não corrigidas) - podem estar bloqueando
  const pendente = allSubs.filter(s => s.status === 'pendente');
  // c) Status "corrigida" com nota < 7 e sem recuperação disponível
  const reprovadas = allSubs.filter(s => s.status === 'corrigida' && s.nota !== null && s.nota < 7);

  // 5. Listar TODAS as submissões
  console.log('='.repeat(80));
  console.log('📋 TODAS AS SUBMISSÕES DE AVALIAÇÕES:');
  console.log('='.repeat(80));
  console.log('');

  allSubs.forEach((sub, i) => {
    const aluno = alunoMap[sub.aluno_id] || {};
    const aula = aulaMap[sub.aula_id] || {};
    
    const statusIcon = sub.status === 'liberado' ? '🔴' : sub.status === 'pendente' ? '🟡' : sub.status === 'corrigida' ? '🟢' : '⚪';
    const isProblematic = sub.status === 'liberado' || (sub.status === 'pendente');
    
    console.log(`${statusIcon} [${i + 1}] ${isProblematic ? '⚠️ POSSÍVEL BLOQUEIO' : ''}`);
    console.log(`  ID:            ${sub.id}`);
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

  // 6. Buscar provas (aulas do tipo prova ou bloco_final) e verificar se alunos reprovados têm acesso à recuperação
  console.log('='.repeat(80));
  console.log('🔎 ANÁLISE DE RECUPERAÇÃO:');
  console.log('='.repeat(80));
  console.log('');

  if (reprovadas.length > 0) {
    console.log(`Encontrados ${reprovadas.length} aluno(s) reprovado(s) (nota < 7):\n`);
    
    for (const sub of reprovadas) {
      const aluno = alunoMap[sub.aluno_id] || {};
      const aula = aulaMap[sub.aula_id] || {};
      
      // Verificar se existe uma versão de recuperação (V2/V3) para esta aula
      if (aula.livro_id) {
        const { data: recupAulas } = await supabase
          .from('aulas')
          .select('id, titulo, versao, tipo')
          .eq('livro_id', aula.livro_id)
          .or('tipo.eq.prova,is_bloco_final.eq.true')
          .gt('versao', aula.versao || 1);

        const hasRecup = recupAulas && recupAulas.length > 0;
        
        // Verificar se já há submissão de recuperação
        const hasRecupSub = allSubs.some(s => 
          s.aluno_id === sub.aluno_id && 
          recupAulas?.some(r => r.id === s.aula_id)
        );

        console.log(`  ❌ ${aluno.nome || 'Desconhecido'} - ${aula.titulo} - Nota: ${sub.nota}`);
        console.log(`     Recuperação disponível: ${hasRecup ? 'SIM (' + recupAulas.map(r => r.titulo).join(', ') + ')' : 'NÃO'}`);
        console.log(`     Já fez recuperação: ${hasRecupSub ? 'SIM' : 'NÃO'}`);
        console.log('');
      }
    }
  } else {
    console.log('Nenhum aluno reprovado encontrado.');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('FIM DO RELATÓRIO');
  console.log('='.repeat(80));
}

fullDiagnostic().catch(console.error);
