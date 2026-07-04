const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

(async () => {
  // 1. Find all courses
  console.log('=== CURSOS ===');
  const { data: cursos } = await supabase.from('cursos').select('*');
  console.log(JSON.stringify(cursos, null, 2));

  // 2. Check the specific modules
  const hebId = '6a052574-6985-4bc6-ba16-2c58fbf02f69';
  const paul1Id = '57616948-1a37-4f25-9cfc-48bbe97d7ae4';
  const demarchId = '8f159455-dd69-4324-80b2-22f881b5d7f1';

  // 3. Get all students from Demarchi
  console.log('\n=== ALUNOS DO DEMARCHI ===');
  const { data: demarchStudents } = await supabase
    .from('users')
    .select('id, nome, tipo, modulos_finalizados_manual')
    .eq('nucleo_id', demarchId);
  console.log('Total: ' + (demarchStudents?.length || 0));
  (demarchStudents || []).forEach(s => console.log('  ' + s.nome + ' | tipo: ' + s.tipo + ' | manual: ' + JSON.stringify(s.modulos_finalizados_manual)));

  // 4. Check who has Hebrews submissions and their status
  console.log('\n=== SUBMISSOES - HEBREUS ===');
  const { data: hebAulas } = await supabase.from('aulas').select('id, titulo, tipo, versao').eq('livro_id', hebId).or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');
  const hebAulaIds = (hebAulas || []).map(a => a.id);
  console.log('Aulas de avaliacao: ' + JSON.stringify(hebAulas, null, 2));

  if (hebAulaIds.length > 0) {
    const { data: subs } = await supabase
      .from('respostas_aulas')
      .select('id, aula_id, aluno_id, nota, status, created_at')
      .in('aula_id', hebAulaIds)
      .order('created_at', { ascending: false });
    console.log('Submissoes: ' + (subs?.length || 0));

    const alunoIds = [...new Set((subs || []).map(s => s.aluno_id))];
    const { data: users } = await supabase.from('users').select('id, nome, nucleo_id').in('id', alunoIds);
    const usersMap = {};
    (users || []).forEach(u => usersMap[u.id] = u);

    const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
    const nucleosMap = {};
    (nucleos || []).forEach(n => nucleosMap[n.id] = n.nome);

    (subs || []).forEach(s => {
      const user = usersMap[s.aluno_id];
      const nucleoNome = nucleosMap[user?.nucleo_id] || 'sem nucleo';
      console.log('  ' + (user?.nome || s.aluno_id) + ' (' + nucleoNome + ') | aula: ' + s.aula_id + ' | nota: ' + s.nota + ' | status: ' + s.status + ' | data: ' + s.created_at);
    });
  }

  // 5. Submissions after 06/06 with no grade (nota = null)
  console.log('\n=== SUBMISSOES APOS 06/06 COM NOTA NULL ===');
  const { data: nullSubs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, created_at')
    .gte('created_at', '2026-06-06T00:00:00Z')
    .is('nota', null)
    .neq('status', 'pendente')
    .order('created_at', { ascending: false });
  console.log('Total sem nota: ' + (nullSubs?.length || 0));
  if (nullSubs && nullSubs.length > 0) {
    const alunoIds2 = [...new Set(nullSubs.map(s => s.aluno_id))];
    const { data: users2 } = await supabase.from('users').select('id, nome, nucleo_id').in('id', alunoIds2);
    const usersMap2 = {};
    (users2 || []).forEach(u => usersMap2[u.id] = u);
    
    // Get aula info
    const aulaIds2 = [...new Set(nullSubs.map(s => s.aula_id))];
    const { data: aulas2 } = await supabase.from('aulas').select('id, titulo, tipo, livro_id, questionario').in('id', aulaIds2);
    const aulasMap2 = {};
    (aulas2 || []).forEach(a => aulasMap2[a.id] = a);

    nullSubs.slice(0, 15).forEach(s => {
      const user = usersMap2[s.aluno_id];
      const aula = aulasMap2[s.aula_id];
      console.log('  ' + (user?.nome || s.aluno_id) + ' | aula: ' + (aula?.titulo || s.aula_id) + ' | status: ' + s.status + ' | data: ' + s.created_at);
    });
  }

  // 6. Total submissions count for Hebrews
  console.log('\n=== SUBMISSOES HEBREUS APOS 06/06 ===');
  if (hebAulaIds.length > 0) {
    const { data: hebSubsAfter } = await supabase
      .from('respostas_aulas')
      .select('id, aula_id, aluno_id, nota, status, created_at')
      .in('aula_id', hebAulaIds)
      .gte('created_at', '2026-06-06T00:00:00Z');
    console.log('Total: ' + (hebSubsAfter?.length || 0));
  }
})().catch(console.error);
