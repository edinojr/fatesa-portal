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
  LayoutDashboard,
  ChevronLeft,
  Menu,
  X,
  Bell,
  MessageSquare
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Course, Documento, Pagamento } from '../types/dashboard'
import CourseList from '../components/dashboard/CourseList'
import DocumentUpload from '../components/dashboard/DocumentUpload'
import FinancePanel from '../components/dashboard/FinancePanel'
import GradesPanel from '../components/dashboard/GradesPanel'
import NoticeBoard from '../components/dashboard/NoticeBoard'
import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'
import ForumPanel from '../components/forum/ForumPanel'

type Tab = 'cursos' | 'avisos' | 'documentos' | 'financeiro' | 'boletim' | 'forum'

const Dashboard = () => {
  const { profile, loading: profileLoading, signOut } = useProfile();
  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
  const isRestricted = ['super_visitante', 'ex_aluno', 'colaborador'].includes(profile?.tipo || '');
  
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
  const [poloAtividades, setPoloAtividades] = useState<any[]>([])
  const [isBlocked, setIsBlocked] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading && profile) {
      fetchDashboardData();
      if (profile.bloqueado) setActiveTab('financeiro');
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

      // Check if student is blocked
      if (profile.bloqueado && !isStaff) {
        setIsBlocked(true);
        setLoading(false);
        return;
      }
      
      if (profile.nucleo_id) {
        fetchNoticeBoard(profile.nucleo_id);
      }

      // Check if user's nucleus is fully exempt (e.g. Epístolas aos Hebreus)
      let nucleoIsento = false;
      if (profile.nucleo_id) {
        const { data: nucData } = await supabase
          .from('nucleos')
          .select('isento')
          .eq('id', profile.nucleo_id)
          .single();
        nucleoIsento = !!nucData?.isento;
      }

      const exemptStatus = profile.bolsista || isStaff || nucleoIsento;

      let releasedCount = 1;
      
      // Fetch all books for this course to calculate progression
      const { data: courseBooks } = await supabase
        .from('livros')
        .select('id, ordem')
        .eq('curso_id', profile.curso_id || '')
        .order('ordem', { ascending: true });

      if (exemptStatus) {
        releasedCount = 999;
      } else {
        const { data: payRecords } = await supabase
          .from('pagamentos')
          .select('status')
          .eq('user_id', profile.id)
          .eq('status', 'pago');
        
        const paidCount = payRecords?.length || 0;
        
        const { data: examSubmissions } = await supabase
          .from('respostas_aulas')
          .select('aula_id, status, nota, aulas(livro_id)')
          .eq('aluno_id', profile.id)
          .gte('nota', 7);
        
        const submittedBookIds = new Set((examSubmissions || []).map(s => (s.aulas as any)?.livro_id).filter(id => !!id));
        
        // The released count is the highest 'ordem' that has a submission + 1
        let maxSubmittedOrdem = 0;
        if (courseBooks) {
          courseBooks.forEach(b => {
            if (submittedBookIds.has(b.id) && b.ordem > maxSubmittedOrdem) {
              maxSubmittedOrdem = b.ordem;
            }
          });
        }

        // Logic combines payments OR exam submission (whichever is higher)
        releasedCount = Math.max(paidCount + 1, maxSubmittedOrdem + 1);

        // Check if we need to initiate a new payment record...
        const { data: openPays } = await supabase
          .from('pagamentos')
          .select('id')
          .eq('user_id', profile.id)
          .eq('status', 'aberto');

        if ((openPays?.length || 0) === 0) {
          await supabase.from('pagamentos').insert({
            user_id: profile.id,
            valor: 70,
            status: 'aberto',
            data_vencimento: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
            descricao: `Mensalidade Módulo ${releasedCount}`
          });
        }
      }

      // Check for multiple roles
      const roles = profile.caminhos_acesso || []
      
      if (profile.email === 'edi.ben.jr@gmail.com') {
        if (!roles.includes('aluno')) roles.push('aluno')
        if (!roles.includes('professor')) roles.push('professor')
        if (!roles.includes('suporte')) roles.push('suporte')
      }
      if (roles.length > 1) setAvailableRoles(roles)

      // Fetch Releases for this Nucleo
      const { data: releases } = await supabase
        .from('liberacoes_nucleo')
        .select('item_id, item_type')
        .eq('nucleo_id', profile.nucleo_id)
        .eq('liberado', true);

      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);

      // Fetch Grades and Progress FIRST so we can use them to unlock/lock block videos
      const [{ data: respostasData }, { data: progData }] = await Promise.all([
        supabase
          .from('respostas_aulas')
          .select('id, status, nota, tentativas, primeira_correcao_at, created_at, aula_id, aulas(id, titulo, tipo, versao, livro_id)')
          .eq('aluno_id', profile.id),
        supabase
          .from('progresso')
          .select('aula_id, concluida')
          .eq('aluno_id', profile.id)
      ]);
      
      const resData = respostasData || [];
      const pData = progData || [];
      setAtividades(resData as any);
      setProgressoAulas(pData as any);

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
            aulas (*)
          )
        `);
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => {
              const professorReleased = isStaff || releasedModulos.includes(l.id);
              const isCurrent = !isStaff && !exemptStatus && (l.ordem || 1) === releasedCount;

              // Helper for modular block logic
              // A failed exam (3 attempts) only unlocks if ALL SUBSEQUENT modules are finished
              const isExamBlockedByFailure = (aulaId: string) => {
                const sub = resData.find(r => r.aula_id === aulaId);
                if (!sub || !(sub as any).bloqueio_final) return false;
                
                // Check if all books with higher ordem are finished
                if (!courseBooks) return true;
                const higherOrdemBooks = courseBooks.filter(b => b.ordem > (l.ordem || 0));
                if (higherOrdemBooks.length === 0) return false; // No subsequent books

                return !higherOrdemBooks.every(b => {
                  // A book is "finished" if its final exam has a passing grade (>= 7)
                  const bookExamSub = resData.find(r => (r.aulas as any)?.livro_id === b.id && (r.aulas as any)?.tipo === 'prova');
                  return bookExamSub && (bookExamSub.nota || 0) >= 7;
                });
              };

              return {
                ...l,
                aulas: (l.aulas || []).filter((a: any) => {
                  if (isStaff) return true;
                  
                  // Filter by Nucleo assignment first
                  const matchesNucleo = !a.nucleo_id || a.nucleo_id === profile?.nucleo_id;
                  if (!matchesNucleo) return false;

                  // Blocked by failure logic
                  if (a.tipo === 'prova' && isExamBlockedByFailure(a.id)) return false;

                  // Restriction for external/ex-students/colleagues: ONLY video-aulas
                  if (isRestricted) {
                    return a.tipo === 'gravada' || a.tipo === 'ao_vivo';
                  }

                  // Structural items (licao containers) always show if module is released
                  if (a.tipo === 'licao') return professorReleased;

                  // Exercises and Provas require explicit release by professor
                  const isExercise = a.tipo === 'atividade' || a.tipo === 'prova';
                  if (isExercise) {
                    if (a.tipo === 'prova') {
                      // Check if student already PASSED any version of this book's exam
                      const anyPassed = resData.some(r => 
                        (r.aulas as any).livro_id === l.id && 
                        (r.aulas as any).tipo === 'prova' && 
                        (r.nota || 0) >= 7
                      );
                      if (anyPassed) return false;

                      // V1, V2, V3 Logic
                      const v = a.versao || 1;
                      if (v === 1) return releasedAtividades.includes(a.id);
                      
                      // For V2 and V3, we check the V1 submission
                      const v1Sub = resData.find(r => (r.aulas as any).livro_id === l.id && (r.aulas as any).versao === 1);
                      if (!v1Sub) return false;
                      
                      const v1Date = new Date(v1Sub.created_at || v1Sub.primeira_correcao_at).getTime();
                      const now = Date.now();
                      const diffDays = Math.floor((now - v1Date) / (1000 * 3600 * 24));
                      
                      // 30-day absolute limit
                      if (diffDays > 30) return false;

                      if (v === 2) {
                        return (v1Sub.nota < 7) && (diffDays >= 7);
                      }
                      
                      if (v === 3) {
                        const v2Sub = resData.find(r => (r.aulas as any).livro_id === l.id && (r.aulas as any).versao === 2);
                        return v2Sub && (v2Sub.nota < 7) && (diffDays >= 21);
                      }
                    }
                    return releasedAtividades.includes(a.id);
                  }

                  // Video Aulas with bloco_id: strict auto-unlock logic (All students)
                  if ((a.tipo === 'gravada' || a.tipo === 'ao_vivo') && a.bloco_id) {
                    if (isStaff) return true;
                    if (!professorReleased) return false;
                    // For Modular mode, we allow video access even if exercises are not finished
                    // but we still follow the professor release.
                    return true;
                  }

                  // Other items (material, video without block) release automatically when module is released
                  return professorReleased;
                }),
                progresso: isStaff ? 100 : 0, 
                isReleased: (isStaff || exemptStatus || (l.ordem || 1) <= releasedCount) && professorReleased,
                isCurrent: isCurrent && professorReleased
              };
            })
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

      const { data: atvData } = await supabase
        .from('atividades')
        .select('*, respostas_atividades_extra(id, status, nota)')
        .eq('nucleo_id', nucleoId)
        .order('created_at', { ascending: false });
      setPoloAtividades(atvData || []);
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

  if (isExpired && !isStaff) {
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

  const isExempt = profile?.bolsista || isStaff;

  return (
    <div className="admin-layout">

      {/* Floating Menu Toggle Button */}
      <button className="floating-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu Backdrop */}
      {isMobileMenuOpen && (
        <div className="menu-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

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
          {availableRoles.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button 
                className="admin-nav-item" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.5rem' }}
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={16} /> Alternar
              </button>
              {showRoleSwitcher && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '180px' }}>
                  {availableRoles.filter(r => r !== 'aluno').map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => {
                        navigate(r === 'professor' ? '/professor' : '/admin');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {r === 'professor' ? 'Portal do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(['cursos', 'forum', 'avisos', 'documentos', 'financeiro', 'boletim'] as Tab[])
            .filter(t => {
              if (isRestricted) return ['cursos', 'forum', 'avisos'].includes(t);
              return isStaff ? t !== 'financeiro' : true;
            })
            .map(t => {
              const isDisabledForBlocked = isBlocked && t !== 'financeiro';
              return (
                <div
                  key={t}
                  className={`admin-nav-item ${activeTab === t ? 'active' : ''} ${isDisabledForBlocked ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isDisabledForBlocked) return;
                    setActiveTab(t);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ opacity: isDisabledForBlocked ? 0.35 : 1, cursor: isDisabledForBlocked ? 'not-allowed' : 'pointer' }}
                >
                  {t === 'cursos' && <BookOpen size={20} />}
                  {t === 'forum' && <MessageSquare size={20} />}
                  {t === 'avisos' && <Bell size={20} />}
                  {t === 'documentos' && <FileText size={20} />}
                  {t === 'financeiro' && <CreditCard size={20} />}
                  {t === 'boletim' && <Award size={20} />}
                  <span>{t === 'avisos' ? 'Avisos' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </div>
              );
            })}

          <div style={{ marginLeft: 'auto', paddingLeft: '0.5rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)', border: 'none', background: 'transparent' }} onClick={() => signOut()}>
              <LogOut size={18} />
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
              {activeTab === 'financeiro' && 'Financeiro e Matrícula'}
              {activeTab === 'boletim' && 'Boletim de Notas'}
              {activeTab === 'forum' && 'Fórum da Comunidade'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, Aluno.</p>
          </div>
        </header>

        <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
          {isBlocked && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.5rem',
              background: 'rgba(255, 77, 77, 0.1)',
              border: '1px solid var(--error)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertCircle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ color: 'var(--error)' }}>Acesso suspenso pelo administrador.</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  Seu acesso aos cursos e materiais está restrito. Regularize seu pagamento abaixo para reativar todos os recursos.
                </p>
              </div>
            </div>
          )}

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
              atividades={poloAtividades}
              onRefresh={() => profile?.nucleo_id && fetchNoticeBoard(profile.nucleo_id)}
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

          {activeTab === 'forum' && (
            <ForumPanel userProfile={profile} />
          )}
        </div>

        <div className="bottom-nav-footer">
          <button onClick={() => navigate(-1)} className="btn btn-outline">
            <ChevronLeft size={20} /> Voltar
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            <LayoutDashboard size={20} /> Início
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
