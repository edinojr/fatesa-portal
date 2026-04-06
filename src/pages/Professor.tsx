import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Users, 
  BookOpen, 
  LogOut, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  FileText,
  ClipboardList,
  MessageSquare,
  LayoutGrid,
  ExternalLink,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Video
} from 'lucide-react'
import AttendanceList from '../features/users/components/AttendanceList'
import NucleosPanel from '../components/NucleosPanel'
import StudentsManagement from '../features/users/components/StudentsManagement'
import ProfessorContent from '../features/courses/components/ProfessorContent'
import GradingPanel from '../features/courses/components/GradingPanel'
import AvisosManagement from '../features/communication/components/AvisosManagement'
import MateriaisManagement from '../features/communication/components/MateriaisManagement'

import { useProfessorManagement } from '../hooks/useProfessorManagement'
import Logo from '../components/common/Logo'

const Professor = () => {
  const {
    profile,
    activeTab,
    setActiveTab,
    loading,
    availableRoles,
    showRoleSwitcher,
    setShowRoleSwitcher,
    courses,
    selectedCourse,
    setSelectedCourse,
    books,
    selectedBook,
    setSelectedBook,
    lessons,
    allStudents,
    searchTerm,
    setSearchTerm,
    professorNucleos,
    submissions,
    selectedSubmission,
    setSelectedSubmission,
    gradeInput,
    setGradeInput,
    avaliacaoComentario,
    setAvaliacaoComentario,
    questionEvaluations,
    questionComments,
    setQuestionComments,
    toggleEvaluation,
    savingGrade,
    actionLoading,
    deleting,
    handleSaveGrade,
    handleDeleteSubmission,
    handleSelectSubmission,
    handleApproveAccess,
    handleRejectAccess,
    handleDeleteUser,
    handleResetProgress,
    handleLogout,
    handleUpdateUserNucleo,
    fetchBooks,
    selectBookAndShowLessons,
    attendanceRecords,
    handleSaveAttendance
  } = useProfessorManagement();

  const navigate = useNavigate()
  const location = useLocation()
  const [dashboardView, setDashboardView] = React.useState<'main' | 'nucleos' | 'alunos' | 'conteudo'>('main');

  React.useEffect(() => {
    localStorage.setItem('fatesa_active_role', 'professor');
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    } else if (!activeTab) {
      setActiveTab('home');
    }
  }, [location.state, setActiveTab, activeTab]);

  const handleGlobalBack = () => {
    if (selectedSubmission) { setSelectedSubmission(null); return; }
    if (selectedBook) { setSelectedBook(null); return; }
    if (selectedCourse) { setSelectedCourse(null); return; }
    if (activeTab !== 'home') { setActiveTab('home'); return; }
  }

  const isAtRoot = activeTab === 'home' && dashboardView === 'main'

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando Painel...</div>

  return (
    <div className="admin-layout">
      {/* COMPACT ICON HEADER */}
      <header className="dashboard-header-modern">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo size={140} />
          
          <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
            {activeTab !== 'home' && (
              <button 
                className="nav-btn-premium" 
                onClick={handleGlobalBack}
                title="Voltar ao Painel Ativo"
              >
                <ChevronLeft size={18} /> <span className="mobile-hide">Voltar</span>
              </button>
            )}
            {!isAtRoot && (
              <button className="nav-btn-premium" onClick={() => { setActiveTab('home'); setDashboardView('main'); }}>
                <LayoutGrid size={18} /> <span className="mobile-hide">Menu Principal</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="mobile-hide" style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{profile?.nome_completo}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Professor</div>
          </div>
          
          {availableRoles.length > 0 && (availableRoles.some(r => r === 'admin' || r === 'suporte' || profile?.email === 'edi.ben.jr@gmail.com')) && (
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-btn-premium" 
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={18} /> <span className="mobile-hide">Alternar Visão</span>
              </button>
              {showRoleSwitcher && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.5rem', zIndex: 1100, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px', marginTop: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  {availableRoles.filter(r => ['aluno', 'admin'].includes(r)).map(r => (
                    <button 
                      key={r} 
                      className="nav-btn-premium" 
                      style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                      onClick={() => navigate(r === 'aluno' ? '/dashboard' : '/admin')}
                    >
                      {r === 'aluno' ? 'Painel do Aluno' : 'Painel Administrativo'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => navigate('/dashboard')} className="nav-btn-premium">
            <ExternalLink size={18} /> <span className="mobile-hide">Área do Aluno</span>
          </button>

          <button className="nav-btn-premium danger" onClick={handleLogout} title="Sair">
            <LogOut size={18} /> <span className="mobile-hide">Sair</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-scroll-content">
          <header className="mobile-col-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
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
                {activeTab === 'home' && dashboardView === 'main' ? 'Portal do Professor' :
                 activeTab === 'home' && dashboardView === 'nucleos' ? 'Gestão de Núcleos' :
                 activeTab === 'home' && dashboardView === 'alunos' ? 'Gerenciamento de Alunos' :
                 activeTab === 'content' ? 'Gestão de Conteúdo' : 
                 activeTab === 'grading' ? 'Correção de Provas' :
                 activeTab === 'avisos' ? 'Quadro de Avisos' :
                 activeTab === 'materiais' ? 'Materiais de Apoio' :
                 activeTab === 'attendance' ? 'Lista de Presença' : 'Fórum da Comunidade'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, opacity: 0.7 }}>
                {activeTab === 'home' && dashboardView === 'main' ? 'Selecione uma categoria para começar.' : 
                 activeTab === 'home' && dashboardView === 'nucleos' ? 'Administre conteúdos, vídeos e provas dos seus núcleos.' :
                 activeTab === 'home' && dashboardView === 'alunos' ? 'Controle frequência, notas e matrículas.' :
                 'Bem-vindo de volta, Professor.'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0, width: '300px' }}>
                <input type="text" placeholder="Pesquisar..." className="form-control" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </header>

          <div className="tab-content">
            {activeTab === 'home' && (
              <div className="admin-dashboard-grid transition-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {dashboardView === 'main' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('nucleos')}>
                      <div className="icon-wrapper"><MapPin size={32} /></div>
                      <h3>Meus Núcleos</h3>
                      <p>Visualize todos os núcleos vinculados ao seu perfil.</p>
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(156,39,176,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
                        {professorNucleos.length} ATIVOS
                      </span>
                    </div>

                    <div className="admin-action-card" onClick={() => setDashboardView('alunos')}>
                      <div className="icon-wrapper"><Users size={32} /></div>
                      <h3>Alunos</h3>
                      <p>Chamada, aceite de novos alunos e lista geral.</p>
                      {submissions.filter(s => s.status === 'pendente').length > 0 && (
                        <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--error)', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                          {submissions.filter(s => s.status === 'pendente').length} PENDENTES
                        </span>
                      )}
                    </div>

                    <div className="admin-action-card" onClick={() => setDashboardView('conteudo')}>
                      <div className="icon-wrapper"><BookOpen size={32} /></div>
                      <h3>Conteúdo</h3>
                      <p>Liberação de vídeos, provas e módulos do curso.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('avisos')}>
                      <div className="icon-wrapper"><AlertCircle size={32} /></div>
                      <h3>Quadro de Avisos</h3>
                      <p>Publique comunicados para seus núcleos.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('forum')}>
                      <div className="icon-wrapper"><MessageSquare size={32} /></div>
                      <h3>Fórum da Comunidade</h3>
                      <p>Interaja e tire dúvidas dos estudantes.</p>
                    </div>
                  </>
                )}

                {dashboardView === 'alunos' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('students')}>
                      <div className="icon-wrapper"><Users size={32} /></div>
                      <h3>Alunos do Núcleo</h3>
                      <p>Lista completa de alunos vinculados aos seus polos.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('attendance')}>
                      <div className="icon-wrapper"><ClipboardList size={32} /></div>
                      <h3>Lista de Chamada</h3>
                      <p>Chamada diária separada por núcleo de ensino.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('students')}>
                      <div className="icon-wrapper"><ShieldCheck size={32} /></div>
                      <h3>Aceitação de Alunos</h3>
                      <p>Confirme e autorize a entrada de novos alunos no núcleo.</p>
                    </div>
                  </>
                )}

                {dashboardView === 'conteudo' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('content')}>
                      <div className="icon-wrapper"><Video size={32} /></div>
                      <h3>Liberação / Vídeo Aula</h3>
                      <p>Gerencie o acesso às aulas gravadas para os alunos.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('grading')}>
                      <div className="icon-wrapper"><GraduationCap size={32} /></div>
                      <h3>Provas</h3>
                      <p>Correção e acompanhamento das avaliações do curso.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('content')}>
                      <div className="icon-wrapper"><LayoutGrid size={32} /></div>
                      <h3>Módulos e Lições</h3>
                      <p>Estrutura pedagógica de matérias e atividades.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('materiais')}>
                      <div className="icon-wrapper"><FileText size={32} /></div>
                      <h3>Conteúdo Adicional</h3>
                      <p>Material de apoio, PDFs e leituras extras.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'nucleos' && <NucleosPanel userRole="professor" />}

            {activeTab === 'students' && (
              <StudentsManagement 
                allStudents={allStudents}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                actionLoading={actionLoading}
                handleApproveAccess={handleApproveAccess}
                handleRejectAccess={handleRejectAccess}
                handleDeleteUser={handleDeleteUser}
                handleResetActivities={handleResetProgress}
                handleUpdateUserNucleo={handleUpdateUserNucleo}
                userRole={profile?.tipo}
                allNucleos={professorNucleos}
              />
            )}

            {activeTab === 'content' && (
              <ProfessorContent 
                courses={courses}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                books={books}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                lessons={lessons}
                fetchBooks={fetchBooks}
                selectBookAndShowLessons={selectBookAndShowLessons}
                profile={profile}
                professorNucleos={professorNucleos}
                submissions={submissions}
              />
            )}

            {activeTab === 'grading' && (
              <GradingPanel 
                courses={courses}
                submissions={submissions}
                selectedSubmission={selectedSubmission}
                setSelectedSubmission={setSelectedSubmission}
                handleSelectSubmission={handleSelectSubmission}
                deleting={deleting}
                handleDeleteSubmission={handleDeleteSubmission}
                gradeInput={gradeInput}
                setGradeInput={setGradeInput}
                avaliacaoComentario={avaliacaoComentario}
                setAvaliacaoComentario={setAvaliacaoComentario}
                questionEvaluations={questionEvaluations}
                questionComments={questionComments}
                setQuestionComments={setQuestionComments}
                toggleEvaluation={toggleEvaluation}
                savingGrade={savingGrade}
                handleSaveGrade={handleSaveGrade}
              />
            )}

            {activeTab === 'avisos' && <AvisosManagement />}

            {activeTab === 'materiais' && <MateriaisManagement />}

            {activeTab === 'attendance' && (
              <AttendanceList 
                professorNucleos={professorNucleos}
                allStudents={allStudents}
                onSave={handleSaveAttendance}
                history={attendanceRecords}
                professorId={profile?.id || ''}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Professor
