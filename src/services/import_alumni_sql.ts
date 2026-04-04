import { supabase } from '../lib/supabase'

export interface AlumniRecord {
  id?: string
  nome: string
  email: string
  curso: string
  nivel_curso: string
  nucleo: string
  ano_formacao: string
  observacoes: string
}

/**
 * Funçao para processar arquivos .sql que contêm INSERTs na tabela registros_alumni
 * ou simplesmente listas de nomes em formato SQL.
 */
export const importAlumniSql = async (sqlText: string) => {
  try {
    const records: Partial<AlumniRecord>[] = []
    
    // Regex para capturar os valores dentro de parênteses após o VALUES
    // Ex: VALUES ('João'), ('Maria'), ('José')
    const valuesMatch = sqlText.match(/VALUES\s*((.|\n)*);/i)
    const content = valuesMatch ? valuesMatch[1] : sqlText
    
    // Extrair cada tupla (valor1, valor2, ...)
    const tupleRegex = /\(([^)]+)\)/g
    let match
    
    while ((match = tupleRegex.exec(content)) !== null) {
      const rowValues = match[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''))
      
      if (rowValues.length > 0) {
        const nome = rowValues[0]
        const email = rowValues.length > 1 ? rowValues[1] : `${nome.toLowerCase().replace(/\s+/g, '.')}@alumni.fatesa.edu.br`
        
        records.push({
          nome: nome,
          email: email,
          curso: 'Curso Básico de Teologia',
          nivel_curso: 'Curso Básico',
          nucleo: 'Geral',
          ano_formacao: new Date().getFullYear().toString(),
          observacoes: `Importado via SQL (Fixo: Teologia) em ${new Date().toLocaleDateString()}`
        })
      }
    }

    if (records.length === 0) {
      throw new Error('Nenhum registro válido encontrado no SQL. Verifique se o formato está correto: VALUES (\'Nome\');')
    }

    // Upsert em lotes para evitar duplicatas por e-mail
    const { data, error } = await supabase
      .from('registros_alumni')
      .upsert(records, { onConflict: 'email' })
      .select()

    if (error) throw error

    return {
      success: data?.length || 0,
      errors: records.length - (data?.length || 0)
    }
  } catch (err: any) {
    console.error('SQL Import Error:', err)
    throw new Error('Falha no processamento do SQL: ' + err.message)
  }
}
