import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getValidatedStudents() {
  // Buscamos pagamentos com status 'aprovado' (novo sistema) 
  // e também usuários que já têm acesso definitivo (podem ter sido validados antes da mudança de status)
  
  const { data, error } = await supabase
    .from('pagamentos')
    .select('valor, status, users(nome, nucleo, acesso_definitivo)')
    .eq('status', 'aprovado')
    .order('users(nucleo)', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('Nenhum aluno encontrado com pagamento validado (status "aprovado").')
    
    // Tentativa alternativa: buscar usuários com acesso definitivo que tenham pagamentos
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('nome, nucleo, acesso_definitivo, pagamentos(status)')
        .eq('acesso_definitivo', true)
        .order('nucleo', { ascending: true })
    
    if (usersError) {
        console.error('Users Error:', usersError)
        return
    }
    
    if (usersData) {
        console.log('--- Alunos com Acesso Definitivo (Provavelmente Validados) ---')
        usersData.forEach(u => {
            console.log(`Núcleo: ${u.nucleo || 'Sem Núcleo'} | Aluno: ${u.nome}`)
        })
    }
    return
  }

  const grouped: Record<string, any[]> = {}
  data.forEach(p => {
    const n = (p.users as any)?.nucleo || 'Sem Núcleo'
    if (!grouped[n]) grouped[n] = []
    grouped[n].push((p.users as any)?.nome)
  })

  console.log('--- Alunos com Pagamento Validado (Por Núcleo) ---')
  for (const [nucleo, alunos] of Object.entries(grouped)) {
    console.log(`\nNúcleo: ${nucleo}`)
    alunos.forEach(a => console.log(` - ${a}`))
  }
}

getValidatedStudents()
