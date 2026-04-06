import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  LogOut, 
  Award, 
  GraduationCap, 
  FileText, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  MessageSquare,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'

// Hooks Feature-based
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { useFinanceControl } from '../features/finance/hooks/useFinanceControl'

// Componentes Feature-based
import CourseList from '../features/courses/components/CourseList'
import DocumentUpload from '../features/finance/components/DocumentUpload'
import FinancePanel from '../features/finance/components/FinancePanel'
import GradesPanel from '../features/courses/components/GradesPanel'
import NoticeBoard from '../features/communication/components/NoticeBoard'
import ForumPanel from '../features/forum/components/ForumPanel'
import AlumniCertificate from '../components/documents/AlumniCertificate'

type Tab = 'home' | 'cursos' | 'avisos' | 'documentos' | 'financeiro' | 'boletim' | 'forum'

const Dashboard = () => {
  const { profile, signOut, refreshProfile } = useProfile();
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    localStorage.setItem('fatesa_active_role', 'aluno')
  }, [])

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
  
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('fatesa_student_activeTab') as Tab;
    if (saved && ['home', 'cursos', 'avisos', 'documentos', 'financeiro', 'boletim', 'forum'].includes(saved)) {
      return saved;
    }
    return 'home';
  });

  useEffect(() => {
    localStorage.setItem('fatesa_student_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as Tab);
    }
  }, [location.state]);
  
  // Custom Hooks para lógica de negócio
  const { 
    courses, 
    progressoAulas, 
    atividades, 
    fetchStudentDashboardData 
  } = useStudentCourses(profile);

  const { 
    payments, 
    pixConfig, 
    isBlockedDueToPayment, 
    isPastDue, 
    fetchPayments, 
    requestExtension 
  } = useFinanceControl(profile);

  // Estados Locais
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [poloAtividades, setPoloAtividades] = useState<any[]>([]);

  const isBlocked = profile?.bloqueado;
  const isAlumniData = (profile as any)?.isAlumni;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNoticeBoard = useCallback(async (nucleoId: string) => {
    try {
      const [{ data: a }, { data: m }, { data: at }] = await Promise.all([
        supabase.from('avisos_nucleo').select('*').eq('nucleo_id', nucleoId).order('created_at', { ascending: false }),
        supabase.from('materiais_nucleo').select('*').eq('nucleo_id', nucleoId).order('created_at', { ascending: false }),
        supabase.from('item_aula').select('*').eq('nucleo_id', nucleoId).eq('tipo', 'atividade').order('id', { ascending: false })
      ]);
      setAvisos(a || []);
      setMateriais(m || []);
      setPoloAtividades(at || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      fetchStudentDashboardData();
      fetchPayments();
      if (profile.nucleo_id) fetchNoticeBoard(profile.nucleo_id);
    }
  }, [profile, fetchStudentDashboardData, fetchPayments, fetchNoticeBoard]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'doc' | 'pay', 
    id?: string, 
    docType?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    
    const uploadId = id || docType || 'general';
    setUploading(uploadId);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
      const filePath = `${type === 'pay' ? 'comprovantes' : 'documentos'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pedagogico')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pedagogico').getPublicUrl(filePath);

      if (type === 'pay' && id) {
        const { error: dbError } = await supabase
          .from('pagamentos')
          .update({ comprovante_url: publicUrl, status: 'pendente' })
          .eq('id', id);
        if (dbError) throw dbError;
      } else if (type === 'doc' && docType) {
        const { error: dbError } = await supabase
          .from('documentos_aluno')
          .upsert({
            user_id: profile.id,
            tipo: docType,
            url: publicUrl,
            status: 'pendente'
          });
        if (dbError) throw dbError;
      }

      showToast('Arquivo enviado com sucesso!');
      fetchPayments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRequestExtension = async () => {
    const result = await requestExtension();
    if (result.success) {
      showToast('Extensão concedida até o dia ' + result.date);
      refreshProfile();
    } else {
      showToast(result.error || 'Erro ao solicitar extensão', 'error');
    }
  };

  const availableNucleos: any[] = []; // Se necessário para staff
  const handleChangeNucleo = async (newNucleoId: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('alunos').update({ nucleo_id: newNucleoId }).eq('id', profile.id);
      if (error) throw error;
      refreshProfile();
      showToast('Núcleo alterado!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }; 

  const handleStudentBack = () => {
    if (selectedBook) {
      setSelectedBook(null);
      return;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return;
    }
    // If already at home, we don't navigate out to avoid quitting the dashboard unexpectedly
  }

  return (
    <div className="admin-layout">
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem', 
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Standardized Dashboard Navigation Header */}
      <header className="dashboard-header-modern">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo size={120} />
          
          <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
            <button onClick={() => navigate('/')} className="nav-btn-premium" title="Ir para Home do Site">
              <HomeIcon size={18} />
            </button>
            <button 
              onClick={handleStudentBack} 
              className="nav-btn-premium" 
              title="Voltar"
              style={{ display: (activeTab === 'home') ? 'none' : 'inline-flex' }}
            >
              <ChevronLeft size={18} /> <span className="mobile-hide">Voltar</span>
            </button>
            <button onClick={() => navigate('/modulos-finalizados')} className="nav-btn-premium" title="Ver Concluídos" style={{ border: '1px solid var(--success-border)', background: 'rgba(16, 185, 129, 0.05)' }}>
              <Award size={18} color="var(--success)" /> <span className="mobile-hide">Módulos Finalizados</span>
            </button>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
           {activeTab !== 'home' && (
             <div className="nav-breadcrumb-modern">
               <LayoutGrid size={16} /> <span>Painel do Aluno</span>
               <ChevronRight size={14} className="divider" />
               <span className="current">
                 {activeTab === 'cursos' ? 'Meus Cursos' :
                  activeTab === 'avisos' ? 'Avisos' :
                  activeTab === 'documentos' ? 'Documentos' :
                  activeTab === 'financeiro' ? 'Pagamentos' :
                  activeTab === 'boletim' ? 'Boletim' : 'Fórum'}
               </span>
             </div>
           )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {(profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.caminhos_acesso?.includes('admin') || profile?.email === 'edi.ben.jr@gmail.com') && (
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-btn-premium" 
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <GraduationCap size={18} /> <span className="mobile-hide">Trocar Painel</span>
              </button>
              {showRoleSwitcher && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.5rem', zIndex: 110, display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '180px', marginTop: '0.5rem' }}>
                  <button className="nav-btn-premium" style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 'none' }} onClick={() => navigate('/professor')}>Painel do Professor</button>
                  <button className="nav-btn-premium" style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 'none' }} onClick={() => navigate('/admin')}>Painel Administrativo</button>
                </div>
              )}
            </div>
          )}
          <button className="nav-btn-premium danger" onClick={() => signOut()}>
            <LogOut size={18} /> <span className="mobile-hide">Sair</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <header className="mobile-col-flex" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {activeTab === 'home' && 'Área do Aluno'}
              {activeTab === 'cursos' && 'Meus Cursos'}
              {activeTab === 'avisos' && 'Quadro de Avisos'}
              {activeTab === 'documentos' && 'Meus Documentos'}
              {activeTab === 'financeiro' && 'Meus Pagamentos'}
              {activeTab === 'boletim' && 'Meu Boletim'}
              {activeTab === 'forum' && 'Fórum da Comunidade'}
            </h1>
            <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              Bem-vindo de volta, {profile?.nome || 'Aluno'}. 
              {profile?.nucleo && (
                <span className="badge" style={{ 
                  fontSize: '0.75rem', 
                  background: 'rgba(var(--primary-rgb), 0.1)', 
                  color: 'var(--primary)', 
                  padding: '0.2rem 0.75rem', 
                  borderRadius: '50px',
                  border: '1px solid var(--primary)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <GraduationCap size={14} /> Polo: {profile.nucleo}
                </span>
              )}
            </p>
          </div>
        </header>

        <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'home' && (
            <div className="admin-dashboard-grid transition-fade-in" style={{ marginTop: '1rem' }}>
              <div className="admin-action-card" onClick={() => setActiveTab('cursos')}>
                <div className="icon-wrapper"><BookOpen size={32} /></div>
                <h3>Meus Cursos</h3>
                <p>Acesse suas aulas, materiais e continue seus estudos.</p>
              </div>

              <div className="admin-action-card" onClick={() => setActiveTab('avisos')}>
                <div className="icon-wrapper"><Bell size={32} /></div>
                <h3>Avisos do Polo</h3>
                <p>Comunicados importantes e materiais extras do seu núcleo.</p>
              </div>

              <div className="admin-action-card" onClick={() => setActiveTab('forum')}>
                <div className="icon-wrapper"><MessageSquare size={32} /></div>
                <h3>Fórum</h3>
                <p>Participe de discussões e tire dúvidas com a comunidade.</p>
              </div>

              <div className="admin-action-card" onClick={() => setActiveTab('documentos')}>
                <div className="icon-wrapper"><FileText size={32} /></div>
                <h3>Documentação</h3>
                <p>Envie e gerencie seus documentos de matrícula.</p>
              </div>

              {!isStaff && (
                <div className="admin-action-card" onClick={() => setActiveTab('financeiro')}>
                  <div className="icon-wrapper"><CreditCard size={32} /></div>
                  <h3>Pagamentos</h3>
                  <p>Consulte mensalidades e gere bônus/PIX de pagamento.</p>
                  {isPastDue && (
                    <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--error)', color: '#fff', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '50px', fontWeight: 800 }}>
                      PENDENTE
                    </span>
                  )}
                </div>
              )}

              <div className="admin-action-card" onClick={() => setActiveTab('boletim')}>
                <div className="icon-wrapper"><Award size={32} /></div>
                <h3>Meu Boletim</h3>
                <p>Consulte suas notas e desempenho acadêmico.</p>
              </div>
            </div>
          )}

          {isAlumniData && activeTab === 'home' && (
            <div style={{ marginBottom: '2rem', padding: '2rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '24px', border: '1px solid rgba(var(--primary-rgb), 0.2)', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Award size={48} color="var(--primary)" />
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Parabéns pela Conclusão!</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px' }}>Você concluiu com aproveitamento o **Curso Básico de Teologia**. Seu certificado oficial está pronto para download abaixo.</p>
                <AlumniCertificate aluno={{
                  nome: profile?.nome || isAlumniData.nome,
                  email: profile?.email || isAlumniData.email,
                  ano_formacao: isAlumniData.ano_formacao,
                  matricula: isAlumniData.matricula
                }} />
              </div>
            </div>
          )}

          {isBlocked && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid var(--error)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ color: 'var(--error)' }}>Acesso suspenso pelo administrador.</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Seu acesso aos cursos e materiais está restrito. Regularize seu pagamento abaixo para reativar todos os recursos.</p>
              </div>
            </div>
          )}

          {activeTab === 'cursos' && (
            <>
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Meus Módulos Ativos</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Acompanhe seu progresso atual e continue seus estudos.</p>
                </div>
                <button 
                  onClick={() => navigate('/modulos-finalizados')} 
                  className="btn btn-outline" 
                  style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', borderRadius: '12px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Award size={20} /> <span className="hide-mobile">Módulos Finalizados</span>
                </button>
              </div>
              <CourseList 
                courses={courses}
                progressoAulas={progressoAulas}
                atividades={atividades}
                showOnlyOngoing={true}
              />
            </>
          )}

          {activeTab === 'avisos' && (
            <NoticeBoard 
              avisos={avisos} 
              materiais={materiais} 
              atividades={poloAtividades}
              onRefresh={() => profile?.nucleo_id && fetchNoticeBoard(profile.nucleo_id)}
            />
          )}

          {activeTab === 'documentos' && (
            <DocumentUpload 
              documents={[]} // Precisa de fetch documentos se necessário, ou usar hooks
              handleFileUpload={handleFileUpload}
              uploading={uploading}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinancePanel 
              isExempt={isStaff || profile?.bolsista}
              pixConfig={pixConfig}
              payments={payments}
              uploading={uploading}
              handleFileUpload={handleFileUpload}
              showToast={showToast}
              isBlockedDueToPayment={isBlockedDueToPayment}
              isPastDue={isPastDue}
              handleRequestExtension={handleRequestExtension}
            />
          )}

          {activeTab === 'boletim' && (
            <GradesPanel 
              profile={profile}
              availableNucleos={availableNucleos}
              handleChangeNucleo={handleChangeNucleo} 
              courses={courses}
              atividades={atividades}
            />
          )}

          {activeTab === 'forum' && (
            <ForumPanel userProfile={profile} />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
