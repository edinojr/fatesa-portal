import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  BookOpen, 
  Upload, 
  FileText, 
  Settings, 
  MoreVertical, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Eye, 
  Award,
  Loader2, 
  CreditCard, 
  GraduationCap,
  ChevronRight,
  PlayCircle,
  LogOut,
  ChevronLeft,
  LayoutDashboard,
  X,
  ClipboardList
} from 'lucide-react'
import NucleosPanel from '../components/NucleosPanel'

export type QuestionType = 'multiple_choice' | 'true_false' | 'matching' | 'discursive';

export interface QuizQuestion {
  id: string; // unique key
  type: QuestionType;
  text: string;
  // Multiple Choice Specific
  options?: string[];
  correct?: number;
  // True False Specific
  isTrue?: boolean;
  // Matching Specific
  matchingPairs?: { left: string; right: string }[];
  // Discursive Specific
  expectedAnswer?: string;
}

type Tab = 'home' | 'users' | 'content' | 'validation' | 'nucleos' | 'settings' | 'finance'


const Admin = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [pendingDocs, setPendingDocs] = useState<any[]>([])
  const [pendingPays, setPendingPays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [newTeacherEmail, setNewTeacherEmail] = useState('')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  
  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  // CMS States
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState(false)
  
  const [allNucleos, setAllNucleos] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<{ type: 'course' | 'book' | 'lesson', data: any } | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [addingLessonType, setAddingLessonType] = useState<string>('gravada')
  const [editingLessonContent, setEditingLessonContent] = useState<any | null>(null)
  const [lessonBlocks, setLessonBlocks] = useState<any[]>([])
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([])
  
  // Settings States
  const [pixKey, setPixKey] = useState('')
  const [pixQrUrl, setPixQrUrl] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewingBook, setViewingBook] = useState<any | null>(null)
  
  const navigate = useNavigate()

  useEffect(() => {
    checkAccess()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchData()
      if (userRole === 'admin') fetchNucleosGlobal()
    }
  }, [activeTab, userRole])

  const fetchNucleosGlobal = async () => {
    const { data } = await supabase.from('nucleos').select('*')
    if (data) setAllNucleos(data)
  }

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }
    setCurrentUserEmail(user.email ?? null)

    const { data: profile } = await supabase
      .from('users')
      .select('tipo, caminhos_acesso')
      .eq('id', user.id)
      .single()

    const roles = profile?.caminhos_acesso || []
    if (user.email === 'edi.ben.jr@gmail.com') {
      if (!roles.includes('aluno')) roles.push('aluno')
      if (!roles.includes('professor')) roles.push('professor')
      if (!roles.includes('suporte')) roles.push('suporte')
    }
    setAvailableRoles(roles)

    const hasAdminAccess = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || roles.includes('admin') || roles.includes('suporte') || user.email === 'edi.ben.jr@gmail.com'

    if (!hasAdminAccess) {
      alert('Acesso restrito ao painel administrativo.')
      navigate('/dashboard')
      return
    }

    setUserRole(profile?.tipo || (roles.includes('admin') ? 'admin' : 'suporte'))

    if (profile?.tipo === 'professor') {
      setActiveTab('content')
    } else {
      setActiveTab('home')
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const normalizeFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w.-]/g, '_') // Replace non-word chars (except . and -) with _
      .replace(/\s+/g, '_'); // Replace spaces with _
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(id)
    try {
      const bucket = table === 'livros' ? 'documentos' : 'comprovantes'
      const safeName = normalizeFileName(file.name)
      const filePath = `${table}/${id}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      const { error: updateError } = await supabase.from(table).update({ [column]: publicUrl }).eq('id', id)
      if (updateError) throw updateError

      showToast('Arquivo enviado com sucesso!')
      if (table === 'livros') fetchBooks(selectedCourse.id)
      else if (selectedBook) fetchLessons(selectedBook.id)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploading(null)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'users') {
        const { data } = await supabase.from('users').select('*, nucleos(nome)')
        if (data) setUsers(data)
      } else if (activeTab === 'content') {
        const { data } = await supabase.from('cursos').select('*, livros(count)')
        if (data) setCourses(data)
      } else if (activeTab === 'validation') {
        const { data: docs } = await supabase
          .from('documentos')
          .select('*, users(nome, email)')
          .eq('status', 'pendente')
        const { data: pays } = await supabase
          .from('pagamentos')
          .select('*, users(nome, email)')
          .eq('status', 'pago') 
        
        if (docs) setPendingDocs(docs)
        if (pays) setPendingPays(pays)
      } else if (activeTab === 'settings' && userRole === 'admin') {
        const { data } = await supabase.from('configuracoes').select('*');
        if (data) {
          data.forEach(item => {
            if (item.chave === 'pix_key') setPixKey(item.valor);
            if (item.chave === 'pix_qr_url') setPixQrUrl(item.valor);
          });
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBooks = async (courseId: string) => {
    const { data } = await supabase.from('livros').select('*').eq('curso_id', courseId).order('ordem')
    if (data) setBooks(data)
  }

  const fetchLessons = async (bookId: string) => {
    const { data } = await supabase.from('aulas').select('*').eq('livro_id', bookId).order('created_at')
    if (data) setLessons(data)
  }

  const handleDelete = async (table: 'cursos' | 'livros' | 'aulas', id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item? Esta ação é irreversível.')) return
    
    setActionLoading(id)
    const { error } = await supabase.from(table).delete().eq('id', id)
    
    if (error) showToast(error.message, 'error')
    else {
      showToast('Excluído com sucesso!')
      if (table === 'cursos') fetchData()
      else if (table === 'livros') fetchBooks(selectedCourse.id)
      else fetchLessons(selectedBook.id)
    }
    setActionLoading(null)
  }

  const handleValidar = async (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado') => {
    const feedback = status === 'rejeitado' ? prompt('Motivo da rejeição:') : null
    if (status === 'rejeitado' && !feedback) return

    setActionLoading(id)
    try {
      const table = target === 'doc' ? 'documentos' : 'pagamentos'
      const { error } = await supabase
        .from(table)
        .update({ 
          status: status === 'aprovado' ? (target === 'doc' ? 'aprovado' : 'pago') : 'rejeitado',
          feedback 
        })
        .eq('id', id)

      if (error) throw error
      showToast(`${target === 'doc' ? 'Documento' : 'Pagamento'} ${status} com sucesso!`)
      fetchData()
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTypeChange = async (userId: string, newType: string) => {
    if (userRole !== 'admin') {
      alert('Apenas administradores podem alterar tipos de usuário.')
      return
    }
    await supabase.from('users').update({ tipo: newType }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, tipo: newType } : u))
  }

  const handleApproveAccess = async (userId: string) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ acesso_definitivo: true })
        .eq('id', userId)
      
      if (error) throw error
      setUsers(users.map(u => u.id === userId ? { ...u, acesso_definitivo: true } : u))
      showToast('Acesso definitivo concedido com sucesso!')
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ bloqueado: !currentStatus })
        .eq('id', userId)
      
      if (error) throw error
      setUsers(users.map(u => u.id === userId ? { ...u, bloqueado: !currentStatus } : u))
      showToast(`Usuário ${!currentStatus ? 'bloqueado' : 'desbloqueado'} com sucesso!`)
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleGratuidade = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ bolsista: !currentStatus })
        .eq('id', userId)
      
      if (error) throw error
      setUsers(users.map(u => u.id === userId ? { ...u, bolsista: !currentStatus } : u))
      showToast(`Gratuidade ${!currentStatus ? 'ativada' : 'revogada'} com sucesso!`)
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateUserNucleo = async (userId: string, nucleoId: string) => {
    try {
      const { error } = await supabase.from('users').update({ nucleo_id: nucleoId || null }).eq('id', userId)
      if (error) throw error
      setUsers(users.map(u => u.id === userId ? { ...u, nucleo_id: nucleoId || null } : u))
    } catch(err: any) {
      alert('Erro: ' + err.message)
    }
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('add-teacher')
    try {
      const { error } = await supabase
        .from('professores_autorizados')
        .insert({
          email: newTeacherEmail
        })
      
      if (error) throw error
      showToast('E-mail de professor autorizado! Ele poderá realizar o cadastro normalmente e será reconhecido como Professor.')
      setShowAddTeacher(false)
      setNewTeacherEmail('')
      fetchData()
    } catch (err: any) {
      showToast('Erro ao autorizar professor: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-settings');
    try {
      await supabase.from('configuracoes').upsert({ chave: 'pix_key', valor: pixKey });
      showToast('Configuração salva!');
    } catch(err:any) {
      showToast('Erro: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const handleUploadQrCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading('save-settings');
    try {
      const ext = file.name.split('.').pop();
      const safeName = normalizeFileName(file.name.replace(`.${ext}`, ''));
      const fileName = `qrcode_${Date.now()}_${safeName}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('livros').upload(`assets/${fileName}`, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(`assets/${fileName}`);
      
      await supabase.from('configuracoes').upsert({ chave: 'pix_qr_url', valor: publicUrl });
      setPixQrUrl(publicUrl);
      showToast('QR Code atualizado com sucesso!');
    } catch(err:any) {
      showToast('Erro ao fazer upload do QR Code: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="admin-layout">
      <Link to="/" className="back-nav-btn">
        <ChevronLeft size={18} /> Voltar à Home
      </Link>

      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ paddingTop: '5rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>Fatesa Admin</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>{userRole}</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Role Switcher */}
          {availableRoles.length > 1 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', gap: '0.5rem', background: 'var(--glass)' }}
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={16} /> Alternar Painel
              </button>
              {showRoleSwitcher && (
                <div style={{ marginTop: '0.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {availableRoles.filter(r => r !== userRole).map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => navigate(r === 'aluno' ? '/dashboard' : r === 'professor' ? '/professor' : '/admin')}
                    >
                      {r === 'aluno' ? 'Portal do Aluno' : r === 'professor' ? 'Painel do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              Voltar
            </button>
            <button onClick={() => navigate('/admin')} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              Início
            </button>
          </div>
          
          {userRole !== 'aluno' && (
            <div className={`admin-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
              <LayoutDashboard size={20} /> Painel Inicial
            </div>
          )}

          {userRole === 'admin' && (
            <div className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={20} /> Usuários
            </div>
          )}
          {(userRole === 'admin' || userRole === 'professor' || userRole === 'suporte') && (
            <div className={`admin-nav-item ${activeTab === 'nucleos' ? 'active' : ''}`} onClick={() => setActiveTab('nucleos')}>
              <GraduationCap size={20} /> {userRole === 'admin' || userRole === 'suporte' ? 'Todos os Núcleos' : 'Minhas Turmas'}
            </div>
          )}
          <div className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            <BookOpen size={20} /> Conteúdo
          </div>
          <div className={`admin-nav-item ${activeTab === 'validation' ? 'active' : ''}`} onClick={() => setActiveTab('validation')}>
            <ShieldCheck size={20} /> Validação
            {(pendingDocs.length + pendingPays.length) > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--error)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingDocs.length + pendingPays.length}
              </span>
            )}
          </div>
          {userRole === 'admin' && (
            <div className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={20} /> Configurações
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="mobile-col-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <GraduationCap size={48} color="var(--primary)" />
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {activeTab === 'home' ? 'Painel de Suporte' : activeTab === 'users' ? 'Gestão de Usuários' : activeTab === 'content' ? 'Gestão de Conteúdo' : 'Validação de Acesso'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                {activeTab === 'home' ? 'Visão geral do sistema e atalhos rápidos.' : activeTab === 'users' ? 'Administre os perfis, bloqueios e acessos.' : activeTab === 'content' ? 'Gerencie as matérias, livros e atividades.' : 'Verifique envios dos alunos.'}
              </p>
            </div>
          </div>
          
          <div className="mobile-wrap-flex" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
            {activeTab === 'users' && (
              <button className="btn btn-primary" onClick={() => setShowAddTeacher(true)} style={{ width: 'auto' }}>
                <Plus size={20} /> Cadastrar Professor
              </button>
            )}
            <div className="input-group" style={{ marginBottom: 0, width: '100%', maxWidth: '300px' }}>
              <input type="text" placeholder="Pesquisar..." className="form-control" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </header>

        {loading ? <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="spinner" size={48} /></div> : (
          <>
            {activeTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <div className="course-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }} onClick={() => setActiveTab('users')}>
                    <div style={{ background: 'rgba(156, 39, 176, 0.1)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                      <Users size={48} color="var(--primary)" />
                    </div>
                    <h3>Gerenciar Usuários</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Alunos, Permissões e Suporte</p>
                  </div>
                )}
                {(userRole === 'admin' || userRole === 'suporte' || userRole === 'professor') && (
                  <div className="course-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }} onClick={() => setActiveTab('nucleos')}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                      <GraduationCap size={48} color="var(--success)" />
                    </div>
                    <h3>{userRole === 'professor' ? 'Minhas Turmas' : 'Gerenciar Núcleos'}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Visualizar Polos e Alunos</p>
                  </div>
                )}
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <div className="course-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }} onClick={() => { setActiveTab('users'); setShowAddTeacher(true); }}>
                    <div style={{ background: 'rgba(3, 169, 244, 0.1)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                      <Users size={48} color="#03A9F4" />
                    </div>
                    <h3>Professores</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Autorizar novos docentes</p>
                  </div>
                )}
                <div className="course-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }} onClick={() => setActiveTab('content')}>
                  <div style={{ background: 'rgba(255, 152, 0, 0.1)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                    <BookOpen size={48} color="#FF9800" />
                  </div>
                  <h3>Gerenciar Conteúdo</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Cursos, Aulas e Atividades</p>
                </div>
              </div>
            )}
            
            {activeTab === 'finance' as any && (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {userRole === 'admin' ? (
                  <p>Módulo de gestão financeira e aprovação de pagamentos via API</p>
                ) : (
                  <div>
                    <ShieldCheck size={48} color="var(--error)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ color: 'var(--error)' }}>Acesso Restrito</h3>
                    <p>Somente administradores podem validar pagamentos de matrículas.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'nucleos' && <NucleosPanel userRole={userRole || 'aluno'} />}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {Object.entries(
                  users
                    .filter(u => u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    .reduce((acc: any, user: any) => {
                      const nucName = user.nucleos?.nome || 'Sem Núcleo Definido';
                      if (!acc[nucName]) acc[nucName] = [];
                      acc[nucName].push(user);
                      return acc;
                    }, {})
                )
                .sort(([nA], [nB]) => nA.localeCompare(nB))
                .map(([nucleoName, nucleoUsers]: [string, any]) => (
                  <div key={nucleoName} className="data-card" style={{ padding: '0', background: 'transparent', border: 'none' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      marginBottom: '1rem',
                      padding: '1rem 1.5rem',
                      background: 'rgba(156, 39, 176, 0.1)',
                      borderRadius: '12px',
                      borderLeft: '4px solid var(--primary)'
                    }}>
                      <GraduationCap size={20} color="var(--primary)" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{nucleoName} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>({nucleoUsers.length} alunos)</span></h3>
                    </div>
                    
                    <table className="admin-table">
                      <thead><tr><th>Nome / Email</th><th>Tipo</th><th>Status Acesso</th><th>Financeiro</th><th>Ações</th></tr></thead>
                      <tbody>
                        {nucleoUsers
                          .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                          .map((user: any) => (
                            <tr key={user.id}>
                              <td><div style={{ fontWeight: 600 }}>{user.nome}</div><div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div></td>
                              <td>
                                <select className="form-control" style={{ width: '150px' }} value={user.tipo} onChange={(e) => handleTypeChange(user.id, e.target.value)}>
                                  <option value="presencial">Presencial</option>
                                  <option value="online">Online</option>
                                  <option value="professor">Professor</option>
                                  <option value="admin">Admin</option>
                                  <option value="suporte">Suporte</option>
                                </select>
                              </td>
                              <td>
                                {user.acesso_definitivo ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                    <ShieldCheck size={16} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Definitivo</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="admin-badge" style={{ background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error)', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                                      Temporário
                                    </div>
                                    <button 
                                      className="btn btn-primary" 
                                      style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                      onClick={() => handleApproveAccess(user.id)}
                                      disabled={actionLoading === user.id}
                                    >
                                      {actionLoading === user.id ? <Loader2 className="spinner" size={12} /> : 'Aprovar'}
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td>
                                {user.bolsista ? (
                                  <span className="admin-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>100% Bolsista</span>
                                ) : (
                                  <span className="admin-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>Pagante (R$ 70)</span>
                                )}
                                <button 
                                  className="btn btn-outline" 
                                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.2rem 0', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
                                  onClick={() => handleToggleGratuidade(user.id, !!user.bolsista)}
                                >
                                  {user.bolsista ? 'Revogar Bolsa' : 'Dar Gratuidade'}
                                </button>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      width: 'auto', 
                                      background: user.bloqueado ? 'var(--success)' : 'rgba(255, 77, 77, 0.1)', 
                                      color: user.bloqueado ? '#fff' : 'var(--error)',
                                      fontSize: '0.8rem',
                                      padding: '0.4rem 0.8rem'
                                    }}
                                    onClick={() => handleToggleBlock(user.id, !!user.bloqueado)}
                                    disabled={actionLoading === user.id}
                                  >
                                    {user.bloqueado ? 'Ativar' : 'Bloquear'}
                                  </button>
                                  <button className="btn" style={{ width: 'auto', background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error)' }}><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {/* Header for Content Tab */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {selectedCourse && (
                      <button 
                        className="btn btn-outline" 
                        style={{ width: 'auto', padding: '0.5rem' }} 
                        onClick={() => { setSelectedCourse(null); setSelectedBook(null); }}
                      >
                        <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Cursos
                      </button>
                    )}
                    {selectedBook && (
                      <button 
                        className="btn btn-outline" 
                        style={{ width: 'auto', padding: '0.5rem' }} 
                        onClick={() => setSelectedBook(null)}
                      >
                        <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Livros
                      </button>
                    )}
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {!selectedCourse ? 'Todos os Cursos' : !selectedBook ? `Livros de ${selectedCourse.nome}` : `Aulas de ${selectedBook.titulo}`}
                    </h3>
                  </div>
                  {(userRole === 'admin' || userRole === 'suporte') && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!selectedCourse ? (
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddCourse(true)}>
                          <Plus size={20} /> Novo Curso
                        </button>
                      ) : !selectedBook ? (
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBook(true)}>
                          <Plus size={20} /> Novo Livro
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setAddingLessonType('gravada'); setShowAddLesson(true); }}>
                            <Plus size={18} /> Nova Aula
                          </button>
                          <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--success)' }} onClick={() => { setAddingLessonType('atividade'); setShowAddLesson(true); }}>
                            <ClipboardList size={18} /> Nova Atividade
                          </button>
                          <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--accent)' }} onClick={() => { setAddingLessonType('prova'); setShowAddLesson(true); }}>
                            <Award size={18} /> Nova Prova
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Conditional Rendering of Lists */}
                {!selectedCourse ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {courses.map(course => (
                      <div key={course.id} className="course-card" style={{ 
                        padding: '2.5rem', 
                        background: 'var(--glass)', 
                        border: '1px solid var(--glass-border)',
                        borderRadius: '24px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{course.nome}</h3>
                          {(userRole === 'admin' || userRole === 'suporte') && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}><Edit size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('cursos', course.id)}><Trash2 size={16} /></button>
                            </div>
                          )}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BookOpen size={18} color="var(--primary)" /> 
                            <strong>{course.livros?.[0]?.count || 0} Livros</strong>
                          </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Gerenciar Conteúdo</button>
                      </div>
                    ))}
                  </div>
                ) : !selectedBook ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {books.map(book => (
                      <div key={book.id} className="course-card" style={{ 
                        padding: '2rem', 
                        background: 'var(--glass)', 
                        border: '1px solid var(--glass-border)',
                        borderRadius: '20px'
                      }}>
                        <h4 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{book.titulo}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Ordem: {book.ordem}</p>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PDF do Livro:</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: 'auto', cursor: 'pointer' }}>
                              {uploading === book.id ? <Loader2 className="spinner" /> : <Upload size={14} />} {book.pdf_url ? 'Alterar PDF' : 'Enviar PDF'}
                              <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'livros', book.id, 'pdf_url')} />
                            </label>
                            {book.pdf_url && <CheckCircle2 size={16} color="var(--success)" />}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setSelectedBook(book); fetchLessons(book.id); }}>Gerenciar Aulas</button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => navigate(`/book/${book.id}`)} title="Visualizar Livro"><Eye size={18} /></button>
                          {(userRole === 'admin' || userRole === 'suporte') && (
                            <>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'book', data: book })} title="Editar Livro"><Edit size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('livros', book.id)}><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {books.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhum livro cadastrado para este curso.</p>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {lessons.map(lesson => (
                      <div key={lesson.id} style={{ 
                        padding: '1.5rem', 
                        background: 'var(--glass)', 
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ width: '40px', height: '40px', background: lesson.tipo === 'prova' ? 'rgba(234, 179, 8, 0.1)' : lesson.tipo === 'atividade' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {lesson.tipo === 'prova' ? <Award size={20} color="#EAB308" /> : lesson.tipo === 'atividade' ? <ClipboardList size={20} color="var(--success)" /> : <PlayCircle size={20} color="var(--primary)" />}
                          </div>
                          <div>
                            <h5 style={{ fontWeight: 600, fontSize: '1rem' }}>{lesson.titulo}</h5>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.tipo === 'prova' ? 'Prova' : lesson.tipo === 'atividade' ? 'Atividade Prática' : lesson.tipo === 'gravada' ? 'Vídeo Aula' : 'Aula ao Vivo'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => navigate(`/lesson/${lesson.id}`)} title="Visualizar Aula"><Eye size={18} /></button>
                          )}
                          {(userRole === 'admin' || userRole === 'suporte') && (
                            <>
                              {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
                                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => {
                                  setEditingLessonContent(lesson);
                                  setLessonBlocks(Array.isArray(lesson.conteudo) ? lesson.conteudo : []);
                                  setLessonMaterials(Array.isArray(lesson.materiais) ? lesson.materiais : []);
                                }} title="Editor de Conteúdo"><FileText size={18} /></button>
                              )}
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'lesson', data: lesson })} title="Editar Nome"><Edit size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setEditingQuiz(lesson); setQuizQuestions(lesson.questionario || []) }} title="Estruturar">
                                <ClipboardList size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lesson.tipo === 'prova' ? 'Estruturar Prova' : lesson.tipo === 'atividade' ? 'Estruturar Atividade' : 'Adicionar Atividade'}</span>
                              </button>
                              <button className="btn" style={{ width: 'auto', color: 'var(--error)', padding: '0.5rem' }} onClick={() => handleDelete('aulas', lesson.id)}><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {lessons.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula cadastrada para este livro.</p>}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'validation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                <section>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}><FileText /> Documentos Pendentes</h3>
                  {pendingDocs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum documento aguardando validação.</p> : (
                    <table className="admin-table">
                      <thead><tr><th>Aluno</th><th>Tipo</th><th>Arquivo</th><th>Ações</th></tr></thead>
                      <tbody>
                        {pendingDocs.map(doc => (
                          <tr key={doc.id}>
                            <td><div style={{ fontWeight: 600 }}>{doc.users?.nome}</div></td>
                            <td><span className="admin-badge">{doc.tipo.toUpperCase()}</span></td>
                            <td><a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', width: 'auto' }}><Eye size={16} /> Ver</a></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-primary" onClick={() => handleValidar('doc', doc.id, 'aprovado')} disabled={actionLoading === doc.id}><CheckCircle2 size={16} /></button>
                                <button className="btn" style={{ background: 'var(--error)', color: '#fff' }} onClick={() => handleValidar('doc', doc.id, 'rejeitado')} disabled={actionLoading === doc.id}><XCircle size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                {userRole === 'admin' && (
                  <section>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}><CreditCard /> Comprovantes de Pagamento</h3>
                    {pendingPays.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum pagamento aguardando validação.</p> : (
                      <table className="admin-table">
                        <thead><tr><th>Aluno</th><th>Valor</th><th>Vencimento</th><th>Arquivo</th><th>Ações</th></tr></thead>
                        <tbody>
                          {pendingPays.map(pay => (
                            <tr key={pay.id}>
                              <td><div style={{ fontWeight: 600 }}>{pay.users?.nome}</div></td>
                              <td><div style={{ fontWeight: 700 }}>R$ {pay.valor.toFixed(2)}</div></td>
                              <td>{new Date(pay.data_vencimento).toLocaleDateString()}</td>
                              <td><a href={pay.comprovante_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', width: 'auto' }}><Eye size={16} /> Ver</a></td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn btn-primary" onClick={() => handleValidar('pay', pay.id, 'aprovado')} disabled={actionLoading === pay.id}><CheckCircle2 size={16} /></button>
                                  <button className="btn" style={{ background: 'var(--error)', color: '#fff' }} onClick={() => handleValidar('pay', pay.id, 'rejeitado')} disabled={actionLoading === pay.id}><XCircle size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === 'settings' && userRole === 'admin' && (
              <div className="data-card" style={{ maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard /> Configuração de Pagamento (PIX)</h3>
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group">
                    <label>Chave PIX da Instituição</label>
                    <input type="text" className="form-control" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Ex: 00.000.000/0001-00" />
                  </div>
                  <div className="form-group">
                    <label>QR Code do PIX (Imagem)</label>
                    {pixQrUrl && <img src={pixQrUrl} alt="QR Code PIX" style={{ width: '150px', background: 'white', padding: '0.5rem', display: 'block', marginBottom: '1rem', borderRadius: '8px' }} />}
                    <input type="file" accept="image/*" className="form-control" onChange={handleUploadQrCode} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'save-settings'}>
                    {actionLoading === 'save-settings' ? <Loader2 className="spinner" /> : 'Salvar Configurações'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* Modal Cadastrar Professor */}
        {showAddTeacher && (
          <div className="modal-overlay" onClick={() => setShowAddTeacher(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Autorizar Novo Professor</h2>
              <form onSubmit={handleAddTeacher}>
                <div className="form-group">
                  <label>E-mail do Professor</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="professor@fatesa.edu"
                    value={newTeacherEmail}
                    onChange={e => setNewTeacherEmail(e.target.value)}
                    required
                  />
                  <p className="field-hint">
                    O e-mail será adicionado à lista de autorizados. O professor deve realizar o cadastro via "Ativar Acesso" na página de login.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddTeacher(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-teacher'}>
                    {actionLoading === 'add-teacher' ? <Loader2 className="spinner" /> : 'Autorizar E-mail'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Novo Livro */}
        {showAddBook && selectedCourse && (
          <div className="modal-overlay" onClick={() => setShowAddBook(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Novo Livro para {selectedCourse.nome}</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const titulo = formData.get('titulo') as string;
                const ordem = parseInt(formData.get('ordem') as string);
                const capaFile = formData.get('capa') as File | null;
                const pdfFile = formData.get('pdf') as File | null;
                
                setActionLoading('add-book');
                try {
                  let capa_url = null;
                  let pdf_url = null;

                  if (capaFile && capaFile.size > 0) {
                    const safeName = normalizeFileName(capaFile.name);
                    const capaPath = `capas/${Date.now()}_${safeName}`;
                    const { error: uploadError } = await supabase.storage.from('livros').upload(capaPath, capaFile);
                    if (uploadError) throw uploadError;
                    capa_url = supabase.storage.from('livros').getPublicUrl(capaPath).data.publicUrl;
                  }

                  if (pdfFile && pdfFile.size > 0) {
                    const safeName = normalizeFileName(pdfFile.name);
                    const pdfPath = `pdfs/${Date.now()}_${safeName}`;
                    const { error: uploadError } = await supabase.storage.from('livros').upload(pdfPath, pdfFile);
                    if (uploadError) throw uploadError;
                    pdf_url = supabase.storage.from('livros').getPublicUrl(pdfPath).data.publicUrl;
                  }

                  const { error } = await supabase.from('livros').insert({ 
                    curso_id: selectedCourse.id, 
                    titulo, 
                    ordem,
                    capa_url,
                    pdf_url
                  });
                  
                  if (error) throw error;
                  showToast('Livro adicionado!');
                  setShowAddBook(false);
                  fetchBooks(selectedCourse.id);
                } catch (err: any) {
                  showToast('Erro: ' + err.message, 'error');
                } finally {
                  setActionLoading(null);
                }
              }}>
                <div className="form-group">
                  <label>Título do Livro</label>
                  <input name="titulo" type="text" className="form-control" required />
                </div>
                <div className="form-group">
                  <label>Ordem (Sequência)</label>
                  <input name="ordem" type="number" className="form-control" defaultValue={books.length + 1} required />
                </div>
                <div className="form-group">
                  <label>Capa do Livro (Imagem)</label>
                  <input name="capa" type="file" accept="image/*" className="form-control" />
                </div>
                <div className="form-group">
                  <label>Arquivo do Livro (PDF)</label>
                  <input name="pdf" type="file" accept=".pdf" className="form-control" />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddBook(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-book'}>
                    {actionLoading === 'add-book' ? <Loader2 className="spinner" /> : 'Criar Livro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nova Aula */}
        {showAddLesson && selectedBook && (
          <div className="modal-overlay" onClick={() => setShowAddLesson(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Nova {addingLessonType === 'prova' ? 'Prova' : addingLessonType === 'atividade' ? 'Atividade' : 'Aula'} para {selectedBook.titulo}</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const titulo = formData.get('titulo') as string;
                const video_url = (addingLessonType === 'gravada' || addingLessonType === 'ao_vivo') ? formData.get('video_url') as string : null;
                const tipo = addingLessonType;
                
                setActionLoading('add-lesson');
                const { error } = await supabase.from('aulas').insert({ 
                  livro_id: selectedBook.id, 
                  titulo, 
                  video_url, 
                  tipo 
                });
                
                if (error) showToast(error.message, 'error');
                else {
                  showToast(addingLessonType === 'prova' ? 'Prova adicionada!' : addingLessonType === 'atividade' ? 'Atividade adicionada!' : 'Aula adicionada!');
                  setShowAddLesson(false);
                  fetchLessons(selectedBook.id);
                }
                setActionLoading(null);
              }}>
                <div className="form-group">
                  <label>Título {addingLessonType === 'prova' ? 'da Prova' : addingLessonType === 'atividade' ? 'da Atividade' : 'da Aula'}</label>
                  <input name="titulo" type="text" className="form-control" required />
                </div>
                {(addingLessonType === 'gravada' || addingLessonType === 'ao_vivo') && (
                  <>
                    <div className="form-group">
                      <label>Vídeo URL (YouTube/Vimeo)</label>
                      <input name="video_url" type="text" className="form-control" placeholder="https://..." />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Mídia</label>
                      <select name="tipo" className="form-control" value={addingLessonType} onChange={(e) => setAddingLessonType(e.target.value)} required>
                        <option value="gravada">Vídeo Aula (Gravada)</option>
                        <option value="ao_vivo">Aula ao Vivo</option>
                      </select>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddLesson(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-lesson'}>
                    {actionLoading === 'add-lesson' ? <Loader2 className="spinner" /> : 'Criar Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Novo Curso */}
        {showAddCourse && (
          <div className="modal-overlay" onClick={() => setShowAddCourse(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Novo Curso</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const nome = formData.get('nome') as string;
                
                setActionLoading('add-course');
                const { error } = await supabase.from('cursos').insert({ nome });
                
                if (error) alert(error.message);
                else {
                  alert('Curso adicionado!');
                  setShowAddCourse(false);
                  fetchData();
                }
                setActionLoading(null);
              }}>
                <div className="form-group">
                  <label>Nome do Curso</label>
                  <input name="nome" type="text" className="form-control" placeholder="Ex: Básico II" required />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddCourse(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-course'}>
                    {actionLoading === 'add-course' ? <Loader2 className="spinner" /> : 'Criar Curso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="modal-overlay" onClick={() => setEditingItem(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Editar {editingItem.type === 'course' ? 'Curso' : editingItem.type === 'book' ? 'Livro' : 'Aula'}</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const table = editingItem.type === 'course' ? 'cursos' : editingItem.type === 'book' ? 'livros' : 'aulas';
                
                const updates: any = {};
                formData.forEach((val, key) => {
                  if (key === 'ordem') updates[key] = parseInt(val as string);
                  else updates[key] = val;
                });

                setActionLoading('edit-item');
                const { error } = await supabase.from(table).update(updates).eq('id', editingItem.data.id);
                
                if (error) showToast(error.message, 'error');
                else {
                  showToast('Atualizado com sucesso!');
                  setEditingItem(null);
                  if (editingItem.type === 'course') fetchData();
                  else if (editingItem.type === 'book') fetchBooks(selectedCourse.id);
                  else if (editingItem.type === 'lesson') fetchLessons(selectedBook.id);
                }
                setActionLoading(null);
              }}>
                <div className="form-group">
                  <label>Título / Nome</label>
                  <input name={editingItem.type === 'course' ? 'nome' : 'titulo'} type="text" className="form-control" defaultValue={editingItem.type === 'course' ? editingItem.data.nome : editingItem.data.titulo} required />
                </div>
                
                {(editingItem.type === 'book' || editingItem.type === 'lesson') && (
                  <div className="form-group">
                    <label>Ordem / Sequência</label>
                    <input name="ordem" type="number" className="form-control" defaultValue={editingItem.data.ordem || 1} />
                  </div>
                )}

                {editingItem.type === 'lesson' && (
                  <>
                  <div className="form-group">
                    <label>Vídeo URL (YouTube/Vimeo)</label>
                    <input name="video_url" type="text" className="form-control" defaultValue={editingItem.data.video_url || ''} />
                  </div>
                  <div className="form-group">
                    <label>Descrição da Aula</label>
                    <textarea name="descricao" className="form-control" rows={3} defaultValue={editingItem.data.descricao || ''}></textarea>
                  </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingItem(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading === 'edit-item'}>
                    {actionLoading === 'edit-item' ? <Loader2 className="spinner" /> : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lesson Content Editor Modal */}
        {editingLessonContent && (
          <div className="modal-overlay" onClick={() => setEditingLessonContent(null)}>
            <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem' }}>Editor de Conteúdo: {editingLessonContent.titulo}</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Construa sua aula com textos e imagens.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setEditingLessonContent(null)}>Cancelar</button>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={async () => {
                    setActionLoading('save-lesson-content');
                    try {
                      const { error } = await supabase.from('aulas').update({ 
                        conteudo: lessonBlocks,
                        materiais: lessonMaterials
                      }).eq('id', editingLessonContent.id);
                      if (error) throw error;
                      showToast('Conteúdo da aula salvo com sucesso!');
                      setEditingLessonContent(null);
                      fetchLessons(selectedBook.id);
                    } catch (err: any) {
                      showToast('Erro ao salvar: ' + err.message, 'error');
                    } finally {
                      setActionLoading(null);
                    }
                  }} disabled={actionLoading === 'save-lesson-content'}>
                    {actionLoading === 'save-lesson-content' ? <Loader2 className="spinner" /> : 'Salvar Aula'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '300px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', padding: '1.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                {lessonBlocks.map((block, idx) => (
                  <div key={idx} style={{ position: 'relative', padding: '1.5rem', background: 'var(--glass)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto' }} onClick={() => {
                        const newBlocks = [...lessonBlocks];
                        if (idx > 0) {
                          [newBlocks[idx], newBlocks[idx-1]] = [newBlocks[idx-1], newBlocks[idx]];
                          setLessonBlocks(newBlocks);
                        }
                      }}>↑</button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto' }} onClick={() => {
                        const newBlocks = [...lessonBlocks];
                        if (idx < newBlocks.length - 1) {
                          [newBlocks[idx], newBlocks[idx+1]] = [newBlocks[idx+1], newBlocks[idx]];
                          setLessonBlocks(newBlocks);
                        }
                      }}>↓</button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto', color: 'var(--error)' }} onClick={() => setLessonBlocks(lessonBlocks.filter((_, i) => i !== idx))}><Trash2 size={14} /></button>
                    </div>

                    {block.type === 'text' ? (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Bloco de Texto</label>
                        <textarea 
                          className="form-control" 
                          rows={6} 
                          value={block.content} 
                          placeholder="Digite o conteúdo da aula aqui..."
                          onChange={(e) => {
                            const newBlocks = [...lessonBlocks];
                            newBlocks[idx].content = e.target.value;
                            setLessonBlocks(newBlocks);
                          }}
                        ></textarea>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: 0, display: 'block' }}>Bloco de Imagem</label>
                        {block.content ? (
                          <div style={{ position: 'relative', width: 'fit-content' }}>
                            <img src={block.content} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                            <button className="btn btn-outline" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none' }} onClick={() => {
                              const newBlocks = [...lessonBlocks];
                              newBlocks[idx].content = '';
                              setLessonBlocks(newBlocks);
                            }}><Edit size={14} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                            <input 
                              type="file" 
                              id={`img-upload-${idx}`} 
                              hidden 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setActionLoading(`upload-block-${idx}`);
                                try {
                                  const filePath = `lesson-elements/${Date.now()}_${file.name}`;
                                  const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file);
                                  if (uploadError) throw uploadError;
                                  const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
                                  const newBlocks = [...lessonBlocks];
                                  newBlocks[idx].content = publicUrl;
                                  setLessonBlocks(newBlocks);
                                  showToast('Imagem enviada!');
                                } catch (err: any) {
                                  showToast('Erro: ' + err.message, 'error');
                                } finally {
                                  setActionLoading(null);
                                }
                              }} 
                            />
                            <label htmlFor={`img-upload-${idx}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
                              {actionLoading === `upload-block-${idx}` ? <Loader2 className="spinner" size={32} /> : (
                                <>
                                  <Upload size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                  <p>Clique para enviar imagem</p>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {lessonBlocks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                    Sua aula está vazia. Comece adicionando um bloco de texto ou imagem abaixo.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <button className="btn btn-outline" style={{ width: 'auto', display: 'flex', gap: '0.75rem' }} onClick={() => setLessonBlocks([...lessonBlocks, { type: 'text', content: '' }])}>
                  <FileText size={20} /> Adicionar Texto
                </button>
                <button className="btn btn-outline" style={{ width: 'auto', display: 'flex', gap: '0.75rem' }} onClick={() => setLessonBlocks([...lessonBlocks, { type: 'image', content: '' }])}>
                  <Plus size={20} /> Adicionar Imagem
                </button>
              </div>

              <div style={{ marginTop: '3rem', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Upload size={20} /> Materiais da Aula (Downloads)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {lessonMaterials.map((mat, mIdx) => (
                    <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FileText size={18} color="var(--primary)" />
                        <span>{mat.name}</span>
                      </div>
                      <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', color: 'var(--error)' }} onClick={() => setLessonMaterials(lessonMaterials.filter((_, i) => i !== mIdx))}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div style={{ marginTop: '1rem' }}>
                    <input 
                      type="file" 
                      id="mat-upload" 
                      hidden 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setActionLoading('upload-material');
                        try {
                          const filePath = `materiais/${Date.now()}_${file.name}`;
                          const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file);
                          if (uploadError) throw uploadError;
                          const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
                          setLessonMaterials([...lessonMaterials, { name: file.name, url: publicUrl }]);
                          showToast('Material adicionado!');
                        } catch (err: any) {
                          showToast('Erro: ' + err.message, 'error');
                        } finally {
                          setActionLoading(null);
                        }
                      }} 
                    />
                    <label htmlFor="mat-upload" className="btn btn-primary" style={{ width: 'auto', cursor: 'pointer' }}>
                      {actionLoading === 'upload-material' ? <Loader2 className="spinner" /> : <><Upload size={18} /> Enviar Novo Material</>}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Editor Modal */}
        {editingQuiz && (
          <div className="modal-overlay" onClick={() => setEditingQuiz(null)}>
            <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Award color="var(--primary)" /> Atividades: {editingQuiz.titulo}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'block' }}>Questão {qIdx + 1}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {q.type === 'multiple_choice' ? 'Múltipla Escolha' : q.type === 'true_false' ? 'Verdadeiro ou Falso' : q.type === 'matching' ? 'Associação de Colunas (Ancoragem)' : q.type === 'discursive' ? 'Dissertativa' : 'Múltipla Escolha (Legado)'}
                        </span>
                      </div>
                      <button onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))} style={{ color: 'var(--error)', background: 'rgba(244, 63, 94, 0.1)', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }} title="Excluir Questão"><Trash2 size={16} /></button>
                    </div>
                    
                    <div className="form-group">
                      <label>Enunciado / Pergunta</label>
                      <textarea 
                        className="form-control" 
                        placeholder="Digite o texto principal da pergunta..." 
                        rows={3}
                        value={q.text} 
                        onChange={(e) => {
                          const newQ = [...quizQuestions];
                          newQ[qIdx].text = e.target.value;
                          setQuizQuestions(newQ);
                        }}
                      />
                    </div>

                    {/* render partial based on type */}
                    {(!q.type || q.type === 'multiple_choice') && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Alternativas (Marque a correta)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(q.options || []).map((opt: string, oIdx: number) => (
                            <div key={oIdx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <input type="radio" name={`correct-${qIdx}`} checked={q.correct === oIdx} onChange={() => {
                                const newQ = [...quizQuestions];
                                newQ[qIdx].correct = oIdx;
                                setQuizQuestions(newQ);
                              }} style={{ width: '20px', height: '20px', accentColor: 'var(--success)' }} />
                              <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 800 }}>{String.fromCharCode(65 + oIdx)}.</span>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  style={{ paddingLeft: '2.5rem' }} 
                                  placeholder="Texto da alternativa..."
                                  value={opt} 
                                  onChange={(e) => {
                                    const newQ = [...quizQuestions];
                                    if(!newQ[qIdx].options) newQ[qIdx].options = [];
                                    newQ[qIdx].options![oIdx] = e.target.value;
                                    setQuizQuestions(newQ);
                                  }}
                                />
                              </div>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.8rem', color: 'var(--error)', borderColor: 'rgba(255,255,255,0.05)' }} onClick={() => {
                                const newQ = [...quizQuestions];
                                newQ[qIdx].options?.splice(oIdx, 1);
                                if (newQ[qIdx].correct === oIdx) newQ[qIdx].correct = 0;
                                setQuizQuestions(newQ);
                              }}><X size={16} /></button>
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-outline" style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => {
                          const newQ = [...quizQuestions];
                          if(!newQ[qIdx].options) newQ[qIdx].options = [];
                          newQ[qIdx].options!.push('');
                          setQuizQuestions(newQ);
                        }}><Plus size={14} /> Adicionar Alternativa</button>
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Gabarito</label>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: q.isTrue ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass)', border: `1px solid ${q.isTrue ? 'var(--success)' : 'var(--glass-border)'}`, padding: '1rem', borderRadius: '12px', flex: 1 }}>
                            <input type="radio" name={`tf-${qIdx}`} checked={q.isTrue === true} onChange={() => {
                              const newQ = [...quizQuestions];
                              newQ[qIdx].isTrue = true;
                              setQuizQuestions(newQ);
                            }} style={{ accentColor: 'var(--success)', width: '20px', height: '20px' }} /> <CheckCircle2 color="var(--success)" size={18} /> Verdadeiro
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: q.isTrue === false ? 'rgba(244, 63, 94, 0.1)' : 'var(--glass)', border: `1px solid ${q.isTrue === false ? 'var(--error)' : 'var(--glass-border)'}`, padding: '1rem', borderRadius: '12px', flex: 1 }}>
                            <input type="radio" name={`tf-${qIdx}`} checked={q.isTrue === false} onChange={() => {
                              const newQ = [...quizQuestions];
                              newQ[qIdx].isTrue = false;
                              setQuizQuestions(newQ);
                            }} style={{ accentColor: 'var(--error)', width: '20px', height: '20px' }} /> <XCircle color="var(--error)" size={18} /> Falso
                          </label>
                        </div>
                      </div>
                    )}

                    {q.type === 'matching' && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Pares (Coluna 1 ➔ Coluna 2)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {(q.matchingPairs || []).map((pair, pIdx) => (
                            <div key={pIdx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Item {pIdx + 1} (Esquerda)</span>
                                <input type="text" className="form-control" placeholder="Ex: Frase A" value={pair.left} onChange={(e) => {
                                  const newQ = [...quizQuestions];
                                  newQ[qIdx].matchingPairs![pIdx].left = e.target.value;
                                  setQuizQuestions(newQ);
                                }} />
                              </div>
                              <ChevronRight color="var(--text-muted)" />
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Correspondente (Direita)</span>
                                <input type="text" className="form-control" placeholder="Ex: Correspondente A" value={pair.right} onChange={(e) => {
                                  const newQ = [...quizQuestions];
                                  newQ[qIdx].matchingPairs![pIdx].right = e.target.value;
                                  setQuizQuestions(newQ);
                                }} />
                              </div>
                              <button className="btn btn-outline" style={{ padding: '0.8rem', color: 'var(--error)', alignSelf: 'flex-end', width: 'auto' }} onClick={() => {
                                const newQ = [...quizQuestions];
                                newQ[qIdx].matchingPairs?.splice(pIdx, 1);
                                setQuizQuestions(newQ);
                              }}><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-outline" style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => {
                          const newQ = [...quizQuestions];
                          if(!newQ[qIdx].matchingPairs) newQ[qIdx].matchingPairs = [];
                          newQ[qIdx].matchingPairs!.push({ left: '', right: '' });
                          setQuizQuestions(newQ);
                        }}><Plus size={14} /> Adicionar Par</button>
                      </div>
                    )}

                    {q.type === 'discursive' && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Expectativa de Resposta / Palavras-chave (Opcional, apenas para correção futura)</label>
                        <textarea 
                          className="form-control" 
                          rows={4} 
                          placeholder="Digite aqui o que se espera que o aluno responda..."
                          value={q.expectedAnswer || ''}
                          onChange={(e) => {
                            const newQ = [...quizQuestions];
                            newQ[qIdx].expectedAnswer = e.target.value;
                            setQuizQuestions(newQ);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
            
                {/* Dropdown for adding new question type */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--glass)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Adicionar Nova Questão</label>
                    <select id="new-q-type" className="form-control" defaultValue="multiple_choice">
                      <option value="multiple_choice">Múltipla Escolha</option>
                      <option value="true_false">Verdadeiro ou Falso</option>
                      <option value="matching">Ancoragem (Associação de Colunas)</option>
                      <option value="discursive">Dissertativa (Texto Livre)</option>
                    </select>
                  </div>
                  <button className="btn btn-outline" style={{ width: 'auto', alignSelf: 'flex-end', display: 'flex', gap: '0.5rem' }} onClick={() => {
                    const sel = document.getElementById('new-q-type') as HTMLSelectElement;
                    const type = sel.value as QuestionType;
                    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    
                    const newQuestion: QuizQuestion = {
                      id: newId,
                      type,
                      text: ''
                    };
                    
                    if(type === 'multiple_choice') {
                      newQuestion.options = ['', '', '', ''];
                      newQuestion.correct = 0;
                    } else if (type === 'true_false') {
                      newQuestion.isTrue = true;
                    } else if (type === 'matching') {
                      newQuestion.matchingPairs = [{left: '', right: ''}, {left: '', right: ''}];
                    }
                    
                    setQuizQuestions([...quizQuestions, newQuestion]);
                  }}>
                    <Plus size={18} /> Inserir
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => setEditingQuiz(null)}>Cancelar e Voltar</button>
                  <button className="btn btn-primary" onClick={async () => {
                    setActionLoading('save-quiz');
                    const { error } = await supabase.from('aulas').update({ questionario: quizQuestions }).eq('id', editingQuiz.id);
                    if (error) showToast(error.message, 'error');
                    else {
                      showToast('Atividade salva com sucesso!');
                      setEditingQuiz(null);
                      fetchLessons(selectedBook.id);
                    }
                    setActionLoading(null);
                  }} disabled={actionLoading === 'save-quiz'}>
                    {actionLoading === 'save-quiz' ? <Loader2 className="spinner" /> : 'Salvar Todas as Atividades'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem 2rem',
            background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span style={{ fontWeight: 600 }}>{toast.message}</span>
          </div>
        )}


      </main>
    </div>
  )
}

export default Admin
