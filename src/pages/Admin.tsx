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
  X,
  Menu,
  MessageSquare,
  LogOut,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  MapPin,
  TrendingUp
} from 'lucide-react'

// Features Components
import UserManagement from '../features/users/components/UserManagement'
import AlumniManagement from '../features/users/components/AlumniManagement'
import ContentManagement from '../features/courses/components/ContentManagement'
import ValidationPanel from '../features/finance/components/ValidationPanel'
import SettingsPanel from '../features/finance/components/SettingsPanel'
import ProfessorsManagement from '../features/users/components/ProfessorsManagement'
import AttendanceList from '../features/users/components/AttendanceList'
import AnalyticsDashboard from '../features/admin/components/AnalyticsDashboard'

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
    isMobileMenuOpen,
    setIsMobileMenuOpen,
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
    analyticsData
  } = useAdminManagement()

  const totalPendingUsers = Object.values(pendingUsersByNucleo).reduce((acc: number, curr: any) => acc + (curr || 0), 0)
  const [expandedUsers, setExpandedUsers] = React.useState(false)
  const [selectedNucleoId, setSelectedNucleoId] = React.useState<string | null>(null)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <LoadingSpinner size={48} label="Validando credenciais..." />
      </div>
    )
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
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ paddingTop: '2rem' }}>
        <div className="logo-section" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
          <Logo size={200} />
          <button className="mobile-menu-btn" style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => window.history.back()} className="admin-nav-item" style={{ background: 'transparent', border: 'none' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setActiveTab('home')} className="admin-nav-item" style={{ background: 'transparent', border: 'none' }}>
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
                  {availableRoles.filter(r => ['aluno', 'professor', 'admin'].includes(r) && r !== userRole).map(r => (
                    <Link 
                      key={r} 
                      to={r === 'aluno' ? '/dashboard' : r === 'professor' ? '/professor' : '/admin'}
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem', fontSize: '0.8rem', background: 'transparent', border: 'none', textDecoration: 'none', color: 'inherit' }}
                      onClick={() => { 
                        setShowRoleSwitcher(false); 
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {r === 'aluno' ? 'Painel do Aluno' : r === 'professor' ? 'Painel do Professor' : 'Administração'}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className={`admin-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}>
            <LayoutDashboard size={18} /> <span className="mobile-hide">Início</span>
          </div>

          {userRole === 'admin' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} 
                  onClick={() => { 
                    setExpandedUsers(!expandedUsers);
                    if (activeTab !== 'users') {
                      setActiveTab('users');
                      setSelectedNucleoId(null);
                    }
                  }}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={18} /> <span className="mobile-hide">Usuários</span>
                    {totalPendingUsers > 0 && (
                      <span style={{ background: 'var(--error)', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                        {totalPendingUsers}
                      </span>
                    )}
                  </div>
                  {expandedUsers ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                
                {expandedUsers && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1.5rem', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <div 
                      className={`admin-nav-item ${activeTab === 'users' && !selectedNucleoId ? 'active' : ''}`} 
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      onClick={() => { setActiveTab('users'); setSelectedNucleoId(null); setIsMobileMenuOpen(false); }}
                    >
                      Todos
                    </div>
                    {allNucleos.map(n => (
                      <div 
                        key={n.id}
                        className={`admin-nav-item ${activeTab === 'users' && selectedNucleoId === n.id ? 'active' : ''}`} 
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', justifyContent: 'space-between' }}
                        onClick={() => { setActiveTab('users'); setSelectedNucleoId(n.id); setIsMobileMenuOpen(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <MapPin size={12} /> {n.nome}
                        </div>
                        {pendingUsersByNucleo[n.id] > 0 && (
                          <span style={{ background: 'var(--error)', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '10px' }}>
                            {pendingUsersByNucleo[n.id]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`admin-nav-item ${activeTab === 'professors' ? 'active' : ''}`} onClick={() => { setActiveTab('professors'); setIsMobileMenuOpen(false); }}>
                <GraduationCap size={18} /> <span className="mobile-hide">Professores</span>
              </div>

              <div className={`admin-nav-item ${activeTab === 'alumni' ? 'active' : ''}`} onClick={() => { setActiveTab('alumni'); setIsMobileMenuOpen(false); }}>
                <GraduationCap size={18} /> <span className="mobile-hide">Alumni / Formados</span>
              </div>

              <div className={`admin-nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }}>
                <ClipboardList size={18} /> <span className="mobile-hide">Frequência</span>
              </div>

              <div className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }}>
                <TrendingUp size={18} /> <span className="mobile-hide">Analytics</span>
              </div>
            </>
          )}

          <div className={`admin-nav-item ${activeTab === 'nucleos' ? 'active' : ''}`} onClick={() => { setActiveTab('nucleos'); setIsMobileMenuOpen(false); }}>
            <GraduationCap size={18} /> <span className="mobile-hide">Núcleos</span>
          </div>

          <div className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => { setActiveTab('content'); setIsMobileMenuOpen(false); }}>
            <BookOpen size={18} /> <span className="mobile-hide">Conteúdo</span>
          </div>

          <div className={`admin-nav-item ${activeTab === 'forum' ? 'active' : ''}`} onClick={() => { setActiveTab('forum'); setIsMobileMenuOpen(false); }}>
            <MessageSquare size={18} /> <span className="mobile-hide">Fórum</span>
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
            <div className="admin-nav-item" style={{ color: 'var(--error)', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}>
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
                {activeTab === 'home' ? 'Painel Administrativo' : 
                 activeTab === 'users' ? (selectedNucleoId ? `Usuários - ${allNucleos.find(n => n.id === selectedNucleoId)?.nome}` : 'Gestão de Usuários') : 
                 activeTab === 'professors' ? 'Gestão de Professores' :
                 activeTab === 'alumni' ? 'Base de Formados (Alumni)' :
                 activeTab === 'content' ? 'Gestão de Conteúdo' : 
                 activeTab === 'forum' ? 'Fórum da Comunidade' : 
                 activeTab === 'nucleos' ? 'Gestão de Núcleos' :
                 activeTab === 'attendance' ? 'Relatório de Frequência' :
                 activeTab === 'analytics' ? 'Análise do Portal' :
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
                 'Verifique envios dos alunos.'}
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
        
        {activeTab === 'alumni' && <AlumniManagement />}
        
        {activeTab === 'users' && (
          <UserManagement 
            users={selectedNucleoId ? users.filter(u => u.nucleo_id === selectedNucleoId) : users}
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
            handleResetActivities={handleResetProgress}
            handleManualPayment={handleManualPayment}
            onAddNucleo={() => { setActiveTab('nucleos'); setNucleosAutoOpenAdd(true); }}
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

        {activeTab === 'validation' && (
          <ValidationPanel 
            pendingDocs={pendingDocs}
            pendingPays={pendingPays}
            userRole={userRole}
            actionLoading={actionLoading}
            handleValidar={handleValidar}
            handleDeleteValidation={handleDeleteValidation}
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
