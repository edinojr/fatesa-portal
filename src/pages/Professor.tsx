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
} from 'lucide-react'
import NucleosPanel from '../components/NucleosPanel'
import { Submission, Student, ProfessorCourse } from '../types/professor'
import StudentsManagement from '../components/professor/StudentsManagement'
import ProfessorContent from '../components/professor/ProfessorContent'
import GradingPanel from '../components/professor/GradingPanel'
import AvisosManagement from '../components/professor/AvisosManagement'
import MateriaisManagement from '../components/professor/MateriaisManagement'
import { AlertCircle, FileText } from 'lucide-react'

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
            created_at
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
      <Link to="/" className="back-nav-btn">
        <ChevronLeft size={18} /> Voltar à Home
      </Link>

      <aside className="admin-sidebar" style={{ paddingTop: '6rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <GraduationCap size={32} color="var(--primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>Painel do Professor</h2>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.8, paddingLeft: '2.75rem' }}>{currentUserEmail}</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {availableRoles.length > 1 && (
            <div style={{ marginBottom: '1rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', gap: '0.5rem' }}
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Users size={16} /> Alternar Painel
              </button>
              {showRoleSwitcher && (
                <div style={{ marginTop: '0.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem' }}>
                  {availableRoles.filter(r => r !== 'professor').map(r => (
                    <button 
                      key={r} 
                      className="admin-nav-item" 
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                      onClick={() => navigate(r === 'aluno' ? '/dashboard' : r === 'suporte' || r === 'admin' ? '/admin' : '/professor')}
                    >
                      {r === 'aluno' ? 'Portal do Aluno' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div 
            className={`admin-nav-item ${activeTab === 'nucleos' ? 'active' : ''}`}
            onClick={() => setActiveTab('nucleos')}
          >
            <Users size={20} /> Meus Núcleos
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <LayoutDashboard size={20} /> Gestão de Alunos
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <BookOpen size={20} /> Ver Conteúdo
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'grading' ? 'active' : ''}`}
            onClick={() => { setActiveTab('grading'); setSelectedSubmission(null); }}
          >
            <CheckCircle size={20} /> Correção de Provas
            {submissions.filter(s => s.status === 'pendente').length > 0 && (
              <span style={{ background: 'var(--error)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: 'auto' }}>
                {submissions.filter(s => s.status === 'pendente').length}
              </span>
            )}
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'avisos' ? 'active' : ''}`}
            onClick={() => setActiveTab('avisos')}
          >
            <AlertCircle size={20} /> Quadro de Avisos
          </div>
          <div 
            className={`admin-nav-item ${activeTab === 'materiais' ? 'active' : ''}`}
            onClick={() => setActiveTab('materiais')}
          >
            <FileText size={20} /> Materiais Adicionais
          </div>
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div className="admin-nav-item" onClick={() => navigate('/professor')}>
              <LayoutDashboard size={20} /> Início
            </div>
            <div className="admin-nav-item" onClick={() => navigate('/dashboard')}>
              <GraduationCap size={20} /> Ir para Portal do Aluno
            </div>
            <div className="admin-nav-item" style={{ color: 'var(--error)' }} onClick={handleLogout}>
              <LogOut size={20} /> Sair
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main" style={{ paddingTop: '5rem' }}>
        <header className="mobile-col-flex" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      </main>
    </div>
  )
}

export default Professor
