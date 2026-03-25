import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  GraduationCap,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Menu,
  X,
  Bell,
  AlertCircle,
  FileText
} from 'lucide-react'
import NucleosPanel from '../components/NucleosPanel'
import { Submission, Student, ProfessorCourse } from '../types/professor'
import StudentsManagement from '../components/professor/StudentsManagement'
import ProfessorContent from '../components/professor/ProfessorContent'
import GradingPanel from '../components/professor/GradingPanel'
import AvisosManagement from '../components/professor/AvisosManagement'
import MateriaisManagement from '../components/professor/MateriaisManagement'

import { useProfile } from '../hooks/useProfile'

type Tab = 'nucleos' | 'content' | 'students' | 'grading' | 'avisos' | 'materiais'

const Professor = () => {
  const { profile, loading: profileLoading, signOut } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>('nucleos')
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [courses, setCourses] = useState<ProfessorCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [lessons, setLessons] = useState<any[]>([])

  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Grading state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [gradeInput, setGradeInput] = useState<string>('')
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({})
  const [savingGrade, setSavingGrade] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading) {
      if (!profile) {
        navigate('/professor/login');
        return;
      }
      
      const roles = profile.caminhos_acesso || []
      if (profile.email === 'edi.ben.jr@gmail.com') {
        if (!roles.includes('aluno')) roles.push('aluno')
        if (!roles.includes('professor')) roles.push('professor')
        if (!roles.includes('suporte')) roles.push('suporte')
      }
      if (roles.length > 1) setAvailableRoles(roles)

      const isProfessor = profile.tipo === 'professor' || roles.includes('professor') || profile.email === 'edi.ben.jr@gmail.com'

      if (!isProfessor) {
        navigate('/dashboard')
        return
      }

      setCurrentUserEmail(profile.email);
      fetchData();
      setLoading(false);
    }
  }, [profile, profileLoading]);

  const fetchData = async () => {
    const { data: cData } = await supabase
      .from('cursos')
      .select(`
        id,
        nome,
        livros (
          id,
          titulo,
          capa_url,
          pdf_url,
          ordem,
          aulas (
            id,
            titulo,
            tipo,
            video_url,
            created_at,
            nucleo_id
          )
        )
      `)
      .order('nome')
    if (cData) setCourses(cData)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single()
      const isAdmin = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.caminhos_acesso?.includes('admin') || user.email === 'edi.ben.jr@gmail.com'

      if (isAdmin) {
        const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
        if (sData) setAllStudents(sData)

        const { data: subData } = await supabase
          .from('respostas_aulas')
          .select(`
            id, 
            respostas, 
            nota, 
            status, 
            created_at, 
            tentativas,
            primeira_correcao_at,
            aulas:aula_id ( id, titulo, questionario ), 
            users:aluno_id ( id, nome, email )
          `)
          .order('updated_at', { ascending: false })
        if (subData) setSubmissions(subData as any)
      } else {
        const { data: myNucs } = await supabase.from('professor_nucleo').select('nucleo_id').eq('professor_id', user.id)
        if (myNucs && myNucs.length > 0) {
          const nucIds = myNucs.map(n => n.nucleo_id)
          const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').in('nucleo_id', nucIds).order('nome')
          if (sData) {
            setAllStudents(sData)
            const studentIds = sData.map(s => s.id)
            if (studentIds.length > 0) {
              const { data: subData } = await supabase
                .from('respostas_aulas')
                .select(`
                  id, 
                  respostas, 
                  nota, 
                  status, 
                  created_at, 
                  tentativas,
                  primeira_correcao_at,
                  aulas:aula_id ( id, titulo, questionario ), 
                  users:aluno_id ( id, nome, email )
                `)
                .in('aluno_id', studentIds)
                .order('updated_at', { ascending: false })
              if (subData) setSubmissions(subData as any)
            }
          }
        }
      }
    }
  }

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    
    const initialEvals: Record<string, boolean> = {};
    const questionnaire = (sub.aulas?.questionario || []).filter((q: any) => q && q.id && q.text);
    
    if (questionnaire.length > 0) {
      questionnaire.forEach((q: any) => {
        const studentAns = sub.respostas?.[q.id];
        const correctOpt = q.correctOption !== undefined ? q.correctOption : q.correct;

        if (q.type === 'multiple_choice' || !q.type) {
          const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns) === String(correctOpt);
          initialEvals[q.id] = isCorrect;
        } else if (q.type === 'true_false') {
          const isCorrect = studentAns === q.correctAnswer;
          initialEvals[q.id] = !!isCorrect;
        } else if (q.type === 'matching') {
          let allCorrect = true;
          if (!studentAns || Object.keys(studentAns).length === 0) {
            allCorrect = false;
          } else {
            const answerMap = studentAns as Record<string, string>;
            q.matchingPairs?.forEach((_: any, idx: number) => {
              if (String(answerMap[idx]) !== String(idx)) allCorrect = false;
            });
          }
          initialEvals[q.id] = allCorrect;
        }
      });
    }
    
    setQuestionEvaluations(initialEvals);
    
    const autoGradable = questionnaire.filter((q: any) => q.type !== 'discursive');
    const totalQuestions = questionnaire.length;
    
    if (totalQuestions > 0) {
      const correctCount = questionnaire.reduce((acc: number, q: any) => {
        return acc + (initialEvals[q.id] === true ? 1 : 0);
      }, 0);
      const initialGrade = (correctCount / totalQuestions) * 10;
      setGradeInput(initialGrade.toFixed(1));
    } else {
      setGradeInput('10.0'); 
    }
  }

  const toggleEvaluation = (questionId: string, isCorrect: boolean) => {
    const newEvals = { ...questionEvaluations, [questionId]: isCorrect };
    setQuestionEvaluations(newEvals);
    
    const questionnaire = (selectedSubmission?.aulas?.questionario || []).filter((q: any) => q && q.id && q.text);
    const totalQuestions = questionnaire.length;
    
    if (totalQuestions > 0) {
      const correctCount = questionnaire.reduce((acc: number, q: any) => {
        return acc + (newEvals[q.id] === true ? 1 : 0);
      }, 0);
      
      const calculatedGrade = (correctCount / totalQuestions) * 10;
      setGradeInput(calculatedGrade.toFixed(1));
    }
  }

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Deseja realmente excluir esta atividade do aluno? Isso permitirá que ele refaça a atividade novamente do zero.')) return
    
    setDeleting(subId)
    try {
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', subId)
      if (error) throw error
      alert('Atividade excluída com sucesso. O aluno já pode refazer.')
      fetchData() 
    } catch(err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveGrade = async () => {
    if(!selectedSubmission || gradeInput === '') return
    setSavingGrade(true)
    try {
      const updateData: any = {
        nota: parseFloat(gradeInput),
        status: 'corrigida'
      }

      if (!selectedSubmission.primeira_correcao_at) {
        updateData.primeira_correcao_at = new Date().toISOString()
      }

      const { error } = await supabase.from('respostas_aulas').update(updateData).eq('id', selectedSubmission.id)
      
      if(error) throw error
      
      alert('Nota salva com sucesso!')
      setSelectedSubmission(null)
      setGradeInput('')
      fetchData() 
    } catch(err) {
      console.error(err)
      alert('Erro ao salvar nota.')
    } finally {
      setSavingGrade(false)
    }
  }

  const fetchBooks = async (courseId: string) => {
    const course = courses.find((c: any) => c.id === courseId)
    if (course) {
      const sortedBooks = [...(course.livros || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
      setBooks(sortedBooks)
    }
  }

  const selectBookAndShowLessons = (book: any) => {
    setSelectedBook(book)
    const sortedLessons = [...(book.aulas || [])].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setLessons(sortedLessons)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
        <div className="logo-section" style={{ padding: '0 0.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>FATESA</h1>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Painel do Professor</p>
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

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
                  {availableRoles.filter(r => r !== 'professor').map(r => (
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
                      {r === 'aluno' ? 'Portal do Aluno' : r === 'admin' ? 'Painel Administrativo' : r === 'suporte' ? 'Painel de Suporte' : 'Professor'}
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
          />
        )}

        {activeTab === 'grading' && (
          <GradingPanel 
            submissions={submissions}
            selectedSubmission={selectedSubmission}
            setSelectedSubmission={setSelectedSubmission}
            handleSelectSubmission={handleSelectSubmission}
            deleting={deleting}
            handleDeleteSubmission={handleDeleteSubmission}
            gradeInput={gradeInput}
            setGradeInput={setGradeInput}
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
