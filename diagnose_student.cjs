const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

// Simula exatamente o que o código do aluno faz
async function simulateStudentView(nucleoId) {
  console.log(`\n=== Simulando visão do aluno com nucleo_id=${nucleoId} ===\n`);

  // 1. Busca releases (com o código NOVO que fizemos)
  const { data: releases, error: relErr } = await supabase
    .from('liberacoes_nucleo')
    .select('item_id, item_type, created_at')
    .or(`nucleo_id.eq.${nucleoId},nucleo_id.is.null`)
    .eq('liberado', true);
  
  if (relErr) { console.error('Erro releases:', relErr.message); return; }
  console.log(`Releases encontradas: ${releases?.length ?? 0}`);

  const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
  const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
  const releasedItems = (releases || []).filter(r => ['video', 'licao', 'atividade'].includes(r.item_type)).map(r => r.item_id);
  
  console.log(`  Módulos liberados: ${releasedModulos.length}`);
  console.log(`  Atividades liberadas: ${releasedAtividades.length}`);
  console.log(`  Items totais (video+licao+atividade): ${releasedItems.length}`);

  // 2. Busca exams
  const { data: exams } = await supabase
    .from('aulas')
    .select('id, livro_id, tipo, titulo, is_bloco_final')
    .or('tipo.eq.prova,is_bloco_final.eq.true,titulo.ilike.%V1%,titulo.ilike.%V2%,titulo.ilike.%V3%,titulo.ilike.%RECUPERACAO%');
  
  console.log(`\nExams encontrados: ${exams?.length ?? 0}`);

  // 3. Computa releasedBookIdsFromItems e releasedExamBookIds
  const releasedBookIdsFromItems = new Set();
  const releasedExamBookIds = new Set();
  if (exams && releases) {
    exams.forEach(exam => {
      if (releasedItems.includes(exam.id)) {
        releasedBookIdsFromItems.add(exam.livro_id);
      }
      if (releasedAtividades.includes(exam.id)) {
        releasedExamBookIds.add(exam.livro_id);
      }
    });
  }
  console.log(`\nLivros identificados via releasedBookIdsFromItems: ${releasedBookIdsFromItems.size}`);
  console.log(`Livros identificados via releasedExamBookIds: ${releasedExamBookIds.size}`);

  // 4. Busca cursos com livros e aulas
  const courseSelect = 'id, nome, nivel, livros(id, titulo, ordem, professor_active, aulas(id, tipo))';
  const { data: allCourses } = await supabase.from('cursos').select(courseSelect);

  console.log('\n=== ANÁLISE DE MÓDULOS (visão do aluno) ===\n');
  let totalModulos = 0;
  let modulosReleased = 0;
  let modulosBloqueados = [];

  allCourses?.forEach(c => {
    const sortedLivros = (c.livros || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    sortedLivros.forEach(l => {
      totalModulos++;
      const bookOrdem = l.ordem || 1;
      const isManualModuleRelease = releasedModulos.includes(l.id);
      const isPreviousFinishedOrReleased = bookOrdem === 1;
      const bookInReleasedExams = releasedExamBookIds.has(l.id);
      const bookInReleasedItems = releasedBookIdsFromItems.has(l.id);
      const anyAulaReleased = (l.aulas || []).some(a => releasedItems.includes(a.id));

      const isModuleReleased = isManualModuleRelease || isPreviousFinishedOrReleased || bookInReleasedExams || bookInReleasedItems || anyAulaReleased;
      const professorActive = l.professor_active !== false;
      const isReleased = isModuleReleased && professorActive;

      if (isReleased) {
        modulosReleased++;
      } else {
        modulosBloqueados.push({
          titulo: l.titulo,
          ordem: bookOrdem,
          curso: c.nome,
          isManualModuleRelease,
          isPreviousFinishedOrReleased,
          bookInReleasedExams,
          bookInReleasedItems,
          anyAulaReleased,
          professorActive
        });
      }
    });
  });

  console.log(`Total módulos: ${totalModulos}`);
  console.log(`Módulos VISÍVEIS para aluno: ${modulosReleased}`);
  console.log(`Módulos BLOQUEADOS: ${modulosBloqueados.length}`);
  
  if (modulosBloqueados.length > 0) {
    console.log('\nMódulos bloqueados (por quê):');
    modulosBloqueados.forEach(m => {
      console.log(`  [${m.curso}] ${m.titulo} (ordem ${m.ordem})`);
      console.log(`    manualRelease=${m.isManualModuleRelease}, prevFinished=${m.isPreviousFinishedOrReleased}, examReleased=${m.bookInReleasedExams}, itemsReleased=${m.bookInReleasedItems}, anyAula=${m.anyAulaReleased}, profActive=${m.professorActive}`);
    });
  }
}

// Testa com o nucleo_id do aluno teste (Administração)
simulateStudentView('6c1eeee0-8220-4885-b33d-6ca31fa8c27c').catch(console.error);
