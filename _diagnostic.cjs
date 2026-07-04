const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

(async () => {
  console.log('=== NUCLEOS ===');
  const { data: nucleos } = await supabase.from('nucleos').select('*').order('nome');
  console.log(JSON.stringify(nucleos, null, 2));

  console.log('\n=== MODULOS (livros) - Teologia Basica ===');
  const { data: curso } = await supabase.from('cursos').select('id, nome').eq('nome', 'Teologia Basica').single();
  if (curso) {
    const { data: livros } = await supabase.from('livros').select('id, ordem, titulo, professor_active').eq('curso_id', curso.id).order('ordem');
    console.log(JSON.stringify(livros, null, 2));
  }

  console.log('\n=== ALUNOS POR NUCLEO ===');
  const { data: users } = await supabase.from('users').select('id, nome, nucleo_id, tipo, status_nucleo, modulos_finalizados_manual');
  if (users) {
    const byNucleo = {};
    users.forEach(u => {
      const n = u.nucleo_id || 'sem_nucleo';
      if (!byNucleo[n]) byNucleo[n] = [];
      byNucleo[n].push({ nome: u.nome, tipo: u.tipo, status: u.status_nucleo });
    });
    for (const [nId, alunos] of Object.entries(byNucleo)) {
      const nucleoInfo = nucleos?.find(n => n.id === nId);
      const nomeNucleo = nucleoInfo ? nucleoInfo.nome : nId;
      console.log('\n  ' + nomeNucleo + ': ' + alunos.length + ' alunos');
      alunos.forEach(a => console.log('    ' + a.nome + ' (' + a.tipo + ', status: ' + a.status + ')'));
    }
  }

  console.log('\n=== SUBMISSOES APOS 06/06/2026 ===');
  const { data: subs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, created_at')
    .gte('created_at', '2026-06-06T00:00:00Z')
    .order('created_at', { ascending: false });
  console.log('Total: ' + (subs?.length || 0));
  if (subs && subs.length > 0) {
    console.log('Primeiras 10:');
    subs.slice(0, 10).forEach(s => console.log('  ' + s.id + ' | aula: ' + s.aula_id + ' | aluno: ' + s.aluno_id + ' | nota: ' + s.nota + ' | status: ' + s.status + ' | data: ' + s.created_at));
  }

  console.log('\n=== EPISTOLA AOS HEBREUS - aulas (provas) ===');
  const { data: hebLivro } = await supabase.from('livros').select('id, titulo').ilike('titulo', '%Hebreus%');
  console.log(JSON.stringify(hebLivro, null, 2));
  if (hebLivro && hebLivro.length > 0) {
    const { data: aulas } = await supabase.from('aulas').select('id, titulo, tipo, versao, min_grade, is_bloco_final').eq('livro_id', hebLivro[0].id);
    console.log('Aulas do livro:');
    console.log(JSON.stringify(aulas, null, 2));
  }

  console.log('\n=== EPISTOLAS PAULINAS I ===');
  const { data: paul1Livro } = await supabase.from('livros').select('id, titulo').ilike('titulo', '%Paulinas I%');
  console.log(JSON.stringify(paul1Livro, null, 2));
})().catch(console.error);
