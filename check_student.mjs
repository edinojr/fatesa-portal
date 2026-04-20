
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudent() {
  const email = 'antony200313@gmail.com';
  
  // 1. Get alumni record
  const { data: alumni, error: alumniError } = await supabase
    .from('registros_alumni')
    .select('*')
    .ilike('email', email);

  if (alumniError) {
    console.error('Alumni error:', alumniError);
    return;
  }

  console.log('Alumni records found:', alumni);
  if (alumni.length === 0) {
    console.log('No alumni record found.');
    return;
  }

  if (userError) {
    console.error('User error:', userError);
    return;
  }

  console.log('Users found:', users);
  if (users.length === 0) {
    console.log('No user found with that email.');
    return;
  }
  const user = users[0];

  // 2. Get submissions (respostas_aulas)
  const { data: resData, error: resError } = await supabase
    .from('respostas_aulas')
    .select('id, aula_id, nota, status, aulas:aula_id(id, titulo, tipo, is_bloco_final, livros:livro_id(id, titulo, cursos:curso_id(nivel)))')
    .eq('aluno_id', user.id);

  if (resError) {
    console.error('Submissions error:', resError);
    return;
  }

  const finishedBasicModules = new Set((resData || [])
    .filter(r => 
      (r.is_bloco_final || r.aulas?.tipo === 'prova') && 
      r.status === 'corrigida' && 
      (r.nota || 0) >= 7.0 &&
      (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('basico') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('básico'))
    )
    .map(r => r.aulas?.livros?.id)
  );

  const finishedMediumModules = new Set((resData || [])
    .filter(r => 
      (r.is_bloco_final || r.aulas?.tipo === 'prova') && 
      r.status === 'corrigida' && 
      (r.nota || 0) >= 7.0 &&
      (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('medio') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('médio'))
    )
    .map(r => r.aulas?.livros?.id)
  );

  console.log('Finished Basic Modules Count:', finishedBasicModules.size);
  console.log('Finished Medium Modules Count:', finishedMediumModules.size);
  console.log('Basic Modules:', Array.from(finishedBasicModules));
}

checkStudent();
