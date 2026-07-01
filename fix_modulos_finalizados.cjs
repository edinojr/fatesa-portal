const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

// Teste: verificar coluna
async function testColumn() {
  const { data, error } = await supabase.from('users').select('nome, modulos_finalizados_manual').limit(3);
  console.log('Teste de coluna:');
  if (error) console.log(`  ERRO: ${error.message}`);
  else if (data) data.forEach(u => console.log(`  ${u.nome} => modulos_finalizados_manual:`, JSON.stringify(u.modulos_finalizados_manual)));
}

async function main() {
  console.log('Testando acesso à coluna modulos_finalizados_manual...\n');
  await testColumn();

  console.log('\nBuscando alunos aprovados...');
  const { data: respostas } = await supabase
    .from('respostas_aulas')
    .select('aluno_id, aula_id, nota')
    .eq('status', 'corrigida')
    .not('nota', 'is', null);

  if (!respostas?.length) { console.log('  Nenhuma resposta'); return; }

  const aIds = [...new Set(respostas.map(r => r.aula_id))];
  const { data: aulas } = await supabase.from('aulas').select('id, livro_id, tipo, min_grade, is_bloco_final').in('id', aIds);
  const aMap = Object.fromEntries((aulas||[]).map(a => [a.id, a]));

  const exames = respostas.filter(r => {
    const a = aMap[r.aula_id];
    return a && (a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final);
  });

  console.log(`  Total provas corrigidas: ${exames.length}`);

  const byAluno = {};
  exames.forEach(r => {
    const a = aMap[r.aula_id];
    const key = r.aluno_id;
    if (!byAluno[key]) byAluno[key] = {};
    const prev = byAluno[key][a.livro_id] || 0;
    if (r.nota > prev) byAluno[key][a.livro_id] = r.nota;
  });

  const aprovadosPorAluno = {};
  for (const [alunoId, modulos] of Object.entries(byAluno)) {
    for (const [livroId, nota] of Object.entries(modulos)) {
      if (nota >= 7) {
        if (!aprovadosPorAluno[alunoId]) aprovadosPorAluno[alunoId] = [];
        aprovadosPorAluno[alunoId].push(livroId);
      }
    }
  }

  console.log(`Total de alunos com aprovações: ${Object.keys(aprovadosPorAluno).length}`);

  let atualizados = 0;
  let semUsuario = 0;
  let jaExiste = 0;
  let erros = 0;
  let idx = 0;

  for (const [alunoId, modulos] of Object.entries(aprovadosPorAluno)) {
    idx++;
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('nome, modulos_finalizados_manual')
      .eq('id', alunoId)
      .maybeSingle();

    if (userErr || !user) {
      if (semUsuario < 3) console.log(`  [${idx}] Aluno não encontrado: ${alunoId} err=${userErr?.message}`);
      semUsuario++;
      continue;
    }

    const current = Array.isArray(user.modulos_finalizados_manual) ? [...user.modulos_finalizados_manual] : [];
    let changed = false;
    for (const mId of modulos) {
      if (!current.includes(mId)) {
        current.push(mId);
        changed = true;
      }
    }

    if (!changed) {
      jaExiste++;
      if (jaExiste === 1) console.log(`  [${idx}] ${user.nome}: já tem todos os módulos (${modulos.length})`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ modulos_finalizados_manual: current })
      .eq('id', alunoId);

    if (updateErr) {
      if (erros < 3) console.log(`  [${idx}] Erro update ${user.nome}: ${updateErr.message}`);
      erros++;
    } else {
      atualizados++;
      if (atualizados <= 3) console.log(`  [${idx}] ${user.nome}: +${modulos.length} módulos (agora tem ${current.length})`);
    }
  }

  console.log(`\nResultado: ${atualizados} atualizados, ${semUsuario} sem usuário, ${jaExiste} já existiam, ${erros} erros`);
}

main().catch(console.error);
