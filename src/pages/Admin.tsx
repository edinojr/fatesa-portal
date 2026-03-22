import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
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
import UserManagement from '../components/admin/UserManagement'
import ContentManagement from '../components/admin/ContentManagement'
import ValidationPanel from '../components/admin/ValidationPanel'
import SettingsPanel from '../components/admin/SettingsPanel'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import LessonContentEditorModal from '../components/admin/modals/LessonContentEditorModal'
import QuizEditorModal from '../components/admin/modals/QuizEditorModal'
import { AddTeacherModal, AddCourseModal, AddBookModal, AddLessonModal, EditItemModal, AddAdminModal } from '../components/admin/modals/ContentModals'
import { QuizQuestion, QuestionType } from '../types/admin'

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
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  
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
      // FIX: Ensure 'livros' bucket is used only for books. 
      // Fallback to 'documentos' if 'livros' is not ready (optional, but keep 'livros' as per migrations)
      const bucket = table === 'livros' ? 'livros' : 'documentos'
      const safeName = normalizeFileName(file.name)
      const folder = column === 'capa_url' ? 'capas' : (file.name.toLowerCase().endsWith('.epub') ? 'epubs' : 'pdfs')
      const filePath = `${folder}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      const realId = id.replace('_pdf', '').replace('_epub', '')
      const { error: updateError } = await supabase.from(table).update({ [column]: publicUrl }).eq('id', realId)
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

  const handleRemoveFile = async (table: 'livros' | 'aulas', id: string, column: string) => {
    if (!confirm('Deseja realmente remover este arquivo?')) return
    setActionLoading(`${id}_${column}_remove`)
    try {
      const { error } = await supabase.from(table).update({ [column]: null }).eq('id', id)
      if (error) throw error
      showToast('Arquivo removido com sucesso!')
      
      const realId = id.replace('_pdf', '').replace('_epub', '')
      if (table === 'livros' && selectedCourse?.id) fetchBooks(selectedCourse.id)
      else if (table === 'aulas' && selectedBook?.id) fetchLessons(selectedBook.id)
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'home') {
        const [usersCount, coursesCount, docsCount, paysCount] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('cursos').select('id', { count: 'exact', head: true }),
          supabase.from('documentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
          supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pago')
        ]);
        
        setUsers(new Array(usersCount.count || 0)); // Hack to show count in cards if they use users.length
        setCourses(new Array(coursesCount.count || 0));
        setPendingDocs(new Array(docsCount.count || 0));
        setPendingPays(new Array(paysCount.count || 0));
      } else if (activeTab === 'users') {
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este usuário?')) return
    setActionLoading(userId)
    try {
      // Direct delete from public.users (triggers should handle clean up if any)
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) throw error
      
      setUsers(users.filter(u => u.id !== userId))
      showToast('Usuário excluído com sucesso!')
    } catch (err: any) {
      showToast('Erro ao excluir usuário: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
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

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const nome = formData.get('nome') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const tipo = formData.get('tipo') as string || 'admin'

    setActionLoading('add-admin')
    try {
      // 1. Pre-authorize based on role
      let authError;
      if (tipo === 'admin') {
        const { error } = await supabase.from('admins_autorizados').insert({ email })
        authError = error
      } else if (tipo === 'professor') {
        const { error } = await supabase.from('professores_autorizados').insert({ email, nome })
        authError = error
      }
      
      if (authError && !authError.message.includes('unique constraint')) {
        throw authError
      }

      // 2. Create the user using a secondary client to avoid session conflict
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
            tipo: tipo,
            acesso_definitivo: true
          }
        }
      })

      if (signUpError) throw signUpError

      showToast('Administrador cadastrado com sucesso!')
      setShowAddAdmin(false)
      fetchData()
    } catch (err: any) {
      showToast('Erro ao cadastrar administrador: ' + err.message, 'error')
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
      setActionLoading(null)
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
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)' }} onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}>
              <LogOut size={20} /> Sair
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="mobile-col-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <GraduationCap size={48} color="var(--primary)" />
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {activeTab === 'home' ? 'Painel Administrativo' : activeTab === 'users' ? 'Gestão de Usuários' : activeTab === 'content' ? 'Gestão de Conteúdo' : 'Validação de Acesso'}
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

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <LoadingSpinner size={48} label="Carregando..." />
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="data-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.2) 0%, rgba(var(--primary-rgb), 0.05) 100%)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                  <Users size={32} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{users.length}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Usuários Cadastrados</p>
                </div>
                <div className="data-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <BookOpen size={32} style={{ marginBottom: '1rem', color: 'var(--success)' }} />
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{courses.length}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Cursos Ativos</p>
                </div>
                <div className="data-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.05) 100%)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <FileText size={32} style={{ marginBottom: '1rem', color: 'var(--warning)' }} />
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{pendingDocs.length + (userRole === 'admin' ? pendingPays.length : 0)}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Pendências de Validação</p>
                </div>
              </div>
            )}
            
            {activeTab === 'users' && (
              <UserManagement 
                users={users}
                searchTerm={searchTerm}
                userRole={userRole}
                actionLoading={actionLoading}
                setShowAddAdmin={setShowAddAdmin}
                handleTypeChange={handleTypeChange}
                handleApproveAccess={handleApproveAccess}
                handleToggleBlock={handleToggleBlock}
                handleToggleGratuidade={handleToggleGratuidade}
                handleUpdateUserNucleo={handleUpdateUserNucleo}
                handleDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'content' && (
              <ContentManagement 
                courses={courses}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                books={books}
                lessons={lessons}
                userRole={userRole}
                actionLoading={actionLoading}
                fetchData={fetchData}
                fetchBooks={fetchBooks}
                fetchLessons={fetchLessons}
                handleDelete={handleDelete as any}
                handleFileUpload={handleFileUpload}
                setShowAddCourse={setShowAddCourse}
                setShowAddBook={setShowAddBook}
                setShowAddLesson={setShowAddLesson}
                setAddingLessonType={setAddingLessonType}
                setEditingItem={setEditingItem}
                setEditingLessonContent={setEditingLessonContent}
                setLessonBlocks={setLessonBlocks}
                setLessonMaterials={setLessonMaterials}
                setEditingQuiz={setEditingQuiz}
                setQuizQuestions={setQuizQuestions}
                uploading={uploading}
                handleRemoveFile={handleRemoveFile}
              />
            )}

            {activeTab === 'validation' && (
              <ValidationPanel 
                pendingDocs={pendingDocs}
                pendingPays={pendingPays}
                userRole={userRole}
                actionLoading={actionLoading}
                handleValidar={handleValidar}
              />
            )}

            {activeTab === 'nucleos' && (
              <NucleosPanel userRole={userRole || 'admin'} />
            )}

            {activeTab === 'settings' && userRole === 'admin' && (
              <SettingsPanel 
                pixKey={pixKey}
                setPixKey={setPixKey}
                pixQrUrl={pixQrUrl}
                handleSaveSettings={handleSaveSettings}
                handleUploadQrCode={handleUploadQrCode}
                actionLoading={actionLoading}
              />
            )}
          </>
        )}

        {/* Modals */}
        <AddTeacherModal 
          showAddTeacher={showAddTeacher}
          setShowAddTeacher={setShowAddTeacher}
          newTeacherEmail={newTeacherEmail}
          setNewTeacherEmail={setNewTeacherEmail}
          handleAddTeacher={handleAddTeacher}
          actionLoading={actionLoading}
        />

        <AddCourseModal 
          showAddCourse={showAddCourse}
          setShowAddCourse={setShowAddCourse}
          actionLoading={actionLoading}
          supabase={supabase}
          fetchData={fetchData}
          showToast={showToast}
        />

        <AddBookModal 
          showAddBook={showAddBook}
          setShowAddBook={setShowAddBook}
          selectedCourse={selectedCourse}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          fetchBooks={fetchBooks}
          showToast={showToast}
          normalizeFileName={normalizeFileName}
          books={books}
        />

        <AddLessonModal 
          showAddLesson={showAddLesson}
          setShowAddLesson={setShowAddLesson}
          selectedBook={selectedBook}
          addingLessonType={addingLessonType}
          setAddingLessonType={setAddingLessonType}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          fetchLessons={fetchLessons}
          showToast={showToast}
        />

        <EditItemModal 
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          fetchData={fetchData}
          fetchBooks={fetchBooks}
          fetchLessons={fetchLessons}
          selectedCourse={selectedCourse}
          selectedBook={selectedBook}
          showToast={showToast}
        />

        <LessonContentEditorModal 
          editingLessonContent={editingLessonContent}
          setEditingLessonContent={setEditingLessonContent}
          lessonBlocks={lessonBlocks}
          setLessonBlocks={setLessonBlocks}
          lessonMaterials={lessonMaterials}
          setLessonMaterials={setLessonMaterials}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          showToast={showToast}
          fetchLessons={fetchLessons}
          selectedBook={selectedBook}
        />

        <QuizEditorModal 
          editingQuiz={editingQuiz}
          setEditingQuiz={setEditingQuiz}
          quizQuestions={quizQuestions}
          setQuizQuestions={setQuizQuestions}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          showToast={showToast}
          fetchLessons={fetchLessons}
          selectedBook={selectedBook}
        />

        <AddAdminModal 
          showAddAdmin={showAddAdmin}
          setShowAddAdmin={setShowAddAdmin}
          actionLoading={actionLoading}
          handleAddAdmin={handleAddAdmin}
        />

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
