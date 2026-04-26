import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useCoordinatorData } from '../features/coordinator/hooks/useCoordinatorData';
import Logo from '../components/common/Logo';
import { 
  LayoutGrid, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  LogOut, 
  ExternalLink,
  ChevronLeft,
  Loader2
} from 'lucide-react';

import MetricsCards from '../features/coordinator/components/MetricsCards';
import StudentDataGrid from '../features/coordinator/components/StudentDataGrid';
import BatchAttendance from '../features/coordinator/components/BatchAttendance';

type Tab = 'home' | 'students' | 'attendance';

const Coordinator = () => {
  const { profile, signOut } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  const { 
    students, 
    loading, 
    metrics, 
    page, 
    setPage, 
    totalCount, 
    pageSize, 
    saveBatchAttendance,
    refresh
  } = useCoordinatorData(profile);

  if (loading && activeTab === 'home') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-primary">
        <Loader2 className="animate-spin mb-4" size={48} />
        <span className="font-bold tracking-widest uppercase">Carregando Painel do Polo...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Premium Header */}
      <header className="fixed top-0 w-full z-50 px-8 py-4 bg-black/50 backdrop-blur-xl border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Logo size={120} />
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'home' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'students' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={18} /> Alunos
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'attendance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ClipboardList size={18} /> Chamada
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <p className="text-sm font-black">{profile?.nome}</p>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Coordenador de Polo</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-primary/50 transition-all"
            title="Ir para Área do Aluno"
          >
            <ExternalLink size={20} />
          </button>
          <button 
            onClick={signOut}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto">
        {/* Title Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-2">
            Polo <span className="text-primary">{profile?.nucleo || 'Unidade Local'}</span>
          </h1>
          <p className="text-gray-400 font-medium">Gestão acadêmica e operacional do seu núcleo de ensino.</p>
        </div>

        {activeTab === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <MetricsCards metrics={metrics} />
            <div className="mt-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Atividade Recente</h2>
                <button onClick={() => setActiveTab('students')} className="text-primary text-sm font-bold hover:underline">Ver todos os alunos</button>
              </div>
              <StudentDataGrid 
                students={students.slice(0, 5)} 
                page={page} 
                setPage={setPage} 
                totalCount={totalCount} 
                pageSize={pageSize} 
                loading={loading}
              />
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="animate-in fade-in duration-500">
            <StudentDataGrid 
              students={students} 
              page={page} 
              setPage={setPage} 
              totalCount={totalCount} 
              pageSize={pageSize} 
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="animate-in zoom-in-95 duration-500">
            <BatchAttendance 
              students={students} 
              onSave={async (list) => {
                const res = await saveBatchAttendance(list);
                if (res.success) refresh();
                return res;
              }} 
            />
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.3em]">
          Fatesa Casa do Saber • Gestão de Polos v1.0
        </p>
      </footer>
    </div>
  );
};

export default Coordinator;
