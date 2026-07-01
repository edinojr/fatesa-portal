const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

const LIMIAR_SUSPEITA = 0.75; // Se 75%+ dos alunos acertam ou erram, é suspeito

function analyzeAnswers(questions, submissions) {
  const results = [];

  questions.forEach((q, qIdx) => {
    const qKey = q.id || qIdx;
    let correctCount = 0;
    let incorrectCount = 0;
    const answerDistribution = {};

    submissions.forEach(sub => {
      const ans = sub.respostas?.[qKey];
      if (ans === undefined || ans === null) return;

      let isCorrect = false;
      if (q.type === 'multiple_choice' || !q.type) {
        isCorrect = String(ans) === String(q.correct);
        const label = `Opção ${parseInt(ans) + 1}`;
        answerDistribution[label] = (answerDistribution[label] || 0) + 1;
      } else if (q.type === 'true_false') {
        isCorrect = ans === q.isTrue;
        const label = ans ? 'Verdadeiro' : 'Falso';
        answerDistribution[label] = (answerDistribution[label] || 0) + 1;
      } else if (q.type === 'matching') {
        const answerMap = ans || {};
        const correctPairs = q.matchingPairs.filter((_, mIdx) => String(answerMap[mIdx]) === String(mIdx)).length;
        isCorrect = correctPairs === q.matchingPairs.length;
        answerDistribution[`${correctPairs}/${q.matchingPairs.length} pares`] = (answerDistribution[`${correctPairs}/${q.matchingPairs.length} pares`] || 0) + 1;
      } else if (q.type === 'discursive') {
        return; // Skip discursive - manual grading
      }

      if (isCorrect) correctCount++;
      else incorrectCount++;
    });

    const total = correctCount + incorrectCount;
    if (total === 0) return;

    const pctCorrect = correctCount / total;
    const pctIncorrect = incorrectCount / total;

    const flags = [];
    if (pctCorrect >= LIMIAR_SUSPEITA) flags.push('MUITOS_ACERTOS');
    if (pctIncorrect >= LIMIAR_SUSPEITA) flags.push('MUITOS_ERROS');

    // Check if correct answer is always the first option
    if ((q.type === 'multiple_choice' || !q.type) && q.correct === 0 && pctCorrect >= 0.5) {
      flags.push('GABARITO_SEMPRE_A');
    }

    results.push({
      qIdx: qIdx + 1,
      text: q.text?.substring(0, 80),
      type: q.type || 'multiple_choice',
      gabaritoValue: q.type === 'multiple_choice' ? `Opção ${parseInt(q.correct) + 1}` :
                      q.type === 'true_false' ? (q.isTrue ? 'V' : 'F') :
                      q.type === 'matching' ? `${q.matchingPairs?.length} pares` : q.expectedAnswer,
      total,
      correctCount,
      incorrectCount,
      pctCorrect: (pctCorrect * 100).toFixed(1) + '%',
      pctIncorrect: (pctIncorrect * 100).toFixed(1) + '%',
      answerDistribution,
      flags
    });
  });

  return results;
}

async function main() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO DE GABARITOS - FATESA');
  console.log('='.repeat(80));

  // Buscar todas as aulas que são provas/avaliações
  const { data: aulas, error: errAulas } = await supabase
    .from('aulas')
    .select('id, livro_id, titulo, tipo, versao, min_grade, is_bloco_final, questionario')
    .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
    .order('livro_id');

  if (errAulas || !aulas?.length) {
    console.log('Erro ou nenhuma aula encontrada:', errAulas?.message);
    return;
  }

  console.log(`\nTotal de avaliações/provas: ${aulas.length}\n`);

  // Buscar livros para nome do módulo
  const livroIds = [...new Set(aulas.map(a => a.livro_id).filter(Boolean))];
  const { data: livros } = await supabase.from('livros').select('id, titulo').in('id', livroIds);
  const livrosMap = Object.fromEntries((livros || []).map(l => [l.id, l.titulo]));

  let totalInconsistencias = 0;

  for (const aula of aulas) {
    if (!aula.questionario || !Array.isArray(aula.questionario) || aula.questionario.length === 0) {
      console.log(`[${aula.titulo}] SEM GABARITO - ignorando`);
      continue;
    }

    const { data: submissions } = await supabase
      .from('respostas_aulas')
      .select('respostas, nota, status')
      .eq('aula_id', aula.id)
      .eq('status', 'corrigida')
      .not('nota', 'is', null);

    if (!submissions || submissions.length < 2) {
      console.log(`[${aula.titulo}] Apenas ${submissions?.length || 0} submissão(ões) - sem dados suficientes`);
      continue;
    }

    const analysis = analyzeAnswers(aula.questionario, submissions);
    const problematicas = analysis.filter(a => a.flags.length > 0);

    if (problematicas.length > 0) {
      totalInconsistencias += problematicas.length;
      const moduloNome = livrosMap[aula.livro_id] || 'Módulo desconhecido';
      console.log(`\n${'='.repeat(70)}`);
      console.log(`MÓDULO: ${moduloNome}`);
      console.log(`PROVA: ${aula.titulo} (V${aula.versao || 1}) - ${submissions.length} alunos`);
      console.log(`ID: ${aula.id}`);
      console.log(`Nota mínima: ${aula.min_grade || 7.0}`);
      console.log('-'.repeat(70));

      problematicas.forEach(p => {
        console.log(`\n  [${p.qIdx}] ${p.text}`);
        console.log(`  Tipo: ${p.type} | Gabarito: ${p.gabaritoValue}`);
        console.log(`  Acertos: ${p.correctCount}/${p.total} (${p.pctCorrect}) | Erros: ${p.incorrectCount}/${p.total} (${p.pctIncorrect})`);
        console.log(`  Distribuição: ${JSON.stringify(p.answerDistribution)}`);
        console.log(`  ⚠️  BANDEIRAS: ${p.flags.join(', ')}`);
      });
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  if (totalInconsistencias === 0) {
    console.log('NENHUMA INCONSISTÊNCIA ENCONTRADA.');
  } else {
    console.log(`TOTAL DE INCONSISTÊNCIAS: ${totalInconsistencias} questões suspeitas.`);
    console.log('\n⚠️  Revisar manualmente as questões com bandeiras acima no painel do professor.');
    console.log('   Use a opção "Editar Gabarito" durante a correção para ajustar o gabarito.');
  }
  console.log('='.repeat(70));
}

main().catch(console.error);
