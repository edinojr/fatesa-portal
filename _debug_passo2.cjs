const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

const HEBREUS_AULA_IDS = [
  'e50aa7eb-49dc-4a60-8a44-62833cb634b1',
  '82585e3b-12cd-4a30-9d5a-802891d6d751',
  '9a94f0ee-62ac-4969-b803-a93645775de3'
];
const DEMARCHI_NUCLEO_ID = '8f159455-dd69-4324-80b2-22f881b5d7f1';
const HEBREUS_BOOK_ID = '6a052574-6985-4bc6-ba16-2c58fbf02f69';
const NOTA_MINIMA_APROVACAO = 7.0;

(async () => {
  // Check how many unique students have Hebrews submissions
  const { data: subs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status')
    .in('aula_id', HEBREUS_AULA_IDS);

  console.log('Total subs: ' + (subs?.length || 0));

  const byStudent = {};
  (subs || []).forEach(s => {
    if (!byStudent[s.aluno_id]) byStudent[s.aluno_id] = [];
    byStudent[s.aluno_id].push(s);
  });

  console.log('Unique students: ' + Object.keys(byStudent).length);

  // Get users
  const alunoIds = Object.keys(byStudent);
  const { data: users } = await supabase
    .from('users')
    .select('id, nome, nucleo_id, modulos_finalizados_manual')
    .in('id', alunoIds);

  console.log('Users found in DB: ' + (users?.length || 0));

  const usersMap = {};
  (users || []).forEach(u => { usersMap[u.id] = u; });

  const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
  const nucleosMap = {};
  (nucleos || []).forEach(n => { nucleosMap[n.id] = n.nome; });

  let count = 0;
  let approved = 0;
  let ignored = 0;
  let demarchiCount = 0;

  for (const [alunoId, alunoSubs] of Object.entries(byStudent)) {
    const user = usersMap[alunoId];
    if (!user) {
      console.log('  User not found: ' + alunoId);
      ignored++;
      continue;
    }

    const jaAprovado = alunoSubs.some(s => s.status === 'corrigida' && (s.nota || 0) >= NOTA_MINIMA_APROVACAO);
    const manualModules = user.modulos_finalizados_manual || [];
    const isDemarchi = user.nucleo_id === DEMARCHI_NUCLEO_ID;
    const jaTemManual = manualModules.includes(HEBREUS_BOOK_ID);

    if (count < 5) {
      console.log('\n  Aluno: ' + user.nome);
      console.log('    Nucleo: ' + (nucleosMap[user.nucleo_id] || 'sem nucleo'));
      console.log('    Submissoes: ' + alunoSubs.length);
      console.log('    Notas: ' + JSON.stringify(alunoSubs.map(s => ({ nota: s.nota, status: s.status }))));
      console.log('    jaAprovado: ' + jaAprovado);
      console.log('    isDemarchi: ' + isDemarchi);
      console.log('    jaTemManual: ' + jaTemManual);
      console.log('    manualModules: ' + JSON.stringify(manualModules));
    }

    if (isDemarchi) {
      demarchiCount++;
      ignored++;
      continue;
    }

    if (!jaAprovado) {
      ignored++;
      continue;
    }

    if (jaTemManual) {
      approved++;
      continue;
    }

    approved++;
    count++;
  }

  console.log('\nTotal approved: ' + approved);
  console.log('Total ignored: ' + ignored);
  console.log('Demarchi count: ' + demarchiCount);
})().catch(console.error);
