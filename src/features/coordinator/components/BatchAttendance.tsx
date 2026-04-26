import React, { useState } from 'react';
import { Check, X, Save, Users, Loader2 } from 'lucide-react';

interface Student {
  id: string;
  nome: string;
}

interface BatchAttendanceProps {
  students: Student[];
  onSave: (attendanceList: { aluno_id: string, status: 'P' | 'F' }[]) => Promise<{ success: boolean }>;
}

const BatchAttendance: React.FC<BatchAttendanceProps> = ({ students, onSave }) => {
  const [attendance, setAttendance] = useState<Record<string, 'P' | 'F'>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const toggleAttendance = (id: string, value: 'P' | 'F') => {
    setAttendance(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    const list = students.map(s => ({
      aluno_id: s.id,
      status: attendance[s.id] || 'F' // Default to Fallback/Absent if not marked
    }));

    setSaving(true);
    const result = await onSave(list);
    setSaving(false);

    if (result.success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="text-primary" /> Chamada em Lote
          </h2>
          <p className="text-gray-400 text-sm mt-1">Marque a presença de todos os alunos da turma de uma vez.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all ${
            status === 'success' ? 'bg-success text-white' : 
            status === 'error' ? 'bg-red-500 text-white' : 
            'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 active:scale-95'
          }`}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {status === 'success' ? 'Salvo!' : status === 'error' ? 'Erro!' : 'Salvar Chamada'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <div 
            key={student.id}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center hover:bg-white/10 transition-all"
          >
            <span className="font-bold text-sm text-white truncate max-w-[150px]">{student.nome}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleAttendance(student.id, 'P')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  attendance[student.id] === 'P' 
                    ? 'bg-success text-white shadow-lg shadow-success/20' 
                    : 'bg-white/5 text-gray-500 hover:text-success'
                }`}
                title="Presente"
              >
                <Check size={20} />
              </button>
              <button 
                onClick={() => toggleAttendance(student.id, 'F')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  attendance[student.id] === 'F' 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                    : 'bg-white/5 text-gray-500 hover:text-red-500'
                }`}
                title="Faltou"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchAttendance;
