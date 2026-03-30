import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { useProfile } from './useProfile'
import { QuizQuestion } from '../types/admin'

export type Tab = 'home' | 'users' | 'alumni' | 'content' | 'validation' | 'nucleos' | 'settings' | 'finance' | 'forum'

export const useAdminManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
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
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [lessonItems, setLessonItems] = useState<any[]>([]) 
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
  
  const [pixKey, setPixKey] = useState('')
  const [pixQrUrl, setPixQrUrl] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [nucleosAutoOpenAdd, setNucleosAutoOpenAdd] = useState(false)
  
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'content', id: string, table?: string, column?: string, title: string } | null>(null);

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
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^\w.-]/g, '_') 
      .replace(/\s+/g, '_'); 
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(id)
    try {
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

  const handleReorder = async (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas') => {
    const idx = items.findIndex(i => i.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    const current = items[idx]
    const swap = items[swapIdx]

    try {
      await Promise.all([
        supabase.from(table).update({ ordem: swap.ordem }).eq('id', current.id),
        supabase.from(table).update({ ordem: current.ordem }).eq('id', swap.id)
      ])
      fetchFn()
    } catch (err: any) {
      showToast('Erro ao reordenar: ' + err.message, 'error')
    }
  }

  const handleMoveTo = async (id: string, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas', targetBlocoId?: number | null) => {
    if (id === targetId) return;
    
    const newItems = [...items];
    const dragIdx = newItems.findIndex(i => i.id === id);
    if (dragIdx === -1) return;

    const [draggedItem] = newItems.splice(dragIdx, 1);
    
    if (targetBlocoId !== undefined) {
      draggedItem.bloco_id = targetBlocoId;
      newItems.push(draggedItem); 
    } else if (targetId) {
      const targetIdx = newItems.findIndex(i => i.id === targetId);
      if (targetIdx !== -1) {
        const targetItem = newItems[targetIdx];
        newItems.splice(targetIdx, 0, draggedItem);
        draggedItem.bloco_id = targetItem.bloco_id;
      } else {
        newItems.push(draggedItem);
      }
    }
    
    const updates = newItems.map((item, index) => {
      const { children, count, professores, nucleos, ...rest } = item;
      return {
        ...rest,
        ordem: index + 1,
        bloco_id: item.bloco_id
      };
    });

    try {
      setActionLoading('reorder-all');
      
      const updatePromises = updates.map(update => {
        const { id: itemId, ...payload } = update;
        return supabase
          .from(table)
          .update(payload)
          .eq('id', itemId);
      });

      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error)?.error;
      
      if (firstError) throw firstError;
      
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
    if (!courseId) return
    const { data } = await supabase.from('livros').select('*, aulas(count)').eq('curso_id', courseId).order('ordem')
    if (data) setBooks(data)
  }

  const fetchLessons = async (bookId: string) => {
    if (!bookId) return
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
    if (!lessonId) return
    setActionLoading('fetch-lesson-items')
    const { data } = await supabase
      .from('aulas')
      .select('*')
      .eq('parent_aula_id', lessonId)
      .order('ordem')
    if (data) setLessonItems(data)
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

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId)
    try {
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

  const handleManualPayment = async (userId: string) => {
    if (!window.confirm('Deseja registrar o pagamento manual para este aluno? Isso liberará o acesso caso ele esteja bloqueado.')) return;
    
    setActionLoading(userId);
    try {
      const { data: openPays } = await supabase
        .from('pagamentos')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'aberto')
        .order('data_vencimento', { ascending: false })
        .limit(1);

      if (openPays && openPays.length > 0) {
        const { error } = await supabase
          .from('pagamentos')
          .update({ 
            status: 'pago',
            feedback: 'Registrado manualmente pela administração'
          })
          .eq('id', openPays[0].id);

        if (error) throw error;
        showToast('Pagamento registrado com sucesso!');
      } else {
        const { error } = await supabase.from('pagamentos').insert({
          user_id: userId,
          valor: 70,
          status: 'pago',
          data_vencimento: new Date().toISOString().split('T')[0],
          descricao: 'Pagamento Manual (Avulso)',
          feedback: 'Registrado manualmente pela administração'
        });
        if (error) throw error;
        showToast('Novo pagamento registrado com sucesso!');
      }
      
      fetchData();
    } catch (err: any) {
      showToast('Erro ao registrar pagamento: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('add-teacher')
    try {
      const { error: authError } = await supabase
        .from('professores_autorizados')
        .insert({
          email: newTeacherEmail,
          nome: newTeacherNome
        })
      
      if (authError && !authError.message.includes('unique constraint')) {
        throw authError
      }

      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })

      const { error: signUpError } = await tempClient.auth.signUp({
        email: newTeacherEmail,
        password: newTeacherPassword,
        options: {
          data: {
            full_name: newTeacherNome,
            student_type: 'professor',
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

      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })

      const { error: signUpError } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
            student_type: tipo,
            acesso_definitivo: true,
            nucleo_id: (formData.get('nucleo_id') as string) || null
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

  return {
    profile,
    activeTab,
    setActiveTab,
    userRole,
    users,
    courses,
    pendingDocs,
    pendingPays,
    userCount,
    courseCount,
    pendingCount,
    loading,
    actionLoading,
    setActionLoading,
    searchTerm,
    setSearchTerm,
    showAddTeacher,
    setShowAddTeacher,
    newTeacherEmail,
    setNewTeacherEmail,
    newTeacherNome,
    setNewTeacherNome,
    newTeacherPassword,
    setNewTeacherPassword,
    availableRoles,
    showRoleSwitcher,
    setShowRoleSwitcher,
    showAddAdmin,
    setShowAddAdmin,
    toast,
    setToast,
    selectedCourse,
    setSelectedCourse,
    selectedBook,
    setSelectedBook,
    selectedLesson,
    setSelectedLesson,
    books,
    setBooks,
    lessons,
    setLessons,
    lessonItems,
    setLessonItems,
    showAddCourse,
    setShowAddCourse,
    showAddBook,
    setShowAddBook,
    showAddLesson,
    setShowAddLesson,
    showAddContent,
    setShowAddContent,
    allNucleos,
    editingItem,
    setEditingItem,
    editingQuiz,
    setEditingQuiz,
    quizQuestions,
    setQuizQuestions,
    addingLessonType,
    setAddingLessonType,
    addingBloco,
    setAddingBloco,
    editingLessonContent,
    setEditingLessonContent,
    lessonBlocks,
    setLessonBlocks,
    lessonMaterials,
    setLessonMaterials,
    pixKey,
    setPixKey,
    pixQrUrl,
    setPixQrUrl,
    uploading,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    nucleosAutoOpenAdd,
    setNucleosAutoOpenAdd,
    confirmDelete,
    setConfirmDelete,
    fetchData,
    fetchNucleosGlobal,
    showToast,
    handleFileUpload,
    handleReorder,
    handleMoveTo,
    fetchBooks,
    fetchLessons,
    fetchLessonItems,
    handleValidar,
    handleTypeChange,
    handleApproveAccess,
    handleToggleBlock,
    handleToggleGratuidade,
    handleUpdateUserNucleo,
    handleUpdateUserName,
    handleDeleteUser,
    handleRemoveFileFinal,
    handleManualPayment,
    handleAddTeacher,
    handleAddAdmin,
    handleSaveSettings,
    handleUploadQrCode,
    normalizeFileName
  }
}
