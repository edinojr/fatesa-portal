import React, { useState, useEffect } from 'react'
import { Check, X, Save, Loader2, Calendar, Users as UsersIcon } from 'lucide-react'
import { AttendanceRecord, Nucleo, Student } from '../../../types/professor'

interface AttendanceListProps {
  professorNucleos: Nucleo[]
  allStudents: Student[]
  onSave: (records: any[]) => Promise<{ success: boolean, error?: string }>
  history: AttendanceRecord[]
  professorId: string
}

const AttendanceList: React.FC<AttendanceListProps> = ({ 
  professorNucleos, 
  allStudents, 
  onSave, 
  history,
  professorId
}) => {
  const [selectedNucleo, setSelectedNucleo] = useState<string>(professorNucleos[0]?.id || '')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, 'P' | 'F'>>({})

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  const [isReadOnly, setIsReadOnly] = useState(false)

  const filteredStudents = allStudents.filter(s => {
    const isInNucleo = s.nucleo_id === selectedNucleo || s.nucleos?.id === selectedNucleo;
    if (!isInNucleo) return false;

    // Excluir professores da lista de chamada, exceto o Edino Junior
    const isProfessor = s.tipo === 'professor';
    const isEdino = s.nome?.toLowerCase().includes('edino junior');

    if (isProfessor && !isEdino) return false;
    
    return true;
  })

  useEffect(() => {
    // If we have history for this date and nucleo, load it
    const dateHistory = history.filter(h => h.data === selectedDate && h.nucleo_id === selectedNucleo)
    const newAttendance: Record<string, 'P' | 'F'> = {}
    
    if (dateHistory.length > 0) {
      dateHistory.forEach(h => {
        newAttendance[h.aluno_id] = h.status
      })
      setIsReadOnly(true)
    } else {
      // Default to P (Present) for everyone
      filteredStudents.forEach(s => {
        newAttendance[s.id] = 'P'
      })
      setIsReadOnly(false)
    }
    setCurrentAttendance(newAttendance)
  }, [selectedDate, selectedNucleo, history, allStudents])

  const handleStatusChange = (studentId: string, status: 'P' | 'F') => {
    if (isReadOnly) return;
    setCurrentAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaving(true)
    setMessage(null)
    
    const records = filteredStudents.map(s => ({
      aluno_id: s.id,
      professor_id: professorId,
      nucleo_id: selectedNucleo,
      data: selectedDate,
      status: currentAttendance[s.id] || 'F',
      compartilhado: true // Padrão nativo
    }))

    const result = await onSave(records)
    if (result.success) {
      setMessage({ text: 'Lista de presença salva e compartilhada com a administração!', type: 'success' })
      setIsReadOnly(true)
    } else {
      setMessage({ text: 'Erro ao salvar: ' + result.error, type: 'error' })
    }
    setSaving(false)
  }

  return (
    <div className="attendance-container" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Selecionar Núcleo</label>
          <select 
            className="form-control" 
            value={selectedNucleo} 
            onChange={(e) => setSelectedNucleo(e.target.value)}
          >
            {professorNucleos.map(n => (
              <option key={n.id} value={n.id}>{n.nome}</option>
            ))}
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Data da Aula</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
            <input 
              type="date" 
              className="form-control" 
              style={{ paddingLeft: '40px' }}
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {isReadOnly ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '45px', padding: '0 1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '10px', fontWeight: 600 }}>
            <Check size={18} /> Lista já enviada (Bloqueada)
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving || !selectedNucleo}
            style={{ height: '45px', minWidth: '160px' }}
          >
            {saving ? <Loader2 className="spinner" size={18} /> : <><Save size={18} /> Salvar Lista</>}
          </button>
        )}
      </div>

      {message && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '12px', 
          marginBottom: '1.5rem', 
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#22c55e33' : '#ef444433'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>Nome do Aluno</th>
              <th style={{ textAlign: 'center' }}>Presença (P)</th>
              <th style={{ textAlign: 'center' }}>Falta (F)</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <UsersIcon size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>Nenhum aluno encontrado para este núcleo.</p>
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id}>
                  <td style={{ fontWeight: 600 }}>{student.nome}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => handleStatusChange(student.id, 'P')}
                      style={{ 
                        background: currentAttendance[student.id] === 'P' ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                        color: currentAttendance[student.id] === 'P' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      P
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => handleStatusChange(student.id, 'F')}
                      style={{ 
                        background: currentAttendance[student.id] === 'F' ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                        color: currentAttendance[student.id] === 'F' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      F
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AttendanceList
