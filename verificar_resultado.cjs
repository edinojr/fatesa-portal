const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  // 1. Modulos ativos/bloqueados
  const { data: livros } = await supabase.from('livros').select('id, ordem, titulo, professor_active').order('ordem');
  console.log('MÓDULOS ATIVOS (professor_active = true):');
  livros.filter(l => l.professor_active).forEach(l => console.log(`  [${l.ordem}] ${l.titulo}`));
  console.log('\nMÓDULOS BLOQUEADOS (professor_active = false):');
  livros.filter(l => !l.professor_active).forEach(l => console.log(`  [${l.ordem}] ${l.titulo}`));

  // 2. Liberações por núcleo
  const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
  const nMap = Object.fromEntries((nucleos||[]).map(n => [n.id, n.nome]));
  const lMap = Object.fromEntries((livros||[]).map(l => [l.id, l.titulo]));

  const { data: releases } = await supabase.from('liberacoes_nucleo').select('nucleo_id, item_id, item_type').eq('item_type', 'modulo');
  console.log('\nLIBERAÇÕES DE MÓDULO POR NÚCLEO:');
  const byN = {};
  (releases||[]).forEach(r => {
    const key = nMap[r.nucleo_id] || r.nucleo_id;
    if (!byN[key]) byN[key] = [];
    byN[key].push(lMap[r.item_id] || r.item_id);
  });
  for (const [n, mods] of Object.entries(byN)) {
    console.log(`  ${n}: ${mods.join(', ')}`);
  }
  if (!Object.keys(byN).length) console.log('  Nenhuma liberação de módulo');

  // 3. Total liberações
  const { count: mCount } = await supabase.from('liberacoes_nucleo').select('id', { count: 'exact', head: true }).eq('item_type', 'modulo');
  const { count: aCount } = await supabase.from('liberacoes_nucleo').select('id', { count: 'exact', head: true }).eq('item_type', 'atividade');
  const { count: vCount } = await supabase.from('liberacoes_nucleo').select('id', { count: 'exact', head: true }).eq('item_type', 'video');
  console.log(`\nLIBERAÇÕES TOTAIS: ${mCount} módulos, ${aCount} atividades, ${vCount} vídeos`);

  // 4. Alunos que tiveram progresso inserido
  const { count: pCount } = await supabase.from('progresso').select('id', { count: 'exact', head: true }).eq('concluida', true);
  console.log(`\nREGIstROS DE PROGRESSO CONCLUÍDOS: ${pCount}`);

  // 5. modulos_finalizados_manual (coluna deve existir)
  const { data: users } = await supabase.from('users').select('nome, modulos_finalizados_manual').not('modulos_finalizados_manual', 'is', null).limit(10);
  console.log(`\nUSUÁRIOS COM modulos_finalizados_manual: ${users?.length || 0}`);
  if (users && users[0]) {
    console.log('  Amostra:', users[0].nome, '->', (users[0].modulos_finalizados_manual||[]).length, 'módulos');
  }
}

main().catch(console.error);
