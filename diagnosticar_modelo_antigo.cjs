const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  console.log('='.repeat(70));
  console.log('DIAGNÓSTICO DE MODELO DE PROVAS - FATESA');
  console.log('='.repeat(70));

  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, livro_id, titulo, tipo, versao, questionario')
    .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');

  if (!aulas?.length) { console.log('Nenhuma aula encontrada'); return; }

  const livroIds = [...new Set(aulas.map(a => a.livro_id).filter(Boolean))];
  const { data: livros } = await supabase.from('livros').select('id, titulo').in('id', livroIds);
  const livrosMap = Object.fromEntries((livros || []).map(l => [l.id, l.titulo]));

  let oldModel = 0;
  let newModel = 0;
  let noGabarito = 0;

  console.log('\nAvaliações com MODELO ANTIGO (contém dissertativas):\n');

  for (const aula of aulas) {
    if (!aula.questionario || !Array.isArray(aula.questionario)) {
      noGabarito++;
      continue;
    }

    const qs = aula.questionario;
    const hasDiscursive = qs.some(q => q.type === 'discursive');
    const tfCount = qs.filter(q => q.type === 'true_false').length;
    const mcCount = qs.filter(q => q.type === 'multiple_choice' || !q.type).length;
    const disCount = qs.filter(q => q.type === 'discursive').length;
    const matchingQ = qs.filter(q => q.type === 'matching');
    const matCount = matchingQ.length;
    const matPairs = matchingQ[0]?.matchingPairs?.length || 0;

    const moduloNome = livrosMap[aula.livro_id] || 'Módulo desconhecido';

    if (hasDiscursive) {
      oldModel++;
      console.log(`[${moduloNome}]`);
      console.log(`  Prova: ${aula.titulo} (V${aula.versao || 1})`);
      console.log(`  Estrutura: ${tfCount} VF + ${disCount} Diss + ${mcCount} MC + ${matCount} Matching (${matPairs} pares)`);
      console.log(`  ID: ${aula.id}`);
      console.log();
    } else if (tfCount === 10 && mcCount === 4 && matCount === 1 && matPairs === 6) {
      newModel++;
    } else {
      console.log(`[${moduloNome}] — ${aula.titulo} — ESTRUTURA ATÍPICA: ${tfCount} VF + ${mcCount} MC + ${matCount} Matching (${matPairs} pares)`);
    }
  }

  console.log('-'.repeat(70));
  console.log(`Total: ${aulas.length} avaliações`);
  console.log(`Modelo ANTIGO (com dissertativas): ${oldModel}`);
  console.log(`Modelo NOVO (10 VF + 4 MC + 6 pares): ${newModel}`);
  console.log(`Sem gabarito: ${noGabarito}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
