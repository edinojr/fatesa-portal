import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI'
);

async function checkProfessorSubmissions() {
  const email = 'pft@fatesa.com';
  
  // 1. Find Professor
  const { data: prof } = await supabase.from('users').select('id, tipo').eq('email', email).maybeSingle();
  if (!prof) {
    console.log('Professor not found');
    return;
  }
  console.log(`Found Professor: ${prof.id} (${prof.tipo})`);

  // 2. Find linked Nucleos
  const { data: nucs } = await supabase.from('professor_nucleo').select('nucleo_id').eq('professor_id', prof.id);
  const nucIds = nucs?.map(n => n.nucleo_id) || [];
  console.log(`Linked Nucleos IDs: ${nucIds.join(', ')}`);

  // 3. Find students in these nucleos
  const { data: students } = await supabase.from('users').select('id, nome, nucleo_id').in('nucleo_id', nucIds);
  const studentIds = students?.map(s => s.id) || [];
  console.log(`Students count: ${studentIds.length}`);

  // 4. Find all submissions (respostas_aulas) for these students
  const { data: submissions } = await supabase
    .from('respostas_aulas')
    .select('id, status, aula_id, aluno_id, created_at, aulas(titulo, tipo, livro_id, livros:livro_id(titulo))')
    .in('aluno_id', studentIds)
    .order('created_at', { ascending: false });

  console.log('\nSubmissions for linked students (Filtered by PENDENTE):');
  submissions?.filter(s => s.status === 'pendente').forEach(s => {
    console.log(`- ID: ${s.id}, AlunoID: ${s.aluno_id}, Lesson: ${s.aulas?.titulo || 'NULL'}, Book: ${s.aulas?.livros?.titulo || 'NULL'}, Date: ${s.created_at}`);
  });

  const pendentes = submissions?.filter(s => s.status === 'pendente') || [];
  console.log(`\nTotal Pendentes: ${pendentes.length}`);
}

checkProfessorSubmissions();
