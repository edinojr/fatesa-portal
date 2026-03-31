import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'

// Modular Feature Hooks
import { useProfessorCourses } from '../features/courses/hooks/useProfessorCourses'
import { useProfessorStudents } from '../features/users/hooks/useProfessorStudents'
import { useProfessorGrading } from '../features/courses/hooks/useProfessorGrading'

export type Tab = 'nucleos' | 'content' | 'students' | 'grading' | 'avisos' | 'materiais'

export const useProfessorManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>('nucleos')
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [professorNucleos, setProfessorNucleos] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      const { data: profileData } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single()
      const isAdmin = profileData?.tipo === 'admin' || profileData?.tipo === 'suporte' || profileData?.caminhos_acesso?.includes('admin') || user.email === 'edi.ben.jr@gmail.com'

      if (isAdmin) {
        const { data: nData } = await supabase.from('nucleos').select('id, nome').order('nome')
        if (nData) setProfessorNucleos(nData)

        const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
        if (sData) studentHook.setAllStudents(sData)

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
            aulas:aula_id ( id, titulo, questionario, tipo, is_bloco_final, livros ( titulo ) ), 
            users:aluno_id ( id, nome, email )
          `)
          .order('updated_at', { ascending: false })
        if (subData) gradingHook.setSubmissions(subData as any)
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
          if (sData) {
            studentHook.setAllStudents(sData)
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
                  aulas:aula_id ( id, titulo, questionario, tipo, is_bloco_final, livros ( titulo ) ), 
                  users:aluno_id ( id, nome, email )
                `)
                .in('aluno_id', studentIds)
                .order('updated_at', { ascending: false })
              if (subData) gradingHook.setSubmissions(subData as any)
            }
          }
        }
      }
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
    // Delegated Grading State & Actions
    ...gradingHook,
    handleSaveGrade: () => gradingHook.handleSaveGrade(fetchData),
    handleDeleteSubmission: (id: string) => gradingHook.handleDeleteSubmission(id, fetchData)
  }
}
