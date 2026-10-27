import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  LogOut, 
  Award, 
  GraduationCap, 
  FileText, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  MessageSquare,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Users,
  Loader2,
  PauseCircle,
  Play,
  Clock
} from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'
import PageHeader from '../components/layout/PageHeader'
import { GRADUATION_CONFIG } from '../config/graduation'

// Hooks Feature-based
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { useFinanceControl } from '../features/finance/hooks/useFinanceControl'
import { collectExamAttempts, isModuleApproved, isModuleDP, getMinGrade } from '../lib/examRules'

// Componentes Feature-based
import CourseList from '../features/courses/components/CourseList'
import ForumPanel from '../features/forum/components/ForumPanel'
import PersonalDataCard from '../features/users/components/PersonalDataCard'
import AlumniCertificate from '../components/documents/AlumniCertificate'
import DocumentUpload from '../features/finance/components/DocumentUpload'
import FinancePanel from '../features/finance/components/FinancePanel'
import ExamNotificationModal from '../features/courses/components/ExamNotificationModal'
import PopupAlertsDisplay from '../features/communication/components/PopupAlertsDisplay'
import PixPaymentPopup from '../features/finance/components/PixPaymentPopup'
import { CertificadosPanel } from '../components/CertificadosPanel'
import { PanelSwitcher } from '../components/common/PanelSwitcher'
import StudentSidebar, { StudentNavTab } from '../components/layout/StudentSidebar'
import StudentTopBar from '../components/layout/StudentTopBar'
import DigitalLibraryPanel from '../components/library/DigitalLibraryPanel'

type Tab = StudentNavTab;

const Dashboard = () => {
  const { profile, signOut, refreshProfile } = useProfile();
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    localStorage.setItem('fatesa_active_role', 'aluno')
  }, [])

  const isStaff = ['admin', 'professor', 'suporte', 'colaborador'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte', 'colaborador'].includes(r));
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = [
      'home',
      'cursos',
      'modulos',
      'modulos-concluidos',
      'financeiro',
      'biblioteca',
      'forum',
      'documentos',
      'certificados'
    ];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const setActiveTab = (newTab: Tab) => {
    setSearchParams({ tab: newTab });
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fatesa_student_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('fatesa_student_sidebar_collapsed', String(next));
      return next;
    });
  };

  const getTabTitle = (tab: Tab): string => {
    switch (tab) {
      case 'home': return 'Visão Geral & Início';
      case 'cursos': return 'Meus Cursos';
      case 'modulos': return 'Módulos em Aberto';
      case 'modulos-concluidos': return 'Histórico & Boletim';
      case 'financeiro': return 'Financeiro & Mensalidades';
      case 'biblioteca': return 'Biblioteca Virtual & Apostilas';
      case 'forum': return 'Fórum de Dúvidas';
      case 'documentos': return 'Documentos de Matrícula';
      case 'certificados': return 'Certificados & Diplomas';
      default: return 'Portal do Aluno';
    }
  };

  const handleSelectTab = (newTab: Tab) => {
    if (newTab === 'modulos-concluidos') {
      navigate('/modulos-finalizados');
      return;
    }
    setActiveTab(newTab);
  };

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as Tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (activeTab === 'modulos-concluidos') {
      navigate('/modulos-finalizados', { replace: true });
    }
  }, [activeTab, navigate]);
  
  // Custom Hooks para lógica de negócio
  const { 
    courses, 
    progressoAulas, 
    atividades, 
    fetchStudentDashboardData,
    finishedBasicCount,
    finishedMediumCount,
    loading: coursesLoading,
  } = useStudentCourses(profile);

  const { 
    payments, 
    pixConfig, 
    isBlockedDueToPayment, 
    isPastDue, 
    fetchPayments, 
    requestExtension 
  } = useFinanceControl(profile);

  // Estados Locais
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showModuleCompletionModal, setShowModuleCompletionModal] = useState(false);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  const isBlocked = profile?.bloqueado;
  const isAlumniData = (profile as any)?.isAlumni;

  // Status de aprovação para alunos formados
  const [alumniPendingApproval, setAlumniPendingApproval] = useState<boolean>(false);
  const [checkingAlumniStatus, setCheckingAlumniStatus] = useState<boolean>(true);

  const checkPendingStatus = useCallback(async () => {
    if (!profile?.id || profile?.tipo !== 'ex_aluno') {
      setAlumniPendingApproval(false);
      setCheckingAlumniStatus(false);
      return;
    }

    try {
      setCheckingAlumniStatus(true);
      const { data } = await supabase
        .from('registros_alumni')
        .select('id, status_aprovacao, observacoes')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (data) {
        const isPending = data.status_aprovacao === 'pendente' || data.observacoes?.includes('[PENDENTE_APROVACAO]');
        setAlumniPendingApproval(!!isPending);
      } else {
        setAlumniPendingApproval(true);
      }
    } catch (err) {
      console.error('Erro ao verificar status do formando:', err);
    } finally {
      setCheckingAlumniStatus(false);
    }
  }, [profile?.id, profile?.tipo]);

  useEffect(() => {
    checkPendingStatus();
  }, [checkPendingStatus]);

  // Exam notification state
  const [showExamNotice, setShowExamNotice] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch available modules for manual completion
  const fetchAvailableModules = async () => {
    if (!profile?.id) return;
    try {
      const { data: allCourses } = await supabase.from('cursos').select('id, nome, nivel, livros(id, titulo, ordem)');
      if (allCourses) {
        const modules: any[] = [];
        for (const course of allCourses) {
          for (const livro of course.livros || []) {
            // Check if already completed (via platform)
            const isCompleted = atividades.some((s: any) => 
              s.book_id === livro.id && 
              s.is_bloco_final && 
              s.status === 'corrigida' && 
              (s.nota || 0) >= (s.min_grade || 7)
            );
            // Check if already manually marked
            const manuallyCompleted = profile?.modulos_finalizados_manual?.includes(livro.id);
            
            if (!isCompleted && !manuallyCompleted) {
              modules.push({
                ...livro,
                courseName: course.nome,
                courseNivel: course.nivel,
                isCompleted: false
              });
            }
          }
        }
        setAvailableModules(modules);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const handleModuleSelection = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSaveManualModules = async () => {
    if (!profile?.id || selectedModules.length === 0) return;
    setSavingModules(true);
    try {
      const currentManual = profile?.modulos_finalizados_manual || [];
      const updatedManual = [...new Set([...currentManual, ...selectedModules])];
      
      const { error } = await supabase
        .from('users')
        .update({ modulos_finalizados_manual: updatedManual } as any)
        .eq('id', profile.id);
      
      if (error) {
        if (error.code === '42703' || /column.*does not exist/i.test(error.message || '')) {
          showToast('Funcionalidade temporariamente indisponível: coluna não encontrada no servidor.', 'error');
        } else {
          throw error;
        }
        return;
      }
      
      showToast(`${selectedModules.length} módulo(s) marcado(s) como concluído(s)!`, 'success');
      setShowModuleCompletionModal(false);
      setSelectedModules([]);
      refreshProfile();
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setSavingModules(false);
    }
  };

  // Logica de Provas Pendentes e Recuperação (Refinada para Aprovação/Reprovação)
  const pendingExams = useMemo(() => {
    if (!courses.length || profile?.bloqueado) return [];
    
    const pending: any[] = [];
    courses.forEach(course => {
      course.livros.forEach(libro => {
        if (!libro.isReleased) return;
        if (libro.isFinished) return;

        // Verifica se o aluno já foi aprovado ou está em DP no módulo (regra única examRules)
        const bookSubmissions = atividades.filter(s => s.book_id === libro.id);
        const examAttempts = collectExamAttempts(libro.aulas || [], bookSubmissions);
        const isApproved = isModuleApproved(examAttempts);
        const isDP = isModuleDP(examAttempts);
        const isRetido = isDP;

        // Se há alguma aula que foi explicitamente liberada individualmente, ignoramos o bloqueio de isApproved
        // Nota: A API não nos dá o examExceptionIds aqui diretamente, mas se aula.isHidden === false 
        // e aula.lockedByProfessor === false para uma V2/V3 quando não deveria, 
        // podemos deixar a lógica do loop abaixo lidar com isso.
        
        // Vamos apenas verificar se há provas pendentes e forçar a exibição se necessário
        if (isApproved || isRetido) {
           // Checa se há alguma exceção manual (se a aula não está oculta e não está travada pelo professor, mas é uma prova)
           const hasManualOverride = libro.aulas.some((a: any) => 
               (a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final || /V[1-3]|RECUPERAÇ/i.test(a.titulo || '')) &&
              !a.isHidden && !a.lockedByProfessor &&
              ((a.versao || 1) > 1) // É uma prova de recuperação
           );
           
           if (!hasManualOverride) return;
        }

        libro.aulas.forEach(aula => {
          const title = aula.titulo || '';
          const isExam = aula.tipo === 'prova' || aula.tipo === 'avaliacao' || !!aula.is_bloco_final || /V[1-3]|RECUPERAÇ/i.test(title);
          
          const isReleasedNow = (aula as any).status_liberacao !== false && 
                                (!(aula as any).data_liberacao || new Date((aula as any).data_liberacao) <= new Date());
          
          const isDoable = !aula.isHidden && !aula.lockedByProfessor && isReleasedNow;
          
          if (isExam && isDoable) {
            const sub = atividades.find(s => s.lesson_id === aula.id);
            const versao = (aula as any).versao || 1;

            if (!sub) {
              // Caso 1: Aluno não fez a prova
              // Caso 3: Aluno em recuperação (se for V2 ou V3)
              pending.push({
                id: aula.id,
                titulo: title || 'Avaliação',
                livro: libro.titulo,
                versao: versao,
                isRecovery: versao > 1 || /V[2-3]|RECUPERAÇ/i.test(title),
                status: versao === 1 ? 'pendente' : 'recuperacao'
              });
            } else if (sub.status === 'corrigida' && (sub.nota || 0) < getMinGrade(aula)) {
              // Caso 2: Aluno reprovou na prova
              // Nota: Normalmente se ele reprova, a próxima versão (V2/V3) será liberada e cairá no "if (!sub)" acima.
              // Mas mostramos aqui caso ele ainda esteja olhando para a prova reprovada.
              pending.push({
                id: aula.id,
                titulo: title || 'Avaliação',
                livro: libro.titulo,
                versao: versao,
                isRecovery: versao > 1 || /V[2-3]|RECUPERAÇ/i.test(title),
                status: 'reprovado',
                failed: true,
                nota: sub.nota
              });
            }
          }
        });
      });
    });

    // Ordenar: primeiro as recuperações, depois os reprovados, depois pendentes
    return pending.sort((a, b) => {
      if (a.status === 'recuperacao' && b.status !== 'recuperacao') return -1;
      if (a.status === 'reprovado' && b.status === 'pendente') return -1;
      return 0;
    });
  }, [courses, atividades, profile?.bloqueado]);

  // Toast de Sucesso para Aprovações Recentes
  useEffect(() => {
    if (!atividades.length || !profile?.id) return;
    
    const storageKey = `fatesa_approval_toast_${profile.id}`;
    const shownApprovals = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    
    const recentApprovals = atividades.filter(s => {
      const isEx = s.is_bloco_final || s.lesson_type === 'prova';
      const isRecent = new Date(s.updated_at || s.submitted_at).getTime() > Date.now() - 86400000; // Últimas 24h
      return isEx && s.status === 'corrigida' && (s.nota || 0) >= 7.0 && isRecent && !shownApprovals.includes(s.submission_id);
    });

    if (recentApprovals.length > 0) {
      const last = recentApprovals[0];
      showToast(`Parabéns! Você foi aprovado em ${last.lesson_title} com nota ${last.nota?.toFixed(1)}!`, 'success');
      
      const newShown = [...shownApprovals, ...recentApprovals.map(r => r.submission_id)];
      sessionStorage.setItem(storageKey, JSON.stringify(newShown));
    }
  }, [atividades, profile?.id]);


  // Filtra cursos para mostrar módulos vigentes e desbloqueados no Dashboard
  const currentCourses = useMemo(() => {
    if (isStaff || !courses.length) return courses;
    
    return courses.map(course => ({
      ...course,
      livros: (course.livros || []).filter((livro: any) => livro.isUnlocked && !livro.isFinished)
    })).filter(course => course.livros.length > 0);
  }, [courses, isStaff]);

  // Módulos em andamento (desbloqueados para estudo e não finalizados)
  const modulosAtivos = useMemo(() => {
    return courses.map(course => ({
      ...course,
      livros: (course.livros || []).filter((livro: any) => livro.isUnlocked && !livro.isFinished)
    })).filter(course => course.livros.length > 0);
  }, [courses]);

  // Módulo atual do aluno (primeiro módulo ativo)
  const currentModule = useMemo(() => {
    for (const course of modulosAtivos) {
      if (course.livros.length > 0) {
        return {
          courseName: course.nome || course.nivel,
          livro: course.livros[0]
        };
      }
    }
    return null;
  }, [modulosAtivos]);

  // Lista plana de livros / módulos em estudo ativo
  const livrosEmEstudo = useMemo(() => {
    return modulosAtivos.flatMap(c => 
      (c.livros || []).map((l: any) => ({
        ...l,
        courseName: c.nome || c.nivel
      }))
    );
  }, [modulosAtivos]);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentDashboardData();
      fetchPayments();
    }
  }, [profile?.id, fetchStudentDashboardData, fetchPayments]);

  useEffect(() => {
    // Só mostrar o aviso se houver provas E se ainda não tiver sido mostrado nesta sessão para este usuário
    if (pendingExams.length > 0 && profile?.id) {
      const storageKey = `fatesa_exam_notice_v4_${profile.id}`;
      const alreadyShown = sessionStorage.getItem(storageKey);
      
      if (!alreadyShown) {
        setShowExamNotice(true);
        // Marcar como mostrado imediatamente para não repetir em navegação ou refresh
        sessionStorage.setItem(storageKey, '1');
      }
    }
  }, [pendingExams, profile?.id]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'doc' | 'pay', 
    id?: string, 
    docType?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    
    const uploadId = id || docType || 'general';
    setUploading(uploadId);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      const filePath = type === 'pay' ? `comprovantes/${fileName}` : `${profile.id}/${fileName}`; 

      const bucketName = type === 'pay' ? 'comprovantes' : 'pedagogico';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      if (type === 'doc' && docType) {
        const { error: dbError } = await supabase
          .from('documentos')
          .upsert({
            user_id: profile.id,
            tipo: docType,
            url: publicUrl,
            status: 'pendente'
          });
        if (dbError) throw dbError;
      } else if (type === 'pay') {
        if (id) {
          // Atualiza fatura existente com o comprovante
          const { error: dbError } = await supabase
            .from('pagamentos')
            .update({ 
               comprovante_url: publicUrl, 
               status: 'pago',
               data_pagamento: new Date().toISOString().split('T')[0]
            })
            .eq('id', id);
          if (dbError) throw dbError;
        } else {
          // Novo aviso com comprovante (Checkout Livre)
          const { error: dbError } = await supabase
            .from('pagamentos')
            .insert({
               user_id: profile.id,
               valor: 0,
               comprovante_url: publicUrl,
               status: 'pago',
               data_pagamento: new Date().toISOString().split('T')[0],
               descricao: 'Aviso de Pagamento com Comprovante (via Site)',
               data_vencimento: new Date().toISOString().split('T')[0]
            });
          if (dbError) throw dbError;
        }
      }

      showToast('Documento inserido corretamente!', 'success');
      fetchPayments();
    } catch (err: any) {
      showToast('Erro ao inserir documento: ' + err.message, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleNotifyPayment = async (id?: string) => {
    if (!profile) return;
    try {
      if (id) {
        // Atualiza fatura existente
        const { error } = await supabase
          .from('pagamentos')
          .update({ 
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
            descricao: 'Aviso de Pagamento (Manual)'
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Cria novo registro se não houver ID (Checkout livre)
        const { error } = await supabase
          .from('pagamentos')
          .insert({
            user_id: profile.id,
            valor: 0,
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
            descricao: 'Aviso de Pagamento (Checkout Manual)',
            data_vencimento: new Date().toISOString().split('T')[0] // Vencimento imediato
          });
        if (error) throw error;
      }
      showToast('Aviso de pagamento enviado com sucesso! Aguarde a validação.');
      fetchPayments();
    } catch (err: any) {
      showToast('Erro ao notificar: ' + err.message, 'error');
    }
  };

  const handleRequestExtension = async () => {
    const result = await requestExtension();
    if (result.success) {
      showToast('Extensão concedida até o dia ' + result.date);
      refreshProfile();
    } else {
      showToast(result.error || 'Erro ao solicitar extensão', 'error');
    }
  };

  const handleSelfTrancar = async () => {
    if (!profile) return;
    if (!confirm('Deseja realmente pausar/trancar o seu curso? Você perderá o acesso aos próximos módulos até que solicite a reativação junto ao suporte.')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status_nucleo: 'trancado' })
        .eq('id', profile.id);
      
      if (error) throw error;
      showToast('Curso pausado com sucesso.', 'success');
      refreshProfile();
    } catch (err: any) {
      showToast('Erro ao pausar curso: ' + err.message, 'error');
    }
  };

  const handleStudentBack = () => {
    if (selectedBook) {
      setSelectedBook(null);
      return;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return;
    }
    window.history.back()
  }

  return (
    <div className="student-lms-container">
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem', 
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* SIDEBAR PERSISTENTE RETRÁTIL COM HIERARQUIA EM ÁRVORE */}
      <StudentSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        profile={profile}
        signOut={signOut}
        courses={courses}
        finishedCount={finishedBasicCount}
        totalRequired={GRADUATION_CONFIG.basico.requiredModules}
        pendingExamsCount={pendingExams.length}
        isPastDue={isPastDue}
      />

      {/* CONTENT WRAPPER COM TOPBAR ENXUTA */}
      <div className={`student-lms-content-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <StudentTopBar
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setIsMobileSidebarOpen(prev => !prev);
            } else {
              toggleSidebarCollapsed();
            }
          }}
          isSidebarCollapsed={isSidebarCollapsed}
          profile={profile}
          signOut={signOut}
          activeTabTitle={getTabTitle(activeTab)}
          courses={courses}
          pendingExams={pendingExams}
          isPastDue={isPastDue}
          onSelectTab={handleSelectTab}
          searchTerm={globalSearchTerm}
          onSearchChange={setGlobalSearchTerm}
        />

        <main className="student-lms-main">
        {alumniPendingApproval ? (
          <div style={{ maxWidth: '850px', margin: '2rem auto 4rem', padding: '0 1rem' }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              border: '1px solid rgba(0, 86, 179, 0.4)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              padding: '3.5rem 2.5rem',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'rgba(0, 86, 179, 0.15)', filter: 'blur(90px)', borderRadius: '50%', pointerEvents: 'none' }}></div>

              <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: '50%', background: 'rgba(0, 86, 179, 0.12)', border: '2px solid rgba(0, 86, 179, 0.3)', marginBottom: '1.5rem', color: '#0056b3' }}>
                <Clock size={48} className="animate-pulse" />
              </div>

              <div>
                <span style={{ display: 'inline-block', background: 'var(--primary, #0056b3)', color: '#ffffff', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', border: '1px solid #004494' }}>
                  Aguardando Validação da Administração
                </span>
              </div>

              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-0.02em', color: 'var(--text-main, #fff)' }}>
                Área de Espera — Alunos Formados
              </h1>

              <p style={{ fontSize: '1.15rem', color: 'var(--text-muted, #aaa)', maxWidth: '650px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                Olá, <strong style={{ color: 'var(--text-main, #fff)' }}>{profile?.nome || 'Aluno'}</strong>! Recebemos seu cadastro como aluno formado da FATESA.
              </p>

              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '18px', padding: '1.75rem', textAlign: 'left', maxWidth: '650px', margin: '0 auto 2.5rem', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary, #0056b3)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
                  <GraduationCap size={22} /> Como funciona o processo de liberação:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  <li><strong>Conferência Histórica:</strong> Como seu nome não constava na listagem preliminar automática, a secretaria acadêmica está conferindo seus dados nos arquivos e livros de atas da instituição.</li>
                  <li><strong>Aprovação Administrativa:</strong> Assim que os administradores validarem seu cadastro no painel, esta sala de espera será desbloqueada automaticamente.</li>
                  <li><strong>Certificados e Histórico:</strong> Com a aprovação concluída, você terá acesso imediato aos certificados oficiais e ao histórico escolar completo.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => { refreshProfile(); checkPendingStatus(); }}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  <CheckCircle2 size={18} /> Verificar se Já Fui Aprovado
                </button>
                <button 
                  onClick={() => window.open('https://wa.me/5511999720904?text=Ol%C3%A1%2C+sou+aluno+formado+da+FATESA+e+estou+na+sala+de+espera+aguardando+aprova%C3%A7%C3%A3o.', '_blank')}
                  className="btn btn-outline"
                  style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <MessageSquare size={18} /> Falar com a Secretaria
                </button>
                <button 
                  onClick={() => signOut()}
                  className="btn btn-outline"
                  style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error, #ef4444)' }}
                >
                  <LogOut size={18} /> Sair da Conta
                </button>
              </div>
            </div>
          </div>
        ) : (
         <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* TOP HEADER: Saudação & Resumo */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Olá, {profile?.nome?.split(' ')[0] || 'Aluno'}!
                  </h1>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Polo: <strong style={{ color: '#60a5fa' }}>{profile?.nucleos?.nome || 'Fatesa EAD'}</strong> • Ambiente Virtual de Aprendizagem
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate('/modulos-finalizados')}
                    className="btn btn-outline"
                    style={{ width: 'auto', padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderColor: 'rgba(96, 165, 250, 0.3)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Award size={16} /> Meu Boletim
                  </button>
                  <button
                    onClick={() => setActiveTab('biblioteca')}
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <BookOpen size={16} /> Biblioteca
                  </button>
                </div>
              </div>

              {/* AVISO DE FORMAÇÃO NO BÁSICO */}
              {finishedBasicCount >= 27 && finishedMediumCount === 0 && (
                <div style={{ background: 'linear-gradient(135deg, #003875 0%, #0056b3 100%)', borderRadius: '20px', padding: '2rem 1.75rem', color: '#fff', textAlign: 'center', boxShadow: '0 10px 30px rgba(0, 86, 179, 0.3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <GraduationCap size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.9 }} />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Parabéns! Você concluiu o Nível Básico!</h2>
                    <p style={{ fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto 1.5rem', lineHeight: '1.5', opacity: 0.9 }}>
                      Sua jornada até aqui foi exemplar. Prepare-se para o nível Médio com novos módulos e aprofundamento teológico.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setActiveTab('certificados')} style={{ background: '#fff', color: '#0056b3', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={16} /> Ver Meus Certificados
                      </button>
                      <button onClick={() => window.open('https://wa.me/5511999720904?text=Ol%C3%A1%2C%20conclu%C3%AD%20o%20n%C3%ADvel%20B%C3%A1sico%20e%20gostaria%20de%20informa%C3%A7%C3%B5es%20para%20o%20n%C3%ADvel%20M%C3%A9dio.', '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Matrícula Nível Médio
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ALERTA DE ALUMNI */}
              {isAlumniData && (
                <div style={{ padding: '1.5rem', background: 'rgba(0, 86, 179, 0.08)', borderRadius: '18px', border: '1px solid rgba(0, 86, 179, 0.25)', textAlign: 'center' }}>
                  <Award size={40} color="#0056b3" style={{ margin: '0 auto 0.5rem' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Conclusão Reconhecida</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '580px', margin: '0 auto 1rem' }}>
                    Você concluiu o Curso Básico de Teologia FATESA. Seu histórico e certificados oficiais estão disponíveis.
                  </p>
                  <AlumniCertificate aluno={{
                    nome: profile?.nome || isAlumniData.nome,
                    email: profile?.email || isAlumniData.email,
                    ano_formacao: isAlumniData.ano_formacao,
                    matricula: isAlumniData.matricula,
                    nucleo: profile?.nucleos?.nome || isAlumniData.nucleo,
                    nivel_curso: isAlumniData.nivel_curso,
                    historico: isAlumniData.historico
                  }} />
                </div>
              )}

              {/* ALERTA DE BLOQUEIO */}
              {isBlocked && (
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong style={{ color: '#ef4444', fontSize: '0.92rem' }}>Acesso suspenso temporariamente.</strong>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0.25rem 0 0' }}>
                      Seu avanço aos novos módulos está suspenso. Regularize seu pagamento pelo painel financeiro para reativar.
                    </p>
                  </div>
                </div>
              )}

              {/* ALERTA DE HIATO OU TRANCADO */}
              {(profile?.status_nucleo === 'hiato' || profile?.status_nucleo === 'trancado') && (
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(0, 86, 179, 0.08)', border: '1px solid #0056b3', borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <PauseCircle size={22} color="#0056b3" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#60a5fa', fontSize: '0.92rem' }}>
                      {profile?.status_nucleo === 'hiato' ? 'Matrícula em Hiato' : 'Curso Temporariamente Pausado'}
                    </strong>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0.25rem 0 0.5rem', lineHeight: 1.5 }}>
                      O avanço para novos módulos está pausado. Você mantém acesso aos seus módulos concluídos e ao módulo que estiver cursando.
                    </p>
                    <a
                      href="https://wa.me/5511999720904?text=Ol%C3%A1%2C%20gostaria%20de%20reativar%20minha%20matr%C3%ADcula%20na%20FATESA!"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      Falar com Secretaria / Reativar
                    </a>
                  </div>
                </div>
              )}

              {/* 1. GRID DE CARTÕES DE ALTA PRIORIDADE (ÁREA CENTRAL) */}
              <div className="student-priority-grid">
                {/* CARD 1: PRÓXIMAS AULAS / CONTINUE DE ONDE PAROU */}
                <div className="student-card-priority" style={{ minHeight: '270px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Play size={13} /> Continue de Onde Parou
                      </span>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(0, 86, 179, 0.25)', color: '#93c5fd', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        Módulo Atual
                      </span>
                    </div>

                    {coursesLoading ? (
                      <div style={{ padding: '2rem 0', textAlign: 'center', color: '#94a3b8' }}>
                        <Loader2 className="spinner" size={24} style={{ margin: '0 auto 0.5rem' }} />
                        <span style={{ fontSize: '0.85rem' }}>Carregando módulo vigente...</span>
                      </div>
                    ) : currentModule ? (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                        {currentModule.livro.capa_url ? (
                          <img
                            src={currentModule.livro.capa_url}
                            alt={currentModule.livro.titulo}
                            style={{ width: '68px', height: '94px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 6px 14px rgba(0,0,0,0.5)', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: '68px', height: '94px', borderRadius: '10px', background: 'linear-gradient(135deg, #003875 0%, #0056b3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 6px 14px rgba(0,0,0,0.4)' }}>
                            <BookOpen size={30} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                            {currentModule.courseName}
                          </span>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', lineHeight: 1.25 }}>
                            {currentModule.livro.titulo}
                          </h3>
                          <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                            {(currentModule.livro.aulas || []).length} aulas e avaliações liberadas
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#94a3b8' }}>
                        <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 700, color: '#f8fafc' }}>Nenhum módulo pendente!</p>
                        <span style={{ fontSize: '0.8rem' }}>Você completou os cursos liberados para sua turma.</span>
                      </div>
                    )}
                  </div>

                  {currentModule && (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/module/${currentModule.livro.id}`)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        boxShadow: '0 4px 14px rgba(0, 86, 179, 0.4)'
                      }}
                    >
                      <Play size={16} /> Retomar Estudos
                    </button>
                  )}
                </div>

                {/* CARD 2: PROGRESSO DO CURSO & FORMATURA */}
                <div className="student-card-priority" style={{ minHeight: '270px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <GraduationCap size={15} /> Progresso do Curso
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa' }}>
                        {Math.min(100, Math.round((finishedBasicCount / GRADUATION_CONFIG.basico.requiredModules) * 100))}%
                      </span>
                    </div>

                    {/* Barra Nível Básico */}
                    <div style={{ marginBottom: '1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Nível Básico em Teologia</span>
                        <span style={{ fontWeight: 800, color: '#60a5fa' }}>
                          {finishedBasicCount} / {GRADUATION_CONFIG.basico.requiredModules} módulos
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (finishedBasicCount / GRADUATION_CONFIG.basico.requiredModules) * 100)}%`,
                            background: 'linear-gradient(90deg, #0056b3 0%, #60a5fa 100%)',
                            borderRadius: '10px',
                            transition: 'width 0.6s ease'
                          }}
                        />
                      </div>
                    </div>

                    {/* Barra Nível Médio */}
                    <div style={{ marginBottom: '1rem', opacity: finishedBasicCount < GRADUATION_CONFIG.basico.requiredModules ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Nível Médio em Teologia</span>
                        <span style={{ fontWeight: 800, color: '#a78bfa' }}>
                          {finishedMediumCount} / {GRADUATION_CONFIG.medio.requiredModules} módulos
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (finishedMediumCount / GRADUATION_CONFIG.medio.requiredModules) * 100)}%`,
                            background: 'linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%)',
                            borderRadius: '10px',
                            transition: 'width 0.6s ease'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => navigate('/modulos-finalizados')}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                        color: '#60a5fa'
                      }}
                    >
                      <Award size={15} /> Ver Boletim
                    </button>
                    <button
                      onClick={() => setActiveTab('certificados')}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        color: '#e2e8f0'
                      }}
                    >
                      <GraduationCap size={15} /> Certificados
                    </button>
                  </div>
                </div>

                {/* CARD 3: PRAZOS & TAREFAS PRIORITÁRIAS */}
                <div
                  className={`student-card-priority ${
                    isPastDue ? 'alert-danger' : pendingExams.length > 0 ? 'alert-warning' : 'alert-success'
                  }`}
                  style={{ minHeight: '270px' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: isPastDue ? '#f87171' : pendingExams.length > 0 ? '#fbbf24' : '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={15} /> Prazos & Prioridades
                      </span>
                      {pendingExams.length > 0 && (
                        <span style={{ fontSize: '0.72rem', background: '#f59e0b', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                          {pendingExams.length} ação{pendingExams.length > 1 ? 'ões' : ''}
                        </span>
                      )}
                    </div>

                    {pendingExams.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1rem' }}>
                        {pendingExams.slice(0, 2).map((exam, idx) => (
                          <div
                            key={exam.id || idx}
                            onClick={() => navigate(`/lesson/${exam.id}`)}
                            style={{
                              padding: '0.6rem 0.8rem',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${exam.isRecovery ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 86, 179, 0.35)'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              transition: 'background 0.15s'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                                {exam.livro}
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {exam.titulo}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: exam.isRecovery ? '#dc2626' : '#0056b3',
                                color: '#ffffff',
                                flexShrink: 0
                              }}
                            >
                              {exam.versao > 1 ? `V${exam.versao}: REC` : 'AVALIAÇÃO'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : isPastDue ? (
                      <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 800, fontSize: '0.85rem' }}>
                          <AlertCircle size={16} /> Mensalidade Pendente
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                          Evite a suspensão do avanço dos seus estudos regularizando via PIX.
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '1.25rem 0', textAlign: 'center' }}>
                        <CheckCircle2 size={34} color="#10b981" style={{ margin: '0 auto 0.4rem' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                          Você está 100% em dia!
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                          Nenhuma avaliação pendente ou mensalidade em atraso.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    {isPastDue ? (
                      <button
                        onClick={() => setActiveTab('financeiro')}
                        style={{
                          width: '100%',
                          padding: '0.7rem 1rem',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <CreditCard size={15} /> Regularizar Pagamento (PIX)
                      </button>
                    ) : pendingExams.length > 0 ? (
                      <button
                        onClick={() => navigate(`/lesson/${pendingExams[0].id}`)}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          padding: '0.7rem 1rem',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        Fazer Avaliação Pendente <ChevronRight size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('cursos')}
                        style={{
                          width: '100%',
                          padding: '0.65rem 1rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Explorar Conteúdo dos Cursos
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. MÓDULOS EM ABERTO PARA ESTUDO (GRADE VIGENTE) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={20} color="#0056b3" /> Módulos em Aberto para Estudo ({livrosEmEstudo.length})
                    </h2>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      Módulos com aulas liberadas para seu cronograma
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('cursos')}
                    className="btn btn-outline"
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }}
                  >
                    Ver Todos os Cursos
                  </button>
                </div>

                {livrosEmEstudo.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: '#f8fafc' }}>Nenhum módulo pendente em aberto.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {livrosEmEstudo.map((livro: any) => (
                      <div
                        key={livro.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          borderRadius: '18px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                            {livro.capa_url ? (
                              <img
                                src={livro.capa_url}
                                alt={livro.titulo}
                                style={{
                                  width: '52px',
                                  height: '72px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
                                  flexShrink: 0
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '52px',
                                  height: '72px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #003875 0%, #0056b3 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}
                              >
                                <BookOpen size={22} />
                              </div>
                            )}

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                                {livro.courseName}
                              </span>
                              <h3
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 800,
                                  margin: '2px 0 0 0',
                                  color: '#ffffff',
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={livro.titulo}
                              >
                                {livro.titulo}
                              </h3>
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                {(livro.aulas || []).length} aulas & provas
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/module/${livro.id}`)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 1rem',
                            backgroundColor: '#0056b3',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0, 86, 179, 0.3)'
                          }}
                        >
                          <span>Acessar Módulo</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. ACESSO RÁPIDO & RECURSOS COMPLEMENTARES */}
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#f8fafc' }}>
                  Acesso Rápido & Recursos
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div
                    onClick={() => setActiveTab('biblioteca')}
                    className="admin-action-card"
                    style={{ margin: 0, padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div className="icon-wrapper" style={{ backgroundColor: 'rgba(0, 86, 179, 0.15)', color: '#0056b3' }}>
                      <BookOpen size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0' }}>Biblioteca Virtual</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Apostilas dos módulos, Bíblia Online e manuais de estudo.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('forum')}
                    className="admin-action-card"
                    style={{ margin: 0, padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div className="icon-wrapper" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}>
                      <MessageSquare size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0' }}>Fórum de Dúvidas</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Tire dúvidas e interaja com professores e colegas de turma.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('documentos')}
                    className="admin-action-card"
                    style={{ margin: 0, padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div className="icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <FileText size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0' }}>Documentação</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Envie documentos pessoais e comprove sua matrícula acadêmica.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('certificados')}
                    className="admin-action-card"
                    style={{ margin: 0, padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div className="icon-wrapper" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                      <GraduationCap size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0' }}>Certificados & Histórico</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Baixe certificados oficiais e histórico acadêmico completo.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. DADOS CADASTRAIS DO ALUNO */}
              <PersonalDataCard
                profile={profile}
                onRefresh={refreshProfile}
                courses={courses}
                atividades={atividades}
                progressoAulas={progressoAulas}
              />
            </div>
          )}

          {(activeTab === 'cursos' || activeTab === 'modulos') && (
            coursesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '5rem 2rem' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Carregando seus cursos…</p>
              </div>
            ) : (
            <>
              {/* Graduation Progress Tracker */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                 {/* Básico Progress */}
                 <div style={{ background: 'var(--glass)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--glass-border)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Award size={20} color="var(--primary)" />
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Progresso Nível Básico</span>
                       </div>
                        <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{Math.min(finishedBasicCount || 0, GRADUATION_CONFIG.basico.requiredModules)}/{GRADUATION_CONFIG.basico.requiredModules}</span>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                       <div style={{ 
                         height: '100%', 
                          width: `${Math.min(((finishedBasicCount || 0) / GRADUATION_CONFIG.basico.requiredModules) * 100, 100)}%`, 
                          background: 'linear-gradient(90deg, var(--primary) 0%, #9333ea 100%)',
                          borderRadius: '10px',
                          transition: 'width 1s ease-out'
                        }}></div>
                     </div>
                     {(finishedBasicCount || 0) >= GRADUATION_CONFIG.basico.requiredModules && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700 }}>
                        <CheckCircle2 size={14} /> Formado no Nível Básico!
                      </div>
                    )}
                 </div>

                 {/* Médio Progress */}
                 <div style={{ 
                   background: 'var(--glass)', 
                   padding: '1.5rem', 
                   borderRadius: '24px', 
                   border: '1px solid var(--glass-border)', 
                   position: 'relative', 
                   overflow: 'hidden',
                    opacity: (finishedBasicCount || 0) < GRADUATION_CONFIG.basico.requiredModules ? 0.6 : 1
                 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <GraduationCap size={20} color={(finishedBasicCount || 0) < GRADUATION_CONFIG.basico.requiredModules ? 'var(--text-muted)' : 'var(--primary)'} />
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Progresso Nível Médio</span>
                       </div>
                       <span style={{ fontWeight: 900 }}>{Math.min(finishedMediumCount || 0, GRADUATION_CONFIG.medio.requiredModules)}/{GRADUATION_CONFIG.medio.requiredModules}</span>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                       <div style={{ 
                         height: '100%', 
                         width: `${Math.min(((finishedMediumCount || 0) / GRADUATION_CONFIG.medio.requiredModules) * 100, 100)}%`, 
                         background: (finishedBasicCount || 0) < GRADUATION_CONFIG.basico.requiredModules ? 'var(--text-muted)' : 'linear-gradient(90deg, #9333ea 0%, #7c3aed 100%)',
                         borderRadius: '10px',
                         transition: 'width 1s ease-out'
                       }}></div>
                    </div>
                    {(finishedBasicCount || 0) < GRADUATION_CONFIG.basico.requiredModules && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertCircle size={14} /> Conclua o Básico para ingressar no Médio.
                      </div>
                    )}
                 </div>
              </div>

              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Módulos em Aberto para Estudo</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Módulos liberados para suas aulas e avaliações atuais.</p>
                </div>
                <button 
                  onClick={() => navigate('/modulos-finalizados')} 
                  className="btn btn-outline" 
                  style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', borderRadius: '12px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Award size={20} /> <span className="hide-mobile">Módulos Finalizados</span>
                </button>
              </div>
                <CourseList 
                  courses={courses}
                  progressoAulas={progressoAulas}
                  atividades={atividades}
                />
            </>
            )
          )}

          {activeTab === 'biblioteca' && (
            <DigitalLibraryPanel courses={courses} />
          )}

          {activeTab === 'documentos' && (
            <DocumentUpload 
              documents={[]} // Precisa de fetch documentos se necessário, ou usar hooks
              handleFileUpload={handleFileUpload}
              uploading={uploading}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinancePanel 
              isExempt={isStaff}
              pixConfig={pixConfig}
              payments={payments}
              uploading={uploading}
              handleFileUpload={handleFileUpload}
              handleNotifyPayment={handleNotifyPayment}
              showToast={showToast}
              isBlockedDueToPayment={isBlockedDueToPayment}
              isPastDue={isPastDue}
              handleRequestExtension={handleRequestExtension}
            />
          )}

          {activeTab === 'certificados' && (
            <CertificadosPanel profile={profile} />
          )}

          {activeTab === 'forum' && (
            <ForumPanel userProfile={profile} />
          )}
        </div>
        )}
      </main>
      </div>

      {/* POP-UP DE ALERTAS E INFORMES DO ADMIN */}
      <PopupAlertsDisplay />

      {/* POP-UP PIX DE MENSALIDADE E VALIDAÇÃO DE COMPROVANTE */}
      <PixPaymentPopup profile={profile} onPaymentSuccess={() => { fetchPayments(); refreshProfile(); }} forceOpen={searchParams.get('preview_pix') === 'true'} />

      {/* POP-UP DE PROVAS PENDENTES OU RECUPERAÇÃO */}
      {showExamNotice && pendingExams.length > 0 && (
        <ExamNotificationModal 
          exams={pendingExams}
          onClose={() => setShowExamNotice(false)}
        />
      )}

      {/* Modal: Marcar Módulos como Concluídos Manualmente */}
      {showModuleCompletionModal && (
        <div className="modal-overlay" onClick={() => { setShowModuleCompletionModal(false); setSelectedModules([]); }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Award color="var(--primary)" /> Marcar Módulos Concluídos
              </h3>
              <button onClick={() => { setShowModuleCompletionModal(false); setSelectedModules([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Selecione os módulos que você já concluiu fora da plataforma (presencial, em outra instituição, etc.). 
              Eles serão contabilizados para sua formatura.
            </p>

            {availableModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Award size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>Todos os módulos disponíveis já estão concluídos ou em andamento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {availableModules.map(module => (
                  <label key={module.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '1rem', 
                    background: selectedModules.includes(module.id) ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedModules.includes(module.id) ? 'var(--primary)' : 'var(--glass-border)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => handleModuleSelection(module.id)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{module.titulo}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {module.courseName} • {module.courseNivel} • Ordem: {module.ordem}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowModuleCompletionModal(false); setSelectedModules([]); }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveManualModules}
                disabled={selectedModules.length === 0 || savingModules}
              >
                {savingModules ? <Loader2 className="spinner" size={18} /> : `Salvar (${selectedModules.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Mobile Bottom Navigation */}
          <div className="mobile-bottom-nav">
            <button className={`bottom-nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
               <HomeIcon size={20} />
               <span>Início</span>
            </button>
            <button className={`bottom-nav-btn ${activeTab === 'cursos' ? 'active' : ''}`} onClick={() => setActiveTab('cursos')}>
               <BookOpen size={20} />
               <span>Cursos</span>
            </button>
            <button className={`bottom-nav-btn ${activeTab === 'forum' ? 'active' : ''}`} onClick={() => setActiveTab('forum')}>
               <MessageSquare size={20} />
               <span>Fórum</span>
            </button>
            <button className={`bottom-nav-btn ${activeTab === 'documentos' ? 'active' : ''}`} onClick={() => setActiveTab('documentos')}>
               <FileText size={20} />
               <span>Docs</span>
            </button>
            {!isStaff && (
              <button className={`bottom-nav-btn ${activeTab === 'financeiro' ? 'active' : ''}`} onClick={() => setActiveTab('financeiro')} style={{ position: 'relative' }}>
                 <CreditCard size={20} />
                 <span>Caixa</span>
                 {isPastDue && <div style={{ position: 'absolute', top: '0.2rem', right: '0.5rem', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)' }} />}
              </button>
            )}
          </div>

    </div>
  )
}

export default Dashboard
