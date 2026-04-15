import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'

// Modular Feature Hooks
import { useProfessorCourses } from '../features/courses/hooks/useProfessorCourses'
import { useProfessorStudents } from '../features/users/hooks/useProfessorStudents'
import { useProfessorGrading } from '../features/courses/hooks/useProfessorGrading'

export type Tab = 'home' | 'nucleos' | 'content' | 'students' | 'grading' | 'avisos' | 'materiais' | 'attendance' | 'forum' | 'academic'

export const useProfessorManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['home', 'nucleos', 'content', 'students', 'grading', 'avisos', 'materiais', 'attendance', 'forum', 'academic'];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const setActiveTab = (newTab: Tab) => {
    setSearchParams({ tab: newTab });
  };
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [professorNucleos, setProfessorNucleos] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [academicReport, setAcademicReport] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const navigate = useNavigate()

  // Composition of modular hooks
  const courseHook = useProfessorCourses()
  const studentHook = useProfessorStudents()
  const gradingHook = useProfessorGrading()

  useEffect(() => {
    if (!profileLoading) {
      if (!profile) {
        navigate('/login');
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
    // 1. Fetch Courses
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
    if (cData) courseHook.setCourses(cData)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).maybeSingle()
      const isAdmin = profileData?.tipo === 'admin' || profileData?.tipo === 'suporte' || profileData?.caminhos_acesso?.includes('admin') || user.email === 'edi.ben.jr@gmail.com'

      if (isAdmin) {
        const { data: nData } = await supabase.from('nucleos').select('id, nome').order('nome')
        if (nData) setProfessorNucleos(nData)

        const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
        if (sData) studentHook.setAllStudents(sData)

        const { data: subData } = await supabase
          .from('respostas_aulas')
          .select(`
            submission_id:id,
            nota,
            status,
            respostas,
            tentativas,
            primeira_correcao_at,
            comentario_professor,
            submitted_at:created_at,
            last_updated:updated_at,
            lesson_id:aula_id,
            aulas:aula_id (
              id,
              titulo,
              tipo,
              questionario,
              is_bloco_final,
              min_grade,
              livros ( id, titulo )
            ),
            student_id:aluno_id,
            users:aluno_id (
              id,
              nome,
              email,
              nucleos ( id, nome )
            )
          `)
          .order('created_at', { ascending: false })
        
        if (subData) {
          // Normalize names for compatibility with the view-based components
          const normalized = (subData as any[]).map(s => ({
            ...s,
            lesson_title: s.aulas?.titulo,
            lesson_type: s.aulas?.tipo,
            is_bloco_final: s.aulas?.is_bloco_final,
            book_title: s.aulas?.livros?.titulo,
            student_name: s.users?.nome,
            student_email: s.users?.email,
            nucleus_name: s.users?.nucleos?.nome
          }));
          gradingHook.setSubmissions(normalized)
        }
      } else {
        const { data: myNucs } = await supabase
          .from('professor_nucleo')
          .select('nucleo_id, nucleos(id, nome)')
          .eq('professor_id', user.id)
        
        if (myNucs) {
          const nucs = myNucs.filter((n: any) => n.nucleos).map((n: any) => n.nucleos)
          // Sort nucleus by name
          setProfessorNucleos([...nucs].sort((a,b) => (a.nome || '').localeCompare(b.nome || '')))
          
          const nucIds = myNucs.map(n => n.nucleo_id)
          const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').in('nucleo_id', nucIds).order('nome')
          
          if (sData && sData.length > 0) {
            const studentIds = sData.map(s => s.id)
            const { data: academicData } = await supabase
              .from('respostas_aulas')
              .select(`
                id, 
                nota, 
                status, 
                updated_at,
                aulas:aula_id ( id, titulo, is_bloco_final, livros ( id, titulo ) ), 
                users:aluno_id ( id, nome, email, tipo, ano_graduacao, nucleos ( id, nome ) )
              `)
              .in('aluno_id', studentIds)
              .not('nota', 'is', null)
              .order('updated_at', { ascending: false });
            if (academicData) setAcademicReport(academicData);
            
            studentHook.setAllStudents(sData)
            if (studentIds.length > 0) {
              const { data: subData } = await supabase
                .from('respostas_aulas')
                .select(`
                  submission_id:id,
                  nota,
                  status,
                  respostas,
                  tentativas,
                  primeira_correcao_at,
                  comentario_professor,
                  submitted_at:created_at,
                  last_updated:updated_at,
                  lesson_id:aula_id,
                  aulas:aula_id (
                    id,
                    titulo,
                    tipo,
                    questionario,
                    is_bloco_final,
                    min_grade,
                    livros ( id, titulo )
                  ),
                  student_id:aluno_id,
                  users:aluno_id (
                    id,
                    nome,
                    email,
                    nucleos ( id, nome )
                  )
                `)
                .in('aluno_id', studentIds)
                .order('created_at', { ascending: false });
              
              if (subData) {
                // Normalize names for compatibility with the view-based components
                const normalized = (subData as any[]).map(s => ({
                  ...s,
                  lesson_title: s.aulas?.titulo,
                  lesson_type: s.aulas?.tipo,
                  is_bloco_final: s.aulas?.is_bloco_final,
                  book_title: s.aulas?.livros?.titulo,
                  student_name: s.users?.nome,
                  student_email: s.users?.email,
                  nucleus_name: s.users?.nucleos?.nome
                }));
                gradingHook.setSubmissions(normalized)
              }
            }
          }
        }
      }
      
      // Fetch Attendance
      const { data: attData } = await supabase
        .from('frequencia')
        .select('*, aluno:users!aluno_id(nome)')
        .eq('professor_id', user.id)
        .order('data', { ascending: false });
      if (attData) setAttendanceRecords(attData);
    }
  }

  const handleSaveAttendance = async (records: any[]) => {
    setActionLoading('saving-attendance');
    try {
      const { error } = await supabase.from('frequencia').upsert(records);
      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setActionLoading(null);
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
    professorNucleos,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    handleLogout,
    navigate,
    // Delegated Course State & Actions
    ...courseHook,
    // Delegated Student State & Actions
    ...studentHook,
    handleApproveAccess: (id: string) => studentHook.handleApproveAccess(id, fetchData),
    handleRejectAccess: (id: string) => studentHook.handleRejectAccess(id, fetchData),
    handleDeleteUser: (id: string) => studentHook.handleDeleteUser(id, fetchData),
    handleResetProgress: (id: string) => studentHook.handleResetProgress(id, fetchData),
    handleUpdateUserNucleo: (id: string, nId: string, nNome: string) => studentHook.handleUpdateUserNucleo(id, nId, nNome, fetchData),
    // Delegated Grading State & Actions
    ...gradingHook,
    handleSaveGrade: () => gradingHook.handleSaveGrade(fetchData),
    handleDeleteSubmission: (id: string) => gradingHook.handleDeleteSubmission(id, fetchData),
    academicReport,
    attendanceRecords,
    handleSaveAttendance,
    actionLoading,
    setActionLoading
  }
}
