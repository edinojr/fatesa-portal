const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

(async () => {
  // Find what course Hebrews belongs to
  const hebId = '6a052574-6985-4bc6-ba16-2c58fbf02f69';
  const { data: hebBook } = await supabase.from('livros').select('*, cursos(*)').eq('id', hebId).single();
  console.log('Hebrews book:', JSON.stringify(hebBook, null, 2));

  // Find curso_id for Teologia Basica
  const { data: cursos } = await supabase.from('cursos').select('*');
  console.log('\nAll cursos:', JSON.stringify(cursos, null, 2));

  // Check submissions after 06/06 that are EXAMS (not exercises)
  console.log('\n=== EXAM SUBMISSIONS AFTER 06/06 ===');
  const { data: allSubsAfter } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, created_at')
    .gte('created_at', '2026-06-06T00:00:00Z');
  
  const aulaIds = [...new Set((allSubsAfter || []).map(s => s.aula_id))];
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, tipo, versao, is_bloco_final, livro_id, questionario')
    .in('id', aulaIds);
  const aulasMap = {};
  (aulas || []).forEach(a => aulasMap[a.id] = a);

  // Count by type
  const examSubs = (allSubsAfter || []).filter(s => {
    const a = aulasMap[s.aula_id];
    return a && (a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final);
  });
  console.log('Exam submissions after 06/06: ' + examSubs.length);
  examSubs.forEach(s => {
    const a = aulasMap[s.aula_id];
    console.log('  ' + (a?.titulo || s.aula_id) + ' | nota: ' + s.nota + ' | status: ' + s.status + ' | data: ' + s.created_at);
  });

  // Check which students do NOT have Hebrews approved (nota >= 7)
  console.log('\n=== STUDENTS NOT APPROVED IN HEBREWS ===');
  const hebAulaIds = ['e50aa7eb-49dc-4a60-8a44-62833cb634b1', '82585e3b-12cd-4a30-9d5a-802891d6d751', '9a94f0ee-62ac-4969-b803-a93645775de3'];
  const { data: allSubs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status')
    .in('aula_id', hebAulaIds);
  
  // Group by student
  const byStudent = {};
  (allSubs || []).forEach(s => {
    if (!byStudent[s.aluno_id]) byStudent[s.aluno_id] = [];
    byStudent[s.aluno_id].push(s);
  });

  // Get all students
  const { data: allUsers } = await supabase.from('users').select('id, nome, nucleo_id');
  const usersMap = {};
  (allUsers || []).forEach(u => usersMap[u.id] = u);

  const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
  const nucleosMap = {};
  (nucleos || []).forEach(n => nucleosMap[n.id] = n.nome);

  for (const [alunoId, subs] of Object.entries(byStudent)) {
    const user = usersMap[alunoId];
    const maxNota = Math.max(...subs.map(s => s.nota || 0));
    if (maxNota < 7) {
      console.log('  ' + (user?.nome || alunoId) + ' (' + (nucleosMap[user?.nucleo_id] || 'sem nucleo') + ') | max nota: ' + maxNota);
    }
  }

  // Check who has modulos_finalizados_manual
  console.log('\n=== USERS WITH MODULOS FINALIZADOS MANUAL ===');
  const { data: usersWithManual } = await supabase
    .from('users')
    .select('id, nome, nucleo_id, modulos_finalizados_manual')
    .not('modulos_finalizados_manual', 'eq', '[]');
  console.log('Total: ' + (usersWithManual?.length || 0));
  (usersWithManual || []).slice(0, 10).forEach(u => {
    console.log('  ' + u.nome + ' (' + (nucleosMap[u.nucleo_id] || 'sem nucleo') + '): ' + JSON.stringify(u.modulos_finalizados_manual));
  });
})().catch(console.error);
