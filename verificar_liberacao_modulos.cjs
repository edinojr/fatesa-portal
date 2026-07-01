const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  console.log('Verificando módulos do curso Teologia Básica...\n');

  const { data: cursos } = await supabase.from('cursos').select('id, nome').eq('nome', 'Teologia Básica').single();
  if (!cursos) { console.log('Curso não encontrado'); return; }

  const { data: livros } = await supabase
    .from('livros')
    .select('id, titulo, numero_modulo, ordem, professor_active')
    .eq('curso_id', cursos.id)
    .order('ordem');

  if (!livros) { console.log('Nenhum livro encontrado'); return; }

  console.log('Módulos encontrados:');
  console.log('='.repeat(80));
  livros.forEach(l => {
    console.log(`${String(l.numero_modulo || '-').padStart(3)} | ordem ${String(l.ordem).padStart(4)} | ${l.professor_active ? 'ATIVO ' : 'INATIV'} | ${l.titulo}`);
  });

  // Check Teologia Prática and História da Igreja specifically
  const tp = livros.find(l => l.titulo.includes('Teologia Prática'));
  const hi = livros.find(l => l.titulo.includes('História da Igreja'));

  if (tp && hi) {
    console.log('\n--- Teologia Prática ---');
    console.log(`ID: ${tp.id}`);
    console.log(`numero_modulo: ${tp.numero_modulo}`);
    console.log(`ordem: ${tp.ordem}`);
    console.log(`professor_active: ${tp.professor_active}`);

    console.log('\n--- História da Igreja (próximo módulo) ---');
    console.log(`ID: ${hi.id}`);
    console.log(`numero_modulo: ${hi.numero_modulo}`);
    console.log(`ordem: ${hi.ordem}`);
    console.log(`professor_active: ${hi.professor_active}`);

    // Check if next by numero_modulo
    const tpNum = parseInt(tp.numero_modulo);
    if (!isNaN(tpNum)) {
      const expectedNextNum = tpNum + 1 > 27 ? 1 : tpNum + 1;
      console.log(`\nEsperado próximo por numero_modulo: ${expectedNextNum}`);
      console.log(`História da Igreja tem numero_modulo: ${hi.numero_modulo}`);
      console.log(`Match por numero_modulo: ${parseInt(hi.numero_modulo) === expectedNextNum}`);
    }

    // Check if next by ordem
    console.log(`\nEsperado próximo por ordem: ${tp.ordem + 1}`);
    console.log(`História da Igreja tem ordem: ${hi.ordem}`);
    console.log(`Match por ordem: ${hi.ordem === tp.ordem + 1}`);
  } else {
    console.log('\nMódulos Teologia Prática ou História da Igreja não encontrados');
    if (!tp) console.log('Teologia Prática: NÃO ENCONTRADO');
    if (!hi) console.log('História da Igreja: NÃO ENCONTRADO');
  }

  // Check liberacoes_nucleo for Vila Luzita
  console.log('\n--- Liberações Vila Luzita ---\n');
  const { data: nucleos } = await supabase.from('nucleos').select('id, nome').eq('nome', 'Vila Luzita');
  if (nucleos && nucleos.length > 0) {
    const nucId = nucleos[0].id;
    console.log(`Núcleo encontrado: ${nucleos[0].nome} (${nucId})`);

    if (tp) {
      const { data: tpReleases } = await supabase
        .from('liberacoes_nucleo')
        .select('*')
        .eq('nucleo_id', nucId)
        .eq('item_id', tp.id);
      console.log(`\nLiberações para Teologia Prática (item_id=${tp.id}):`, tpReleases?.length || 0);
      if (tpReleases?.length) console.log(JSON.stringify(tpReleases, null, 2));
    }

    if (hi) {
      const { data: hiReleases } = await supabase
        .from('liberacoes_nucleo')
        .select('*')
        .eq('nucleo_id', nucId)
        .eq('item_id', hi.id);
      console.log(`\nLiberações para História da Igreja (item_id=${hi.id}):`, hiReleases?.length || 0);
      if (hiReleases?.length) console.log(JSON.stringify(hiReleases, null, 2));

      // Check if any content of HI is released
      const { data: hiAulas } = await supabase
        .from('aulas')
        .select('id, tipo, titulo')
        .eq('livro_id', hi.id)
        .not('tipo', 'eq', 'prova')
        .not('tipo', 'eq', 'avaliacao');
      
      if (hiAulas && hiAulas.length > 0) {
        const hiAulaIds = hiAulas.map(a => a.id);
        const { data: hiContentReleases } = await supabase
          .from('liberacoes_nucleo')
          .select('*')
          .eq('nucleo_id', nucId)
          .in('item_id', hiAulaIds);
        console.log(`\nLiberações de CONTEÚDO para História da Igreja:`, hiContentReleases?.length || 0, `/ ${hiAulas.length} aulas`);
        if (hiContentReleases?.length) console.log(JSON.stringify(hiContentReleases.map(r => ({ item_id: r.item_id, item_type: r.item_type })), null, 2));
      }
    }
  } else {
    console.log('Núcleo Vila Luzita não encontrado');
  }
}

main().catch(console.error);
