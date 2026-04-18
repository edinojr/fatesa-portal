import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI'
);

async function resetExam() {
  const email = 'edi.ben.jr@gmail.com';
  
  // 1. Get User ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
    
  if (userError || !userData) {
    console.error('User not found:', userError);
    return;
  }
  const userId = userData.id;
  console.log('User ID:', userId);

  // 2. Find Module 3 (Livro) and its Exam
  // We'll search for 'Módulo 3' or 'Livro 3' in the title
  const { data: moduleData } = await supabase
    .from('livros')
    .select('id, titulo, aulas(id, titulo, tipo)')
    .ilike('titulo', '%3%')
    .order('ordem');

  if (!moduleData || moduleData.length === 0) {
    console.error('Module 3 not found');
    return;
  }

  // Find the exact Module 3 (it might be "Teologia Básica - Livro 3" or something)
  const mod3 = moduleData.find(m => m.titulo.includes('3'));
  console.log('Module found:', mod3?.titulo);

  if (!mod3) return;

  const exams = mod3.aulas.filter(a => a.tipo === 'prova' || a.tipo === 'avaliacao');
  console.log('Exams found in module:', exams.map(e => e.titulo));

  if (exams.length === 0) {
    console.error('No exams found in Module 3');
    return;
  }

  // 3. Delete Submissions and Progress
  for (const exam of exams) {
    console.log(`Resetting exam: ${exam.titulo} (${exam.id})`);

    // Delete from respostas
    const { error: delRes } = await supabase
      .from('respostas')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', exam.id);

    if (delRes) console.error('Error deleting responses:', delRes);
    else console.log('Responses deleted');

    // Delete from progresso
    const { error: delProg } = await supabase
      .from('progresso')
      .delete()
      .eq('aluno_id', userId)
      .eq('aula_id', exam.id);

    if (delProg) console.error('Error deleting progress:', delProg);
    else console.log('Progress reset');
  }

  console.log('Done.');
}

resetExam();
