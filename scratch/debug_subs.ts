
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSubmissions() {
    const { data: profile } = await supabase.from('users').select('id').eq('email', 'edi.ben.jr@gmail.com').single();
    if (!profile) {
        console.log('Profile not found for student');
        return;
    }
    const { data: resData } = await supabase.from('view_submissions_detailed').select('*').eq('student_id', profile.id);
    console.log('Submissions found:', resData?.length);
    if (resData && resData.length > 0) {
        console.log('Sample record keys:', Object.keys(resData[0]));
        console.log('Hebeus Sample:', resData.find(r => r.lesson_title?.includes('Hebreus') || r.book_title?.includes('Hebreus')));
    }
}

checkSubmissions();
