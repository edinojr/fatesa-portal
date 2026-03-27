import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
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
  Menu,
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
import { AddTeacherModal, AddCourseModal, AddBookModal, AddLessonModal, AddContentModal, EditItemModal, AddAdminModal } from '../components/admin/modals/ContentModals'
import { QuizQuestion, QuestionType } from '../types/admin'

import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'

type Tab = 'home' | 'users' | 'content' | 'validation' | 'nucleos' | 'settings' | 'finance'


const Admin = () => {
  const { profile, loading: profileLoading, signOut } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [pendingDocs, setPendingDocs] = useState<any[]>([])
  const [pendingPays, setPendingPays] = useState<any[]>([])

  const [userCount, setUserCount] = useState(0)
  const [courseCount, setCourseCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [newTeacherEmail, setNewTeacherEmail] = useState('')
  const [newTeacherNome, setNewTeacherNome] = useState('')
  const [newTeacherPassword, setNewTeacherPassword] = useState('')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  
  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  // CMS States
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [lessonItems, setLessonItems] = useState<any[]>([]) // Children of a lesson
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [showAddContent, setShowAddContent] = useState(false)
  
  const [allNucleos, setAllNucleos] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<{ type: 'course' | 'book' | 'lesson' | 'content', data: any } | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [addingLessonType, setAddingLessonType] = useState<string>('gravada')
  const [addingBloco, setAddingBloco] = useState<number | null>(null)
  const [editingLessonContent, setEditingLessonContent] = useState<any | null>(null)
  const [lessonBlocks, setLessonBlocks] = useState<any[]>([])
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([])
  
  // Settings States
  const [pixKey, setPixKey] = useState('')
  const [pixQrUrl, setPixQrUrl] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewingBook, setViewingBook] = useState<any | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [nucleosAutoOpenAdd, setNucleosAutoOpenAdd] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading) {
      if (!profile || !['admin', 'suporte'].includes(profile.tipo || '')) {
        navigate('/dashboard');
        return;
      }
      setUserRole(profile.tipo);
      setCurrentUserEmail(profile.email);
      setAvailableRoles(profile.caminhos_acesso || []);
      setLoading(false);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (userRole) {
      console.log("Fatesa Portal v1.6.1 - Sanitização de upload ativa");
      fetchData()
      if (userRole === 'admin') fetchNucleosGlobal()
    }
  }, [activeTab, userRole])

  const fetchNucleosGlobal = async () => {
    const { data } = await supabase.from('nucleos').select('*')
    if (data) setAllNucleos(data)
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
      const bucket = (table === 'livros' || table === 'aulas') ? 'livros' : 'documentos'
      const safeName = normalizeFileName(file.name)
      const folder = column === 'capa_url' ? 'capas' : (file.name.toLowerCase().endsWith('.epub') ? 'epubs' : 'pdfs')
      const filePath = `${folder}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      const { error: updateError } = await supabase.from(table).update({ [column]: publicUrl }).eq('id', id)
      if (updateError) throw updateError

      showToast('Arquivo enviado com sucesso!')
      if (table === 'livros') {
        fetchBooks(selectedCourse.id)
      } else if (table === 'aulas') {
        if (selectedLesson) fetchLessonItems(selectedLesson.id)
        if (selectedBook) fetchLessons(selectedBook.id)
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploading(null)
    }
  }

  const handleRemoveFile = async (table: 'livros' | 'aulas', id: string, column: string) => {
    setConfirmDelete({ 
      type: 'content', 
      id, 
      table, 
      column, 
      title: 'Tem certeza que deseja remover este arquivo?' 
    })
  }

  const handleReorder = async (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void) => {
    const idx = items.findIndex(i => i.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    const current = items[idx]
    const swap = items[swapIdx]

    try {
      await Promise.all([
        supabase.from('aulas').update({ ordem: swap.ordem }).eq('id', current.id),
        supabase.from('aulas').update({ ordem: current.ordem }).eq('id', swap.id)
      ])
      fetchFn()
    } catch (err: any) {
      showToast('Erro ao reordenar: ' + err.message, 'error')
    }
  }

  const handleMoveTo = async (id: string, targetId: string | null, items: any[], fetchFn: () => void, targetBlocoId?: number | null) => {
    if (id === targetId) return;
    
    const newItems = [...items];
    const dragIdx = newItems.findIndex(i => i.id === id);
    if (dragIdx === -1) return;

    const [draggedItem] = newItems.splice(dragIdx, 1);
    
    if (targetBlocoId !== undefined) {
      // Direct drop on a block header or empty block
      draggedItem.bloco_id = targetBlocoId;
      newItems.push(draggedItem); // Append to end of book/lesson list
    } else if (targetId) {
      // Drop on another item
      const targetIdx = newItems.findIndex(i => i.id === targetId);
      if (targetIdx !== -1) {
        const targetItem = newItems[targetIdx];
        newItems.splice(targetIdx, 0, draggedItem);
        draggedItem.bloco_id = targetItem.bloco_id;
      } else {
        newItems.push(draggedItem);
      }
    }
    
    // Create update batch
    const updates = newItems.map((item, index) => ({
      id: item.id,
      ordem: index + 1,
      bloco_id: item.bloco_id
    }));

    try {
      setActionLoading('reorder-all');
      const { error } = await supabase
        .from('aulas')
        .upsert(updates, { onConflict: 'id' });
        
      if (error) throw error;
      fetchFn();
    } catch (err: any) {
      showToast('Erro ao mover: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
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
        
        setUserCount(usersCount.count || 0);
        setCourseCount(coursesCount.count || 0);
        setPendingCount((docsCount.count || 0) + (userRole === 'admin' ? (paysCount.count || 0) : 0));
        
        // Reset lists when on home to avoid rendering undefined items if tab changes
        setUsers([]);
        setCourses([]);
        setPendingDocs([]);
        setPendingPays([]);
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
    const { data } = await supabase.from('livros').select('*, aulas(count)').eq('curso_id', courseId).order('ordem')
    if (data) setBooks(data)
  }

  const fetchLessons = async (bookId: string) => {
    setActionLoading('fetch-lessons')
    const { data } = await supabase
      .from('aulas')
      .select('*, children:aulas(count)')
      .eq('livro_id', bookId)
      .eq('tipo', 'licao')
      .order('ordem')
    if (data) setLessons(data)
    setActionLoading(null)
  }

  const fetchLessonItems = async (lessonId: string) => {
    setActionLoading('fetch-lesson-items')
    const { data } = await supabase
      .from('aulas')
      .select('*')
      .eq('parent_aula_id', lessonId)
      .order('ordem')
    if (data) setLessonItems(data)
    setActionLoading(null)
  }

  const handleDelete = async (table: 'cursos' | 'livros' | 'aulas', id: string) => {
    setConfirmDelete({ 
      type: 'content', 
      id, 
      table, 
      title: 'Tem certeza que deseja excluir este item? Esta ação é irreversível.' 
    })
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

  const handleUpdateUserName = async (userId: string, newName: string) => {
    if (!newName.trim()) return;
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('users').update({ nome: newName }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, nome: newName } : u));
      showToast('Nome atualizado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao atualizar nome: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'content', id: string, table?: string, column?: string, title: string } | null>(null);

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      // Use RPC to delete from auth.users (cascades to public.users)
      const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId })
      if (error) throw error
      
      setUsers(users.filter(u => u.id !== userId))
      showToast('Usuário excluído com sucesso!')
    } catch (err: any) {
      showToast('Erro ao excluir usuário: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
      setConfirmDelete(null)
    }
  }

  const handleRemoveFileFinal = async (table: 'livros' | 'aulas', id: string, column: string) => {
    setActionLoading(id + '_' + column)
    try {
      const { error } = await supabase.from(table).update({ [column]: null }).eq('id', id)
      if (error) throw error
      
      showToast('Arquivo removido com sucesso!')
      
      if (table === 'livros' && selectedCourse?.id) fetchBooks(selectedCourse.id)
      else if (table === 'aulas') {
        if (selectedLesson?.id) fetchLessonItems(selectedLesson.id)
        if (selectedBook?.id) fetchLessons(selectedBook.id)
      }
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
      setConfirmDelete(null)
    }
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('add-teacher')
    try {
      // 1. Authorize the email
      const { error: authError } = await supabase
        .from('professores_autorizados')
        .insert({
          email: newTeacherEmail,
          nome: newTeacherNome
        })
      
      if (authError && !authError.message.includes('unique constraint')) {
        throw authError
      }

      // 2. Create the user immediately
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })

      const { error: signUpError } = await tempClient.auth.signUp({
        email: newTeacherEmail,
        password: newTeacherPassword,
        options: {
          data: {
            nome: newTeacherNome,
            tipo: 'professor',
            acesso_definitivo: true
          }
        }
      })

      if (signUpError) throw signUpError

      showToast('Professor cadastrado e autorizado com sucesso!')
      setShowAddTeacher(false)
      setNewTeacherEmail('')
      setNewTeacherNome('')
      setNewTeacherPassword('')
      fetchData()
    } catch (err: any) {
      showToast('Erro ao cadastrar professor: ' + err.message, 'error')
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

      {/* Floating Menu Toggle Button */}
      <button className="floating-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu Backdrop */}
      {isMobileMenuOpen && (
        <div className="menu-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      {/* Sidebar / Mobile Slim Nav */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ paddingTop: '2rem' }}>
        <div className="logo-section" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
          <Logo size={200} />
          <button className="mobile-menu-btn" style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => navigate(-1)} className="admin-nav-item" style={{ background: 'transparent', border: 'none' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => navigate('/admin')} className="admin-nav-item" style={{ background: 'transparent', border: 'none' }}>
              <LayoutDashboard size={18} />
            </button>
          </div>

          {availableRoles.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button 
                className="admin-nav-item" 
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={16} /> <span className="mobile-hide">Alternar</span>
              </button>
              {showRoleSwitcher && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '180px' }}>
                  {availableRoles.filter(r => r !== userRole).map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => { 
                        navigate(r === 'aluno' ? '/dashboard' : r === 'professor' ? '/professor' : '/admin'); 
                        setShowRoleSwitcher(false); 
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {r === 'aluno' ? 'Portal do Aluno' : r === 'professor' ? 'Painel do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {userRole !== 'aluno' && (
            <div className={`admin-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}>
              <LayoutDashboard size={18} /> <span className="mobile-hide">Início</span>
            </div>
          )}

          {userRole === 'admin' && (
            <div className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}>
              <Users size={18} /> <span className="mobile-hide">Usuários</span>
            </div>
          )}
          {(userRole === 'admin' || userRole === 'professor' || userRole === 'suporte') && (
            <div className={`admin-nav-item ${activeTab === 'nucleos' ? 'active' : ''}`} onClick={() => { setActiveTab('nucleos'); setIsMobileMenuOpen(false); }}>
              <GraduationCap size={18} /> <span className="mobile-hide">Núcleos</span>
            </div>
          )}
          <div className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => { setActiveTab('content'); setIsMobileMenuOpen(false); }}>
            <BookOpen size={18} /> <span className="mobile-hide">Conteúdo</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'validation' ? 'active' : ''}`} onClick={() => { setActiveTab('validation'); setIsMobileMenuOpen(false); }}>
            <ShieldCheck size={18} /> <span className="mobile-hide">Validação</span>
            {(pendingDocs.length + pendingPays.length) > 0 && (
              <span style={{ marginLeft: '4px', background: 'var(--error)', color: '#fff', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '10px' }}>
                {pendingDocs.length + pendingPays.length}
              </span>
            )}
          </div>
          {userRole === 'admin' && (
            <div className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}>
              <Settings size={18} /> <span className="mobile-hide">Config</span>
            </div>
          )}
          <div style={{ marginLeft: 'auto', paddingLeft: '0.5rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)', border: 'none', background: 'transparent' }} onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}>
              <LogOut size={18} />
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        <Link 
          to="/dashboard" 
          className="btn btn-outline" 
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', color: 'inherit' }}
        >
          <ChevronLeft size={16} /> Voltar ao Dashboard
        </Link>
        <header className="mobile-col-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Logo size={120} />
            <div>
              <h1 style={{ 
                fontSize: '2.2rem', 
                fontWeight: 900, 
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, var(--text) 0%, var(--primary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.25rem'
              }}>
                {activeTab === 'home' ? 'Painel Administrativo' : activeTab === 'users' ? 'Gestão de Usuários' : activeTab === 'content' ? 'Gestão de Conteúdo' : 'Validação de Acesso'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, opacity: 0.7 }}>
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
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{userCount}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Usuários Cadastrados</p>
                </div>
                <div className="data-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <BookOpen size={32} style={{ marginBottom: '1rem', color: 'var(--success)' }} />
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{courseCount}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Cursos Ativos</p>
                </div>
                <div className="data-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.05) 100%)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <FileText size={32} style={{ marginBottom: '1rem', color: 'var(--warning)' }} />
                  <h3 style={{ fontSize: '2rem', margin: 0 }}>{pendingCount}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>Pendências de Validação</p>
                </div>
              </div>
            )}
            
            {activeTab === 'users' && (
              <UserManagement 
                users={users}
                allNucleos={allNucleos}
                searchTerm={searchTerm}
                userRole={userRole}
                actionLoading={actionLoading}
                setShowAddAdmin={setShowAddAdmin}
                handleTypeChange={handleTypeChange}
                handleApproveAccess={handleApproveAccess}
                handleToggleBlock={handleToggleBlock}
                handleToggleGratuidade={handleToggleGratuidade}
                handleUpdateUserNucleo={handleUpdateUserNucleo}
                handleUpdateUserName={handleUpdateUserName}
                handleDeleteUser={async (userId: string) => setConfirmDelete({ type: 'user', id: userId, title: 'Tem certeza que deseja excluir este usuário?' })}
                onAddNucleo={() => { setActiveTab('nucleos'); setNucleosAutoOpenAdd(true); }}
              />
            )}

            {activeTab === 'content' && (
              <ContentManagement
                courses={courses}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                selectedLesson={selectedLesson}
                setSelectedLesson={setSelectedLesson}
                books={books}
                lessons={lessons}
                lessonItems={lessonItems}
                userRole={userRole}
                actionLoading={actionLoading}
                fetchData={fetchData}
                fetchBooks={fetchBooks}
                fetchLessons={fetchLessons}
                fetchLessonItems={fetchLessonItems}
                handleDelete={handleDelete}
                handleRemoveFile={handleRemoveFileFinal}
                handleFileUpload={handleFileUpload}
                handleReorder={handleReorder}
                handleMoveTo={handleMoveTo}
                setShowAddCourse={setShowAddCourse}
                setShowAddBook={setShowAddBook}
                setShowAddLesson={setShowAddLesson}
                setShowAddContent={setShowAddContent}
                setAddingLessonType={setAddingLessonType}
                setAddingBloco={setAddingBloco}
                setEditingItem={setEditingItem}
                setEditingLessonContent={setEditingLessonContent}
                setLessonBlocks={setLessonBlocks}
                setLessonMaterials={setLessonMaterials}
                setEditingQuiz={setEditingQuiz}
                setQuizQuestions={setQuizQuestions}
                uploading={uploading}
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
              <NucleosPanel 
                userRole={userRole || 'professor'} 
                autoOpenAddModal={nucleosAutoOpenAdd}
                onModalClose={() => setNucleosAutoOpenAdd(false)}
              />
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
          newTeacherNome={newTeacherNome}
          setNewTeacherNome={setNewTeacherNome}
          newTeacherPassword={newTeacherPassword}
          setNewTeacherPassword={setNewTeacherPassword}
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
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          fetchLessons={fetchLessons}
          showToast={showToast}
          lessons={lessons}
        />

        <AddContentModal
          showAddContent={showAddContent}
          setShowAddContent={setShowAddContent}
          selectedLesson={selectedLesson}
          addingLessonType={addingLessonType}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          fetchLessonItems={fetchLessonItems}
          showToast={showToast}
          lessonItems={lessonItems}
          addingBloco={addingBloco}
          normalizeFileName={normalizeFileName}
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
          fetchLessonItems={fetchLessonItems}
          selectedCourse={selectedCourse}
          selectedBook={selectedBook}
          selectedLesson={selectedLesson}
          showToast={showToast}
          lessons={lessons}
          normalizeFileName={normalizeFileName}
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
          normalizeFileName={normalizeFileName}
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

        {confirmDelete && (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(255, 77, 77, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Trash2 size={30} color="var(--error)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{confirmDelete.title}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Esta ação não pode ser desfeita.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} disabled={!!actionLoading}>Cancelar</button>
                <button 
                  className="btn" 
                  style={{ background: 'var(--error)', color: '#fff' }} 
                  onClick={() => {
                    if (confirmDelete.type === 'user') {
                      handleDeleteUser(confirmDelete.id);
                    } else if (confirmDelete.type === 'content' && confirmDelete.column) {
                      handleRemoveFileFinal(confirmDelete.table as any, confirmDelete.id, confirmDelete.column as any);
                    } else if (confirmDelete.type === 'content') {
                      const table = confirmDelete.table as 'cursos' | 'livros' | 'aulas';
                      const id = confirmDelete.id;
                      setActionLoading(id);
                      (async () => {
                        try {
                          const { error } = await supabase.from(table).delete().eq('id', id);
                          if (error) {
                            showToast(error.message, 'error');
                          } else {
                            showToast('Excluído com sucesso!');
                            if (table === 'cursos') fetchData();
                            else if (table === 'livros' && selectedCourse?.id) fetchBooks(selectedCourse.id);
                            else if (table === 'aulas' && selectedBook?.id) fetchLessons(selectedBook.id);
                          }
                        } catch (err: any) {
                          showToast('Erro: ' + err.message, 'error');
                        } finally {
                          setActionLoading(null);
                          setConfirmDelete(null);
                        }
                      })();
                    }
                  }}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? <Loader2 className="spinner" size={18} /> : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bottom-nav-footer">
          <button onClick={() => navigate(-1)} className="btn btn-outline">
            <ChevronLeft size={20} /> Voltar
          </button>
          <button onClick={() => navigate('/admin')} className="btn btn-primary">
            <LayoutDashboard size={20} /> Início
          </button>
        </div>
      </main>

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

      {/* CSS para Animações e Modais */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Admin
