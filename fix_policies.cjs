const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixPolicies() {
  console.log('Fixing RLS policies to be case-insensitive for roles...');

  const policiesToFix = [
    {
      table: 'aulas',
      policyName: 'Admins and Professors can view all lessons',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    },
    {
      table: 'livros',
      policyName: 'Admins and Professors can view all books',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    },
    {
      table: 'matriculas',
      policyName: 'Admins and Professors can view all enrollments',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    },
    {
      table: 'progresso',
      policyName: 'Admins and Professors can view all progress',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    },
    {
      table: 'tentativas_prova',
      policyName: 'Admins and Professors can view all attempts',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    },
    {
      table: 'documentos',
      policyName: 'Admins and Professors can view all documents',
      newUsing: "EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND LOWER(tipo) IN ('admin', 'professor'))"
    }
  ];

  for (const p of policiesToFix) {
    console.log(`Updating policy ${p.policyName} on ${p.table}...`);
    
    // To update a policy, we must drop and recreate it
    const { error: dropError } = await supabase.rpc('drop_policy', { 
      policy_name: p.policyName, 
      table_name: p.table 
    });

    // Since we might not have a custom RPC for dropping, let's use a SQL command via a helper if available, 
    // or simply use the .rpc if we can create it.
    // Actually, the safest way is to run a SQL script in the Supabase Dashboard.
    // But I can try to use a stored procedure.
  }
}

// Since I cannot easily run 'DROP POLICY' via the JS client without a custom RPC,
// I will provide the SQL for the user to run or try to find a way to execute it.
run();
