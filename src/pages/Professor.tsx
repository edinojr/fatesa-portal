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
  PlayCircle,
  Eye,
  Plus,
  Search,
  Award,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Trash2,
  ChevronDown
} from 'lucide-react'
import NucleosPanel from '../components/NucleosPanel'

type Tab = 'nucleos' | 'content' | 'students' | 'grading'

const Professor = () => {
  const [activeTab, setActiveTab] = useState<Tab>('nucleos')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [lessons, setLessons] = useState<any[]>([])

  const [allStudents, setAllStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Grading state
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const [gradeInput, setGradeInput] = useState<string>('')
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({})
  const [savingGrade, setSavingGrade] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }
    setCurrentUserEmail(user.email ?? null)

    const { data: profile } = await supabase
      .from('users')
      .select('tipo, caminhos_acesso')
      .eq('id', user.id)
      .single()

    const roles = profile?.caminhos_acesso || []
    if (user.email === 'edi.ben.jr@gmail.com') {
      if (!roles.includes('aluno')) roles.push('aluno')
      if (!roles.includes('professor')) roles.push('professor')
      if (!roles.includes('suporte')) roles.push('suporte')
    }
    if (roles.length > 1) setAvailableRoles(roles)

    const isProfessor = profile?.tipo === 'professor' || roles.includes('professor') || user.email === 'edi.ben.jr@gmail.com'

    if (!isProfessor) {
      alert('Acesso restrito a professores.')
      navigate('/dashboard')
      return
    }

    setUserRole('professor')
    fetchData()
    setLoading(false)
  }

  const fetchData = async () => {
    // Fetch Courses with nested livros and aulas (same approach as Dashboard)
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

    // Fetch all students and submissions
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Determine if I should see everything (admin/suporte)
      const { data: profile } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single()
      const isAdmin = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.caminhos_acesso?.includes('admin') || user.email === 'edi.ben.jr@gmail.com'

      if (isAdmin) {
        // Admins see all students and all submissions
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
        if (subData) setSubmissions(subData)
      } else {
        // Regular professors see only their nuclei
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
              if (subData) setSubmissions(subData)
            }
          }
        }
      }
    }
  }

  const handleSelectSubmission = (sub: any) => {
    setSelectedSubmission(sub);
    
    // Auto-prefill evaluations for auto-graded questions
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
    
    // Initial grade calculation - only auto-gradable
    const autoGradable = questionnaire.filter((q: any) => q.type !== 'discursive');
    const totalAuto = autoGradable.length;
    
    if (totalAuto > 0) {
      const correctCount = autoGradable.reduce((acc: number, q: any) => {
        return acc + (initialEvals[q.id] === true ? 1 : 0);
      }, 0);
      const initialGrade = (correctCount / totalAuto) * 10;
      setGradeInput(initialGrade.toFixed(1));
    } else {
      setGradeInput('10.0'); // All discursive or no questions
    }
  }

  const toggleEvaluation = (questionId: string, isCorrect: boolean) => {
    const newEvals = { ...questionEvaluations, [questionId]: isCorrect };
    setQuestionEvaluations(newEvals);
    
    const questionnaire = (selectedSubmission?.aulas?.questionario || []).filter((q: any) => q && q.id && q.text);
    const totalQuestions = questionnaire.length;
    
    if (totalQuestions > 0) {
      const correctCount = questionnaire.reduce((acc: number, q: any) => {
        // For auto-graded, use the already solved result OR the toggle
        // For discursive, use the toggle
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
      fetchData() // Refresh list
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

      // Se for a primeira correção, marca a data de início do prazo de 30 dias
      if (!selectedSubmission.primeira_correcao_at) {
        updateData.primeira_correcao_at = new Date().toISOString()
      }

      const { error } = await supabase.from('respostas_aulas').update(updateData).eq('id', selectedSubmission.id)
      
      if(error) throw error
      
      alert('Nota salva com sucesso!')
      setSelectedSubmission(null)
      setGradeInput('')
      fetchData() // Refresh list
    } catch(err) {
      console.error(err)
      alert('Erro ao salvar nota.')
    } finally {
      setSavingGrade(false)
    }
  }

  const fetchBooks = async (courseId: string) => {
    // Extract books from already-fetched courses data
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
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{activeTab === 'nucleos' ? 'Gestão de Núcleos' : activeTab === 'grading' ? 'Correção de Avaliações' : 'Conteúdo do Curso'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, Professor.</p>
          </div>
        </header>

        {activeTab === 'nucleos' && <NucleosPanel userRole="professor" />}

        {activeTab === 'students' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <div className="mobile-wrap-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>Gestão Unificada de Alunos</h2>
                <p style={{ color: 'var(--text-muted)' }}>Lista consolidada de todos os alunos vinculados aos seus pólos.</p>
              </div>
              <div className="input-group" style={{ width: '100%', maxWidth: '300px', marginBottom: 0 }}>
                <input 
                  type="text" 
                  placeholder="Pesquisar aluno..." 
                  className="form-control" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {Object.entries(
                allStudents
                  .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .reduce((acc: any, student: any) => {
                    const nucName = student.nucleos?.nome || 'Sem Núcleo Definido';
                    if (!acc[nucName]) acc[nucName] = [];
                    acc[nucName].push(student);
                    return acc;
                  }, {})
              )
              .sort(([nA], [nB]) => nA.localeCompare(nB))
              .map(([nucleoName, nucleoStudents]: [string, any]) => (
                <div key={nucleoName}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    padding: '1rem 1.5rem',
                    background: 'rgba(168, 85, 247, 0.1)',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--primary)'
                  }}>
                    <Users size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{nucleoName} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>({nucleoStudents.length} alunos)</span></h3>
                  </div>

                  <div className="data-card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nucleoStudents
                          .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                          .map((student: any) => (
                            <tr key={student.id}>
                              <td style={{ fontWeight: 600 }}>{student.nome}</td>
                              <td>{student.email}</td>
                              <td><span className={`admin-badge status-${student.status_nucleo || 'pendente'}`}>{student.status_nucleo || 'pendente'}</span></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {allStudents.length === 0 && (
                <div className="data-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  Nenhum aluno encontrado nos seus núcleos.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {selectedCourse && (
                <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => { setSelectedCourse(null); setSelectedBook(null); }}>
                  Voltar para Cursos
                </button>
              )}
              {selectedBook && (
                <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setSelectedBook(null)}>
                  Voltar para Livros
                </button>
              )}
            </div>

            {!selectedCourse ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {courses.map(course => (
                  <div key={course.id} className="course-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>{course.nome}</h3>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <BookOpen size={16} color="var(--primary)" /> <strong>{course.livros?.length || 0} Livros</strong>
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Ver Conteúdo</button>
                  </div>
                ))}
              </div>
            ) : !selectedBook ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {books.map(book => (
                  <div key={book.id} className="course-card" style={{ padding: '1.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                    <h4 style={{ marginBottom: '1.5rem' }}>{book.titulo}</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => selectBookAndShowLessons(book)}>Aulas</button>
                      <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => navigate(`/book/${book.id}`)}><Eye size={18} /></button>
                    </div>
                  </div>
                ))}
                {books.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum livro neste curso.</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                  <h4 style={{ color: 'var(--primary)' }}>Aulas de {selectedBook.titulo}</h4>
                </div>
                {lessons.map(lesson => (
                  <div key={lesson.id} style={{ padding: '1.25rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <PlayCircle size={24} color="var(--primary)" />
                      <div>
                        <h5 style={{ fontSize: '1rem', fontWeight: 600 }}>{lesson.titulo}</h5>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.tipo === 'gravada' ? 'Vídeo Aula' : 'Aula ao Vivo'}</p>
                      </div>
                    </div>
                    <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => navigate(`/lesson/${lesson.id}`)}><Eye size={18} /> Ver Aula</button>
                  </div>
                ))}
                {lessons.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula cadastrada ainda.</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'grading' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            {!selectedSubmission ? (
              <div className="data-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle color="var(--primary)" /> Submissões Pendentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {submissions.filter(s => s.status === 'pendente').map(sub => (
                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem' }}>{sub.aulas?.titulo || 'Atividade Desconhecida'}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aluno: {sub.users?.nome} ({sub.users?.email})</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>Data: {new Date(sub.created_at).toLocaleString()}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => handleSelectSubmission(sub)}>Corrigir Teste</button>
                        <button 
                          className="btn btn-outline" 
                          style={{ width: 'auto', border: 'none', color: 'var(--error)', padding: '0.5rem' }}
                          onClick={() => handleDeleteSubmission(sub.id)}
                          disabled={deleting === sub.id}
                        >
                          {deleting === sub.id ? <Loader2 className="spinner" size={20} /> : <Trash2 size={20} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {submissions.filter(s => s.status === 'pendente').length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Você não tem avaliações pendentes de correção no momento.</p>
                  )}
                </div>

                <h3 style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle color="var(--success)" /> Últimas Correções</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
                  {submissions.filter(s => s.status === 'corrigida').slice(0, 10).map(sub => (
                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem' }}>{sub.aulas?.titulo}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Aluno: {sub.users?.nome} 
                          <span style={{ marginLeft: '1rem', color: sub.tentativas > 1 ? 'var(--warning)' : 'var(--text-muted)' }}>
                             • {sub.tentativas || 1}ª tentativa
                          </span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.2rem', textAlign: 'right' }}>{sub.nota?.toFixed(1)} / 10</div>
                        <button 
                          className="btn btn-outline" 
                          style={{ width: 'auto', border: 'none', color: 'var(--error)', padding: '0.5rem' }}
                          onClick={() => handleDeleteSubmission(sub.id)}
                          disabled={deleting === sub.id}
                        >
                          {deleting === sub.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {submissions.filter(s => s.status === 'corrigida').length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma correção recente.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="data-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button className="btn btn-outline" style={{ width: 'auto', marginBottom: '2rem', padding: '0.5rem 1rem' }} onClick={() => setSelectedSubmission(null)}>
                  <ChevronLeft size={16} /> Voltar para Fila
                </button>

                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedSubmission.aulas?.titulo}</h2>
                      <p style={{ color: 'var(--text-muted)' }}>Aluno: <strong style={{ color: '#fff' }}>{selectedSubmission.users?.nome}</strong></p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail: {selectedSubmission.users?.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="admin-badge status-pendente" style={{ background: selectedSubmission.tentativas > 1 ? 'var(--warning-dark)' : 'rgba(var(--primary-rgb), 0.1)' }}>
                        {selectedSubmission.tentativas || 1}ª Tentativa
                      </div>
                      {selectedSubmission.primeira_correcao_at && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          Início da Recuperação: {new Date(selectedSubmission.primeira_correcao_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
                  {Array.isArray(selectedSubmission.aulas?.questionario) && selectedSubmission.aulas.questionario.map((q: any, idx: number) => {
                    const studentAnswer = selectedSubmission.respostas?.[q.id];
                    let displayAnswer: React.ReactNode = <em style={{ color: 'var(--text-muted)' }}>Sem resposta</em>;

                    if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
                      if (q.type === 'multiple_choice' || !q.type) {
                        displayAnswer = <span><strong>Opção {parseInt(studentAnswer) + 1} selecionada:</strong> {q.options?.[studentAnswer]}</span>;
                      } else if (q.type === 'true_false') {
                        displayAnswer = <span>Marcou como: <strong style={{ color: studentAnswer ? 'var(--success)' : 'var(--error)' }}>{studentAnswer ? 'Verdadeiro' : 'Falso'}</strong></span>;
                      } else if (q.type === 'matching') {
                        // studentAnswer is an object {0: "1", 1: "0"}
                        const answerMap = studentAnswer as Record<string, string>;
                        displayAnswer = (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Associações Efetuadas:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr)', gap: '1rem', alignItems: 'center' }}>
                              {q.matchingPairs?.map((pair: any, pIdx: number) => {
                                const selectedRightIdx = answerMap[pIdx];
                                const selectedRight = selectedRightIdx !== undefined && selectedRightIdx !== '' ? q.matchingPairs[parseInt(selectedRightIdx)].right : '---';
                                return (
                                  <React.Fragment key={pIdx}>
                                    <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 600, border: '1px solid rgba(255,255,255,0.05)' }}>
                                      {pair.left}
                                    </div>
                                    <div style={{ color: 'var(--primary)', opacity: 0.8 }}><ChevronRight size={18} /></div>
                                    <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', fontSize: '0.9rem', color: '#fff', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}>
                                      {selectedRight}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        );
                      } else if (q.type === 'discursive') {
                        displayAnswer = <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{studentAnswer}</div>;
                      }
                    }

                    return (
                      <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                          <span style={{ opacity: 0.3, marginRight: '0.5rem' }}>{idx + 1}.</span> {q.text}
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {q.type === 'discursive' && q.expectedAnswer && (
                            <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '1px' }}>Gabarito Sugerido / Palavras-chave:</div>
                              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{q.expectedAnswer}</p>
                            </div>
                          )}

                          <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Resposta do Aluno:</div>
                            <div style={{ fontSize: '1.05rem', color: '#fff' }}>{displayAnswer}</div>
                            {q.type === 'discursive' && (
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                <button 
                                  className="btn" 
                                  style={{ 
                                    width: 'auto', 
                                    padding: '0.4rem 1rem', 
                                    fontSize: '0.75rem', 
                                    background: questionEvaluations[q.id] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    border: 'none',
                                    opacity: questionEvaluations[q.id] === true ? 1 : 0.6
                                  }}
                                  onClick={() => toggleEvaluation(q.id, true)}
                                >
                                  {questionEvaluations[q.id] === true ? '✓ Correta' : 'Certa'}
                                </button>
                                <button 
                                  className="btn" 
                                  style={{ 
                                    width: 'auto', 
                                    padding: '0.4rem 1rem', 
                                    fontSize: '0.75rem', 
                                    background: questionEvaluations[q.id] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    border: 'none',
                                    opacity: questionEvaluations[q.id] === false ? 1 : 0.6
                                  }}
                                  onClick={() => toggleEvaluation(q.id, false)}
                                >
                                  {questionEvaluations[q.id] === false ? '✗ Incorreta' : 'Errada'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Resultado Final (0 a 10)</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1" 
                      className="form-control" 
                      style={{ fontSize: '2rem', width: '120px', textAlign: 'center', padding: '1rem', background: '#000' }} 
                      value={gradeInput}
                      onChange={e => setGradeInput(e.target.value)}
                      placeholder="Ex: 8.5"
                    />
                    <button className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }} disabled={savingGrade || gradeInput === ''} onClick={handleSaveGrade}>
                      {savingGrade ? <Loader2 className="spinner" /> : 'Salvar Nota e Finalizar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  )
}

export default Professor
