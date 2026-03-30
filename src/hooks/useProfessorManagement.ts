import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Submission, Student, ProfessorCourse } from '../types/professor'
import { useProfile } from './useProfile'

export type Tab = 'nucleos' | 'content' | 'students' | 'grading' | 'avisos' | 'materiais'

export const useProfessorManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
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
  const [professorNucleos, setProfessorNucleos] = useState<any[]>([])
  
  // Grading state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [gradeInput, setGradeInput] = useState<string>('')
  const [avaliacaoComentario, setAvaliacaoComentario] = useState<string>('')
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({})
  const [savingGrade, setSavingGrade] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (!profileLoading) {
      if (!profile) {
        navigate('/professor/login');
        return;
      }
      
      let roles = profile.caminhos_acesso || []
      
      // Remover acesso de aluno para perfis estritamente professor
      if (profile.tipo === 'professor' && profile.email !== 'edi.ben.jr@gmail.com') {
        roles = roles.filter((r: string) => r !== 'aluno')
      }

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
            arquivo_url,
            created_at,
            questionario
          )
        )
      `)
      .order('nome')
    if (cData) setCourses(cData)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single()
      const isAdmin = profileData?.tipo === 'admin' || profileData?.tipo === 'suporte' || profileData?.caminhos_acesso?.includes('admin') || user.email === 'edi.ben.jr@gmail.com'

      if (isAdmin) {
        const { data: nData } = await supabase.from('nucleos').select('id, nome').order('nome')
        if (nData) setProfessorNucleos(nData)

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
        const { data: myNucs } = await supabase
          .from('professor_nucleo')
          .select('nucleo_id, nucleos(id, nome)')
          .eq('professor_id', user.id)
        
        if (myNucs) {
          const nucs = myNucs.filter((n: any) => n.nucleos).map((n: any) => n.nucleos)
          setProfessorNucleos(nucs)
          
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
    setAvaliacaoComentario(sub.comentario_professor || '');
    
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
    if(!selectedSubmission || gradeInput === '' || !avaliacaoComentario.trim()) {
      alert('A avaliação (comentário) e a nota são obrigatórias.')
      return
    }
    setSavingGrade(true)
    try {
      const updateData: any = {
        nota: parseFloat(gradeInput),
        comentario_professor: avaliacaoComentario,
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
      setAvaliacaoComentario('')
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
      (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' })
    )
    setLessons(sortedLessons)
  }

  const handleApproveAccess = async (userId: string) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status_nucleo: 'aprovado',
          acesso_definitivo: true 
        })
        .eq('id', userId)
      
      if (error) throw error
      setAllStudents(prev => prev.map(s => s.id === userId ? { ...s, status_nucleo: 'aprovado', acesso_definitivo: true } : s))
      alert('Acesso aprovado com sucesso!')
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectAccess = async (userId: string) => {
    if (!confirm('Deseja realmente recusar o acesso deste aluno?')) return
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ status_nucleo: 'recusado' })
        .eq('id', userId)
      
      if (error) throw error
      setAllStudents(prev => prev.map(s => s.id === userId ? { ...s, status_nucleo: 'recusado' } : s))
      alert('Acesso recusado.')
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deseja realmente EXCLUIR este aluno permanentemente? Esta ação não pode ser desfeita.')) return
    setActionLoading(userId)
    try {
      const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId })
      if (error) throw error
      setAllStudents(prev => prev.filter(s => s.id !== userId))
      alert('Aluno excluído com sucesso.')
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return {
    profile,
    activeTab,
    setActiveTab,
    loading,
    currentUserEmail,
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
    handleLogout,
    fetchBooks,
    selectBookAndShowLessons,
    navigate
  }
}
