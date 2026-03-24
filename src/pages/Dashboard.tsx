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
  Users,
  ChevronLeft,
  Menu,
  X,
  Bell
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Course, Documento, Pagamento } from '../types/dashboard'
import CourseList from '../components/dashboard/CourseList'
import DocumentUpload from '../components/dashboard/DocumentUpload'
import FinancePanel from '../components/dashboard/FinancePanel'
import GradesPanel from '../components/dashboard/GradesPanel'
import NoticeBoard from '../components/dashboard/NoticeBoard'
import { useProfile } from '../hooks/useProfile'

type Tab = 'cursos' | 'avisos' | 'documentos' | 'financeiro' | 'boletim'

const Dashboard = () => {
  const { profile, loading: profileLoading, signOut } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>('cursos')
  const [courses, setCourses] = useState<Course[]>([])
  const [documents, setDocuments] = useState<Documento[]>([])
  const [payments, setPayments] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [selectedLessonType, setSelectedLessonType] = useState<'video' | 'atividade'>('video')
  const [atividades, setAtividades] = useState<any[]>([])
  const [progressoAulas, setProgressoAulas] = useState<any[]>([])
  const [availableNucleos, setAvailableNucleos] = useState<any[]>([])
  const [pixConfig, setPixConfig] = useState<{ key: string, qr: string }>({ key: '', qr: '' })
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [showArchives, setShowArchives] = useState<Record<string, boolean>>({})
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [avisos, setAvisos] = useState<any[]>([])
  const [materiais, setMateriais] = useState<any[]>([])

  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading && profile) {
      fetchDashboardData();
    }
  }, [profileLoading, profile]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDashboardData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      
      if (profile.nucleo_id) {
        fetchNoticeBoard(profile.nucleo_id);
      }
      
      const isStaff = ['admin', 'professor', 'suporte'].includes(profile.tipo || '');
      const exemptStatus = profile.bolsista || isStaff;

      let releasedCount = 999;
      if (!exemptStatus) {
        const { data: payRecords } = await supabase
          .from('pagamentos')
          .select('status')
          .eq('user_id', profile.id)
          .eq('status', 'pago');
        releasedCount = (payRecords?.length || 0) + 1;
      }

      // Check for multiple roles
      const roles = profile.caminhos_acesso || []
      if (profile.email === 'edi.ben.jr@gmail.com') {
        if (!roles.includes('aluno')) roles.push('aluno')
        if (!roles.includes('professor')) roles.push('professor')
        if (!roles.includes('suporte')) roles.push('suporte')
      }
      if (roles.length > 1) setAvailableRoles(roles)

      // Fetch Courses
      const { data: allCourses } = await supabase
        .from('cursos')
        .select(`
          id,
          nome,
          livros (
            id,
            titulo,
            professor_nome,
            capa_url,
            pdf_url,
            epub_url,
            ordem,
            ensino_tipo,
            aulas (
              id,
              titulo,
              tipo,
              parent_aula_id,
              ordem,
              arquivo_url,
              video_url,
              nucleo_id
            )
          )
        `);
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => ({
              ...l,
              aulas: (l.aulas || []).filter((a: any) => !a.nucleo_id || a.nucleo_id === profile?.nucleo_id),
              progresso: isStaff ? 100 : 0, 
              isReleased: isStaff || exemptStatus || (l.ordem || 1) <= releasedCount,
              isCurrent: !isStaff && !exemptStatus && (l.ordem || 1) === releasedCount
            }))
          };
        }).filter((c: any) => c.livros.length > 0);
        setCourses(mappedCourses);
      }
    } catch (err: any) {
      console.error("Dashboard Error:", err);
      showToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      if (activeTab === 'documentos') fetchDocuments()
      if (activeTab === 'financeiro') fetchPayments()
      if (activeTab === 'boletim') fetchBoletim()
    }
  }, [activeTab, profile])

  const fetchDocuments = async () => {
    if (!profile) return
    const { data } = await supabase.from('documentos').select('*').eq('user_id', profile.id)
    if (data) setDocuments(data)
  }

  const fetchPayments = async () => {
    if (!profile) return
    const { data } = await supabase.from('pagamentos').select('*').eq('user_id', profile.id).order('data_vencimento', { ascending: false })
    if (data && data.length > 0) setPayments(data)

    const { data: config } = await supabase.from('configuracoes').select('*')
    if (config) {
      const pix = { key: '', qr: '' }
      config.forEach(c => {
        if (c.chave === 'pix_key') pix.key = c.valor
        if (c.chave === 'pix_qr_url') pix.qr = c.valor
      })
      setPixConfig(pix)
    }
  }

  const fetchBoletim = async () => {
    if (!profile) return
    const { data: nucs } = await supabase.from('nucleos').select('id, nome, cidade, estado').order('nome')
    if (nucs) setAvailableNucleos(nucs)

    const { data: respostasData } = await supabase
      .from('respostas_aulas')
      .select('id, status, nota, tentativas, primeira_correcao_at, aulas(titulo, tipo)')
      .eq('aluno_id', profile.id)
      .order('created_at', { ascending: false })

    if (respostasData) setAtividades(respostasData)

    const { data: progData } = await supabase
      .from('progresso')
      .select('aula_id, concluida')
      .eq('aluno_id', profile.id)
    
    if (progData) setProgressoAulas(progData)
  }

  const fetchNoticeBoard = async (nucleoId: string) => {
    try {
      const { data: avisosData } = await supabase
        .from('avisos')
        .select('*')
        .eq('nucleo_id', nucleoId)
        .order('created_at', { ascending: false });
      setAvisos(avisosData || []);

      const { data: materiaisData } = await supabase
        .from('materiais_adicionais')
        .select('*')
        .eq('nucleo_id', nucleoId)
        .order('created_at', { ascending: false });
      setMateriais(materiaisData || []);
    } catch (error) {
      console.error('Notice Board Error:', error);
    }
  }

  const handleChangeNucleo = async (nucleoId: string) => {
    if (!nucleoId || !profile) return
    try {
      const { error } = await supabase.rpc('update_user_nucleo', { p_nucleo_id: nucleoId })
      if (error) throw error
      showToast('Núcleo atualizado!')
      fetchDashboardData();
    } catch(err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'doc' | 'pay', id?: string, docType?: string) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(id || docType || 'general')
    try {
      const bucket = type === 'doc' ? 'documentos' : 'comprovantes'
      const filePath = `${profile.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

      if (type === 'doc') {
        await supabase.from('documentos').upsert({ user_id: profile.id, tipo: docType as any, url: publicUrl, status: 'pendente' })
        fetchDocuments()
      } else {
        await supabase.from('pagamentos').update({ comprovante_url: publicUrl, status: 'pago' }).eq('id', id)
        fetchPayments()
      }
      showToast('Upload realizado!')
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploading(null)
    }
  }

  if (profileLoading || loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando...</div>

  const isTemp = profile && !profile.acesso_definitivo
  const expiration = profile?.data_expiracao_temp ? new Date(profile.data_expiracao_temp) : null
  const isExpired = isTemp && expiration && expiration < new Date()
  const daysRemaining = isTemp && expiration ? Math.max(0, Math.ceil((expiration.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null

  if (isExpired) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <AlertCircle size={80} color="var(--error)" style={{ margin: '0 auto 2rem' }} />
          <h1>Acesso Expirado</h1>
          <button onClick={() => signOut()} className="btn btn-outline">Sair</button>
        </div>
      </div>
    )
  }

  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '');
  const isExempt = profile?.bolsista || isStaff;

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

      <aside className="admin-sidebar" style={{ paddingTop: '2.5rem' }}>
        <div className="logo-section" style={{ padding: '0 1.25rem', marginBottom: '1rem', flex: 1 }}>
          <div>
            <GraduationCap size={40} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Portal do Aluno
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', opacity: 0.8 }}>v1.4</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{profile?.email}</p>
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className={isMobileMenuOpen ? 'mobile-open' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {availableRoles.length > 1 && (
            <div style={{ marginBottom: '1rem', padding: '0 1.25rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', gap: '0.5rem' }}
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={16} /> Alternar Painel
              </button>
              {showRoleSwitcher && (
                <div style={{ marginTop: '0.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem' }}>
                  {availableRoles.filter(r => r !== 'aluno').map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => navigate(r === 'professor' ? '/professor' : '/admin')}
                    >
                      {r === 'professor' ? 'Painel do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(['cursos', 'avisos', 'documentos', 'financeiro', 'boletim'] as Tab[]).map(t => (
            <div 
              key={t} 
              className={`admin-nav-item ${activeTab === t ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab(t);
                setIsMobileMenuOpen(false);
              }}
            >
              {t === 'cursos' && <BookOpen size={20} />}
              {t === 'avisos' && <Bell size={20} />}
              {t === 'documentos' && <FileText size={20} />}
              {t === 'financeiro' && <CreditCard size={20} />}
              {t === 'boletim' && <Award size={20} />}
              {t === 'avisos' ? 'Avisos' : t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)' }} onClick={() => signOut()}>
              <LogOut size={20} /> Sair
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main" style={{ paddingTop: '2rem' }}>
        <header className="mobile-col-flex" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {activeTab === 'cursos' && 'Meus Cursos'}
              {activeTab === 'avisos' && 'Quadro de Avisos'}
              {activeTab === 'documentos' && 'Meus Documentos'}
              {activeTab === 'financeiro' && 'Financeiro e Matrícula'}
              {activeTab === 'boletim' && 'Boletim de Notas'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, Aluno.</p>
          </div>
        </header>

        <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'cursos' && (
            <CourseList 
              courses={courses}
              showArchives={showArchives}
              setShowArchives={setShowArchives}
              selectedBook={selectedBook}
              setSelectedBook={setSelectedBook}
              selectedLessonType={selectedLessonType}
              setSelectedLessonType={setSelectedLessonType}
              atividades={atividades}
              progressoAulas={progressoAulas}
            />
          )}

          {activeTab === 'avisos' && (
            <NoticeBoard 
              avisos={avisos} 
              materiais={materiais} 
            />
          )}

          {activeTab === 'documentos' && (
            <DocumentUpload 
              documents={documents}
              handleFileUpload={handleFileUpload}
              uploading={uploading}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinancePanel 
              isExempt={isExempt}
              pixConfig={pixConfig}
              payments={payments}
              uploading={uploading}
              handleFileUpload={handleFileUpload}
              showToast={(msg) => showToast(msg)}
            />
          )}

          {activeTab === 'boletim' && (
            <GradesPanel 
              profile={profile}
              availableNucleos={availableNucleos}
              handleChangeNucleo={handleChangeNucleo}
              atividades={atividades}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
