import React, { useEffect, useState } from 'react'
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
  Loader2,
  Menu,
  X,
  Bell,
  MessageSquare
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

type Tab = 'cursos' | 'avisos' | 'documentos' | 'financeiro' | 'boletim' | 'forum'

const Dashboard = () => {
  const { profile, loading: profileLoading, signOut, refreshProfile } = useProfile();
  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
  
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('activeTab') as Tab;
    if (saved && ['cursos', 'avisos', 'documentos', 'financeiro', 'boletim', 'forum'].includes(saved)) {
      localStorage.removeItem('activeTab');
      return saved;
    }
    return 'cursos';
  });

  const navigate = useNavigate()
  const location = useLocation()

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
    loading: coursesLoading, 
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

  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [availableNucleos, setAvailableNucleos] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [avisos, setAvisos] = useState<any[]>([])
  const [materiais, setMateriais] = useState<any[]>([])
  const [poloAtividades, setPoloAtividades] = useState<any[]>([])
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    if (!profileLoading && profile) {
      // Bloquear acesso de professores estritos ao portal do aluno
      if (profile.tipo === 'professor' && profile.email !== 'edi.ben.jr@gmail.com' && !profile.caminhos_acesso?.includes('aluno')) {
        navigate('/professor', { replace: true });
        return;
      }
      // Opcional: Bloquear admins também, se fizer sentido
      if (profile.tipo === 'admin' && profile.email !== 'edi.ben.jr@gmail.com' && profile.email !== 'ap.panisso@gmail.com' && !profile.caminhos_acesso?.includes('aluno')) {
        navigate('/admin', { replace: true });
        return;
      }

      fetchStudentDashboardData();
      fetchPayments();
      if (profile.bloqueado) {
        setIsBlocked(true);
        setActiveTab('financeiro');
      }
    }
  }, [profileLoading, profile, fetchStudentDashboardData, fetchPayments, navigate]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (profile) {
      if (activeTab === 'avisos' && profile.nucleo_id) fetchNoticeBoard(profile.nucleo_id);
      if (activeTab === 'boletim') fetchBoletim();
    }
  }, [activeTab, profile])

  const fetchBoletim = async () => {
    if (!profile) return
    const { data: nucs } = await supabase.from('nucleos').select('id, nome, cidade, estado').order('nome')
    if (nucs) setAvailableNucleos(nucs)
  }

  const handleChangeNucleo = async (id: string, name?: string) => {
    if (!profile || !id) return;
    try {
      const selectedName = name || availableNucleos.find(n => n.id === id)?.nome;
      const { error } = await supabase.from('users').update({ 
        nucleo_id: id,
        nucleo: selectedName,
        status_nucleo: 'pendente'
      }).eq('id', profile.id);
      
      if (error) throw error;
      showToast('Polo vinculado com sucesso! Aguarde aprovação.', 'success');
      await refreshProfile();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchNoticeBoard = async (nucleoId: string) => {
    try {
      const { data: avisosData } = await supabase.from('avisos').select('id, titulo, conteudo, created_at, prioridade').eq('nucleo_id', nucleoId).order('created_at', { ascending: false });
      setAvisos(avisosData || []);

      const { data: materiaisData } = await supabase.from('materiais_adicionais').select('id, titulo, descricao, arquivos, created_at').eq('nucleo_id', nucleoId).order('created_at', { ascending: false });
      setMateriais(materiaisData || []);

      const { data: atvData } = await supabase.from('atividades').select('*, respostas_atividades_extra(id, status, nota)').eq('nucleo_id', nucleoId).order('created_at', { ascending: false });
      setPoloAtividades(atvData || []);
    } catch (error) {
      console.error('Notice Board Error:', error);
    }
  }

  const handleRequestExtension = async () => {
    const result = await requestExtension();
    if (result.success) {
      showToast('Acesso de emergência liberado!');
      await refreshProfile();
      fetchStudentDashboardData();
    } else {
      showToast(result.error || 'Erro ao solicitar extensão', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'doc' | 'pay', id?: string, docType?: string) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Clear the input value so the same file selection can trigger onChange again if needed
    const target = e.target;
    
    setUploading(id || docType || 'general')
    try {
      const bucket = type === 'doc' ? 'documentos' : 'comprovantes'
      const fileName = `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`
      const filePath = `${profile.id}/${fileName}`

      console.log(`Iniciando upload para o bucket: ${bucket}, caminho: ${filePath}`);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
      
      if (uploadError) {
        console.error('Erro no Supabase Storage:', uploadError);
        throw new Error(`Erro no servidor de arquivos: ${uploadError.message === 'Bucket not found' ? 'A pasta do servidor não foi encontrada. Verifique se o bucket "' + bucket + '" foi criado no Supabase.' : uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

      if (type === 'doc') {
        const { error: dbError } = await supabase.from('documentos').upsert({ user_id: profile.id, tipo: docType as any, url: publicUrl, status: 'pendente' })
        if (dbError) throw dbError;
      } else {
        if (id && id !== 'general' && id !== 'pay') {
          const { error: dbError } = await supabase.from('pagamentos').update({ comprovante_url: publicUrl, status: 'pago' }).eq('id', id)
          if (dbError) throw dbError;
        } else {
          const { error: dbError } = await supabase.from('pagamentos').insert({
            user_id: profile.id,
            valor: 0,
            status: 'pago',
            comprovante_url: publicUrl,
            data_vencimento: new Date().toISOString().split('T')[0],
            descricao: 'Comprovante avulso enviado pelo Aluno'
          })
          if (dbError) throw dbError;
        }
        fetchPayments()
      }
      showToast('Upload realizado com sucesso!')
      target.value = ''; // Reset input selection
    } catch (err: any) {
      console.error('Falha no upload:', err);
      showToast(err.message || 'Falha ao processar arquivo', 'error')
      target.value = ''; // Reset input selection on error too
    } finally {
      setUploading(null)
    }
  }

  if (profileLoading || (coursesLoading && courses.length === 0)) return <div className="auth-container"><Loader2 className="spinner" /> Carregando...</div>

  return (
    <div className="admin-layout">
      {/* Botão de Menu Flutuante */}
      <button className="floating-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop do Menu */}
      {isMobileMenuOpen && <div className="menu-backdrop" onClick={() => setIsMobileMenuOpen(false)} />}

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

      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ paddingTop: '2rem' }}>
        <div className="logo-section" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
          <Logo size={200} />
          <button className="mobile-menu-btn" style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(['cursos', 'avisos', 'forum', 'documentos', 'financeiro', 'boletim'] as Tab[])
            .filter(t => isStaff ? t !== 'financeiro' : true)
            .map(t => {
              const isDisabled = (isBlocked || isBlockedDueToPayment) && t !== 'financeiro';
              return (
                <div
                  key={t}
                  className={`admin-nav-item ${activeTab === t ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isDisabled) return;
                    setActiveTab(t);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  {t === 'cursos' && <BookOpen size={20} />}
                  {t === 'avisos' && <Bell size={20} />}
                  {t === 'documentos' && <FileText size={20} />}
                  {t === 'financeiro' && <CreditCard size={20} />}
                  {t === 'boletim' && <Award size={20} />}
                  {t === 'forum' && <MessageSquare size={20} />}
                  <span>{t === 'avisos' ? 'Avisos' : t === 'financeiro' ? 'Pagamentos' : t === 'boletim' ? 'Boletim' : t === 'forum' ? 'Fórum' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </div>
              );
            })}

          <div style={{ padding: '1rem', marginTop: 'auto' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, #7B1FA2 100%)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 800 }} onClick={() => { setActiveTab('financeiro'); setIsMobileMenuOpen(false); }}>
              <CreditCard size={20} /> Realizar Pagamento
            </button>
          </div>

          <div style={{ padding: '0.5rem 1rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)', border: 'none', background: 'transparent' }} onClick={() => signOut()}>
              <LogOut size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sair</span>
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main" style={{ paddingTop: '1rem' }}>
        <header className="mobile-col-flex" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
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
            <CourseList 
              courses={courses}
              selectedBook={selectedBook}
              setSelectedBook={setSelectedBook}
              progressoAulas={progressoAulas}
              atividades={atividades}
            />
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
