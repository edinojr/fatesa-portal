const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);

async function main() {
  console.log('=== LIBERAÇÕES NA TABELA liberacoes_nucleo ===\n');
  const { data: releases, error: relErr } = await supabase
    .from('liberacoes_nucleo')
    .select('*')
    .order('created_at', { ascending: false });

  if (relErr) { console.error('Erro ao buscar liberações:', relErr.message); return; }
  console.log(`Total de liberações: ${releases?.length ?? 0}`);
  if (releases && releases.length > 0) {
    // Group by item_type
    const byType = {};
    releases.forEach(r => {
      byType[r.item_type] = (byType[r.item_type] || 0) + 1;
    });
    console.log('Por tipo:', byType);
    console.log('\nPrimeiras 20 liberações:');
    releases.slice(0, 20).forEach(r => {
      console.log(`  nucleo_id=${r.nucleo_id} | item_type=${r.item_type} | item_id=${r.item_id} | liberado=${r.liberado}`);
    });
  }

  console.log('\n=== NÚCLEOS CADASTRADOS ===\n');
  const { data: nucleos } = await supabase.from('nucleos').select('id, nome').order('nome');
  nucleos?.forEach(n => console.log(`  ${n.id} - ${n.nome}`));

  console.log('\n=== SAMPLE DE ALUNOS (5) COM nucleo_id ===\n');
  const { data: alunos } = await supabase
    .from('users')
    .select('id, nome, email, nucleo_id, curso_id, tipo')
    .eq('tipo', 'aluno')
    .limit(5);
  alunos?.forEach(a => console.log(`  ${a.nome} | nucleo_id=${a.nucleo_id} | curso_id=${a.curso_id}`));

  console.log('\n=== ALUNOS SEM nucleo_id ===\n');
  const { data: semNucleo, count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'aluno')
    .is('nucleo_id', null);
  console.log(`Alunos sem nucleo_id: ${count}`);

  console.log('\n=== LIVROS COM professor_active = false ===\n');
  const { data: inactivos } = await supabase
    .from('livros')
    .select('id, titulo, professor_active')
    .eq('professor_active', false);
  if (!inactivos || inactivos.length === 0) {
    console.log('Nenhum livro com professor_active = false');
  } else {
    inactivos.forEach(l => console.log(`  ${l.titulo} - professor_active=${l.professor_active}`));
  }
}

main().catch(console.error);
