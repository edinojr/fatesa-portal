import { createClient } from '@supabase/supabase-client-server'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugProgression() {
  const studentEmail = 'edi.ben.jr@gmail.com' // Aluno administrativo de teste
  
  // 1. Buscar perfil
  const { data: profile } = await supabase.from('users').select('id, nome').eq('email', studentEmail).single()
  if (!profile) return console.log('Profile not found')

  console.log(`Checking progression for: ${profile.nome} (${profile.id})`)

  // 2. Buscar submissões com dados de aula/livro/curso
  const { data: submissions, error } = await supabase
    .from('respostas_aulas')
    .select(`
      id, nota, status,
      aulas:aula_id (
        id, titulo, tipo, is_bloco_final,
        livros:livro_id (
          id, titulo,
          cursos:curso_id (id, nome, nivel)
        )
      )
    `)
    .eq('aluno_id', profile.id)

  if (error) return console.error('Error:', error)

  console.log('--- SUBMISSÕES DE PROVA FINAL ---')
  submissions?.forEach((s: any) => {
    const aula = s.aulas
    const livro = aula?.livros
    const curso = livro?.cursos
    
    if (aula?.is_bloco_final || aula?.tipo === 'prova') {
      console.log(`Livro: ${livro?.titulo} | Aula: ${aula?.titulo} | Nota: ${s.nota} | Status: ${s.status} | Nível: ${curso?.nivel}`)
    }
  })

  // 3. Verificar especificamente "Epistolas ao Hebreus"
  const hebreus = submissions?.find((s: any) => s.aulas?.livros?.titulo?.includes('Hebreus'))
  console.log('\n--- DETALHE HEBREUS ---')
  console.log(JSON.stringify(hebreus, null, 2))
}

debugProgression()
