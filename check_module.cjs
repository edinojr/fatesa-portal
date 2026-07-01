const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'
);
(async () => {
  const { data: livros } = await supabase
    .from('livros')
    .select('id, titulo, numero_modulo, ordem, professor_active')
    .eq('curso_id', '4ec2d32a-92c5-4bdf-bfe8-02cded9f5719')
    .order('ordem');
  livros?.forEach(l => {
    console.log(String(l.numero_modulo||'-').padStart(3) + ' | ' + (l.professor_active ? 'ATIVO ' : 'INATIV') + ' | ' + l.titulo);
  });
  const tp = livros?.find(l => l.titulo.includes('Teologia Pratica') || l.titulo.includes('Teologia Prática'));
  const hi = livros?.find(l => l.titulo.includes('Historia') || l.titulo.includes('História'));
  if (tp) console.log('\nTP:', tp.numero_modulo, tp.ordem, tp.professor_active, tp.id);
  if (hi) console.log('HI:', hi.numero_modulo, hi.ordem, hi.professor_active, hi.id);
  if (tp && hi) {
    console.log('Match por numero_modulo:', Number(tp.numero_modulo) + 1 === Number(hi.numero_modulo));
    console.log('Match por ordem:', tp.ordem + 1 === hi.ordem);
  }
})();
