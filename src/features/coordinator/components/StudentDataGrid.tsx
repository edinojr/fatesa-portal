import React from 'react';
import { ChevronLeft, ChevronRight, User, Mail, Calendar } from 'lucide-react';

interface Student {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  tipo: string;
  bloqueado: boolean;
}

interface GridProps {
  students: Student[];
  page: number;
  setPage: (page: number) => void;
  totalCount: number;
  pageSize: number;
  loading: boolean;
}

const StudentDataGrid: React.FC<GridProps> = ({ students, page, setPage, totalCount, pageSize, loading }) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Listagem de Alunos</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Mostrando <span className="text-white font-bold">{students.length}</span> de <span className="text-white font-bold">{totalCount}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Aluno</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Matrícula</th>
              <th className="px-6 py-4">Modalidade</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8 h-12 bg-white/5"></td>
                </tr>
              ))
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                        {student.nome.charAt(0)}
                      </div>
                      <span className="font-bold text-white text-sm">{student.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Mail size={12} /> {student.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} /> {new Date(student.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-primary uppercase">{student.tipo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      student.bloqueado ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'
                    }`}>
                      {student.bloqueado ? 'Suspenso' : 'Ativo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 border-t border-white/10 flex justify-between items-center bg-white/5">
        <button 
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 rounded-xl border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                page === i + 1 ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'text-gray-400 hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 rounded-xl border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default StudentDataGrid;
