import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { useProfile } from './useProfile'
import { QuizQuestion } from '../types/admin'

export type Tab = 'home' | 'users' | 'alumni' | 'content' | 'nucleos' | 'settings' | 'finance' | 'forum' | 'attendance' | 'professors' | 'analytics' | 'reports' | 'docs_archive' | 'academic'

export const useAdminManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['home', 'users', 'alumni', 'content', 'nucleos', 'settings', 'finance', 'forum', 'attendance', 'professors', 'analytics', 'reports', 'docs_archive', 'academic'];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const dashboardView = useMemo(() => (searchParams.get('view') || 'main') as 'main' | 'users' | 'admin_tools', [searchParams]);
  const userTypeFilter = useMemo(() => searchParams.get('filter'), [searchParams]);

  const updateParams = (newParams: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else params.set(key, value);
      });
      return params;
    });
  };

  const setActiveTab = (newTab: Tab) => updateParams({ tab: newTab, view: 'main', filter: null, courseId: null, bookId: null, lessonId: null });
  const setDashboardView = (view: string) => updateParams({ view });
  const setUserTypeFilter = (filter: string | null) => updateParams({ filter });
  const [userRole, setUserRole] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [professors, setProfessors] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [financeReport, setFinanceReport] = useState<any[]>([])
  const [userCount, setUserCount] = useState(0)
  const [courseCount, setCourseCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [newTeacherEmail, setNewTeacherEmail] = useState('')
  const [newTeacherNome, setNewTeacherNome] = useState('')
  const [newTeacherPassword, setNewTeacherPassword] = useState('')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [selectedCourse, setSelectedCourseState] = useState<any | null>(null)
  const [selectedBook, setSelectedBookState] = useState<any | null>(null)
  const [selectedLesson, setSelectedLessonState] = useState<any | null>(null)
  const setSelectedCourse = (val: any) => updateParams({ courseId: val?.id || null, bookId: null, lessonId: null });
  const setSelectedBook = (val: any) => updateParams({ bookId: val?.id || null, lessonId: null });
  const setSelectedLesson = (val: any) => updateParams({ lessonId: val?.id || null });
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
  const [pendingStudentsCount, setPendingStudentsCount] = useState(0)
  const [pendingProofsCount, setPendingProofsCount] = useState(0)
  const [pendingDocsCount, setPendingDocsCount] = useState(0)
  const [pendingPaysCount, setPendingPaysCount] = useState(0)
  const [pendingDocs, setPendingDocs] = useState<any[]>([])
  const [pendingPaysValidation, setPendingPaysValidation] = useState<any[]>([])
  const [pendingUsersByNucleo, setPendingUsersByNucleo] = useState<Record<string, number>>({})
  const [pendingActivityByNucleo, setPendingActivityByNucleo] = useState<Record<string, any>>({})
  const [academicReport, setAcademicHistory] = useState<any[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'content', id: string, table?: string, column?: string, title: string } | null>(null);

  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading) {
      if (!profile || !['admin', 'suporte'].includes(profile.tipo || '')) {
        navigate('/dashboard');
        return;
      }
      setUserRole(profile.tipo);
      setUserRole(profile.tipo);
      setAvailableRoles(profile.caminhos_acesso || []);
      setLoading(false);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (userRole) {
      fetchData()
      if (userRole === 'admin') {
        fetchNucleosGlobal()
        fetchPendingCounts()
      }
    }
  }, [activeTab, userRole])

  // NEW: Persistence Recovery Effect
  useEffect(() => {
    if (!loading && userRole) {
      const cId = searchParams.get('courseId');
      const bId = searchParams.get('bookId');
      const lId = searchParams.get('lessonId');

      if (cId && (!selectedCourse || selectedCourse.id !== cId)) {
        supabase.from('cursos').select('*, livros(count)').eq('id', cId).single().then(({ data }) => {
          if (data) { setSelectedCourseState(data); fetchBooks(cId); }
        });
      } else if (!cId) {
        setSelectedCourseState(null);
      }

      if (bId && (!selectedBook || selectedBook.id !== bId)) {
        supabase.from('livros').select('*, aulas(count)').eq('id', bId).single().then(({ data }) => {
          if (data) { setSelectedBookState(data); fetchLessons(bId); }
        });
      } else if (!bId) {
        setSelectedBookState(null);
      }

      if (lId && (!selectedLesson || selectedLesson.id !== lId)) {
        supabase.from('aulas').select('*').eq('id', lId).single().then(({ data }) => {
          if (data) { setSelectedLessonState(data); fetchLessonItems(lId); }
        });
      } else if (!lId) {
        setSelectedLessonState(null);
      }
    }
  }, [searchParams, userRole, loading]);

  // NEW: Auto-Forward logic for user selection tiles
  useEffect(() => {
    if (activeTab === 'home' && dashboardView === 'users' && userTypeFilter) {
      updateParams({ tab: 'users' });
    }
  }, [activeTab, dashboardView, userTypeFilter]);

  const fetchNucleosGlobal = async () => {
    const { data } = await supabase.from('nucleos').select('*')
    if (data) setAllNucleos(data)
  }

  const fetchPendingCounts = async () => {
    const { data } = await supabase.from('users').select('id, nucleo_id').or('acesso_definitivo.is.null,acesso_definitivo.eq.false')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(u => {
        const nId = u.nucleo_id || 'none'
        counts[nId] = (counts[nId] || 0) + 1
      })
      setPendingUsersByNucleo(counts)
    }
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
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: 'max-age=31536000' })
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
      const payload = { ...item };
      // Remover campos virtuais/relacionais que não existem na tabela original
      delete (payload as any).children;
      delete (payload as any).count;
      delete (payload as any).professores;
      delete (payload as any).nucleos;

      return {
        ...payload,
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
        const [usersCount, coursesCount, docsCount, paysCount, proofsPending] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('cursos').select('id', { count: 'exact', head: true }),
          supabase.from('documentos').select('id', { count: 'exact', head: true }).not('url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
          supabase.from('pagamentos').select('id', { count: 'exact', head: true }).not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
          supabase.from('respostas_aulas')
            .select('id, aulas!inner(is_bloco_final)', { count: 'exact', head: true })
            .is('nota', null)
            .eq('aulas.is_bloco_final', true)
        ]);
        
        setUserCount(usersCount.count || 0);
        setCourseCount(coursesCount.count || 0);
        
        const financeCount = (docsCount.count || 0) + (userRole === 'admin' ? (paysCount.count || 0) : 0);
        setPendingCount(financeCount);
        setPendingFinanceCount(financeCount);
        setPendingProofsCount(proofsPending.count || 0);

        // Fetch pending students count
        const { count: studentsCount } = await supabase.from('users')
          .select('id', { count: 'exact', head: true })
          .or('acesso_definitivo.is.null,acesso_definitivo.eq.false');
        setPendingStudentsCount(studentsCount || 0);
        
        setUsers([]);
        setCourses([]);
        setPendingDocs([]);
        setPendingPays([]);
      } else if (activeTab === 'users') {
        const { data: usersData } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
        
        // Fetch User IDs with pending payments (receipts waiting validation)
        const { data: payIds } = await supabase.from('pagamentos').select('user_id').not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)')
        
        const pendingUserIds = new Set(payIds?.map(p => p.user_id) || [])

        if (usersData) {
          const enrichedUsers = usersData.map(u => ({
            ...u,
            hasPendingPayment: pendingUserIds.has(u.id)
          }))
          setUsers(enrichedUsers)
          
          // Calculate pending counts per nucleus
          const activity: Record<string, { students: number; payments: number }> = {}
          
          enrichedUsers.forEach(u => {
            const nId = u.nucleo_id || 'none'
            if (!activity[nId]) activity[nId] = { students: 0, payments: 0 }
            
            if (u.acesso_definitivo === false || u.acesso_definitivo === null) {
              activity[nId].students++
            }
            if (u.hasPendingPayment) {
              activity[nId].payments++
            }
          })
          
          setPendingActivityByNucleo(activity)
          
          // Legacy count for backwards compatibility
          const legacyCounts: Record<string, number> = {}
          Object.entries(activity).forEach(([id, counts]) => {
            legacyCounts[id] = counts.students
          })
          setPendingUsersByNucleo(legacyCounts)
        }
      } else if (activeTab === 'content') {
        const { data } = await supabase.from('cursos').select('*, livros(count)')
        if (data) setCourses(data)
      } else if (activeTab === 'settings' && userRole === 'admin') {
        const { data } = await supabase.from('configuracoes').select('chave, valor');
        if (data) {
          data.forEach(item => {
            if (item.chave === 'pix_key') setPixKey(item.valor);
            if (item.chave === 'pix_qr_url') setPixQrUrl(item.valor);
          });
        }
      } else if (activeTab === 'professors') {
        const { data } = await supabase
          .from('users')
          .select('*, professor_nucleo(nucleos(nome))')
          .eq('tipo', 'professor')
          .order('nome');
        if (data) setProfessors(data);
      } else if (activeTab === 'attendance') {
        const { data } = await supabase
          .from('frequencia')
          .select('*, aluno:users!aluno_id(nome, email), nucleo:nucleos(nome), professor:users!professor_id(nome)')
          .eq('compartilhado', true)
          .order('data', { ascending: false });
        if (data) setAttendanceRecords(data);
      } else if (activeTab === 'finance') {
        const [docsData, paysData] = await Promise.all([
          supabase.from('documentos').select('*, users(id, nome, email, nucleo, nucleo_id, nucleos(nome))').not('url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
          supabase.from('pagamentos').select('*, users(id, nome, email, nucleo, nucleo_id, nucleos(nome))').not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)')
        ]);
        if (docsData.data) setPendingDocs(docsData.data);
        if (paysData.data) setPendingPaysValidation(paysData.data);
      } else if (activeTab === 'analytics') {
        const { data } = await supabase
          .from('portal_access_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5000);
          
        if (data) {
          // Process statistics
          const totalViews = data.length;
          const uniqueSessions = new Set(data.map(l => l.session_id)).size;
          const registeredViews = data.filter(l => l.user_type === 'registrado').length;
          const visitorViews = data.filter(l => l.user_type === 'visitante').length;
          
          // Daily Active Users (Unique registered users today)
          const today = new Date().toISOString().split('T')[0];
          const dau = new Set(data.filter(l => l.user_type === 'registrado' && l.created_at.startsWith(today)).map(l => l.user_id)).size;
          
          // Rotation / Activity trend (last 7 days unique sessions)
          const last7Days = new Date();
          last7Days.setDate(last7Days.getDate() - 7);
          const activeLast7 = new Set(data.filter(l => new Date(l.created_at) > last7Days).map(l => l.session_id)).size;

          setAnalyticsData({
            totalViews,
            uniqueSessions,
            registeredViews,
            visitorViews,
            dau,
            activeLast7,
            logs: data.slice(0, 100)
          });
        }
      } else if (activeTab === 'reports' && userRole === 'admin') {
        const { data: reportPays, error } = await supabase
          .from('pagamentos')
          .select('id, valor, status, data_vencimento, comprovante_url, feedback, modulo, users(id, nome, email, nucleo, nucleo_id, nucleos(nome))')
          .order('data_vencimento', { ascending: false });
        
        if (reportPays) setFinanceReport(reportPays);
        if (error) throw error;
      } else if (activeTab === 'academic') {
        const { data: academicData, error } = await supabase
          .from('respostas_aulas')
          .select(`
            id, 
            nota, 
            status, 
            updated_at,
            aulas:aula_id ( id, titulo, is_bloco_final, livros ( id, titulo ) ), 
            users:aluno_id ( id, nome, email, tipo, ano_graduacao, nucleos ( id, nome ) )
          `)
          .not('nota', 'is', null)
          .order('updated_at', { ascending: false });
        
        if (academicData) setAcademicReport(academicData);
        if (error) throw error;
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

  const handleValidar = async (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado', modulo?: string) => {
    const feedback = status === 'rejeitado' ? prompt('Motivo da rejeição:') : null
    if (status === 'rejeitado' && !feedback) return

    setActionLoading(id)
    try {
      const isPay = target === 'pay'
      const table = isPay ? 'pagamentos' : 'documentos'
      const finalStatus = status === 'aprovado' ? 'aprovado' : 'rejeitado'
      
      const { error } = await supabase
        .from(table)
        .update({ 
          status: finalStatus,
          feedback,
          modulo: modulo || null
        })
        .eq('id', id)

      if (error) throw error

      // Ativação automática do usuário ao aprovar pagamento
      if (status === 'aprovado' && isPay) {
        const { data: payData } = await supabase.from('pagamentos').select('user_id').eq('id', id).single()
        if (payData?.user_id) {
          await supabase.from('users').update({ acesso_definitivo: true }).eq('id', payData.user_id)
        }
      }

      showToast(`${target === 'doc' ? 'Documento' : 'Pagamento'} ${status} com sucesso!`)
      fetchData()
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteValidation = async (target: 'doc' | 'pay', id: string) => {
    if (!window.confirm(`Deseja realmente EXCLUIR este registro de ${target === 'doc' ? 'documento' : 'pagamento'}? Esta ação é irreversível.`)) return

    setActionLoading(id)
    try {
      const table = target === 'doc' ? 'documentos' : 'pagamentos'
      const { error } = await supabase.from(table).delete().eq('id', id)
      
      if (error) throw error
      showToast('Registro excluído com sucesso!')
      fetchData()
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error')
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
      const nucleoObj = allNucleos.find(n => n.id === nucleoId);
      const nucleoNome = nucleoObj ? nucleoObj.nome : 'Sem Núcleo';
      
      const { error } = await supabase.from('users').update({ 
        nucleo_id: nucleoId || null,
        nucleo: nucleoId ? nucleoNome : null,
        status_nucleo: 'aprovado'
      }).eq('id', userId)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        nucleo_id: nucleoId || null, 
        nucleo: nucleoId ? nucleoNome : null,
        status_nucleo: 'aprovado',
        nucleos: nucleoId ? { id: nucleoId, nome: nucleoNome } : null
      } : u))
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

  const handleResetProgress = async (userId: string) => {
    if (!window.confirm('ATENÇÃO: Deseja realmente resetar TODO o progresso e avaliações deste aluno? Esta ação removerá permanentemente todas as notas e aulas assistidas.')) return;
    
    setActionLoading(userId);
    try {
      const { error: errorRes } = await supabase.from('respostas_aulas').delete().eq('aluno_id', userId);
      if (errorRes) throw errorRes;
      
      const { error: errorProg } = await supabase.from('progresso').delete().eq('aluno_id', userId);
      if (errorProg) throw errorProg;
      
      showToast('Atividades e progresso resetados com sucesso!');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao resetar: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
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
    const modulo = prompt('Informe o Módulo deste pagamento (ex: 1, 2, 3...):', '1');
    if (modulo === null) return;

    if (!window.confirm(`Deseja registrar o pagamento manual do Módulo ${modulo} para este aluno?`)) return;
    
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
            feedback: 'Registrado manualmente pela administração',
            modulo: modulo
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
          feedback: 'Registrado manualmente pela administração',
          modulo: modulo
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
        auth: { 
          persistSession: false, 
          autoRefreshToken: false, 
          detectSessionInUrl: false,
          storageKey: 'fatesa-temp-auth'
        }
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

      if (signUpError) {
        if (signUpError.status === 422 || signUpError.message?.includes('already registered')) {
          throw new Error('Este e-mail já possui uma conta no sistema. Use o e-mail como acesso ou solicite recuperação de senha.');
        }
        throw signUpError;
      }

      showToast('Professor cadastrado e autorizado com sucesso!')
      setShowAddTeacher(false)
      setNewTeacherEmail('')
      setNewTeacherNome('')
      setNewTeacherPassword('')
      fetchData()
    } catch (err: any) {
      showToast(err.message, 'error')
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
          detectSessionInUrl: false,
          storageKey: 'fatesa-temp-auth'
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

      if (signUpError) {
        if (signUpError.status === 422 || signUpError.message?.includes('already registered')) {
          throw new Error('Este e-mail já possui uma conta no sistema. Use o e-mail como acesso ou solicite recuperação de senha.');
        }
        throw signUpError;
      }

      showToast('Administrador cadastrado com sucesso!')
      setShowAddAdmin(false)
      fetchData()
    } catch (err: any) {
      showToast(err.message, 'error')
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
      const { error: uploadError } = await supabase.storage.from('livros').upload(`assets/${fileName}`, file, { cacheControl: 'max-age=31536000' });
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

  const handleDeleteNucleo = async (nucleoId: string) => {
    if (!window.confirm('Deseja realmente excluir este núcleo? Todas as faturas e alunos vinculados ficarão órfãos de polo. Esta ação é definitiva.')) return
    
    setActionLoading(`delete_nuc_${nucleoId}`)
    try {
      const { error } = await supabase.from('nucleos').delete().eq('id', nucleoId)
      if (error) throw error
      showToast('Núcleo excluído com sucesso!')
      setAllNucleos(prev => {
        const updated = prev.filter(n => n.id !== nucleoId)
        return updated
      })
    } catch(err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetAutoCorrectedExams = async () => {
    if (!window.confirm('ATENÇÃO: Deseja realmente resetar todas as provas que foram corrigidas automaticamente? Estas provas voltarão para a fila dos professores dos respectivos núcleos com nota 0 para permitir uma correção manual justa.')) return;
    
    setActionLoading('reset-exams');
    try {
      // 1. Buscar submissões de provas auto-corrigidas
      // Critério: status corrigida, sem data de primeira correção manual, sem comentário, e sendo do tipo prova ou bloco final.
      const { data: subs, error: fetchError } = await supabase
        .from('respostas_aulas')
        .select(`
          id,
          aulas!inner ( id, tipo, is_bloco_final )
        `)
        .eq('status', 'corrigida')
        .is('primeira_correcao_at', null)
        .or('comentario_professor.is.null,comentario_professor.eq.""')
        .or('is_bloco_final.eq.true,tipo.eq.prova', { foreignTable: 'aulas' });

      if (fetchError) throw fetchError;
      
      if (!subs || subs.length === 0) {
        showToast('Nenhuma prova auto-corrigida foi encontrada para resetar.');
        return;
      }

      const ids = subs.map(s => s.id);
      
      // 2. Update status e reset da nota para 0
      const { error: updateError } = await supabase
        .from('respostas_aulas')
        .update({ 
          status: 'pendente', 
          nota: 0,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (updateError) throw updateError;
      
      showToast(`${ids.length} provas foram retornadas com sucesso para a fila de correção dos professores!`);
      fetchData(); // Recarregar contadores no dashboard
    } catch (err: any) {
      showToast('Erro ao resetar: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return {
    profile,
    activeTab,
    setActiveTab,
    dashboardView,
    setDashboardView,
    userTypeFilter,
    setUserTypeFilter,
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
    attendanceRecords,
    professors,
    pendingUsersByNucleo,
    analyticsData,
    financeReport,
    fetchData,
    fetchPendingCounts,
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
    handleResetProgress,
    handleManualPayment,
    handleAddTeacher,
    handleAddAdmin,
    handleSaveSettings,
    handleUploadQrCode,
    handleDeleteValidation,
    normalizeFileName,
    pendingProofsCount,
    pendingStudentsCount,
    pendingDocsCount,
    pendingPaysCount,
    pendingDocs,
    pendingPaysValidation,
    academicReport,
    pendingActivityByNucleo,
    handleDeleteNucleo,
    handleResetAutoCorrectedExams,
    updateParams
  }
}
