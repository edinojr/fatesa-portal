import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUser() {
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth error:', authError);
        return;
    }

    // Try to find a student user
    const { data: profiles, error: profileError } = await supabase.from('users').select('*, nucleos(nome), cursos(nome)');
    if (profileError) {
        console.error('Profile error:', profileError);
        return;
    }

    console.log('Profiles found:', profiles.length);
    profiles.slice(0, 5).forEach(p => {
        console.log(`- ${p.nome} (${p.email}): Tipo: ${p.tipo}, Curso: ${p.cursos?.nome}, Nucleo: ${p.nucleos?.nome}`);
    });
}

checkUser();
