const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

const MODULOS_LIBERADOS = [
  '6a052574-6985-4bc6-ba16-2c58fbf02f69',
  'b225082a-ae60-457f-8bbe-7a286c14542d',
  '57616948-1a37-4f25-9cfc-48bbe97d7ae4',
  '419891a7-f5a1-4094-92b5-e24acf450f7a'
];
const BIBLIOLOGIA_ID = 'cd525251-b438-4e21-aaea-bd5578017698';

async function batchUpsertProgress(records) {
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('progresso')
      .upsert(chunk, { onConflict: 'aluno_id, aula_id', ignoreDuplicates: false });
    if (!error) inserted += chunk.length;
  }
  return inserted;
}

async function main() {
  console.log('='.repeat(70));
  console.log('EXECUTANDO CORREÇÃO - FATESA');
  console.log('='.repeat(70));

  const { data: curso } = await supabase.from('cursos').select('id').eq('nome', 'Teologia Básica').single();
  if (!curso) { console.error('Curso não encontrado'); return; }
  console.log(`\nCurso: Teologia Básica (${curso.id})`);

  // ===================================================================
  // PASSO 1: Finalizar módulos para alunos aprovados
  // ===================================================================
  console.log('\n--- [1/5] Finalizando módulos para alunos aprovados ---');

  const { data: respostas } = await supabase
    .from('respostas_aulas')
    .select('aluno_id, aula_id, nota, status')
    .eq('status', 'corrigida')
    .not('nota', 'is', null);

  if (!respostas?.length) { console.log('  Nenhuma resposta'); return; }

  const aulasCursId = [...new Set(respostas.map(r => r.aula_id))];
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, livro_id, tipo, min_grade, is_bloco_final')
    .in('id', aulasCursId);
  const aulasMap = Object.fromEntries((aulas || []).map(a => [a.id, a]));

  const examRespostas = respostas.filter(r => {
    const a = aulasMap[r.aula_id];
    return a && (a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final);
  });

  const byAlunoLivro = {};
  examRespostas.forEach(r => {
    const a = aulasMap[r.aula_id];
    const key = `${r.aluno_id}|${a.livro_id}`;
    if (!byAlunoLivro[key]) byAlunoLivro[key] = { aluno_id: r.aluno_id, livro_id: a.livro_id, notas: [] };
    byAlunoLivro[key].notas.push(r.nota);
  });

  const aprovados = [];
  for (const val of Object.values(byAlunoLivro)) {
    const melhorNota = Math.max(...val.notas);
    if (melhorNota >= 7) aprovados.push({ aluno_id: val.aluno_id, livro_id: val.livro_id });
  }
  console.log(`  Aprovações encontradas: ${aprovados.length}`);

  // Batch: buscar aulas de cada modulo
  const livroIdsSet = [...new Set(aprovados.map(a => a.livro_id))];
  const { data: aulasPorLivro } = await supabase
    .from('aulas')
    .select('id, livro_id')
    .in('livro_id', livroIdsSet);
  const aulasByLivro = {};
  (aulasPorLivro || []).forEach(a => {
    if (!aulasByLivro[a.livro_id]) aulasByLivro[a.livro_id] = [];
    aulasByLivro[a.livro_id].push(a.id);
  });

  // Criar todos os registros de progresso
  const progressRecords = [];
  for (const ap of aprovados) {
    const aulaIds = aulasByLivro[ap.livro_id] || [];
    for (const aulaId of aulaIds) {
      progressRecords.push({ aluno_id: ap.aluno_id, aula_id: aulaId, concluida: true, updated_at: new Date().toISOString() });
    }
  }
  console.log(`  Registros de progresso a criar: ${progressRecords.length}`);
  const progInserted = await batchUpsertProgress(progressRecords);
  console.log(`  Progresso inserido/atualizado: ${progInserted}`);

  // Batch: Atualizar modulos_finalizados_manual
  const { data: usersToUpdate } = await supabase
    .from('users')
    .select('id, modulos_finalizados_manual')
    .in('id', [...new Set(aprovados.map(a => a.aluno_id))]);

  for (const user of usersToUpdate || []) {
    const current = user.modulos_finalizados_manual || [];
    const novosIds = aprovados.filter(a => a.aluno_id === user.id).map(a => a.livro_id);
    let changed = false;
    for (const id of novosIds) {
      if (!current.includes(id)) { current.push(id); changed = true; }
    }
    if (changed) {
      await supabase.from('users').update({ modulos_finalizados_manual: current }).eq('id', user.id);
    }
  }
  console.log(`  modulos_finalizados_manual atualizado para ${usersToUpdate?.length || 0} alunos`);

  // ===================================================================
  // PASSO 2: Bloquear Bibliologia
  // ===================================================================
  console.log('\n--- [2/5] Bloqueando Bibliologia ---');

  await supabase.from('liberacoes_nucleo').delete().eq('item_type', 'modulo').eq('item_id', BIBLIOLOGIA_ID);
  const { data: bibAulas } = await supabase.from('aulas').select('id').eq('livro_id', BIBLIOLOGIA_ID);
  if (bibAulas?.length) {
    await supabase.from('liberacoes_nucleo').delete().in('item_id', bibAulas.map(a => a.id));
  }
  await supabase.from('livros').update({ professor_active: false }).eq('id', BIBLIOLOGIA_ID);
  await supabase.from('aulas').update({ status_liberacao: false }).eq('livro_id', BIBLIOLOGIA_ID);
  console.log('  Bibliologia bloqueada (professor_active=false, liberações removidas)');

  // ===================================================================
  // PASSO 3: Bloquear demais módulos
  // ===================================================================
  console.log('\n--- [3/5] Bloqueando demais módulos ---');

  const { data: todosLivros } = await supabase
    .from('livros')
    .select('id, titulo, professor_active')
    .eq('curso_id', curso.id);

  const bloquearIds = (todosLivros || [])
    .filter(l => !MODULOS_LIBERADOS.includes(l.id) && l.id !== BIBLIOLOGIA_ID && l.professor_active === true)
    .map(l => l.id);

  if (bloquearIds.length > 0) {
    await supabase.from('livros').update({ professor_active: false }).in('id', bloquearIds);
    await supabase.from('liberacoes_nucleo').delete().eq('item_type', 'modulo').in('item_id', bloquearIds);

    const { data: aulasBloq } = await supabase.from('aulas').select('id').in('livro_id', bloquearIds);
    if (aulasBloq?.length) {
      await supabase.from('liberacoes_nucleo').delete().in('item_id', aulasBloq.map(a => a.id));
    }
    await supabase.from('aulas').update({ status_liberacao: false }).in('livro_id', bloquearIds);
    console.log(`  ${bloquearIds.length} módulos bloqueados`);
  } else {
    console.log('  Nenhum módulo adicional para bloquear');
  }

  // ===================================================================
  // PASSO 4: Garantir módulos liberados
  // ===================================================================
  console.log('\n--- [4/5] Garantindo módulos liberados ---');

  await supabase.from('livros').update({ professor_active: true }).in('id', MODULOS_LIBERADOS);
  await supabase.from('aulas').update({ status_liberacao: true }).in('livro_id', MODULOS_LIBERADOS);
  console.log('  4 módulos garantidos como ativos');

  // ===================================================================
  // PASSO 5: Remover provas de módulos bloqueados
  // ===================================================================
  console.log('\n--- [5/5] Removendo provas de módulos bloqueados ---');

  const todosBloq = (todosLivros || []).filter(l => !MODULOS_LIBERADOS.includes(l.id)).map(l => l.id);
  if (todosBloq.length > 0) {
    const { data: provas } = await supabase
      .from('aulas')
      .select('id')
      .in('livro_id', todosBloq)
      .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');
    if (provas?.length) {
      await supabase.from('liberacoes_nucleo').delete().eq('item_type', 'atividade').in('item_id', provas.map(p => p.id));
      console.log(`  Liberações de provas removidas: ${provas.length}`);
    }
  }

  // ===================================================================
  // VERIFICAÇÃO FINAL
  // ===================================================================
  console.log('\n--- VERIFICAÇÃO FINAL ---');

  const { data: vLivros } = await supabase
    .from('livros')
    .select('id, ordem, titulo, professor_active')
    .eq('curso_id', curso.id)
    .order('ordem');

  console.log('\n  Módulos ATIVOS:');
  (vLivros || []).filter(l => l.professor_active).forEach(l =>
    console.log(`    [${String(l.ordem).padStart(2, ' ')}] ${l.titulo}`));

  console.log('\n  Módulos BLOQUEADOS:');
  (vLivros || []).filter(l => !l.professor_active).forEach(l =>
    console.log(`    [${String(l.ordem).padStart(2, ' ')}] ${l.titulo}`));

  const { data: vRel, count: vRelCount } = await supabase
    .from('liberacoes_nucleo')
    .select('item_type', { count: 'exact', head: true });

  const { count: relMod } = await supabase
    .from('liberacoes_nucleo')
    .select('id', { count: 'exact', head: true })
    .eq('item_type', 'modulo');

  const { count: relAtv } = await supabase
    .from('liberacoes_nucleo')
    .select('id', { count: 'exact', head: true })
    .eq('item_type', 'atividade');

  const { count: relVid } = await supabase
    .from('liberacoes_nucleo')
    .select('id', { count: 'exact', head: true })
    .eq('item_type', 'video');

  console.log(`\n  Liberações restantes: ${relMod || 0} módulos, ${relAtv || 0} atividades, ${relVid || 0} vídeos`);

  console.log('\n=== CORREÇÃO CONCLUÍDA ===');
}

main().catch(console.error);
