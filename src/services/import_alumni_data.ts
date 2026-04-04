import { supabase } from '../lib/supabase'

export interface AlumniImportData {
  nome: string
  email: string
  curso?: string
  nucleo?: string
  ano_formacao?: string
  nivel_curso?: string
  observacoes?: string
}

export const importAlumniData = async (data: any[]): Promise<{ success: number; errors: number; messages: string[] }> => {
  let success = 0
  let errors = 0
  const messages: string[] = []

  // Map JSON fields to Alumni fields
  const formattedData = data.map(item => {
    // Detect year from created_at if available
    let year = new Date().getFullYear().toString()
    if (item.created_at) {
      year = new Date(item.created_at).getFullYear().toString()
    }

    return {
      nome: item.nome || item.full_name || 'Sem Nome',
      email: item.email || '',
      curso: item.curso || 'Migrado do Sistema Anterior',
      nucleo: item.nucleo || item.polo || '',
      ano_formacao: item.ano_formacao || year,
      nivel_curso: item.nivel_curso || 'Graduação',
      observacoes: item.observacoes || `Importado via arquivo em ${new Date().toLocaleDateString()}`
    }
  }).filter(item => item.email !== '') // Basic validation

  // Chunk processing to avoid overwhelming Supabase
  const chunkSize = 50
  for (let i = 0; i < formattedData.length; i += chunkSize) {
    const chunk = formattedData.slice(i, i + chunkSize)
    try {
      // Use upsert to avoid duplicates if email + year combination already exists
      const { error } = await supabase
        .from('registros_alumni')
        .upsert(chunk, { onConflict: 'email, ano_formacao' })
      
      if (error) throw error
      success += chunk.length
    } catch (err: any) {
      errors += chunk.length
      messages.push(`Erro no lote ${i / chunkSize + 1}: ${err.message}`)
    }
  }

  return { success, errors, messages }
}
