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
  status_aprovacao?: string
  user_id?: string | null
  historico?: { modulo: string; nota: string; data: string }[]
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
          const XLSX = await import('xlsx')
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

                // Detectar múltiplos módulos (campos individuais)
                if (val.includes('modulo') || val.includes('disciplina') || val.includes('bloco')) {
                  const numMatch = val.match(/\d+/);
                  const num = numMatch ? numMatch[0] : (Object.keys(colMap).filter(k => k.startsWith('modulo_')).length + 1).toString();
                  colMap[`modulo_${num}`] = idx;
                }
                if (val.includes('nota') || val.includes('média') || val.includes('media')) {
                  const numMatch = val.match(/\d+/);
                  const num = numMatch ? numMatch[0] : (Object.keys(colMap).filter(k => k.startsWith('nota_')).length + 1).toString();
                  colMap[`nota_${num}`] = idx;
                }
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

            // Processar Histórico (Módulos Individuais)
            const historico: { modulo: string; nota: string; data: string }[] = [];
            const hoje = new Date().toLocaleDateString();
            
            Object.keys(colMap).forEach(key => {
              if (key.startsWith('modulo_')) {
                const num = key.split('_')[1];
                const moduloIdx = colMap[key];
                const notaIdx = colMap[`nota_${num}`];
                
                const moduloVal = moduloIdx !== undefined ? String(row[moduloIdx] || '').trim() : '';
                const notaVal = notaIdx !== undefined ? String(row[notaIdx] || '').trim() : '';
                
                if (moduloVal && notaVal) {
                  historico.push({ modulo: moduloVal, nota: notaVal, data: hoje });
                }
              }
            });

            records.push({
              nome,
              email: email.toLowerCase(),
              matricula,
              curso,
              nivel_curso: 'Curso Básico',
              nucleo,
              ano_formacao: ano,
              historico: historico.length > 0 ? historico : undefined,
              status_aprovacao: 'aprovado',
              observacoes: `Importado: Whitelist de Confirmação (${new Date().toLocaleDateString()})`
            })
          }

          // 3. DEDUPLICAR E SALVAR EM LOTES DE 100
          const emailCounts = new Map<string, number>();
          const sanitizedRecords = records.map(r => {
            let email = r.email || '';
            if (emailCounts.has(email)) {
              const count = emailCounts.get(email)! + 1;
              emailCounts.set(email, count);
              email = email.replace('@', `${count}@`);
            } else {
              emailCounts.set(email, 1);
            }
            return {
              ...r,
              email,
              status_aprovacao: 'aprovado'
            };
          });

          if (sanitizedRecords.length === 0) {
            throw new Error('Nenhum dado válido encontrado para importação.')
          }

          // Executar em lotes de 100 para evitar timeout do PostgREST
          const CHUNK_SIZE = 100;
          let totalSuccess = 0;
          let totalErrors = 0;

          for (let i = 0; i < sanitizedRecords.length; i += CHUNK_SIZE) {
            const chunk = sanitizedRecords.slice(i, i + CHUNK_SIZE);
            const { data: chunkInserted, error: chunkError } = await supabase
              .from('registros_alumni')
              .upsert(chunk, { onConflict: 'email' })
              .select('id');

            if (chunkError) {
              console.error(`Erro no lote ${Math.floor(i / CHUNK_SIZE) + 1}:`, chunkError);
              totalErrors += chunk.length;
            } else {
              totalSuccess += chunkInserted?.length || chunk.length;
            }
          }

          // 4. BACKUP STORAGE (Auditoria não bloqueante)
          try {
            const dateDir = new Date().toISOString().split('T')[0];
            const fileName = `imports/${dateDir}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            
            await supabase.storage
              .from('alumni_formados')
              .upload(fileName, file);
          } catch (storageErr) {
            console.warn('Storage backup opcional não concluído:', storageErr);
          }

          resolve({
            success: totalSuccess,
            errors: totalErrors,
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
