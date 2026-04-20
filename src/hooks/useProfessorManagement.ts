import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'

// Modular Feature Hooks (Existing)
import { useProfessorCourses } from '../features/courses/hooks/useProfessorCourses'
import { useProfessorStudents } from '../features/users/hooks/useProfessorStudents'
import { useProfessorGrading } from '../features/courses/hooks/useProfessorGrading'

// New Modular Feature Hooks
import { useProfessorNavigation } from '../features/professor/hooks/useProfessorNavigation'
import { useProfessorNucleos } from '../features/professor/hooks/useProfessorNucleos'
import { useProfessorAttendance } from '../features/professor/hooks/useProfessorAttendance'
import { useProfessorAcademic } from '../features/professor/hooks/useProfessorAcademic'

export const useProfessorManagement = () => {
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  
  // 1. Feature Hooks
  const nav = useProfessorNavigation();
  const nucs = useProfessorNucleos();
  const att = useProfessorAttendance();
  const acad = useProfessorAcademic();
  const courseHook = useProfessorCourses();
  const studentHook = useProfessorStudents();
  const gradingHook = useProfessorGrading();

  // 2. Local State
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 3. Orchestrated Data Fetch
  const fetchData = useCallback(async () => {
    if (!profile) return;
    
    const isAdmin = ['admin', 'suporte'].includes(profile.tipo || '') || profile.email === 'edi.ben.jr@gmail.com';
    
    try {
      // Fetch Nucleos based on role
      await nucs.fetchNucleos(profile.id, isAdmin);
      
      // Fetch Courses (Global for all professors)
      const { data: cData } = await supabase.from('cursos').select('id, nome, livros(*, aulas(*))').order('nome');
      if (cData) courseHook.setCourses(cData);

      if (isAdmin) {
        // Admin: See all students and submissions
        const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome');
        if (sData) studentHook.setAllStudents(sData);

        const { data: subData } = await supabase
          .from('respostas_aulas')
          .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas, aulas:aula_id(id, titulo, tipo, is_bloco_final, questionario, livros:livro_id(id, titulo)), users:aluno_id(id, nome, email, nucleo_id, nucleos:nucleo_id(id, nome))')
          .order('created_at', { ascending: false });
        const subDataMapped = (subData || []).map((r: any) => ({
          ...r,
          submission_id: r.id,
          student_id: r.aluno_id,
          lesson_id: r.aula_id,
          lesson_title: r.aulas?.titulo,
          lesson_type: r.aulas?.tipo,
          is_bloco_final: r.aulas?.is_bloco_final,
          student_name: r.users?.nome,
          student_email: r.users?.email,
          nucleus_id: r.users?.nucleos?.id,
          nucleus_name: r.users?.nucleos?.nome || 'Sem Polo',
          book_id: r.aulas?.livros?.id,
          book_title: r.aulas?.livros?.titulo || 'Módulo Geral',
          submitted_at: r.created_at,
        }));
        if (subDataMapped) gradingHook.setSubmissions(subDataMapped);
        
        acad.fetchAcademicReport(true);
      } else {
        // Professor: Restricted to linked nucleos
        const { data: myNucs } = await supabase.from('professor_nucleo').select('nucleo_id').eq('professor_id', profile.id);
        const nucIds = myNucs?.map(n => n.nucleo_id) || [];
        
        if (nucIds.length > 0) {
          const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').in('nucleo_id', nucIds).order('nome');
          if (sData) {
            studentHook.setAllStudents(sData);
            const studentIds = sData.map(s => s.id);
            if (studentIds.length > 0) {
              acad.fetchAcademicHistory(studentIds);
              const { data: subData } = await supabase
                .from('respostas_aulas')
                .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas, aulas:aula_id(id, titulo, tipo, is_bloco_final, questionario, livros:livro_id(id, titulo)), users:aluno_id(id, nome, email, nucleo_id, nucleos:nucleo_id(id, nome))')
                .in('aluno_id', studentIds)
                .order('created_at', { ascending: false });
              const subDataMapped = (subData || []).map((r: any) => ({
                ...r,
                submission_id: r.id,
                student_id: r.aluno_id,
                lesson_id: r.aula_id,
                lesson_title: r.aulas?.titulo,
                lesson_type: r.aulas?.tipo,
                is_bloco_final: r.aulas?.is_bloco_final,
                student_name: r.users?.nome,
                student_email: r.users?.email,
                nucleus_id: r.users?.nucleos?.id,
                nucleus_name: r.users?.nucleos?.nome || 'Sem Polo',
                book_id: r.aulas?.livros?.id,
                book_title: r.aulas?.livros?.titulo || 'Módulo Geral',
                submitted_at: r.created_at,
              }));
              if (subDataMapped) gradingHook.setSubmissions(subDataMapped);
            }
          }
        } else {
          // No linked nucleos
          studentHook.setAllStudents([]);
          gradingHook.setSubmissions([]);
        }
      }

      // Attendance (specific to current professor)
      await att.fetchAttendance(profile.id);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // 4. Auth and Role Setup
  useEffect(() => {
    if (!profileLoading) {
      if (!profile) { navigate('/login'); return; }
      
      const isProfessor = profile.tipo === 'professor' || profile.caminhos_acesso?.includes('professor') || profile.email === 'edi.ben.jr@gmail.com';
      if (!isProfessor) { navigate('/dashboard'); return; }

      let roles = profile.caminhos_acesso || [];
      if (profile.email === 'edi.ben.jr@gmail.com') {
        const adminRoles = ['aluno', 'professor', 'suporte'];
        adminRoles.forEach(r => { if (!roles.includes(r)) roles.push(r); });
      }
      setAvailableRoles(roles);
      
      fetchData().finally(() => setLoading(false));
    }
  }, [profile, profileLoading, navigate, fetchData]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate]);

  // Memoized Handlers to prevent re-renders
  const handlers = useMemo(() => ({
    handleSaveAttendance: (records: any[]) => att.handleSaveAttendance(records, fetchData),
    handleApproveAccess: (id: string) => studentHook.handleApproveAccess(id, fetchData),
    handleRejectAccess: (id: string) => studentHook.handleRejectAccess(id, fetchData),
    handleDeleteUser: (id: string) => studentHook.handleDeleteUser(id, fetchData),
    handleResetProgress: (id: string) => studentHook.handleResetProgress(id, fetchData),
    handleUpdateUserNucleo: (id: string, nId: string, nNome: string) => studentHook.handleUpdateUserNucleo(id, nId, nNome, fetchData),
    handleSaveGrade: () => gradingHook.handleSaveGrade(fetchData),
    handleDeleteSubmission: (id: string) => gradingHook.handleDeleteSubmission(id, fetchData),
  }), [att, studentHook, gradingHook, fetchData]);

  return useMemo(() => ({
    profile,
    ...nav,
    ...nucs,
    ...att,
    ...acad,
    ...courseHook,
    ...studentHook,
    ...gradingHook,
    ...handlers,
    loading: loading || profileLoading,
    availableRoles,
    showRoleSwitcher, setShowRoleSwitcher,
    isMobileMenuOpen, setIsMobileMenuOpen,
    actionLoading, setActionLoading,
    handleLogout,
    navigate,
    fetchData
  }), [
    profile, nav, nucs, att, acad, courseHook, studentHook, gradingHook, handlers,
    loading, profileLoading, availableRoles, showRoleSwitcher, isMobileMenuOpen, 
    actionLoading, handleLogout, navigate, fetchData
  ]);
};
