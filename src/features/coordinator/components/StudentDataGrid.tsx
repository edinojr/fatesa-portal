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
  const [searchQuery, setSearchQuery] = React.useState('');
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredStudents = students.filter(s => 
    s.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
      <div className="p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/[0.02]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Listagem de Alunos</h2>
          <p className="text-gray-400 text-xs mt-1 font-medium">Gestão centralizada de matrículas do Polo.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text"
              placeholder="Pesquisar nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 pl-10 rounded-xl text-white text-sm outline-none focus:border-primary/50 transition-all"
            />
            <User className="absolute left-3 top-3 text-gray-500" size={16} />
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 hidden md:block">
            <span className="text-xs text-gray-400">
              Total: <span className="text-white font-bold">{totalCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.03] text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">
              <th className="px-8 py-5 border-b border-white/5">Aluno / Identificação</th>
              <th className="px-8 py-5 border-b border-white/5">E-mail</th>
              <th className="px-8 py-5 border-b border-white/5">Data de Ingresso</th>
              <th className="px-8 py-5 border-b border-white/5">Modalidade</th>
              <th className="px-8 py-5 border-b border-white/5">Status Acadêmico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(pageSize)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6 h-12 bg-white/[0.01]"></td>
                </tr>
              ))
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-white/[0.03] transition-all group cursor-default">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
                        {student.nome.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm tracking-tight">{student.nome}</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ID: {student.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs text-gray-300 font-medium bg-white/5 px-3 py-1.5 rounded-lg w-fit border border-white/5">
                      <Mail size={12} className="text-gray-500" /> {student.email}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                      <Calendar size={14} className="text-primary/50" /> {new Date(student.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-primary px-2.5 py-1.5 bg-primary/10 rounded-lg border border-primary/20 uppercase tracking-widest">
                      {student.tipo}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${student.bloqueado ? 'bg-red-500' : 'bg-success'} animate-pulse`} />
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        student.bloqueado ? 'text-red-500' : 'text-success'
                      }`}>
                        {student.bloqueado ? 'Acesso Suspenso' : 'Matrícula Ativa'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center opacity-30">
                    <User size={64} className="mb-4" />
                    <h3 className="text-xl font-bold">Nenhum aluno encontrado</h3>
                    <p className="text-sm">Tente ajustar seus filtros ou termos de pesquisa.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      <div className="p-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.02]">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Página <span className="text-white">{page}</span> de <span className="text-white">{totalPages || 1}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-1.5 px-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              // Simple pagination logic for first 5 pages
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    page === pageNum 
                      ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/30 border border-primary/40' 
                      : 'text-gray-400 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-gray-600 px-1">...</span>}
          </div>

          <button 
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDataGrid;
