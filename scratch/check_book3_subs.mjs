import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI'
);

async function checkSub() {
  const studentId = '4ab793ec-7a3d-4438-bcb7-d80fc7d05fea';
  const book3Id = '57616948-1a37-4f25-9cfc-48bbe97d7ae4';
  
  // Get all lessons for book 3
  const { data: lessons } = await supabase.from('aulas').select('id, titulo').eq('livro_id', book3Id);
  if (!lessons) return;
  
  const lessonIds = lessons.map(l => l.id);
  
  // Check submissions in respostas_aulas
  const { data: subs } = await supabase.from('respostas_aulas').select('*').eq('aluno_id', studentId).in('aula_id', lessonIds);
  console.log('Submissions in book 3:', subs);
}

checkSub();
