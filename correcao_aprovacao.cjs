const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

// ============================================================
// CONFIGURACAO
// ============================================================
const DATA_REFERENCIA = '2026-06-06T00:00:00Z';
const NOTA_MINIMA_APROVACAO = 7.0;

// Modulos alvo
const HEBREUS_BOOK_ID = '6a052574-6985-4bc6-ba16-2c58fbf02f69';
const HEBREUS_AULA_IDS = [
  'e50aa7eb-49dc-4a60-8a44-62833cb634b1', // Avaliacao V1
  '82585e3b-12cd-4a30-9d5a-802891d6d751', // Recuperacao
  '9a94f0ee-62ac-4969-b803-a93645775de3'  // 2a Recuperacao
];

// Nucleo EXCLUIDO da aprovacao (Demarchi ainda esta estudando Paulinas 1)
const DEMARCHI_NUCLEO_ID = '8f159455-dd69-4324-80b2-22f881b5d7f1';

// Funcao para calcular nota baseada no gabarito
function calcularNota(respostasAluno, questionario) {
  if (!questionario || !Array.isArray(questionario) || questionario.length === 0) {
    return null;
  }

  let score = 0;

  questionario.forEach((q, idx) => {
    const qKey = q.id || idx;
    const studentAns = respostasAluno ? respostasAluno[qKey] : undefined;

    if (studentAns === undefined || studentAns === null) return;

    if (q.type === 'matching' && q.matchingPairs && q.matchingPairs.length > 0) {
      const uA = studentAns || {};
      const correctPairs = q.matchingPairs.reduce((acc, _, mIdx) => {
        return acc + (String(uA[mIdx]) === String(mIdx) ? 1 : 0);
      }, 0);
      score += Math.min(3.0, correctPairs * 0.5);
    } else if (q.type === 'multiple_choice' || !q.type) {
      if (String(studentAns) === String(q.correct)) score += 0.5;
    } else if (q.type === 'true_false') {
      if (studentAns === q.isTrue) score += 0.5;
    }
    // Discursiva: nao auto-corrige, pula
  });

  return Math.min(10, score);
}

// ============================================================
// PASSO 1: Auto-correcao de provas apos 06/06/2026
// ============================================================
async function autoCorrigirProvas() {
  console.log('\n' + '='.repeat(70));
  console.log('PASSO 1: AUTO-CORRECAO DE PROVAS APOS ' + DATA_REFERENCIA);
  console.log('='.repeat(70));

  // Buscar todas as submissões após a data de referencia
  const { data: submissions } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, respostas, created_at')
    .gte('created_at', DATA_REFERENCIA);

  if (!submissions || submissions.length === 0) {
    console.log('  Nenhuma submissao encontrada apos ' + DATA_REFERENCIA);
    return { corrigidas: 0 };
  }

  console.log('  Total de submissões encontradas: ' + submissions.length);

  // Buscar informações das aulas (tipo, questionario)
  const aulaIds = [...new Set(submissions.map(s => s.aula_id).filter(Boolean))];
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, tipo, versao, is_bloco_final, livro_id, min_grade, questionario')
    .in('id', aulaIds);

  const aulasMap = {};
  (aulas || []).forEach(a => { aulasMap[a.id] = a; });

  // Buscar informacoes dos alunos e nucleos - buscar TODOS os users
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, nome, nucleo_id');
  const usersMap = {};
  (allUsers || []).forEach(u => { usersMap[u.id] = u; });

  const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
  const nucleosMap = {};
  (nucleos || []).forEach(n => { nucleosMap[n.id] = n.nome; });

  // Filtrar apenas submissões de PROVAS/AVALIACOES (nao exercicios)
  const examSubmissions = submissions.filter(s => {
    const aula = aulasMap[s.aula_id];
    return aula && (aula.tipo === 'prova' || aula.tipo === 'avaliacao' || !!aula.is_bloco_final);
  });

  console.log('  Submissões de provas/avaliações: ' + examSubmissions.length);

  let corrigidas = 0;
  let pendentes = 0;

  for (const sub of examSubmissions) {
    const aula = aulasMap[sub.aula_id];
    if (!aula) continue;

    // Se ja tem nota e status corrigida, pular (ja corrigida)
    if (sub.nota !== null && sub.status === 'corrigida') {
      console.log('  Ja corrigida: ' + (aula.titulo || sub.aula_id) + ' | nota: ' + sub.nota);
      continue;
    }

    // Se nao tem respostas, nao da para corrigir
    if (!sub.respostas || Object.keys(sub.respostas).length === 0) {
      console.log('  Sem respostas: ' + (aula.titulo || sub.aula_id) + ' | aluno: ' + (usersMap[sub.aluno_id]?.nome || sub.aluno_id));
      continue;
    }

    // Se tem questoes discursivas, pula (correcao manual necessaria)
    const hasDiscursive = (aula.questionario || []).some(q => q.type === 'discursive');
    if (hasDiscursive) {
      pendentes++;
      console.log('  Discursiva (manual): ' + (aula.titulo || sub.aula_id) + ' | aluno: ' + (usersMap[sub.aluno_id]?.nome || sub.aluno_id));
      continue;
    }

    // Calcular a nota automaticamente
    const nota = calcularNota(sub.respostas, aula.questionario);
    if (nota === null) {
      console.log('  Nao foi possivel calcular nota: ' + (aula.titulo || sub.aula_id));
      continue;
    }

    // Salvar a correcao
    const { error } = await supabase
      .from('respostas_aulas')
      .update({
        nota: nota,
        status: 'corrigida',
        primeira_correcao_at: sub.primeira_correcao_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (error) {
      console.error('  Erro ao corrigir ' + sub.id + ': ' + error.message);
    } else {
      corrigidas++;
      const alunoNome = usersMap[sub.aluno_id]?.nome || sub.aluno_id;
      const nucleoNome = nucleosMap[usersMap[sub.aluno_id]?.nucleo_id] || 'sem nucleo';
      console.log('  Corrigida: ' + (aula.titulo || sub.aula_id) + ' | aluno: ' + alunoNome + ' (' + nucleoNome + ') | nota: ' + nota.toFixed(1));
    }
  }

  console.log('\n  Total auto-corrigidas: ' + corrigidas);
  console.log('  Pendentes (discursivas): ' + pendentes);
  return { corrigidas, pendentes };
}

// ============================================================
// PASSO 2: Aprovar alunos para Epistola aos Hebreus
// ============================================================
async function aprovarAlunosHebreus() {
  console.log('\n' + '='.repeat(70));
  console.log('PASSO 2: APROVACAO DE ALUNOS - EPISTOLA AOS HEBREUS');
  console.log('  Excluindo nucleo: Demarch - SBC (ID: ' + DEMARCHI_NUCLEO_ID + ')');
  console.log('='.repeat(70));

  // Buscar todos os alunos com submissoes nas provas de Hebreus
  const { data: subs } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, created_at')
    .in('aula_id', HEBREUS_AULA_IDS);

  if (!subs || subs.length === 0) {
    console.log('  Nenhuma submissao encontrada para Hebreus');
    return { aprovados: 0 };
  }

  console.log('  Total de submissões em Hebreus: ' + subs.length);

  // Agrupar por aluno
  const byStudent = {};
  subs.forEach(s => {
    if (!byStudent[s.aluno_id]) byStudent[s.aluno_id] = [];
    byStudent[s.aluno_id].push(s);
  });

  // Buscar dados dos alunos e nucleos
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, nome, nucleo_id, modulos_finalizados_manual');
  const usersMap = {};
  (allUsers || []).forEach(u => { usersMap[u.id] = u; });

  const { data: nucleos } = await supabase.from('nucleos').select('id, nome');
  const nucleosMap = {};
  (nucleos || []).forEach(n => { nucleosMap[n.id] = n.nome; });

  let aprovados = 0;
  let ignorados = 0;

  for (const [alunoId, alunoSubs] of Object.entries(byStudent)) {
    const user = usersMap[alunoId];
    if (!user) {
      ignorados++;
      continue;
    }

    // Verificar se o aluno é do Demarchi
    if (user.nucleo_id === DEMARCHI_NUCLEO_ID) {
      console.log('  IGNORADO (Demarchi): ' + user.nome + ' - ainda estudando Epistolas Paulinas 1');
      ignorados++;
      continue;
    }

    // Verificar se ja foi aprovado (alguma submissao com nota >= 7 e status corrigida)
    const jaAprovado = alunoSubs.some(s => s.status === 'corrigida' && (s.nota || 0) >= NOTA_MINIMA_APROVACAO);

    if (!jaAprovado) {
      // Aluno fez a prova mas nao foi aprovado ainda
      const nucleoNome = nucleosMap[user.nucleo_id] || 'sem nucleo';
      console.log('  NAO APROVADO: ' + user.nome + ' (' + nucleoNome + ') | subs: ' + alunoSubs.length + ' | maiores notas: ' + JSON.stringify(alunoSubs.map(s => s.nota)));
      ignorados++;
      continue;
    }

    const nucleoNome = nucleosMap[user.nucleo_id] || 'sem nucleo';

    // Verificar se ja tem o modulo em modulos_finalizados_manual
    const manualModules = user.modulos_finalizados_manual || [];
    if (manualModules.includes(HEBREUS_BOOK_ID)) {
      console.log('  Ja finalizado: ' + user.nome + ' (' + nucleoNome + ')');
      aprovados++;
      continue;
    }

    // Adicionar o modulo aos finalizados manuais
    const updatedManual = [...new Set([...manualModules, HEBREUS_BOOK_ID])];
    const { error } = await supabase
      .from('users')
      .update({ modulos_finalizados_manual: updatedManual })
      .eq('id', alunoId);

    if (error) {
      console.error('  Erro ao atualizar ' + user.nome + ': ' + error.message);
    } else {
      console.log('  APROVADO: ' + user.nome + ' (' + nucleoNome + ') - modulo adicionado aos finalizados');
      aprovados++;
    }
  }

  console.log('\n  Total aprovados para Hebreus: ' + aprovados);
  console.log('  Ignorados (Demarchi/sem aprovacao): ' + ignorados);
  return { aprovados, ignorados };
}

// ============================================================
// PASSO 3: Criar registros de progresso para modulos aprovados
// ============================================================
async function criarProgressoModulos() {
  console.log('\n' + '='.repeat(70));
  console.log('PASSO 3: CRIAR REGISTROS DE PROGRESSO PARA MODULOS APROVADOS');
  console.log('='.repeat(70));

  // Buscar alunos que tem o modulo Hebreus nos finalizados manuais
  const { data: users } = await supabase
    .from('users')
    .select('id, nome, nucleo_id, modulos_finalizados_manual')
    .contains('modulos_finalizados_manual', [HEBREUS_BOOK_ID]);

  if (!users || users.length === 0) {
    console.log('  Nenhum aluno com modulo Hebreus finalizado manualmente');
    return 0;
  }

  console.log('  Alunos com Hebreus finalizado: ' + users.length);

  // Buscar todas as aulas do modulo Hebreus
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id')
    .eq('livro_id', HEBREUS_BOOK_ID);

  if (!aulas || aulas.length === 0) {
    console.log('  Nenhuma aula encontrada para o modulo Hebreus');
    return 0;
  }

  console.log('  Aulas no modulo: ' + aulas.length);

  let totalProgresso = 0;
  for (const user of users) {
    const progressRecords = aulas.map(aula => ({
      aluno_id: user.id,
      aula_id: aula.id,
      concluida: true,
      updated_at: new Date().toISOString()
    }));

    // Inserir em lotes de 50
    for (let i = 0; i < progressRecords.length; i += 50) {
      const chunk = progressRecords.slice(i, i + 50);
      const { error } = await supabase
        .from('progresso')
        .upsert(chunk, { onConflict: 'aluno_id, aula_id', ignoreDuplicates: false });

      if (error) {
        console.error('  Erro ao criar progresso para ' + user.nome + ': ' + error.message);
      } else {
        totalProgresso += chunk.length;
      }
    }
    console.log('  Progresso criado para: ' + user.nome);
  }

  console.log('\n  Total de registros de progresso criados: ' + totalProgresso);
  return totalProgresso;
}

// ============================================================
// PASSO 4: Verificar e corrigir submissões pendentes 
//          (status pendente mas respostas preenchidas)
// ============================================================
async function corrigirPendentes() {
  console.log('\n' + '='.repeat(70));
  console.log('PASSO 4: CORRIGIR SUBMISSOES PENDENTES COM RESPOSTAS');
  console.log('='.repeat(70));

  const { data: pendentes } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, aluno_id, nota, status, respostas, created_at')
    .eq('status', 'pendente')
    .not('respostas', 'eq', '{}');

  if (!pendentes || pendentes.length === 0) {
    console.log('  Nenhuma submissao pendente com respostas');
    return 0;
  }

  console.log('  Submissoes pendentes com respostas: ' + pendentes.length);

  const aulaIds = [...new Set(pendentes.map(s => s.aula_id).filter(Boolean))];
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, tipo, questionario, min_grade')
    .in('id', aulaIds);
  const aulasMap = {};
  (aulas || []).forEach(a => { aulasMap[a.id] = a; });

  const { data: allUsers } = await supabase
    .from('users')
    .select('id, nome, nucleo_id');
  const usersMap = {};
  (allUsers || []).forEach(u => { usersMap[u.id] = u; });

  let corrigidas = 0;
  for (const sub of pendentes) {
    const aula = aulasMap[sub.aula_id];
    if (!aula) continue;

    const isExam = aula.tipo === 'prova' || aula.tipo === 'avaliacao' || !!aula.is_bloco_final;

    // So corrigir automaticamente se for prova/avaliacao (nao exercicio)
    if (!isExam) {
      console.log('  Ignorado (exercicio): ' + (aula.titulo || sub.aula_id));
      continue;
    }

    // Verificar se tem questoes discursivas
    const hasDiscursive = (aula.questionario || []).some(q => q.type === 'discursive');
    if (hasDiscursive) {
      console.log('  Discursiva (manual): ' + (aula.titulo || sub.aula_id) + ' | aluno: ' + (usersMap[sub.aluno_id]?.nome || sub.aluno_id));
      continue;
    }

    const nota = calcularNota(sub.respostas, aula.questionario);
    if (nota === null) continue;

    const { error } = await supabase
      .from('respostas_aulas')
      .update({
        nota: nota,
        status: 'corrigida',
        primeira_correcao_at: sub.primeira_correcao_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (error) {
      console.error('  Erro: ' + error.message);
    } else {
      corrigidas++;
      console.log('  Corrigida: ' + (aula.titulo || sub.aula_id) + ' | aluno: ' + (usersMap[sub.aluno_id]?.nome || sub.aluno_id) + ' | nota: ' + nota.toFixed(1));
    }
  }

  console.log('\n  Total pendentes corrigidas: ' + corrigidas);
  return corrigidas;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('='.repeat(70));
  console.log('SISTEMA DE CORRECAO E APROVACAO - FATESA');
  console.log('Data de referencia: ' + DATA_REFERENCIA);
  console.log('='.repeat(70));

  try {
    // Passo 1: Auto-corrigir provas apos 06/06/2026
    const passo1 = await autoCorrigirProvas();

    // Passo 2: Aprovar alunos para Hebreus (exceto Demarchi)
    const passo2 = await aprovarAlunosHebreus();

    // Passo 3: Criar progresso para modulos aprovados
    const passo3 = await criarProgressoModulos();

    // Passo 4: Corrigir submissões pendentes
    const passo4 = await corrigirPendentes();

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('RESUMO FINAL');
    console.log('='.repeat(70));
    console.log('  Passo 1 - Provas auto-corrigidas:         ' + passo1.corrigidas);
    console.log('  Passo 2 - Alunos aprovados para Hebreus:  ' + passo2.aprovados);
    console.log('  Passo 3 - Registros de progresso criados:  ' + passo3);
    console.log('  Passo 4 - Submissoes pendentes corrigidas: ' + passo4);
    console.log('\n' + '='.repeat(70));
    console.log('CONCLUIDO!');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Erro fatal:', err);
  }
}

main();
