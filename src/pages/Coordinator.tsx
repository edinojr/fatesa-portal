import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useCoordinatorData } from '../features/coordinator/hooks/useCoordinatorData';
import { 
  LayoutGrid, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  LogOut, 
  ExternalLink,
  ChevronLeft,
  Loader2,
  GraduationCap,
  ShieldCheck
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--primary)' }}>
        <Loader2 className="spinner" size={48} />
        <span style={{ fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Carregando Painel do Polo...</span>
      </div>
    );
  }

  const handleRoleNavigate = (role: string, path: string) => {
    localStorage.setItem('fatesa_active_role', role);
    navigate(path);
  };

  return (
    <div className="admin-layout">
      <header className="dashboard-header-modern" style={{ height: 'auto', minHeight: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={() => navigate('/dashboard')} className="nav-btn-premium" title="Voltar ao Painel do Aluno">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Painel do Coordenador</h1>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{profile?.nucleo || 'Unidade Local'} • Gestão Acadêmica</p>
          </div>
          
          <nav style={{ display: 'flex', gap: '0.5rem', marginLeft: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('home')}
              className={`nav-btn-premium ${activeTab === 'home' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <LayoutGrid size={16} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`nav-btn-premium ${activeTab === 'students' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <Users size={16} /> Alunos
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`nav-btn-premium ${activeTab === 'attendance' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <ClipboardList size={16} /> Chamada
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(profile?.tipo === 'professor' || profile?.caminhos_acesso?.includes('professor')) && (
            <button 
              onClick={() => handleRoleNavigate('professor', '/professor')}
              className="nav-btn-premium"
              style={{ width: 'auto' }}
              title="Ir para Painel do Professor"
            >
              <GraduationCap size={18} /> <span className="mobile-hide">Painel Professor</span>
            </button>
          )}
          {(profile?.tipo === 'admin' || profile?.caminhos_acesso?.includes('admin') || profile?.caminhos_acesso?.includes('suporte')) && (
            <button 
              onClick={() => handleRoleNavigate('admin', '/admin')}
              className="nav-btn-premium"
              style={{ width: 'auto' }}
              title="Ir para Painel Admin"
            >
              <ShieldCheck size={18} /> <span className="mobile-hide">Painel Admin</span>
            </button>
          )}
          <button 
            onClick={signOut}
            className="nav-btn-premium danger"
            title="Sair"
          >
            <LogOut size={18} /> <span className="mobile-hide">Sair</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-scroll-content" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              Polo <span style={{ color: 'var(--primary)' }}>{profile?.nucleo || 'Unidade Local'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gestão acadêmica e operacional do seu núcleo de ensino.</p>
          </div>

          {activeTab === 'home' && (
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <MetricsCards metrics={metrics} />
              <div style={{ marginTop: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Atividade Recente</h2>
                  <button onClick={() => setActiveTab('students')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Ver todos os alunos</button>
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
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
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
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
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
        </div>
      </main>
    </div>
  );
};

export default Coordinator;
