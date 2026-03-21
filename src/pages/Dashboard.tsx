import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  CheckCircle, 
  Circle, 
  LogOut, 
  Award, 
  GraduationCap, 
  FileText, 
  CreditCard, 
  Upload, 
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  ChevronLeft,
  Menu,
  X,
  PlayCircle,
  ClipboardList,
  Lock
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

interface Lesson {
  id: string
  titulo: string
  tipo: 'gravada' | 'ao_vivo' | 'atividade' | 'prova'
  concluida?: boolean
}

interface Book {
  id: string
  titulo: string
  aulas: Lesson[]
  progresso: number
  capa_url?: string
  pdf_url?: string
  isReleased?: boolean
  isCurrent?: boolean
  ordem?: number
}

interface Course {
  id: string
  nome: string
  livros: Book[]
}

interface Documento {
  id: string
  tipo: 'rg' | 'cnh' | 'residencia' | 'exame' | 'outro'
  url: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  feedback?: string
}

interface Pagamento {
  id: string
  valor: number
  status: 'aberto' | 'pago' | 'atrasado'
  data_vencimento: string
  comprovante_url?: string
  feedback?: string
}

interface UserProfile {
  id: string
  nome: string
  email: string
  tipo: string
  acesso_definitivo?: boolean
  data_expiracao_temp?: string
  bolsista?: boolean
  nucleo_id?: string
  status_nucleo?: string
  nucleos?: { nome: string }
}

type Tab = 'cursos' | 'documentos' | 'financeiro' | 'boletim'

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('cursos')
  const [courses, setCourses] = useState<Course[]>([])
  const [documents, setDocuments] = useState<Documento[]>([])
  const [payments, setPayments] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [selectedLessonType, setSelectedLessonType] = useState<'video' | 'atividade'>('video')
  const [atividades, setAtividades] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [availableNucleos, setAvailableNucleos] = useState<any[]>([])
  const [linkingNucleo, setLinkingNucleo] = useState(false)
  const [pixConfig, setPixConfig] = useState<{ key: string, qr: string }>({ key: '', qr: '' })
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [showArchives, setShowArchives] = useState<Record<string, boolean>>({})
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (profile) {
      if (activeTab === 'documentos') fetchDocuments()
      if (activeTab === 'financeiro') fetchPayments()
      if (activeTab === 'boletim') fetchBoletim()
    }
  }, [activeTab, profile])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*, nucleos(nome)')
        .eq('id', user.id)
        .single()
      
      if (error) {
        setLoading(false)
        return
      }

      setProfile(profileData)
      
      const isStaff = ['admin', 'professor', 'suporte'].includes(profileData.tipo || '');
      const exemptStatus = profileData.bolsista || isStaff;

      let releasedCount = 999;

      if (!exemptStatus) {
        const { data: payRecords } = await supabase
          .from('pagamentos')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'pago')
        releasedCount = (payRecords?.length || 0) + 1;
      }

      // Check for multiple roles
      const roles = profileData.caminhos_acesso || []
      if (user.email === 'edi.ben.jr@gmail.com') {
        if (!roles.includes('aluno')) roles.push('aluno')
        if (!roles.includes('professor')) roles.push('professor')
        if (!roles.includes('suporte')) roles.push('suporte')
      }
      if (roles.length > 1) setAvailableRoles(roles)

      // Fetch Courses
      let mappedCourses: Course[] = [];

      if (isStaff) {
        // Staff sees everything
        const { data: allCourses } = await supabase
          .from('cursos')
          .select(`
            id,
            nome,
            livros (
              id,
              titulo,
              capa_url,
              pdf_url,
              ordem,
              aulas (
                id,
                titulo,
                tipo
              )
            )
          `)
        
        if (allCourses) {
          mappedCourses = allCourses.map((c: any) => ({
            id: c.id,
            nome: c.nome,
            livros: (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((l: any) => ({
              ...l,
              progresso: 100, 
              isReleased: true,
              isCurrent: false
            }))
          }))
        }
      } else {
        // Students see only their enrollments
        const { data: enrollments } = await supabase
          .from('matriculas')
          .select(`
            curso_id,
            cursos (
              id,
              nome,
              livros (
                id,
                titulo,
                capa_url,
                pdf_url,
                ordem,
                aulas (
                  id,
                  titulo,
                  tipo
                )
              )
            )
          `)
        
        if (enrollments && enrollments.length > 0) {
          mappedCourses = enrollments.map((e: any) => {
            const allLivros = e.cursos.livros || [];
            const sortedLivros = [...allLivros].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
            
            return {
              id: e.cursos.id,
              nome: e.cursos.nome,
              livros: sortedLivros.map((l: any) => ({
                ...l,
                progresso: 0, 
                isReleased: exemptStatus || (l.ordem || 1) <= releasedCount,
                isCurrent: !exemptStatus && (l.ordem || 1) === releasedCount
              }))
            }
          })
        }
      }
      
      if (mappedCourses.length > 0) {
        setCourses(mappedCourses)
      } else {
        // Fallback mock with valid UUIDs
        setCourses([
          {
            id: '00000000-0000-0000-0000-000000000001',
            nome: 'Curso Teológico Básico',
            livros: Array.from({ length: 5 }, (_, i) => ({
              id: `00000000-0000-0000-0000-00000000001${i+1}`,
              titulo: `Módulo ${i + 1}: Introdução`,
              ordem: i + 1,
              progresso: 0,
              isReleased: i === 0,
              isCurrent: i === 0,
              aulas: [
                { id: `a${i}-1`, titulo: 'Introdução ao Tema', tipo: 'gravada', concluida: false },
                { id: `a${i}-2`, titulo: 'Aula Magna', tipo: 'ao_vivo', concluida: false },
              ]
            }))
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    if (!profile) return
    const { data } = await supabase.from('documentos').select('*').eq('user_id', profile.id)
    if (data) setDocuments(data)
  }

  const fetchPayments = async () => {
    if (!profile) return
    const { data } = await supabase.from('pagamentos').select('*').eq('user_id', profile.id).order('data_vencimento', { ascending: false })
    if (data && data.length > 0) setPayments(data)
    else {
      setPayments([
        { id: 'p1', valor: 70.00, status: 'aberto', data_vencimento: '2025-04-10' },
        { id: 'p2', valor: 70.00, status: 'pago', data_vencimento: '2025-03-10', comprovante_url: '#' },
      ])
    }

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

    // Fetch user answers/grades for activities and exams ALWAYS
    const { data: respostasData } = await supabase
      .from('respostas_aulas')
      .select('id, status, nota, tentativas, primeira_correcao_at, aulas(titulo, tipo)')
      .eq('aluno_id', profile.id)
      .order('created_at', { ascending: false })

    if (respostasData) {
      setAtividades(respostasData)
    }
  }

  const handleChangeNucleo = async (nucleoId: string) => {
    if (!nucleoId || !profile) return
    setLinkingNucleo(true)
    try {
      const { error } = await supabase.rpc('update_user_nucleo', { p_nucleo_id: nucleoId })
      if (error) throw error
      showToast('Núcleo atualizado!')
      fetchUserData()
    } catch(err: any) {
      showToast(err.message, 'error')
    } finally {
      setLinkingNucleo(false)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': case 'pago': return <CheckCircle2 size={18} color="var(--success)" />
      case 'rejeitado': case 'atrasado': return <XCircle size={18} color="var(--error)" />
      case 'pendente': return <History size={18} color="var(--primary)" />
      default: return <AlertCircle size={18} color="var(--text-muted)" />
    }
  }

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando...</div>

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
          <button onClick={handleLogout} className="btn btn-outline">Sair</button>
        </div>
      </div>
    )
  }

  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '');
  const isExempt = profile?.bolsista || isStaff;

  return (
    <div className="admin-layout">
      <Link to="/" className="back-nav-btn">
        <ChevronLeft size={18} /> Voltar à Home
      </Link>
      
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

      {/* Sidebar Unificada */}
      <aside className="admin-sidebar" style={{ paddingTop: '5rem' }}>
        <div className="logo-section" style={{ padding: '0 1.25rem', marginBottom: '1rem', flex: 1 }}>
          <div>
            <GraduationCap size={40} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem' }}>Portal do Aluno</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{profile?.email}</p>
          </div>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className={isMobileMenuOpen ? 'mobile-open' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Role Switcher */}
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

          {/* Abas Migradas */}
          {(['cursos', 'documentos', 'financeiro', 'boletim'] as Tab[]).map(t => (
            <div 
              key={t} 
              className={`admin-nav-item ${activeTab === t ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab(t);
                setIsMobileMenuOpen(false);
              }}
            >
              {t === 'cursos' && <BookOpen size={20} />}
              {t === 'documentos' && <FileText size={20} />}
              {t === 'financeiro' && <CreditCard size={20} />}
              {t === 'boletim' && <Award size={20} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}

          {/* Rodapé da Sidebar */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            {isTemp && <div className="admin-nav-item" style={{ color: 'var(--error)' }}><AlertCircle size={20} />{daysRemaining} dias restantes</div>}
            <div className="admin-nav-item" style={{ color: 'var(--error)' }} onClick={handleLogout}>
              <LogOut size={20} /> Sair
            </div>
          </div>
        </nav>
      </aside>

      {/* Conteúdo Principal Unificado */}
      <main className="admin-main" style={{ paddingTop: '5rem' }}>
        <header className="mobile-col-flex" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {activeTab === 'cursos' && 'Meus Cursos'}
              {activeTab === 'documentos' && 'Meus Documentos'}
              {activeTab === 'financeiro' && 'Financeiro e Matrícula'}
              {activeTab === 'boletim' && 'Boletim de Notas'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, Aluno.</p>
          </div>
        </header>

        <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
        {activeTab === 'cursos' && (
          <div className="courses-grid">
            {courses.map(course => {
              const currentBook = course.livros.find(l => l.isCurrent) || course.livros.find(l => l.isReleased)
              const pastBooks = course.livros.filter(l => l.isReleased && l.id !== currentBook?.id)
              const isOpen = showArchives[course.id]

              return (
                <div key={course.id}>
                  <h3 style={{ marginBottom: '2rem' }}>{course.nome}</h3>
                  {currentBook && (
                    <div className="book-highlight-card">
                      <div onClick={() => navigate(`/book/${currentBook.id}`)} className="book-cover" style={{ background: currentBook.capa_url ? `url(${currentBook.capa_url}) center/cover` : 'var(--glass-border)' }}></div>
                      <div>
                        <h2>{currentBook.titulo}</h2>
                        <div className="book-actions">
                          <button onClick={() => navigate(`/book/${currentBook.id}`)} className="btn btn-primary">
                            <BookOpen size={20} /> Ler Livro
                          </button>
                          <button onClick={() => { setSelectedLessonType('video'); setSelectedBook(selectedBook === currentBook.id && selectedLessonType === 'video' ? null : currentBook.id) }} className="btn btn-outline">
                            <PlayCircle size={20} /> Vídeos
                          </button>
                          <button onClick={() => { setSelectedLessonType('atividade'); setSelectedBook(selectedBook === currentBook.id && selectedLessonType === 'atividade' ? null : currentBook.id) }} className="btn btn-outline">
                            <ClipboardList size={20} /> Atividades
                          </button>
                        </div>
                        {selectedBook === currentBook.id && (
                          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {currentBook.aulas.filter(a => selectedLessonType === 'video' ? (a.tipo === 'gravada' || a.tipo === 'ao_vivo') : (a.tipo === 'atividade' || a.tipo === 'prova')).map(a => {
                               const bookActivities = currentBook.aulas.filter(al => al.tipo === 'atividade');
                               const submittedIds = atividades.map((at: any) => at.aula_id);
                               const isLocked = a.tipo === 'prova' && bookActivities.some(bal => !submittedIds.includes(bal.id));
                               
                               return (
                                 <div 
                                   key={a.id} 
                                   onClick={() => !isLocked && navigate(`/lesson/${a.id}`)} 
                                   style={{ 
                                     padding: '0.75rem 1rem', 
                                     background: isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.02)', 
                                     borderRadius: '8px', 
                                     cursor: isLocked ? 'not-allowed' : 'pointer', 
                                     display: 'flex', 
                                     justifyContent: 'space-between',
                                     alignItems: 'center', 
                                     gap: '0.75rem', 
                                     border: '1px solid rgba(255,255,255,0.05)',
                                     opacity: isLocked ? 0.6 : 1
                                   }} 
                                   className="lesson-link-card"
                                 >
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                     {a.tipo === 'prova' ? <Award size={18} color="#EAB308" /> : a.tipo === 'atividade' ? <ClipboardList size={18} color="var(--success)" /> : <PlayCircle size={18} color="var(--primary)" />} 
                                     <span style={{ fontWeight: 500 }}>{a.titulo}</span>
                                   </div>
                                   {isLocked && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--error)', fontSize: '0.7rem' }}>
                                     <Lock size={14} /> <span>Bloqueada</span>
                                   </div>}
                                 </div>
                               );
                             })}
                            {currentBook.aulas.filter(a => selectedLessonType === 'video' ? (a.tipo === 'gravada' || a.tipo === 'ao_vivo') : (a.tipo === 'atividade' || a.tipo === 'prova')).length === 0 && (
                               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem' }}>Nenhum item de {selectedLessonType === 'video' ? 'vídeo' : 'atividade'} disponível ainda.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {pastBooks.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                      <button onClick={() => setShowArchives({...showArchives, [course.id]: !isOpen})} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                        <History size={16} /> {isOpen ? 'Esconder anteriores' : 'Ver anteriores'}
                      </button>
                      {isOpen && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {pastBooks.map(b => (
                            <div key={b.id} onClick={() => navigate(`/book/${b.id}`)} style={{ cursor: 'pointer', padding: '1rem', background: 'var(--glass)', borderRadius: '12px' }}>{b.titulo}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="data-card">
            <h3>Documentos</h3>
            {['rg', 'residencia', 'exame'].map(t => {
              const d = documents.find(doc => doc.tipo === t)
              return (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                  <span>{t.toUpperCase()}</span>
                  <input type="file" onChange={(e) => handleFileUpload(e, 'doc', undefined, t)} />
                  {d && <span>{d.status}</span>}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="data-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CreditCard /> Financeiro e Mensalidades</h3>
            
            {isExempt ? (
              <div style={{ padding: '2rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)', textAlign: 'center' }}>
                <CheckCircle2 color="var(--success)" size={32} style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--success)' }}>Você possui isenção ou gratuidade ativa.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Nenhum pagamento é necessário no momento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Pix Payment Info */}
                {(pixConfig.key || pixConfig.qr) && (
                  <div style={{ padding: '1.5rem', background: 'var(--glass)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>Pagamento via PIX</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Utilize a chave abaixo ou o QR Code ao lado para realizar o pagamento. Após concluir, anexe o comprovante na mensalidade correspondente abaixo.</p>
                        
                        {pixConfig.key && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <code style={{ fontSize: '1rem', color: '#fff', letterSpacing: '1px' }}>{pixConfig.key}</code>
                            <button 
                              className="btn btn-outline" 
                              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                navigator.clipboard.writeText(pixConfig.key);
                                showToast('Chave PIX copiada!');
                              }}
                            >Copiar Chave</button>
                          </div>
                        )}
                      </div>
                      
                      {pixConfig.qr && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '12px', width: '130px', height: '130px', margin: '0 auto 0.5rem' }}>
                            <img src={pixConfig.qr} alt="QR Code PIX" style={{ width: '100%', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>QR Code do Polo</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', opacity: 0.8 }}>Minhas Mensalidades</h4>
                  {payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {p.status === 'pago' ? <CheckCircle2 color="var(--success)" size={20} /> : <AlertCircle color="#EAB308" size={20} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>R$ {p.valor.toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vencimento: {new Date(p.data_vencimento).toLocaleDateString()}</div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        {p.status === 'pago' ? (
                          <div className="status-badge status-approved">Pago</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="status-badge status-pending" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.2)' }}>Em Aberto</div>
                            <label className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Upload size={14} /> {uploading === p.id ? 'Enviando...' : 'Anexar Comprovante'}
                              <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pay', p.id)} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma mensalidade registrada até o momento.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'boletim' && (
          <div className="data-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Award color="var(--primary)" /> Notas e Atividades</h3>
            
            {!profile?.nucleo_id && (
              <div style={{ padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)', marginBottom: '2rem' }}>
                <p style={{ color: '#EAB308', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Você ainda não vinculou seu acesso a um Polo Educacional (Núcleo). Por favor, escolha um abaixo:</p>
                <select className="form-control" onChange={(e) => handleChangeNucleo(e.target.value)}>
                  <option value="">Escolha seu núcleo...</option>
                  {availableNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                </select>
              </div>
            )}

            {profile?.nucleo_id && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Seu Polo Vinculado: <strong style={{ color: '#fff' }}>{profile.nucleos?.nome}</strong></p>
            )}
                
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {atividades.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.aulas?.titulo || 'Atividade Excluída'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {a.aulas?.tipo === 'prova' ? 'Prova' : 'Atividade'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {a.status === 'pendente' ? (
                      <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader2 size={16} className="spinner" /> Em Correção
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: a.nota >= 7 ? 'var(--success)' : a.nota !== null ? 'var(--error)' : '#fff' }}>
                          {a.nota !== null ? a.nota.toFixed(1) : 'Concluída'}
                        </div>
                        {a.aulas?.tipo === 'prova' && a.nota !== null && a.nota < 7 && a.tentativas < 3 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                            {3 - a.tentativas} tentativas restantes
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {atividades.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Você ainda não concluiu nenhuma atividade ou prova.</p>
              )}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
