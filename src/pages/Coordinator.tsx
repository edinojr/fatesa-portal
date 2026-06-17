import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useCoordinatorData } from '../features/coordinator/hooks/useCoordinatorData';
import { 
  LayoutGrid, 
  Users, 
  ClipboardList, 
  Loader2,
} from 'lucide-react';

import MetricsCards from '../features/coordinator/components/MetricsCards';
import StudentDataGrid from '../features/coordinator/components/StudentDataGrid';
import BatchAttendance from '../features/coordinator/components/BatchAttendance';
import PageHeader from '../components/layout/PageHeader';

type Tab = 'home' | 'students' | 'attendance';

const Coordinator = () => {
  const { profile } = useProfile();
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
      <div className="auth-container">
        <Loader2 className="spinner" size={48} />
        <span style={{ fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Carregando Painel do Polo...</span>
      </div>
    );
  }

  const tabNav = (
    <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
  );

  return (
    <div className="admin-layout">
      <PageHeader
        title="Painel do Coordenador"
        subtitle={`${profile?.nucleo || 'Unidade Local'} • Gestão Acadêmica`}
        variant="coordinator"
        onBack={() => navigate('/dashboard')}
        showTopBanner={false}
        nav={tabNav}
      />

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
