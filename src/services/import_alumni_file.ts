import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export interface AlumniRecord {
  id?: string
  nome: string
  email: string
  curso: string
  nivel_curso: string
  nucleo: string
  ano_formacao: string
  matricula?: string
  observacoes: string
}

/**
 * Serviço unificado para importar arquivos Excel (.xlsx, .xls) e CSV.
 * Filtra apenas alunos formados e prepara a base para o pré-cadastro.
 */
export const importAlumniFile = (file: File) => {
  return new Promise<{ success: number; errors: number; total: number }>((resolve, reject) => {
    try {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Lemos como matriz pura (header: 1) para ter controle total sobre as linhas e colunas
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          if (!rows || rows.length === 0) {
            throw new Error('O arquivo está vazio ou no formato incorreto.')
          }

          const records: Partial<AlumniRecord>[] = []
          let headerIndex = -1
          const colMap: Record<string, number> = {}

          // 1. HUNTER: Encontrar a linha que contém os cabeçalhos
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i]
            if (!Array.isArray(row)) continue
            const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
            
            if (['nome', 'aluno', 'estudante'].some(p => rowStr.includes(p))) {
              headerIndex = i
              // Mapear os índices das colunas
              row.forEach((cell, idx) => {
                const val = String(cell || '').toLowerCase()
                if (['nome', 'aluno', 'estudante'].some(p => val.includes(p))) colMap['nome'] = idx
                if (['matrícula', 'matricula', 'ra', 'id', 'nº'].some(p => val.includes(p))) colMap['matricula'] = idx
                if (['núcleo', 'nucleo', 'polo', 'sede', 'cidade'].some(p => val.includes(p))) colMap['nucleo'] = idx
                if (['curso', 'especialidade', 'formação', 'área', 'descrição'].some(p => val.includes(p))) colMap['curso'] = idx
                if (['status', 'situação', 'situacao', 'formado'].some(p => val.includes(p))) colMap['status'] = idx
                if (['ano', 'conclusão', 'conclusao', 'data'].some(p => val.includes(p))) colMap['ano'] = idx
                if (['email', 'e-mail'].some(p => val.includes(p))) colMap['email'] = idx
              })
              break
            }
          }

          // Se não achou cabeçalho, assume que a primeira linha é o dado e faz o melhor chute
          const startAt = headerIndex === -1 ? 0 : headerIndex + 1
          if (headerIndex === -1) {
            // Chute padrão se houver apenas 2 colunas: 0=Nome, 1=Matricula/Núcleo/RA
            colMap['nome'] = 0
            colMap['matricula'] = 1
          }

          // 2. PROCESSAR DADOS
          for (let i = startAt; i < rows.length; i++) {
            const row = rows[i]
            if (!row || row.length === 0) continue

            const nome = colMap['nome'] !== undefined ? String(row[colMap['nome']] || '').trim() : ''
            if (!nome || ['nome', 'aluno', 'estudante', 'núcleo', 'matricula'].some(p => nome.toLowerCase() === p)) continue

            const matricula = colMap['matricula'] !== undefined ? String(row[colMap['matricula']] || '').trim() : ''
            const nucleo = colMap['nucleo'] !== undefined ? String(row[colMap['nucleo']] || '').trim() : 'Geral'
            const curso = colMap['curso'] !== undefined ? String(row[colMap['curso']] || '').trim() : 'Curso Básico de Teologia'
            const ano = colMap['ano'] !== undefined ? String(row[colMap['ano']] || '').substring(0, 4) : new Date().getFullYear().toString()
            const emailInRow = colMap['email'] !== undefined ? String(row[colMap['email']] || '').trim() : ''
            
            // Gerar e-mail resiliente se não existir
            const email = emailInRow || `${nome.toLowerCase().replace(/[^\w]/g, '.')}.${matricula || 'alumni'}@fatesa.edu.br`

            records.push({
              nome,
              email: email.toLowerCase(),
              matricula,
              curso,
              nivel_curso: 'Curso Básico',
              nucleo,
              ano_formacao: ano,
              observacoes: `Importado: Whitelist de Confirmação (${new Date().toLocaleDateString()})`
            })
          }

          // 3. DEDUPLICAR E SALVAR
          const uniqueRecords = Array.from(
            records.reduce((map, item) => {
              if (item.email) map.set(item.email, item);
              return map;
            }, new Map<string, Partial<AlumniRecord>>()).values()
          );

          if (uniqueRecords.length === 0) {
            throw new Error('Nenhum dado válido encontrado para importação.')
          }

          const { data: insertedData, error } = await supabase
            .from('registros_alumni')
            .upsert(uniqueRecords, { onConflict: 'email' })
            .select()

          if (error) {
            console.error('Supabase Upsert Error:', error);
            throw error;
          }

          // 4. BACKUP STORAGE (Auditoria)
          try {
            const dateDir = new Date().toISOString().split('T')[0];
            const fileName = `imports/${dateDir}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            
            const { error: storageError } = await supabase.storage
              .from('alumni_formados')
              .upload(fileName, file);

            if (storageError) {
              console.warn('Alerta Backup:', storageError);
            }
          } catch (storageErr) {
            console.error('Storage communication error:', storageErr);
          }

          resolve({
            success: insertedData?.length || 0,
            errors: uniqueRecords.length - (insertedData?.length || 0),
            total: rows.length - startAt
          })
        } catch (err: any) {
          reject(err)
        }
      }

      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
      reader.readAsBinaryString(file)
    } catch (err: any) {
      reject(err)
    }
  })
}
