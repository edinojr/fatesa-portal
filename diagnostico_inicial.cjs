const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO INICIAL - FATESA');
  console.log('='.repeat(80));

  // 1. CURSOS
  console.log('\n--- CURSOS ---');
  const { data: cursos } = await supabase.from('cursos').select('*').order('nome');
  cursos?.forEach(c => console.log(`  ${c.id} | ${c.nome} (nivel: ${c.nivel || 'N/A'})`));

  // 2. MÓDULOS (LIVROS)
  console.log('\n--- TODOS OS MÓDULOS (LIVROS) ---');
  const { data: livros } = await supabase
    .from('livros')
    .select('id, curso_id, ordem, titulo, professor_active')
    .order('ordem');
  livros?.forEach(l => {
    const cursoNome = cursos?.find(c => c.id === l.curso_id)?.nome || 'N/A';
    console.log(`  [${l.ordem}] ${l.id} | ${l.titulo} | Curso: ${cursoNome} | prof_active: ${l.professor_active}`);
  });

  // 3. NÚCLEOS
  console.log('\n--- NÚCLEOS ---');
  const { data: nucleos } = await supabase.from('nucleos').select('*').order('nome');
  nucleos?.forEach(n => console.log(`  ${n.id} | ${n.nome} | active: ${n.is_active} | hidden: ${n.is_hidden} | modules_blocked: ${n.modules_blocked}`));

  // 4. LIBERAÇÕES POR NÚCLEO
  console.log('\n--- LIBERAÇÕES (liberacoes_nucleo) ---');
  const { data: releases } = await supabase
    .from('liberacoes_nucleo')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Get nucleos names separately
  const { data: allNucleos } = await supabase.from('nucleos').select('id, nome');
  const nucleoMap = {};
  (allNucleos || []).forEach(n => { nucleoMap[n.id] = n.nome; });
  
  if (releases && releases.length > 0) {
    const byNucleo = {};
    releases.forEach(r => {
      const key = `${r.nucleo_id} (${nucleoMap[r.nucleo_id] || 'N/A'})`;
      if (!byNucleo[key]) byNucleo[key] = { modulo: [], atividade: [], video: [] };
      if (r.item_type === 'modulo') byNucleo[key].modulo.push(r);
      else if (r.item_type === 'atividade') byNucleo[key].atividade.push(r);
      else if (r.item_type === 'video') byNucleo[key].video.push(r);
    });
    for (const [nucleoKey, items] of Object.entries(byNucleo)) {
      console.log(`\n  Núcleo: ${nucleoKey}`);
      if (items.modulo.length > 0) {
        console.log(`    Módulos liberados:`);
        for (const m of items.modulo) {
          const livro = livros?.find(l => l.id === m.item_id);
          console.log(`      ${m.item_id} | ${livro?.titulo || 'DESCONHECIDO'} | criado: ${m.created_at} | liberado: ${m.liberado}`);
        }
      }
      if (items.atividade.length > 0) {
        console.log(`    Atividades/Provas liberadas: ${items.atividade.length} itens`);
        for (const a of items.atividade.slice(0, 5)) {
          console.log(`      ${a.item_id} | criado: ${a.created_at} | liberado: ${a.liberado}`);
        }
        if (items.atividade.length > 5) console.log(`      ... e mais ${items.atividade.length - 5}`);
      }
      if (items.video.length > 0) {
        console.log(`    Vídeos liberados: ${items.video.length}`);
      }
    }
  } else {
    console.log('  Nenhuma liberação encontrada');
  }

  // 5. ALUNOS APROVADOS POR MÓDULO (consulta direta)
  console.log('\n\n--- ALUNOS APROVADOS POR MÓDULO (nota >= min_grade) ---');
  const { data: respostas } = await supabase
    .from('respostas_aulas')
    .select('aluno_id, aula_id, nota, status')
    .eq('status', 'corrigida')
    .not('nota', 'is', null);
  
  if (respostas && respostas.length > 0) {
    // Get aulas info
    const aulaIds = [...new Set(respostas.map(r => r.aula_id))];
    const { data: aulasData } = await supabase
      .from('aulas')
      .select('id, livro_id, tipo, min_grade, is_bloco_final, versao')
      .in('id', aulaIds);
    
    const aulasMap = {};
    (aulasData || []).forEach(a => { aulasMap[a.id] = a; });
    
    // Filter to exams only
    const examRespostas = respostas.filter(r => {
      const a = aulasMap[r.aula_id];
      return a && (a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final === true);
    });
    
    console.log(`Total de submissões de provas corrigidas: ${examRespostas.length}`);
    
    // Group by aluno + livro
    const byAlunoLivro = {};
    examRespostas.forEach(r => {
      const a = aulasMap[r.aula_id];
      const key = `${r.aluno_id}|${a.livro_id}`;
      if (!byAlunoLivro[key]) byAlunoLivro[key] = { aluno_id: r.aluno_id, livro_id: a.livro_id, notas: [] };
      byAlunoLivro[key].notas.push({ nota: r.nota, minGrade: a.min_grade || 7 });
    });
    
    // Find approved
    const aprovados = [];
    for (const [key, val] of Object.entries(byAlunoLivro)) {
      const melhorNota = Math.max(...val.notas.map(n => n.nota));
      const minGrade = val.notas[0]?.minGrade || 7;
      if (melhorNota >= minGrade) {
        aprovados.push({ aluno_id: val.aluno_id, livro_id: val.livro_id, melhor_nota: melhorNota, min_grade: minGrade });
      }
    }
    
    console.log(`Total de aprovações (aluno-módulo): ${aprovados.length}`);
    
    const byModulo = {};
    aprovados.forEach(a => {
      if (!byModulo[a.livro_id]) byModulo[a.livro_id] = [];
      byModulo[a.livro_id].push(a);
    });
    
    for (const [livroId, alunos] of Object.entries(byModulo)) {
      const livro = livros?.find(l => l.id === livroId);
      console.log(`\n  Módulo: ${livro?.titulo || livroId}`);
      console.log(`    Alunos aprovados: ${alunos.length}`);
      
      const ids = alunos.map(a => a.aluno_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, nome, email, tipo')
        .in('id', ids);
      
      users?.forEach(u => {
        const a = alunos.find(al => al.aluno_id === u.id);
        console.log(`    ${u.nome} (${u.email}) [${u.tipo}] - melhor nota: ${a?.melhor_nota}/${a?.min_grade}`);
      });
    }
  } else {
    console.log('  Nenhuma resposta encontrada');
  }

  // 6. ALUNOS PRESENCIAIS
  console.log('\n\n--- ALUNOS PRESENCIAIS ---');
  const { data: presenciais } = await supabase
    .from('users')
    .select('id, nome, email, nucleo_id, curso_id')
    .eq('tipo', 'presencial')
    .limit(20);
  presenciais?.forEach(u => {
    const nucleoNome = nucleoMap[u.nucleo_id] || 'N/A';
    console.log(`  ${u.nome} (${u.email}) | núcleo: ${nucleoNome}`);
  });
  console.log(`Total presenciais listados: ${presenciais?.length || 0}`);

  // 7. USERS WITH modulos_finalizados_manual
  console.log('\n\n--- USUÁRIOS COM MÓDULOS FINALIZADOS MANUALMENTE ---');
  const { data: manualFinish } = await supabase
    .from('users')
    .select('id, nome, email, modulos_finalizados_manual')
    .not('modulos_finalizados_manual', 'is', null);
  
  if (manualFinish) {
    let count = 0;
    manualFinish.forEach(u => {
      const arr = u.modulos_finalizados_manual || [];
      if (arr.length > 0) {
        count++;
        const modulos = arr.map(id => {
          const livro = livros?.find(l => l.id === id);
          return livro?.titulo || id;
        });
        console.log(`  ${u.nome} - ${modulos.join(', ')}`);
      }
    });
    if (count === 0) console.log('  Nenhum');
  }

  // 8. aulas com status_liberacao ou data_liberacao
  console.log('\n\n--- AMOSTRA DE AULAS (config de liberação) ---');
  const { data: aulasConfig } = await supabase
    .from('aulas')
    .select('id, livro_id, titulo, tipo, status_liberacao, data_liberacao, professor_active')
    .limit(30);
  
  if (aulasConfig) {
    const configAulas = aulasConfig.filter(a => a.status_liberacao === false || a.data_liberacao || a.professor_active === false);
    configAulas.forEach(a => {
      const livro = livros?.find(l => l.id === a.livro_id);
      console.log(`  ${a.titulo} (${a.tipo}) | módulo: ${livro?.titulo || 'N/A'} | status_liberacao: ${a.status_liberacao} | data_liberacao: ${a.data_liberacao} | prof_active: ${a.professor_active}`);
    });
    if (configAulas.length === 0) console.log('  Todas com configuração padrão (status_liberacao=true, professor_active=true)');
  }
  
  console.log('\n\nDIAGNÓSTICO CONCLUÍDO');
}

main().catch(console.error);
