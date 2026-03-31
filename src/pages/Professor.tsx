import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  ChevronLeft,
  Loader2,
  CheckCircle,
  Menu,
  X,
  AlertCircle,
  FileText
} from 'lucide-react'
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
    toggleEvaluation,
    savingGrade,
    actionLoading,
    deleting,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    handleSaveGrade,
    handleDeleteSubmission,
    handleSelectSubmission,
    handleApproveAccess,
    handleRejectAccess,
    handleDeleteUser,
    handleResetProgress,
    handleLogout,
    fetchBooks,
    selectBookAndShowLessons
  } = useProfessorManagement();

  const navigate = useNavigate()

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando Painel...</div>

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

      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ paddingTop: '2rem' }}>
        <div className="logo-section" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
          <Logo size={200} />
          <button className="mobile-menu-btn" style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {availableRoles.length > 0 && availableRoles.some(r => r === 'admin' || r === 'suporte' || profile?.email === 'edi.ben.jr@gmail.com') && (
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
                  {availableRoles.filter(r => ['aluno', 'admin', 'professor'].includes(r) && r !== 'professor').map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => { 
                        navigate(r === 'aluno' ? '/dashboard' : r === 'admin' ? '/admin' : '/professor'); 
                        setShowRoleSwitcher(false); 
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {r === 'aluno' ? 'Painel do Aluno' : r === 'admin' ? 'Painel Administrativo' : 'Professor'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`admin-nav-item ${activeTab === 'nucleos' ? 'active' : ''}`} onClick={() => { setActiveTab('nucleos'); setIsMobileMenuOpen(false); }}>
            <Users size={18} /> <span className="mobile-hide">Núcleos</span>
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => { setActiveTab('students'); setIsMobileMenuOpen(false); }}
          >
            <LayoutDashboard size={18} /> <span className="mobile-hide">Alunos</span>
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => { setActiveTab('content'); setIsMobileMenuOpen(false); }}
          >
            <BookOpen size={18} /> <span className="mobile-hide">Conteúdo</span>
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'grading' ? 'active' : ''}`}
            onClick={() => { setActiveTab('grading'); setSelectedSubmission(null); setIsMobileMenuOpen(false); }}
          >
            <CheckCircle size={18} /> <span className="mobile-hide">Provas</span>
            {submissions.filter(s => s.status === 'pendente').length > 0 && (
              <span style={{ background: 'var(--error)', padding: '1px 5px', borderRadius: '10px', fontSize: '0.6rem', marginLeft: '4px' }}>
                {submissions.filter(s => s.status === 'pendente').length}
              </span>
            )}
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'avisos' ? 'active' : ''}`}
            onClick={() => { setActiveTab('avisos'); setIsMobileMenuOpen(false); }}
          >
            <AlertCircle size={18} /> <span className="mobile-hide">Avisos</span>
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'materiais' ? 'active' : ''}`}
            onClick={() => { setActiveTab('materiais'); setIsMobileMenuOpen(false); }}
          >
            <FileText size={18} /> <span className="mobile-hide">Materiais</span>
          </div>
          
          <div style={{ marginLeft: 'auto', paddingLeft: '0.5rem' }}>
            <div className="admin-nav-item" style={{ color: 'var(--error)', border: 'none', background: 'transparent' }} onClick={handleLogout}>
              <LogOut size={18} />
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main" style={{ paddingTop: '1rem' }}>
        <header className="mobile-col-flex" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {activeTab === 'nucleos' ? 'Gestão de Núcleos' : 
               activeTab === 'students' ? 'Gestão de Alunos' :
               activeTab === 'grading' ? 'Correção de Avaliações' : 
               activeTab === 'avisos' ? 'Quadro de Avisos' :
               activeTab === 'materiais' ? 'Materiais Adicionais' :
               'Conteúdo do Curso'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, Professor.</p>
          </div>
        </header>

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
            userRole={profile?.tipo}
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
            toggleEvaluation={toggleEvaluation}
            savingGrade={savingGrade}
            handleSaveGrade={handleSaveGrade}
          />
        )}

        {activeTab === 'avisos' && (
          <AvisosManagement />
        )}

        {activeTab === 'materiais' && (
          <MateriaisManagement />
        )}

        <div className="bottom-nav-footer">
          <button onClick={() => navigate(-1)} className="btn btn-outline">
            <ChevronLeft size={20} /> Voltar
          </button>
          <button onClick={() => navigate('/professor')} className="btn btn-primary">
            <LayoutDashboard size={20} /> Início
          </button>
        </div>
      </main>
    </div>
  )
}

export default Professor
