import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function testSubmissions() {
  const { data: subs, error } = await supabase.from('view_submissions_detailed').select('student_email, lesson_title, nota, status').limit(5);
  if (error) {
    console.error("ERROR:", error.message);
  } else {
    console.log("Submissions:");
    console.log(subs);
  }
}
testSubmissions();
