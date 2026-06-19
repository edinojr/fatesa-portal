import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Users, 
  BookOpen, 
  FileText, 
  Settings, 
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  XCircle,
  Loader2, 
  GraduationCap,
  ChevronLeft,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  MapPin,
  TrendingUp,
  History,
  LayoutGrid,
  ExternalLink,
  ArrowLeft,
  Search,
  ChevronDown,
  ClipboardList
} from 'lucide-react'

// Features Components
import UserManagement from '../features/users/components/UserManagement'
import AlumniManagement from '../features/users/components/AlumniManagement'
import ContentManagement from '../features/courses/components/ContentManagement'
import SettingsPanel from '../features/finance/components/SettingsPanel'
import ProfessorsManagement from '../features/users/components/ProfessorsManagement'
import AnalyticsDashboard from '../features/admin/components/AnalyticsDashboard'
import FinanceReport from '../features/finance/components/FinanceReport'
import AcademicHistory from '../features/admin/components/AcademicHistory'
import GradeHistoryInsertion from '../features/admin/components/GradeHistoryInsertion'
import DocsArchive from '../features/admin/components/DocsArchive'
import BoletimPanel from '../features/professor/components/BoletimPanel'

// Icons and UI
import { Folder } from 'lucide-react'

// Legacy / Shared Components
import NucleosPanel from '../components/NucleosPanel'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ForumPanel from '../features/forum/components/ForumPanel'
import ValidationPanel from '../features/finance/components/ValidationPanel'

// Modals
import LessonContentEditorModal from '../features/courses/components/modals/LessonContentEditorModal'
import QuizEditorModal from '../features/courses/components/modals/QuizEditorModal'
import { 
  AddTeacherModal, 
  AddCourseModal, 
  AddBookModal, 
  AddLessonModal, 
  AddContentModal, 
  EditItemModal, 
  AddAdminModal 
} from '../features/courses/components/modals/ContentModals'

// Hook
import { useAdminManagement } from '../hooks/useAdminManagement'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/layout/PageHeader'

const Admin = () => {
  const navigate = useNavigate()
  
  useEffect(() => {
    // No need to force set 'admin' every time, 
    // as it will be set when the user explicitly chooses the Admin Panel
  }, [])

  const goToPanel = () => {
    navigate('/dashboard');
  };

  const {
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
    showToast,
    allNucleos,
    handleDeleteSubmission,
    selectedCourse,
    setSelectedCourse,
    selectedBook,
    setSelectedBook,
    selectedLesson,
    setSelectedLesson,
    books,
    lessons,
    lessonItems,
    showAddCourse,
    setShowAddCourse,
    showAddBook,
    setShowAddBook,
    showAddLesson,
    setShowAddLesson,
    showAddContent,
    setShowAddContent,
    editingItem,
    setEditingItem,
    editingQuiz,
    setEditingQuiz,
    quizQuestions,
    setQuizQuestions,
    pendingExamMeta: adminPendingExamMeta,
    setPendingExamMeta: setAdminPendingExamMeta,
    uploading,
    nucleosAutoOpenAdd,
    setNucleosAutoOpenAdd,
    confirmDelete,
    setConfirmDelete,
    fetchData,
    handleFileUpload,
    handleBatchUpload,
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
    attendanceRecords,
    professors,
    pendingUsersByNucleo,
    pendingActivityByNucleo,
    analyticsData,
    financeReport,
    pendingDocsCount,
    pendingPaysCount,
    pendingDocs,
    pendingPaysValidation,
    pendingStudentsCount,
    pendingProofsCount,
    academicReport,
    handleDeleteNucleo,
    handleResetAutoCorrectedExams,
    updateParams
  } = useAdminManagement()

  const [boletimSubmissions, setBoletimSubmissions] = useState<any[]>([])
  const [addingLessonType, setAddingLessonType] = useState('')
  const [addingBloco, setAddingBloco] = useState<number | null>(null)
  const [editingLessonContent, setEditingLessonContent] = useState<any>(null)
  const [lessonBlocks, setLessonBlocks] = useState<any[]>([])
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([])

  const fetchBoletimSubmissions = useCallback(async () => {
    const { data: subDataRaw } = await supabase
      .from('respostas_aulas')
      .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas')
      .order('created_at', { ascending: false })
    if (!subDataRaw) return
    const aulaIds = Array.from(new Set(subDataRaw.map(r => r.aula_id).filter(Boolean)))
    const alunoIds = Array.from(new Set(subDataRaw.map(r => r.aluno_id).filter(Boolean)))
    const [aulasRes, usersRes] = await Promise.all([
      aulaIds.length > 0 ? supabase.from('aulas').select('id, titulo, tipo, questionario, min_grade, versao, livro_id(id, titulo)').in('id', aulaIds) : Promise.resolve({ data: [] }),
      alunoIds.length > 0 ? supabase.from('users').select('id, nome, email, nucleo_id, nucleos(id, nome)').in('id', alunoIds) : Promise.resolve({ data: [] })
    ])
    const aulasMap = (aulasRes.data || []).reduce((acc: any, a: any) => { acc[a.id] = a; return acc }, {} as any)
    const usersMap = (usersRes.data || []).reduce((acc: any, u: any) => { acc[u.id] = u; return acc }, {} as any)
    const mapped = (subDataRaw || []).map((r: any) => {
      const aula = aulasMap[r.aula_id]
      const user = usersMap[r.aluno_id]
      return { ...r, submission_id: r.id, student_id: r.aluno_id, lesson_id: r.aula_id, lesson_title: aula?.titulo, lesson_type: aula?.tipo, questionario: aula?.questionario, min_grade: aula?.min_grade, versao: aula?.versao, aulas: aula, student_name: user?.nome, student_email: user?.email, nucleus_id: user?.nucleos?.id, nucleus_name: user?.nucleos?.nome || 'Sem Polo', book_id: aula?.livro_id?.id, book_title: aula?.livro_id?.titulo || 'Módulo Geral', submitted_at: r.created_at }
    }).filter((s: any) => s.lesson_type === 'prova' || s.lesson_type === 'avaliacao')
    setBoletimSubmissions(mapped)
  }, [])

  useEffect(() => {
    if (activeTab === 'boletim') fetchBoletimSubmissions()
  }, [activeTab, fetchBoletimSubmissions])
  const [pixKey, setPixKey] = useState('')
  const [pixQrUrl, setPixQrUrl] = useState('')

  const totalPendingUsers = Object.values(pendingUsersByNucleo).reduce((acc: number, curr: any) => acc + (curr || 0), 0)

  const handleGlobalBack = () => {
    if (selectedLesson) { setSelectedLesson(null); return; }
    if (selectedBook) { setSelectedBook(null); return; }
    if (selectedCourse) { setSelectedCourse(null); return; }
    if (dashboardView !== 'main') { setDashboardView('main'); return; }
    if (activeTab !== 'home') { setActiveTab('home'); return; }
    window.history.back()
  }

  const isAtRoot = activeTab === 'home' && dashboardView === 'main'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <LoadingSpinner size={48} label="Validando credenciais..." />
      </div>
    )
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home': return 'Painel Administrativo';
      case 'users': return 'Gestão de Usuários';
      case 'professors': return 'Gestão de Professores';
      case 'alumni': return 'Base de Formados (Alumni)';
      case 'content': return 'Gestão de Conteúdo';
      case 'forum': return 'Fórum da Comunidade';
      case 'nucleos': return 'Gestão de Núcleos';
      case 'attendance': return 'Relatório de Frequência';
      case 'analytics': return 'Análise do Portal';
      case 'reports': return 'Relatório de Pagamentos';
      case 'grade_history': return 'Histórico de Notas';
      case 'docs_archive': return 'Arquivo de Documentação';
      case 'boletim': return 'Boletim de Notas';
      default: return 'Validação de Acesso';
    }
  }

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'home': return 'Visão geral do sistema e atalhos rápidos.';
      case 'users': return 'Administre os perfis, bloqueios e acessos.';
      case 'professors': return 'Visualize professores e seus núcleos vinculados.';
      case 'alumni': return 'Gerencie o banco de dados histórico de alunos formados.';
      case 'content': return 'Gerencie as matérias, livros e atividades.';
      case 'forum': return 'Acompanhe as discussões da comunidade.';
      case 'nucleos': return 'Gerencie polos e núcleos de ensino.';
      case 'attendance': return 'Acompanhe as listas de presença compartilhadas pelos professores.';
      case 'analytics': return 'Monitore visualizações, acessos únicos e rotatividade de usuários.';
      case 'reports': return 'Lista de alunos que enviaram comprovantes pelo portal.';
      case 'grade_history': return 'Insira e gerencie notas de módulos concluídos pelos alunos.';
      case 'docs_archive': return 'Central de arquivos organizada por polo e status.';
      case 'boletim': return 'Visualize e edite notas de provas e avaliações de todos os alunos.';
      default: return 'Verifique envios dos alunos.';
    }
  }

  const adminActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="nav-btn-premium"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
        >
          PAINEL ADMINISTRATIVO <ChevronDown size={14} />
        </button>
        {availableRoles.length > 1 && showRoleSwitcher && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            background: 'var(--bg-card)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '14px', 
            padding: '0.5rem', 
            zIndex: 1100, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.25rem', 
            minWidth: '200px', 
            marginTop: '0.5rem', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
          }}>
            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Painel Atual:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>Administração</span>
            </div>
            {availableRoles.filter((r: string) => ['aluno', 'professor', 'admin', 'coordenador_polo'].includes(r) && r !== userRole).map((r: string) => (
              <Link 
                key={r} 
                to={r === 'aluno' ? '/dashboard' : r === 'professor' ? '/professor' : r === 'coordenador_polo' ? '/coordenador' : '/admin'}
                className="nav-btn-premium" 
                style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', textDecoration: 'none', color: 'inherit', padding: '0.5rem' }}
                onClick={() => { localStorage.setItem('fatesa_active_role', r); setShowRoleSwitcher(false); }}
              >
                {r === 'aluno' ? '👁 Área do Aluno' : r === 'professor' ? '🎓 Painel do Professor' : r === 'coordenador_polo' ? '👥 Painel do Coordenador' : '🔧 Administração'}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="input-group" style={{ marginBottom: 0, width: '100%', maxWidth: '300px' }}>
        <label htmlFor="admin-global-search" style={{ display: 'none' }}>Pesquisar</label>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input 
            id="admin-global-search"
            name="admin-search"
            type="text" 
            placeholder="Pesquisar..." 
            className="form-control" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>
      <button 
        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
        className="nav-btn-premium danger"
        style={{ width: 'auto' }}
      >
        <LogOut size={18} /> <span className="mobile-hide">Sair</span>
      </button>
    </div>
  )

  return (
    <div className="admin-layout">
      <PageHeader
        title={getTabTitle()}
        subtitle={getTabSubtitle()}
        variant="admin"
        actions={adminActions}
        onBack={handleGlobalBack}
        showBackButton={!isAtRoot}
        showTopBanner={false}
      />

      <main className="admin-main">
        <div className="admin-scroll-content">
            {activeTab === 'home' && (
            <div className="admin-dashboard-grid transition-fade-in" style={{ gap: '2rem' }}>
              {/* CENTRAL DE ATIVIDADES (SINALIZAÇÃO) */}
              {dashboardView === 'main' && (
                <>

                  <div className="admin-action-card" onClick={() => setActiveTab('content')}>
                    <div className="icon-wrapper"><BookOpen size={32} /></div>
                    <h3>Conteúdo</h3>
                    <p>Gerencie cursos, módulos, aulas e materiais.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setDashboardView('users')}>
                    <div className="icon-wrapper"><Users size={32} /></div>
                    <h3>Gestão de Usuários</h3>
                    <p>Alunos, Professores, Administrativo e Alumni.</p>
                    {totalPendingUsers > 0 && (
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--error)', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        {totalPendingUsers} pendentes
                      </span>
                    )}
                  </div>

                  <div className="admin-action-card" onClick={() => setDashboardView('admin_tools')}>
                    <div className="icon-wrapper"><ShieldCheck size={32} /></div>
                    <h3>Administrativo</h3>
                    <p>Financeiro, Docs e Analytics.</p>
                    {(pendingDocsCount + pendingPaysCount) > 0 && (
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--warning)', color: '#000', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        {pendingDocsCount + pendingPaysCount} envios
                      </span>
                    )}
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('nucleos')}>
                    <div className="icon-wrapper"><MapPin size={32} /></div>
                    <h3>Núcleos</h3>
                    <p>Gestão de polos e unidades de ensino.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('forum')}>
                    <div className="icon-wrapper"><MessageSquare size={32} /></div>
                    <h3>Fórum</h3>
                    <p>Modere discussões e dúvidas da comunidade.</p>
                  </div>

                  {userRole === 'admin' && (
                    <div className="admin-action-card" onClick={() => setActiveTab('settings')}>
                      <div className="icon-wrapper"><Settings size={32} /></div>
                      <h3>Configurações</h3>
                      <p>Ajustes globais do sistema e chaves PIX.</p>
                    </div>
                  )}

                  <div className="admin-action-card" onClick={() => setActiveTab('academic')} style={{ border: '1px solid rgba(var(--primary-rgb), 0.3)', background: 'rgba(var(--primary-rgb), 0.02)' }}>
                    <div className="icon-wrapper"><History size={32} /></div>
                    <h3>Histórico Acadêmico</h3>
                    <p>Relatório completo de notas e módulos.</p>
                  </div>
                </>
              )}

              {dashboardView === 'users' && (
                <>
                  <div className="admin-action-card" onClick={() => updateParams({ tab: 'users', filter: 'administrativos', view: 'main' })}>
                    <div className="icon-wrapper"><ShieldCheck size={32} /></div>
                    <h3>Administrativo</h3>
                    <p>Gerencie suporte, moderadores e administradores.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => { setActiveTab('professors'); }}>
                    <div className="icon-wrapper"><GraduationCap size={32} /></div>
                    <h3>Professores</h3>
                    <p>Visualize e vincule docentes aos núcleos.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => updateParams({ tab: 'users', filter: 'alunos', view: 'main' })}>
                    <div className="icon-wrapper"><Users size={32} /></div>
                    <h3>Alunos</h3>
                    <p>Gestão total dos alunos ativos.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('alumni')}>
                    <div className="icon-wrapper"><History size={32} /></div>
                    <h3>Alumni Formados</h3>
                    <p>Base histórica e certificados.</p>
                  </div>
                </>
              )}

              {dashboardView === 'admin_tools' && (
                <>
                  <div className="admin-action-card" onClick={() => setActiveTab('reports')}>
                    <div className="icon-wrapper"><FileText size={32} /></div>
                    <h3>Financeiro</h3>
                    <p>Relatórios, Faturas e Homologação.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('analytics')}>
                    <div className="icon-wrapper"><TrendingUp size={32} /></div>
                    <h3>Analytics</h3>
                    <p>Métricas de acesso e engajamento.</p>
                  </div>

                  <div className="admin-action-card" onClick={handleResetAutoCorrectedExams} style={{ border: '1px solid var(--error)', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <div className="icon-wrapper" style={{ background: 'var(--error)' }}><History size={32} /></div>
                    <h3 style={{ color: 'var(--error)' }}>Manutenção de Provas</h3>
                    <p>Resetar e devolver provas auto-corrigidas para os professores.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('docs_archive')}>
                    <div className="icon-wrapper"><Folder size={32} /></div>
                    <h3>Arquivo de Documentação</h3>
                    <p>Central de arquivos organizada por polo e status.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('boletim')} style={{ border: '1px solid rgba(var(--primary-rgb), 0.3)', background: 'rgba(var(--primary-rgb), 0.02)' }}>
                    <div className="icon-wrapper"><GraduationCap size={32} /></div>
                    <h3>Boletim de Notas</h3>
                    <p>Visualize e edite notas de todos os alunos em todos os módulos.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => setActiveTab('grade_history')}>
                    <div className="icon-wrapper"><GraduationCap size={32} /></div>
                    <h3>Histórico de Notas</h3>
                    <p>Insira notas de módulos concluídos e histórico acadêmico.</p>
                  </div>
                </>
              )}
            </div>
          )}
        
        {activeTab === 'alumni' && <AlumniManagement />}
        
        {activeTab === 'users' && (
          <UserManagement 
            pendingActivityByNucleo={pendingActivityByNucleo}
            users={(() => {
              let filtered = users;
              if (userTypeFilter === 'administrativos') filtered = filtered.filter((u: any) => ['admin', 'suporte', 'colaborador'].includes(u.tipo));
              if (userTypeFilter === 'alunos' || userTypeFilter === 'pendentes') filtered = filtered.filter((u: any) => !['admin', 'suporte', 'professor', 'colaborador'].includes(u.tipo) || u.email === 'edi.ben.jr@gmail.com');
              return filtered;
            })()}
            userTypeFilter={userTypeFilter || undefined}
            allNucleos={allNucleos}
            searchTerm={searchTerm}
            actionLoading={actionLoading}
            setShowAddAdmin={setShowAddAdmin}
            handleTypeChange={handleTypeChange}
            handleApproveAccess={handleApproveAccess}
            handleToggleBlock={handleToggleBlock}
            handleToggleGratuidade={handleToggleGratuidade}
            handleUpdateUserNucleo={handleUpdateUserNucleo}
            handleUpdateUserName={handleUpdateUserName}
            handleDeleteUser={async (userId: string) => setConfirmDelete({ type: 'user', id: userId, title: 'Tem certeza que deseja excluir este usuário?' })}
            handleResetActivities={handleResetProgress}
            handleManualPayment={handleManualPayment}
            onAddNucleo={() => { setActiveTab('nucleos'); setNucleosAutoOpenAdd(true); }}
            handleDeleteNucleo={handleDeleteNucleo}
          />
        )}

        {activeTab === 'professors' && (
          <ProfessorsManagement 
            professors={professors}
            allNucleos={allNucleos}
            searchTerm={searchTerm}
            actionLoading={actionLoading}
            handleUpdateProfessorNucleo={handleUpdateUserNucleo}
            onDelete={(professorId) => setConfirmDelete({ type: 'user', id: professorId, title: 'Tem certeza que deseja excluir este professor?' })}
          />
        )}

        {activeTab === 'attendance' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aluno</th>
                  <th>Núcleo</th>
                  <th>Professor</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Nenhuma lista de presença compartilhada encontrada.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.filter((r: any) => 
                    r.aluno?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.professor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.nucleo?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((record: any) => (
                    <tr key={record.id}>
                      <td>{new Date(record.data).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{record.aluno?.nome}</td>
                      <td>{record.nucleo?.nome}</td>
                      <td>{record.professor?.nome}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          background: record.status === 'P' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: record.status === 'P' ? '#22c55e' : '#ef4444',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          {record.status === 'P' ? 'PRESENÇA' : 'FALTA'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard data={analyticsData} />
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
             handleDelete={(table: any, id: string) => setConfirmDelete({ type: 'content', id, table, title: 'Tem certeza que deseja excluir este item?' })}
             handleRemoveFile={handleRemoveFileFinal}
             handleFileUpload={handleFileUpload}
             handleBatchUpload={handleBatchUpload}
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
             pendingExamMeta={adminPendingExamMeta}
             setPendingExamMeta={setAdminPendingExamMeta}
             uploading={uploading}
          />
        )}


        {activeTab === 'docs_archive' && (
          <DocsArchive allNucleos={allNucleos} />
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

          {activeTab === 'academic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Cabeçalho */}
              <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.02) 100%)', borderRadius: '20px', border: '1px solid rgba(168,85,247,0.2)' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
                  <History size={28} color="var(--primary)" /> Controle Acadêmico
                </h2>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Boletim completo e inserção manual de notas para alunos com progresso iniciado no formato analógico.
                </p>
              </div>

              {/* Seção 1: Boletim de Notas */}
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', background: 'rgba(var(--primary-rgb), 0.04)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <GraduationCap size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>Boletim de Notas</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '6px' }}>EDIÇÃO INLINE</span>
                </div>
                <div style={{ padding: '1rem' }}>
                  <BoletimPanel
                    courses={courses}
                    submissions={boletimSubmissions}
                    allStudents={users}
                    professorNucleos={allNucleos}
                    onRefresh={fetchBoletimSubmissions}
                  />
                </div>
              </div>

              {/* Seção 2: Inserção Manual de Histórico */}
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={20} color="#f59e0b" />
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>Inserir Notas do Processo Manual (Analógico)</span>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 10px', borderRadius: '6px' }}>HISTÓRICO</span>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <GradeHistoryInsertion onRefresh={fetchBoletimSubmissions} />
                </div>
              </div>
            </div>
          )}

        {activeTab === 'boletim' && (
          <BoletimPanel
            courses={courses}
            submissions={boletimSubmissions}
            allStudents={users}
            professorNucleos={allNucleos}
            onRefresh={fetchBoletimSubmissions}
          />
        )}

        {activeTab === 'grade_history' && (
          <GradeHistoryInsertion />
        )}

        {activeTab === 'finance' && (
          <ValidationPanel 
            pendingDocs={pendingDocs}
            pendingPays={pendingPaysValidation}
            handleValidar={handleValidar}
            handleDeleteValidation={handleDeleteValidation}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'reports' && (
          <FinanceReport 
            data={financeReport} 
            searchTerm={searchTerm} 
            handleValidar={handleValidar}
            handleDeleteValidation={handleDeleteValidation} 
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'forum' && (
          <ForumPanel userProfile={profile} />
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
          selectedBook={selectedBook}
           addingLessonType={addingLessonType || ''}
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
          fetchLessonItems={fetchLessonItems}
          selectedBook={selectedBook}
          selectedLesson={selectedLesson}
          normalizeFileName={normalizeFileName}
        />

        <QuizEditorModal 
          editingQuiz={editingQuiz}
          setEditingQuiz={setEditingQuiz}
          quizQuestions={quizQuestions}
          setQuizQuestions={setQuizQuestions}
           pendingExamMeta={adminPendingExamMeta}
           setPendingExamMeta={setAdminPendingExamMeta}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          showToast={showToast}
          fetchLessons={fetchLessons}
          fetchLessonItems={fetchLessonItems}
          selectedBook={selectedBook}
          selectedLesson={selectedLesson}
        />

        <AddAdminModal 
          showAddAdmin={showAddAdmin}
          setShowAddAdmin={setShowAddAdmin}
          actionLoading={actionLoading}
          handleAddAdmin={handleAddAdmin}
          availableNucleos={allNucleos}
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
                  style={{ background: 'var(--error)', color: '#fff', flex: 1 }} 
                  onClick={async () => {
                    if (confirmDelete.type === 'user') {
                      await handleDeleteUser(confirmDelete.id);
                    } else if (confirmDelete.type === 'content' && (confirmDelete as any).column) {
                      await handleRemoveFileFinal(confirmDelete.table as any, confirmDelete.id, (confirmDelete as any).column as any);
                    } else if (confirmDelete.type === 'content') {
                      const { table, id } = confirmDelete;
                      setActionLoading(id);
                      try {
                        const { error } = await supabase.from(table as any).delete().eq('id', id);
                        if (error) throw error;
                        showToast('Item excluído com sucesso');
                        await fetchData();
                      } catch (err: any) {
                        showToast('Erro ao excluir: ' + err.message);
                      } finally {
                        setActionLoading(null);
                      }
                    }
                    setConfirmDelete(null);
                  }}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? <Loader2 className="spinner" size={18} /> : 'Excluir Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

        <div className="bottom-nav-footer">
          <button onClick={() => window.history.back()} className="btn btn-outline">
            <ChevronLeft size={20} /> Voltar
          </button>
          <button onClick={() => setActiveTab('home')} className="btn btn-primary">
            <LayoutDashboard size={20} /> Início
          </button>
        </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '1rem 2rem',
          background: toast?.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toast?.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 600 }}>{toast?.message}</span>
        </div>
      )}

      <input 
        id="import-alumni-file-global"
        type="file" 
        accept=".xlsx,.xls,.csv" 
        style={{ display: 'none' }} 
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setActionLoading('importing-file');
          try {
            const { importAlumniFile } = await import('../services/import_alumni_file');
            const result = await importAlumniFile(file);
            alert(`Importação concluída!\nLidas: ${result.total}\nSucessos (Formados): ${result.success}\nErros: ${result.errors}`);
            window.location.reload();
          } catch (err: any) {
            alert('Erro na importação: ' + err.message);
          } finally {
            setActionLoading(null);
            e.target.value = '';
          }
        }}
      />

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
