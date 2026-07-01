import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  BookOpen, 
  LogOut, 
  Loader2,
  AlertCircle,
  FileText,
  ClipboardList,
  MessageSquare,
  LayoutGrid,
  ExternalLink,
  MapPin,
  GraduationCap,
  Video,
   History,
   ShieldCheck,
   ArrowLeft,
} from 'lucide-react'
import AttendanceList from '../features/users/components/AttendanceList'
import NucleosPanel from '../components/NucleosPanel'
import StudentsManagement from '../features/users/components/StudentsManagement'
import ProfessorContent from '../features/courses/components/ProfessorContent'
import GradingPanel from '../features/courses/components/GradingPanel'
import AvisosManagement from '../features/communication/components/AvisosManagement'
import MateriaisManagement from '../features/communication/components/MateriaisManagement'
import AcademicHistory from '../features/admin/components/AcademicHistory'
import AlumniManagement from '../features/users/components/AlumniManagement'
import DocumentAnalysis from '../features/admin/components/DocumentAnalysis'
import ForumPanel from '../features/forum/components/ForumPanel'
import BoletimPanel from '../features/professor/components/BoletimPanel'
import ContentReleasePanel from '../features/courses/components/ContentReleasePanel'

import { useProfessorManagement } from '../hooks/useProfessorManagement'
import PageHeader from '../components/layout/PageHeader'

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
    setBooks,
    selectedBook,
    setSelectedBook,
    lessons,
    setLessons,
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
    handleSaveAttendance,
    academicReport,
    handleUpdateUserType,
    handleGrantModuleException,
    fetchData
  } = useProfessorManagement();

  const navigate = useNavigate()
  const location = useLocation()
  const [dashboardView, setDashboardView] = React.useState<'main' | 'nucleos' | 'alunos' | 'conteudo'>(() => {
    return (localStorage.getItem('fatesa_prof_dashboard_view') as any) || 'main'
  });

  const goToPanel = () => {
    const role = profile?.tipo;
    const roles = (profile?.caminhos_acesso as string[]) || [];
    const isAdmin = role === 'admin' || roles.includes('admin') || roles.includes('suporte');
    navigate(isAdmin ? '/admin' : '/professor');
  };

  React.useEffect(() => {
    // Only set to 'professor' if the user is NOT an admin, 
    // or if they explicitly navigated here (already handled by navigation)
    // To prevent overriding admin preference, we check current active role
    const activeRole = localStorage.getItem('fatesa_active_role');
    if (activeRole !== 'admin') {
      localStorage.setItem('fatesa_active_role', 'professor');
    }
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    } else if (!activeTab) {
      setActiveTab('home');
    }
  }, [location.state, setActiveTab]);

  React.useEffect(() => {
    localStorage.setItem('fatesa_prof_dashboard_view', dashboardView);
  }, [dashboardView]);

  const handleGlobalBack = () => {
    if (selectedSubmission) { setSelectedSubmission(null); return; }
    if (selectedBook) { setSelectedBook(null); return; }
    if (selectedCourse) { setSelectedCourse(null); return; }
    if (dashboardView !== 'main') { setDashboardView('main'); return; }
    if (activeTab !== 'home') { setActiveTab('home'); return; }
    window.history.back()
  }

  const isAtRoot = activeTab === 'home' && dashboardView === 'main'

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando Painel...</div>

  return (
    <div className="admin-layout">
      <PageHeader
        title="Painel Professor"
        variant="professor"
        onBack={handleGlobalBack}
        showBackButton={!isAtRoot}
        showTopBanner={false}
      />

        <main className="admin-main">
         <div className="admin-scroll-content">
           <div className="tab-content">
             {activeTab === 'home' && (
              <div className="admin-dashboard-grid transition-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {dashboardView === 'main' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('nucleos')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Núcleo</span>
                      <div className="icon-wrapper"><MapPin size={32} /></div>
                      <h3>Meus Núcleos</h3>
                      <p>Visualize todos os núcleos vinculados ao seu perfil.</p>
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(156,39,176,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
                        {professorNucleos.length} ATIVOS
                      </span>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setDashboardView('alunos')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Alunos</span>
                      <div className="icon-wrapper"><Users size={32} /></div>
                      <h3>Alunos</h3>
                      <p>Chamada, aceite de novos alunos e lista geral.</p>
                      {submissions.filter(s => s.status === 'pendente').length > 0 && (
                        <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--error)', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                          {submissions.filter(s => s.status === 'pendente').length} PENDENTES
                        </span>
                      )}
                    </div>
 
                    <div className="admin-action-card" onClick={() => setDashboardView('conteudo')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><BookOpen size={32} /></div>
                      <h3>Conteúdo</h3>
                      <p>Liberação de vídeos, provas e módulos do curso.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('avisos')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Comunicação</span>
                      <div className="icon-wrapper"><AlertCircle size={32} /></div>
                      <h3>Quadro de Avisos</h3>
                      <p>Publique comunicados para seus núcleos.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('forum')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Comunicação</span>
                      <div className="icon-wrapper"><MessageSquare size={32} /></div>
                      <h3>Fórum da Comunidade</h3>
                      <p>Interaja e tire dúvidas dos estudantes.</p>
                    </div>
                  </>
                )}
 
                {dashboardView === 'alunos' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('students')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Alunos</span>
                      <div className="icon-wrapper"><Users size={32} /></div>
                      <h3>Alunos do Núcleo</h3>
                      <p>Lista completa de alunos vinculados aos seus polos.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('attendance')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Alunos</span>
                      <div className="icon-wrapper"><ClipboardList size={32} /></div>
                      <h3>Lista de Chamada</h3>
                      <p>Chamada diária separada por núcleo de ensino.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('alumni')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Alunos</span>
                      <div className="icon-wrapper"><GraduationCap size={32} /></div>
                      <h3>Alumni / Formados</h3>
                      <p>Base histórica de alunos que já concluíram o curso.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('documents')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Alunos</span>
                      <div className="icon-wrapper"><FileText size={32} /></div>
                      <h3>Arquivos e Documentos</h3>
                      <p>Validação da documentação pessoal enviada pelos alunos.</p>
                    </div>
                  </>
                )}
 
                {dashboardView === 'conteudo' && (
                  <>
                    <div className="admin-action-card" onClick={() => setActiveTab('content')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><Video size={32} /></div>
                      <h3>Liberação / Vídeo Aula</h3>
                      <p>Gerencie o acesso às aulas gravadas para os alunos.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('grading')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><GraduationCap size={32} /></div>
                      <h3>Provas</h3>
                      <p>Correção e acompanhamento das avaliações do curso.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('modules')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><LayoutGrid size={32} /></div>
                      <h3>Módulos e Lições</h3>
                      <p>Estrutura pedagógica de matérias e atividades.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('release')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><ShieldCheck size={32} /></div>
                      <h3>Liberação de Conteúdos</h3>
                      <p>Ativar/desativar módulos e liberar conteúdos por polo.</p>
                    </div>

                    <div className="admin-action-card" onClick={() => setActiveTab('boletim')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><GraduationCap size={32} /></div>
                      <h3>Boletim</h3>
                      <p>Notas dos alunos por módulo com edição inline.</p>
                    </div>
 
                    <div className="admin-action-card" onClick={() => setActiveTab('materiais')} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                      <span className="category-badge">Conteúdo</span>
                      <div className="icon-wrapper"><FileText size={32} /></div>
                      <h3>Conteúdo Adicional</h3>
                      <p>Material de apoio, PDFs e leituras extras.</p>
                    </div>
                  </>
                )}

              </div>
            )}

            {activeTab === 'nucleos' && <NucleosPanel userRole={profile?.tipo} />}

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
                handleUpdateUserType={handleUpdateUserType}
                handleGrantModuleException={handleGrantModuleException}
                userRole={profile?.tipo}
                allNucleos={professorNucleos}
                courses={courses}
              />
            )}

            {activeTab === 'content' && (
               <ProfessorContent 
                 courses={courses}
                 selectedCourse={selectedCourse}
                 setSelectedCourse={setSelectedCourse}
                 books={books}
                 setBooks={setBooks}
                 selectedBook={selectedBook}
                 setSelectedBook={setSelectedBook}
                 lessons={lessons}
                 setLessons={setLessons}
                 fetchBooks={fetchBooks}
                 selectBookAndShowLessons={selectBookAndShowLessons}
                 profile={profile}
                 professorNucleos={professorNucleos}
                 submissions={submissions}
               />
            )}

             {(activeTab as string) === 'modules' && (
               <ProfessorContent 
                 courses={courses}
                 selectedCourse={selectedCourse}
                 setSelectedCourse={setSelectedCourse}
                 books={books}
                 setBooks={setBooks}
                 selectedBook={selectedBook}
                 setSelectedBook={setSelectedBook}
                 lessons={lessons}
                 setLessons={setLessons}
                 fetchBooks={fetchBooks}
                 selectBookAndShowLessons={selectBookAndShowLessons}
                 profile={profile}
                 professorNucleos={professorNucleos}
                 submissions={submissions}
               />
            )}

            {activeTab === 'academic' && (
              <AcademicHistory 
                data={academicReport} 
                searchTerm={searchTerm} 
                onDelete={handleDeleteSubmission}
                onUpdateStatus={handleUpdateUserType}
                allStudents={allStudents}
                onCorrect={async (id) => {
                  let sub = submissions.find(s => s.submission_id === id);
                  if (!sub) {
                       const { data, error } = await supabase
                         .from('respostas_aulas')
                         .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas, aulas:aula_id(id, titulo, tipo, questionario, is_bloco_final, livros:livro_id(id, titulo)), users:aluno_id(id, nome, email, nucleo_id, nucleos:nucleo_id(id, nome))')
                         .eq('id', id)
                         .single();
                    if (data && !error) {
                      const rawData = data as any;
                      sub = {
                        ...rawData,
                        submission_id: rawData.id,
                        student_id: rawData.aluno_id,
                        lesson_id: rawData.aula_id,
                        lesson_title: rawData.aulas?.titulo,
                        lesson_type: rawData.aulas?.tipo,
                        is_bloco_final: rawData.aulas?.is_bloco_final,
                        student_name: rawData.users?.nome,
                        student_email: rawData.users?.email,
                        nucleus_id: rawData.users?.nucleos?.id,
                        nucleus_name: rawData.users?.nucleos?.nome || 'Sem Polo',
                        book_id: rawData.aulas?.livros?.id,
                        book_title: rawData.aulas?.livros?.titulo || 'Módulo Geral',
                        submitted_at: rawData.created_at,
                      } as any;
                    }
                  }
                  if (sub) {
                    handleSelectSubmission(sub);
                    setActiveTab('grading');
                  } else {
                    alert('Os dados completos desta avaliação não estão carregados para correção no momento.');
                  }
                }}
              />
           )}

            {activeTab === 'boletim' && (
              <BoletimPanel
                courses={courses}
                submissions={submissions}
                allStudents={allStudents}
                professorNucleos={professorNucleos}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'grading' && (
              <GradingPanel 
                courses={courses}
                submissions={submissions}
                allStudents={allStudents}
                professorNucleos={professorNucleos}
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

            {activeTab === 'alumni' && <AlumniManagement />}

            {activeTab === 'documents' && <DocumentAnalysis />}

              {activeTab === 'forum' && profile && <ForumPanel userProfile={profile} />}

              {activeTab === 'release' && (
                <ContentReleasePanel
                  professorNucleos={professorNucleos}
                  profile={profile}
                />
              )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Professor
