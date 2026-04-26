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
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const filteredStudents = students.filter(s => 
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAttendance = (id: string, value: 'P' | 'F') => {
    setAttendance(prev => ({ ...prev, [id]: value }));
  };

  const markAllPresent = () => {
    const newAttendance = { ...attendance };
    students.forEach(s => newAttendance[s.id] = 'P');
    setAttendance(newAttendance);
  };

  const clearAll = () => setAttendance({});

  const handleSave = async () => {
    const list = students.map(s => ({
      aluno_id: s.id,
      status: attendance[s.id] || 'F'
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
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 rounded-full" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <Users className="text-primary" size={32} /> Chamada em Lote
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gestão de presença rápida para turmas do Polo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={markAllPresent}
            className="px-4 py-2 text-xs font-bold bg-success/10 text-success border border-success/20 rounded-xl hover:bg-success hover:text-white transition-all"
          >
            Marcar Todos Presentes
          </button>
          <button 
            onClick={clearAll}
            className="px-4 py-2 text-xs font-bold bg-white/5 text-gray-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
          >
            Limpar
          </button>
          <div className="w-[1px] h-8 bg-white/10 mx-2 hidden lg:block" />
          <button 
            onClick={handleSave}
            disabled={saving || students.length === 0}
            className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${
              status === 'success' ? 'bg-success text-white' : 
              status === 'error' ? 'bg-red-500 text-white' : 
              'bg-primary hover:bg-primary-hover text-white shadow-xl shadow-primary/20'
            }`}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            {status === 'success' ? 'Presenças Salvas!' : status === 'error' ? 'Erro ao Salvar' : 'Confirmar Chamada'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <input 
          type="text"
          placeholder="Buscar aluno na turma..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <div 
              key={student.id}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-white truncate">{student.nome}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Aluno Ativo</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => toggleAttendance(student.id, 'P')}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    attendance[student.id] === 'P' 
                      ? 'bg-success text-white shadow-lg shadow-success/30 scale-105' 
                      : 'bg-white/5 text-gray-500 hover:text-success border border-transparent hover:border-success/30'
                  }`}
                  title="Presente"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => toggleAttendance(student.id, 'F')}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    attendance[student.id] === 'F' 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' 
                      : 'bg-white/5 text-gray-500 hover:text-red-500 border border-transparent hover:border-red-500/30'
                  }`}
                  title="Faltou"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Users className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Nenhum aluno encontrado para esta busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchAttendance;
