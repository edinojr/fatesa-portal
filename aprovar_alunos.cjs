const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  console.log('='.repeat(70));
  console.log('APROVAÇÃO DE ALUNOS - MÓDULOS');
  console.log('Epístola aos Hebreus / Doutrina do Espírito Santo / Epístolas Paulinas I');
  console.log('='.repeat(70));

  const { data: allLivros } = await supabase
    .from('livros')
    .select('id, titulo, ordem')
    .in('ordem', [14, 15, 16])
    .eq('curso_id', '4ec2d32a-92c5-4bdf-bfe8-02cded9f5719');

  console.log('\nMódulos alvo:');
  (allLivros || []).forEach(function(l) { console.log('  ' + l.titulo + ' (ordem ' + l.ordem + ')'); });

  const livroIds = (allLivros || []).map(function(l) { return l.id; });

  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, livro_id, questionario')
    .in('livro_id', livroIds)
    .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');

  console.log('\n=== GABARITOS DAS AVALIAÇÕES ===\n');
  for (let ai = 0; ai < (aulas || []).length; ai++) {
    const aula = aulas[ai];
    const livro = (allLivros || []).find(function(l) { return l.id === aula.livro_id; });
    const qs = aula.questionario || [];
    console.log('[' + (livro ? livro.titulo : '?') + '] ' + aula.titulo + ' (' + qs.length + ' questões)');
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      let ans = '?';
      if (q.type === 'true_false') ans = q.isTrue ? 'V' : 'F';
      else if (q.type === 'multiple_choice' || !q.type) {
        const opts = q.options || ['A','B','C','D'];
        const idx = q.correct || 0;
        ans = (opts[idx] || 'Opção ' + (idx + 1));
      }
      else if (q.type === 'matching') {
        const pairs = q.matchingPairs || [];
        ans = pairs.map(function(p) { return p.left + '→' + p.right; }).join(' | ');
      }
      else if (q.type === 'discursive') ans = '✍ Dissertativa';
      console.log('  Q' + (i+1) + ': ' + ans);
    }
    console.log('');
  }

  const aulaIds = (aulas || []).map(function(a) { return a.id; });

  const { data: subs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, created_at')
    .in('aula_id', aulaIds);

  const alunoIds = [...new Set((subs || []).map(function(s) { return s.aluno_id; }))];

  const { data: users } = await supabase
    .from('users')
    .select('id, nome, email, created_at')
    .in('id', alunoIds);

  const usersMap = {};
  (users || []).forEach(function(u) { usersMap[u.id] = u; });

  console.log('=== SUBMISSÕES ENCONTRADAS ===\n');
  const subsPorAula = {};
  for (let si = 0; si < (subs || []).length; si++) {
    const sub = subs[si];
    if (!subsPorAula[sub.aula_id]) subsPorAula[sub.aula_id] = [];
    subsPorAula[sub.aula_id].push(sub);
  }

  for (let ai2 = 0; ai2 < (aulas || []).length; ai2++) {
    const aula = aulas[ai2];
    const livro = (allLivros || []).find(function(l) { return l.id === aula.livro_id; });
    const aulaSubs = subsPorAula[aula.id] || [];
    console.log('[' + (livro ? livro.titulo : '?') + '] ' + (aulaSubs.length + ' submissões'));
    for (let si2 = 0; si2 < aulaSubs.length; si2++) {
      const sub = aulaSubs[si2];
      const user = usersMap[sub.aluno_id];
      console.log('  ' + (user ? user.nome : sub.aluno_id) + ' | status: ' + sub.status + ' | nota: ' + (sub.nota ?? 'N/A'));
    }
    console.log('');
  }

  const subIds = (subs || []).map(function(s) { return s.id; });

  console.log('='.repeat(70));
  console.log('APROVANDO ' + subIds.length + ' SUBMISSÕES COM NOTA 10...');
  console.log('Data referência: 2026-06-11 (liberação lição Teologia Prática)');
  console.log('='.repeat(70));

  if (subIds.length > 0) {
    const { data: updated, error } = await supabase
      .from('respostas_aulas')
      .update({
        nota: 10,
        status: 'corrigida',
        primeira_correcao_at: '2026-06-11T00:00:00Z',
        updated_at: new Date().toISOString()
      })
      .in('id', subIds)
      .select('id, nota, status');

    if (error) {
      console.error('\nErro ao atualizar:', error.message || error);
    } else {
      console.log('\n✓ ' + (updated ? updated.length : 0) + ' submissões atualizadas para nota=10, status=corrigida');
    }
  } else {
    console.log('\nNenhuma submissão para aprovar.');
  }

  console.log('\nConcluído!');
}

main().catch(console.error);
