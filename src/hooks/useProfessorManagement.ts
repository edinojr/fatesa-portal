import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'
import { isUserAdmin } from '../lib/authUtils'



// Modular Feature Hooks (Existing)
import { useProfessorCourses } from '../features/courses/hooks/useProfessorCourses'
import { useProfessorStudents } from '../features/users/hooks/useProfessorStudents'
import { useProfessorGrading } from '../features/courses/hooks/useProfessorGrading'

// New Modular Feature Hooks
import { useProfessorNavigation } from '../features/professor/hooks/useProfessorNavigation'
import { useProfessorNucleos } from '../features/professor/hooks/useProfessorNucleos'
import { useProfessorAttendance } from '../features/professor/hooks/useProfessorAttendance'
import { useProfessorAcademic } from '../features/professor/hooks/useProfessorAcademic'
import { LEGACY_AULA_TO_BOOK_TITLE, cleanModuleTitle } from '../lib/courseTitles'

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
    
    const isMaster = isUserAdmin(profile);
    const isAdmin = isMaster || ['admin', 'suporte'].includes(profile.tipo || '') || (profile.caminhos_acesso || []).some((r: string) => ['admin', 'suporte'].includes(r));
    
    try {
      // Fetch Nucleos based on role
      await nucs.fetchNucleos(profile.id, isAdmin);
      
      // Fetch Courses (Global for all professors)
      const { data: cData } = await supabase.from('cursos').select('id, nome, livros(*, aulas(*))').order('nome');
      if (cData) courseHook.setCourses(cData);

      const titleToBook: Record<string, any> = {};
      (cData || []).forEach((c: any) => {
        (c.livros || []).forEach((l: any) => {
          if (l.titulo) {
            titleToBook[cleanModuleTitle(l.titulo)] = l;
          }
        });
      });

      if (isAdmin) {
        // Admin: See all students and submissions
        const { data: sData } = await supabase.from('users').select('*, nucleos(nome)').order('nome');
        if (sData) studentHook.setAllStudents(sData);

        // Fetch submissions and historic grades in stages to avoid 400 errors
        const [{ data: subDataRaw }, { data: histDataRaw }] = await Promise.all([
          supabase
            .from('respostas_aulas')
            .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas')
            .order('created_at', { ascending: false }),
          supabase
            .from('historico_notas')
            .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
            .order('created_at', { ascending: false })
        ]);

        const aulaIds = Array.from(new Set((subDataRaw || []).map(r => r.aula_id).filter(Boolean)));
        const alunoIds = Array.from(new Set([
          ...(subDataRaw || []).map(r => r.aluno_id),
          ...(histDataRaw || []).map(h => h.aluno_id)
        ].filter(Boolean)));

        const [aulasRes, usersRes] = await Promise.all([
          aulaIds.length > 0 ? supabase.from('aulas').select('id, titulo, tipo, questionario, min_grade, versao, livro_id, is_bloco_final').in('id', aulaIds) : Promise.resolve({ data: [] }),
          alunoIds.length > 0 ? supabase.from('users').select('id, nome, email, nucleo_id, nucleos(id, nome)').in('id', alunoIds) : Promise.resolve({ data: [] })
        ]);

        const aulasMap = (aulasRes.data || []).reduce((acc: Record<string, any>, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
        const usersMap = (usersRes.data || []).reduce((acc: Record<string, any>, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);

        const subDataMapped = (subDataRaw || []).map((r: any) => {
          const aula = aulasMap[r.aula_id];
          const user = usersMap[r.aluno_id];

          let bookId: string | null = null;
          let bookTitle: string | null = null;
          const rawBook = aula?.livro_id;

          if (rawBook) {
            if (typeof rawBook === 'string') {
              bookId = rawBook;
            } else if (Array.isArray(rawBook) && rawBook[0]) {
              bookId = rawBook[0].id || rawBook[0];
              bookTitle = rawBook[0].titulo;
            } else if (typeof rawBook === 'object') {
              bookId = rawBook.id || null;
              bookTitle = rawBook.titulo || null;
            }
          }

          if (!bookId && r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) {
            const legacyTitle = LEGACY_AULA_TO_BOOK_TITLE[r.aula_id];
            const matchedBook = titleToBook[cleanModuleTitle(legacyTitle)];
            if (matchedBook) {
              bookId = matchedBook.id;
              bookTitle = matchedBook.titulo;
            } else {
              bookTitle = legacyTitle;
            }
          }

          return {
            ...r,
            submission_id: r.id,
            student_id: r.aluno_id,
            lesson_id: r.aula_id,
            lesson_title: aula?.titulo,
            lesson_type: aula?.tipo,
            is_bloco_final: aula?.is_bloco_final,
            questionario: aula?.questionario,
            min_grade: aula?.min_grade,
            versao: aula?.versao,
            aulas: aula,
            student_name: user?.nome,
            student_email: user?.email,
            nucleus_id: user?.nucleos?.id,
            nucleus_name: user?.nucleos?.nome || 'Sem Polo',
            book_id: bookId,
            book_title: bookTitle || 'Módulo Geral',
            submitted_at: r.updated_at || r.created_at,
          };
        }).filter(s => {
          const isExam = s.lesson_type === 'prova' || 
                         s.lesson_type === 'avaliacao' || 
                         s.is_bloco_final === true || 
                         (s.nota !== null && s.nota !== undefined) ||
                         (s.lesson_title && /V[1-3]|RECUPERA|AVALIA|PROVA/i.test(s.lesson_title));
          const user = usersMap[s.student_id];
          const isStaff = user && ['admin', 'suporte', 'professor', 'colaborador'].includes(user.tipo?.toLowerCase());
          return isExam && !isStaff;
        });

        // Mapear histórico de notas oficial para que também apareça em Boletins e relatórios
        const histMapped = (histDataRaw || []).map((m: any, idx: number) => {
          const user = usersMap[m.aluno_id];
          const matchedBook = titleToBook[cleanModuleTitle(m.modulo_nome || '')];
          return {
            id: `hist-${m.id || idx}`,
            submission_id: `hist-${m.id || idx}`,
            student_id: m.aluno_id,
            aluno_id: m.aluno_id,
            lesson_id: null,
            aula_id: null,
            lesson_title: m.modulo_nome,
            lesson_type: 'prova',
            is_bloco_final: true,
            min_grade: 7,
            versao: 1,
            nota: Number(m.nota),
            status: 'corrigida',
            student_name: user?.nome || 'Aluno',
            student_email: user?.email || '',
            nucleus_id: user?.nucleos?.id,
            nucleus_name: user?.nucleos?.nome || 'Sem Polo',
            book_id: matchedBook?.id || null,
            book_title: matchedBook?.titulo || m.modulo_nome,
            submitted_at: m.data_conclusao || m.created_at,
            is_manual: true
          };
        });

        const allMappedSubs = [...subDataMapped, ...histMapped];
        gradingHook.setSubmissions(allMappedSubs);
        gradingHook.autoCorrectPending(subDataMapped);
        
        acad.fetchAcademicReport();
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
              const [{ data: subDataRaw }, { data: histDataRaw }] = await Promise.all([
                supabase
                  .from('respostas_aulas')
                  .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas')
                  .in('aluno_id', studentIds)
                  .order('created_at', { ascending: false }),
                supabase
                  .from('historico_notas')
                  .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
                  .in('aluno_id', studentIds)
                  .order('created_at', { ascending: false })
              ]);

              const aulaIds = Array.from(new Set((subDataRaw || []).map(r => r.aula_id).filter(Boolean)));
              const alunoIds = Array.from(new Set([
                ...(subDataRaw || []).map(r => r.aluno_id),
                ...(histDataRaw || []).map(h => h.aluno_id)
              ].filter(Boolean)));

              const [aulasRes, usersRes] = await Promise.all([
                aulaIds.length > 0 ? supabase.from('aulas').select('id, titulo, tipo, questionario, min_grade, versao, livro_id, is_bloco_final').in('id', aulaIds) : Promise.resolve({ data: [] }),
                alunoIds.length > 0 ? supabase.from('users').select('id, nome, email, nucleo_id, nucleos(id, nome)').in('id', alunoIds) : Promise.resolve({ data: [] })
              ]);

              const aulasMap = (aulasRes.data || []).reduce((acc: Record<string, any>, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
              const usersMap = (usersRes.data || []).reduce((acc: Record<string, any>, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);

              const subDataMapped = (subDataRaw || []).map((r: any) => {
                const aula = aulasMap[r.aula_id];
                const user = usersMap[r.aluno_id];

                let bookId: string | null = null;
                let bookTitle: string | null = null;
                const rawBook = aula?.livro_id;

                if (rawBook) {
                  if (typeof rawBook === 'string') {
                    bookId = rawBook;
                  } else if (Array.isArray(rawBook) && rawBook[0]) {
                    bookId = rawBook[0].id || rawBook[0];
                    bookTitle = rawBook[0].titulo;
                  } else if (typeof rawBook === 'object') {
                    bookId = rawBook.id || null;
                    bookTitle = rawBook.titulo || null;
                  }
                }

                if (!bookId && r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) {
                  const legacyTitle = LEGACY_AULA_TO_BOOK_TITLE[r.aula_id];
                  const matchedBook = titleToBook[cleanModuleTitle(legacyTitle)];
                  if (matchedBook) {
                    bookId = matchedBook.id;
                    bookTitle = matchedBook.titulo;
                  } else {
                    bookTitle = legacyTitle;
                  }
                }

                return {
                  ...r,
                  submission_id: r.id,
                  student_id: r.aluno_id,
                  lesson_id: r.aula_id,
                  lesson_title: aula?.titulo,
                  lesson_type: aula?.tipo,
                  is_bloco_final: aula?.is_bloco_final,
                  questionario: aula?.questionario,
                  min_grade: aula?.min_grade,
                  versao: aula?.versao,
                  aulas: aula,
                  student_name: user?.nome,
                  student_email: user?.email,
                  nucleus_id: user?.nucleos?.id,
                  nucleus_name: user?.nucleos?.nome || 'Sem Polo',
                  book_id: bookId,
                  book_title: bookTitle || 'Módulo Geral',
                  submitted_at: r.updated_at || r.created_at,
                };
              }).filter(s => {
                const isExam = s.lesson_type === 'prova' || 
                               s.lesson_type === 'avaliacao' || 
                               s.is_bloco_final === true || 
                               (s.nota !== null && s.nota !== undefined) ||
                               (s.lesson_title && /V[1-3]|RECUPERA|AVALIA|PROVA/i.test(s.lesson_title));
                const user = usersMap[s.student_id];
                const isStaff = user && ['admin', 'suporte', 'professor', 'colaborador'].includes(user.tipo?.toLowerCase());
                return isExam && !isStaff;
              });

              const histMapped = (histDataRaw || []).map((m: any, idx: number) => {
                const user = usersMap[m.aluno_id];
                const matchedBook = titleToBook[cleanModuleTitle(m.modulo_nome || '')];
                return {
                  id: `hist-${m.id || idx}`,
                  submission_id: `hist-${m.id || idx}`,
                  student_id: m.aluno_id,
                  aluno_id: m.aluno_id,
                  lesson_id: null,
                  aula_id: null,
                  lesson_title: m.modulo_nome,
                  lesson_type: 'prova',
                  is_bloco_final: true,
                  min_grade: 7,
                  versao: 1,
                  nota: Number(m.nota),
                  status: 'corrigida',
                  student_name: user?.nome || 'Aluno',
                  student_email: user?.email || '',
                  nucleus_id: user?.nucleos?.id,
                  nucleus_name: user?.nucleos?.nome || 'Sem Polo',
                  book_id: matchedBook?.id || null,
                  book_title: matchedBook?.titulo || m.modulo_nome,
                  submitted_at: m.data_conclusao || m.created_at,
                  is_manual: true
                };
              });

              const allMappedSubs = [...subDataMapped, ...histMapped];
              gradingHook.setSubmissions(allMappedSubs);
              gradingHook.autoCorrectPending(subDataMapped);
            }
          }
        } else {
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
      
      const isMaster = isUserAdmin(profile);
      const isAdmin = isMaster || ['admin', 'suporte'].includes(profile.tipo || '') || (profile.caminhos_acesso || []).some((r: string) => ['admin', 'suporte'].includes(r));
      const isProfessor = isMaster || isAdmin || profile.tipo === 'professor' || profile.caminhos_acesso?.includes('professor');
      if (!isProfessor) { navigate('/dashboard'); return; }

      const roles = isMaster 
        ? Array.from(new Set([...(profile.caminhos_acesso || []), 'admin', 'suporte', 'professor', 'aluno']))
        : [...(profile.caminhos_acesso || [])];
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
    handleAutoCorrectQueue: () => gradingHook.autoCorrectPending(undefined, fetchData),
    handleUpdateUserType: (id: string, type: string) => studentHook.handleUpdateUserType(id, type, fetchData),
    handleGrantModuleException: (uId: string, bId: string) => studentHook.handleGrantModuleException(uId, bId, fetchData),
    handleRevokeModuleException: (uId: string, bId: string) => studentHook.handleRevokeModuleException(uId, bId, fetchData),
    handleSetHiato: (id: string) => studentHook.handleSetHiato(id, fetchData),
    handleSetTrancado: (id: string) => studentHook.handleSetTrancado(id, fetchData),
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
