import { useState, useEffect, useCallback } from 'react'
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
    
    // Fetch Nucleos and Students based on role
    await nucs.fetchNucleos(profile.id, isAdmin);
    
    // Fetch Courses (Global for all professors for now as per legacy logic)
    const { data: cData } = await supabase.from('cursos').select('id, nome, livros(*, aulas(*))').order('nome');
    if (cData) courseHook.setCourses(cData);

    if (isAdmin) {
      const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome');
      if (sData) studentHook.setAllStudents(sData);
      // Fetch all submissions for admin/support
      const { data: subData } = await supabase.from('view_submissions_detailed').select('*').order('submitted_at', { ascending: false });
      if (subData) gradingHook.setSubmissions(subData);
    } else {
      // Logic for restricted professor (linked nucleos)
      const { data: myNucs } = await supabase.from('professor_nucleo').select('nucleo_id').eq('professor_id', profile.id);
      const nucIds = myNucs?.map(n => n.nucleo_id) || [];
      
      const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').in('nucleo_id', nucIds).order('nome');
      if (sData) {
        studentHook.setAllStudents(sData);
        const studentIds = sData.map(s => s.id);
        if (studentIds.length > 0) {
          acad.fetchAcademicHistory(studentIds);
          const { data: subData } = await supabase.from('view_submissions_detailed').select('*').in('student_id', studentIds).order('submitted_at', { ascending: false });
          if (subData) gradingHook.setSubmissions(subData);
        }
      }
    }

    // Attendance and Access Logs
    att.fetchAttendance(profile.id);
  }, [profile, nucs, courseHook, studentHook, gradingHook, acad, att]);

  // 4. Auth and Role Setup
  useEffect(() => {
    if (!profileLoading) {
      if (!profile) { navigate('/login'); return; }
      
      const isProfessor = profile.tipo === 'professor' || profile.caminhos_acesso?.includes('professor') || profile.email === 'edi.ben.jr@gmail.com';
      if (!isProfessor) { navigate('/dashboard'); return; }

      let roles = profile.caminhos_acesso || [];
      if (profile.email === 'edi.ben.jr@gmail.com') {
        ['aluno', 'professor', 'suporte'].forEach(r => { if (!roles.includes(r)) roles.push(r); });
      }
      setAvailableRoles(roles);
      
      fetchData().finally(() => setLoading(false));
    }
  }, [profile, profileLoading, navigate, fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return {
    profile,
    ...nav,
    ...nucs,
    ...att,
    ...acad,
    ...courseHook,
    ...studentHook,
    ...gradingHook,
    loading: loading || profileLoading,
    availableRoles,
    showRoleSwitcher, setShowRoleSwitcher,
    isMobileMenuOpen, setIsMobileMenuOpen,
    actionLoading, setActionLoading,
    handleLogout,
    handleSaveAttendance: (records: any[]) => att.handleSaveAttendance(records, fetchData),
    handleApproveAccess: (id: string) => studentHook.handleApproveAccess(id, fetchData),
    handleRejectAccess: (id: string) => studentHook.handleRejectAccess(id, fetchData),
    handleDeleteUser: (id: string) => studentHook.handleDeleteUser(id, fetchData),
    handleResetProgress: (id: string) => studentHook.handleResetProgress(id, fetchData),
    handleUpdateUserNucleo: (id: string, nId: string, nNome: string) => studentHook.handleUpdateUserNucleo(id, nId, nNome, fetchData),
    handleSaveGrade: () => gradingHook.handleSaveGrade(fetchData),
    handleDeleteSubmission: (id: string) => gradingHook.handleDeleteSubmission(id, fetchData),
    navigate,
    fetchData
  };
};
