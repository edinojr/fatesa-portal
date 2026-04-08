import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  BookOpen, 
  FileText, 
  Settings, 
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
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
  ExternalLink
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
import DocsArchive from '../features/admin/components/DocsArchive'

// Icons and UI
// import { Folder } from 'lucide-react'

// Legacy / Shared Components
import NucleosPanel from '../components/NucleosPanel'
import Logo from '../components/common/Logo'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ForumPanel from '../features/forum/components/ForumPanel'

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

const Admin = () => {
  const {
    profile,
    activeTab,
    setActiveTab,
    userRole,
    users,
    courses,
    pendingDocs,
    pendingPays,
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
    uploading,
    nucleosAutoOpenAdd,
    setNucleosAutoOpenAdd,
    confirmDelete,
    setConfirmDelete,
    fetchData,
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
    attendanceRecords,
    professors,
    pendingUsersByNucleo,
    pendingActivityByNucleo,
    pendingFinanceCount,
    analyticsData,
    financeReport,
    pendingProofsCount,
    pendingStudentsCount,
    academicReport,
    handleDeleteNucleo,
    handleResetAutoCorrectedExams
  } = useAdminManagement()

  const totalPendingUsers = Object.values(pendingUsersByNucleo).reduce((acc: number, curr: any) => acc + (curr || 0), 0)
  const [dashboardView, setDashboardView] = React.useState<'main' | 'users' | 'admin_tools'>('main')
  const [userTypeFilter, setUserTypeFilter] = React.useState<string | null>(null)

  const handleGlobalBack = () => {
    if (selectedLesson) { setSelectedLesson(null); return; }
    if (selectedBook) { setSelectedBook(null); return; }
    if (selectedCourse) { setSelectedCourse(null); return; }
    if (dashboardView !== 'main') { setDashboardView('main'); setUserTypeFilter(null); return; }
    if (activeTab !== 'home') { setActiveTab('home'); return; }
  }

  const isAtRoot = activeTab === 'home' && dashboardView === 'main'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <LoadingSpinner size={48} label="Validando credenciais..." />
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <main className="admin-main">
        {/* New Standardized Administrative Header */}
        <header className="dashboard-header-modern">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Logo size={140} />
            
            <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
              {!isAtRoot && (
                <button 
                  className="nav-btn-premium" 
                  onClick={handleGlobalBack}
                  title="Voltar um passo"
                >
                  <ChevronLeft size={18} /> <span className="mobile-hide">Voltar</span>
                </button>
              )}
              {activeTab !== 'home' && (
                <button className="nav-btn-premium" onClick={() => { setActiveTab('home'); setDashboardView('main'); setUserTypeFilter(null); }}>
                  <LayoutGrid size={18} /> <span className="mobile-hide">Menu Principal</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {availableRoles.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button 
                  className="nav-btn-premium" 
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                >
                  <Users size={18} /> <span className="mobile-hide">Alternar Visão</span>
                </button>
                {showRoleSwitcher && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.5rem', zIndex: 1100, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px', marginTop: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    {availableRoles.filter(r => ['aluno', 'professor', 'admin'].includes(r) && r !== userRole).map(r => (
                      <Link 
                        key={r} 
                        to={r === 'aluno' ? '/dashboard' : r === 'professor' ? '/professor' : '/admin'}
                        className="nav-btn-premium" 
                        style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                        onClick={() => setShowRoleSwitcher(false)}
                      >
                        {r === 'aluno' ? 'Painel do Aluno' : r === 'professor' ? 'Painel do Professor' : 'Administração'}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link 
              to="/dashboard" 
              className="nav-btn-premium"
            >
              <ExternalLink size={18} /> <span className="mobile-hide">Área do Aluno</span>
            </Link>
            
            <button 
              className="nav-btn-premium danger" 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
              title="Sair"
            >
              <LogOut size={18} /> <span className="mobile-hide">Sair</span>
            </button>
          </div>
        </header>

        <header className="mobile-col-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <h1 style={{ 
                fontSize: '2.2rem', 
                fontWeight: 900, 
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, var(--text) 0%, var(--primary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.25rem'
              }}>
                {activeTab === 'home' ? 'Painel Administrativo' : 
                 activeTab === 'users' ? 'Gestão de Usuários' : 
                 activeTab === 'professors' ? 'Gestão de Professores' :
                 activeTab === 'alumni' ? 'Base de Formados (Alumni)' :
                 activeTab === 'content' ? 'Gestão de Conteúdo' : 
                 activeTab === 'forum' ? 'Fórum da Comunidade' : 
                 activeTab === 'nucleos' ? 'Gestão de Núcleos' :
                 activeTab === 'attendance' ? 'Relatório de Frequência' :
                 activeTab === 'analytics' ? 'Análise do Portal' :
                 activeTab === 'reports' ? 'Relatório de Pagamentos' :
                 activeTab === 'docs_archive' ? 'Arquivo de Documentação' :
                 'Validação de Acesso'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, opacity: 0.7 }}>
                {activeTab === 'home' ? 'Visão geral do sistema e atalhos rápidos.' : 
                 activeTab === 'users' ? 'Administre os perfis, bloqueios e acessos.' : 
                 activeTab === 'professors' ? 'Visualize professores e seus núcleos vinculados.' :
                 activeTab === 'alumni' ? 'Gerencie o banco de dados histórico de alunos formados.' :
                 activeTab === 'content' ? 'Gerencie as matérias, livros e atividades.' : 
                 activeTab === 'forum' ? 'Acompanhe as discussões da comunidade.' :
                 activeTab === 'nucleos' ? 'Gerencie polos e núcleos de ensino.' :
                 activeTab === 'attendance' ? 'Acompanhe as listas de presença compartilhadas pelos professores.' :
                 activeTab === 'analytics' ? 'Monitore visualizações, acessos únicos e rotatividade de usuários.' :
                 activeTab === 'reports' ? 'Lista de alunos que enviaram comprovantes pelo portal.' :
                 activeTab === 'docs_archive' ? 'Central de arquivos organizada por polo e status.' :
                 'Verifique envios dos alunos.'}
                </p>
              </div>
            
            <div className="mobile-wrap-flex" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
              {activeTab === 'users' && (
                <button className="btn btn-primary" onClick={() => setShowAddTeacher(true)} style={{ width: 'auto' }}>
                  <Plus size={20} /> Cadastrar Professor
                </button>
              )}
              {activeTab === 'alumni' && (
                <button 
                  className="btn btn-outline" 
                  onClick={() => document.getElementById('import-alumni-file-global')?.click()} 
                  style={{ width: 'auto' }}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'importing-file' ? <Loader2 className="spinner" size={20} /> : <FileText size={20} />} Importar Planilha (Excel/CSV)
                </button>
              )}
              <div className="input-group" style={{ marginBottom: 0, width: '100%', maxWidth: '300px' }}>
                <input type="text" placeholder="Pesquisar..." className="form-control" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </header>

           {activeTab === 'home' && (
            <div className="admin-dashboard-grid transition-fade-in" style={{ gap: '2rem' }}>
              {/* CENTRAL DE ATIVIDADES (SINALIZAÇÃO) */}
              {dashboardView === 'main' && (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  <div className="activity-signal-card" onClick={() => { setActiveTab('users'); setUserTypeFilter('alunos'); }} style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.2)', padding: '1.5rem', borderRadius: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--primary)', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Novos Alunos</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{pendingStudentsCount}</div>
                      </div>
                    </div>
                    {pendingStudentsCount > 0 && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--primary)' }}></div>}
                  </div>

                  <div className="activity-signal-card" onClick={() => setActiveTab('nucleos')} style={{ background: 'rgba(156, 39, 176, 0.05)', border: '1px solid rgba(156, 39, 176, 0.2)', padding: '1.5rem', borderRadius: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: '#9c27b0', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Provas p/ Corrigir</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{pendingProofsCount}</div>
                      </div>
                    </div>
                    {pendingProofsCount > 0 && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#9c27b0' }}></div>}
                  </div>

                  <div className="activity-signal-card" onClick={() => { setDashboardView('admin_tools'); setActiveTab('reports'); }} style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1.5rem', borderRadius: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: '#f59e0b', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Validação de Documentos/Pagamentos</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{pendingFinanceCount}</div>
                      </div>
                    </div>
                    {pendingFinanceCount > 0 && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#f59e0b' }}></div>}
                  </div>
                </div>
              )}

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
                    {(pendingDocs.length + pendingPays.length) > 0 && (
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--warning)', color: '#000', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        {pendingDocs.length + pendingPays.length} envios
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
                  <div className="admin-action-card" onClick={() => { setActiveTab('users'); setUserTypeFilter('administrativos'); }}>
                    <div className="icon-wrapper"><ShieldCheck size={32} /></div>
                    <h3>Administrativo</h3>
                    <p>Gerencie suporte, moderadores e administradores.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => { setActiveTab('professors'); }}>
                    <div className="icon-wrapper"><GraduationCap size={32} /></div>
                    <h3>Professores</h3>
                    <p>Visualize e vincule docentes aos núcleos.</p>
                  </div>

                  <div className="admin-action-card" onClick={() => { setActiveTab('users'); setUserTypeFilter('alunos'); }}>
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
              if (userTypeFilter === 'administrativos') filtered = filtered.filter(u => ['admin', 'suporte', 'colaborador'].includes(u.tipo));
              if (userTypeFilter === 'alunos') filtered = filtered.filter(u => !['admin', 'suporte', 'professor', 'colaborador'].includes(u.tipo));
              return filtered;
            })()}
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
            searchTerm={searchTerm}
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
                  attendanceRecords.filter(r => 
                    r.aluno?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.professor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.nucleo?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(record => (
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
          <AcademicHistory data={academicReport} searchTerm={searchTerm} />
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
          <button onClick={() => window.history.back()} className="btn btn-outline">
            <ChevronLeft size={20} /> Voltar
          </button>
          <button onClick={() => setActiveTab('home')} className="btn btn-primary">
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
