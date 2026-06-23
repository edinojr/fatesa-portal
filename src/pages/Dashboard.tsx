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
  Loader2
} from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'
import { GRADUATION_CONFIG } from '../config/graduation'

// Hooks Feature-based
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { useFinanceControl } from '../features/finance/hooks/useFinanceControl'

// Componentes Feature-based
import CourseList from '../features/courses/components/CourseList'
import ForumPanel from '../features/forum/components/ForumPanel'
import AlumniCertificate from '../components/documents/AlumniCertificate'
import DocumentUpload from '../features/finance/components/DocumentUpload'
import FinancePanel from '../features/finance/components/FinancePanel'
import ExamNotificationModal from '../features/courses/components/ExamNotificationModal'

type Tab = 'home' | 'cursos' | 'documentos' | 'financeiro' | 'forum' | 'modulos-concluidos'

const Dashboard = () => {
  const { profile, signOut, refreshProfile } = useProfile();
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    localStorage.setItem('fatesa_active_role', 'aluno')
  }, [])

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['home', 'cursos', 'documentos', 'financeiro', 'forum', 'modulos-concluidos'];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const setActiveTab = (newTab: Tab) => {
    setSearchParams({ tab: newTab });
  };

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as Tab);
    }
  }, [location.state]);
  
  // Custom Hooks para lógica de negócio
  const { 
    courses, 
    progressoAulas, 
    atividades, 
    fetchStudentDashboardData,
    finishedBasicCount,
    finishedMediumCount,
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
  const [historyGrades, setHistoryGrades] = useState<any[]>([]);

  const isBlocked = profile?.bloqueado;
  const isAlumniData = (profile as any)?.isAlumni;

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
        .update({ modulos_finalizados_manual: updatedManual })
        .eq('id', profile.id);
      
      if (error) throw error;
      
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

  const fetchHistoryGrades = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('historico_notas')
      .select('*')
      .eq('aluno_id', profile.id)
      .order('created_at', { ascending: false })
    setHistoryGrades(data || [])
  }, [profile?.id])

  // Logica de Provas Pendentes e Recuperação (Refinada para Aprovação/Reprovação)
  const pendingExams = useMemo(() => {
    if (!courses.length || profile?.bloqueado) return [];
    
    const pending: any[] = [];
    courses.forEach(course => {
      course.livros.forEach(libro => {
        if (!libro.isReleased) return;

        // Verifica se o aluno já foi aprovado ou está em DP no módulo
        const bookSubmissions = atividades.filter(s => s.book_id === libro.id);
        const examSubs = bookSubmissions.filter(s => {
          const sa = (libro.aulas || []).find((pa: any) => pa.id === s.lesson_id);
          const isEx = sa?.is_bloco_final || sa?.tipo === 'prova' || sa?.tipo === 'avaliacao' || /V[1-3]|RECUPERAÇ/i.test(sa?.titulo || '');
          return isEx && s.status === 'corrigida';
        });

        let isApproved = false;
        if (examSubs.length > 0) {
          const highestExam = examSubs.reduce((prev, current) => {
            const prevAula = (libro.aulas || []).find((pa: any) => pa.id === prev.lesson_id);
            const currAula = (libro.aulas || []).find((pa: any) => pa.id === current.lesson_id);
            const prevV = (prevAula as any)?.versao || 1;
            const currV = (currAula as any)?.versao || 1;
            if (currV > prevV) return current;
            if (currV < prevV) return prev;
            return new Date(current.created_at || 0).getTime() > new Date(prev.created_at || 0).getTime() ? current : prev;
          });
          const highestAula = (libro.aulas || []).find((pa: any) => pa.id === highestExam.lesson_id);
          const minGrade = (highestAula as any)?.min_grade || 7.0;
          isApproved = (highestExam.nota || 0) >= minGrade;
        }
        const isDP = bookSubmissions.some(s => {
          const aula = (libro.aulas || []).find((pa: any) => pa.id === s.lesson_id);
          const isEx = aula?.is_bloco_final || aula?.tipo === 'prova' || aula?.tipo === 'avaliacao';
          const minGrade = (aula as any)?.min_grade || GRADUATION_CONFIG.defaultMinGrade;
          return isEx && s.status === 'corrigida' && (aula as any)?.versao === GRADUATION_CONFIG.maxExamVersion && (s.nota || 0) < minGrade;
        });
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
            } else if (sub.status === 'corrigida' && (sub.nota || 0) < 7.0) {
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


  // Filtra cursos para mostrar apenas o vigente no Dashboard (Home e Cursos)
  const currentCourses = useMemo(() => {
    if (isStaff || !courses.length) return courses;
    
    return courses.map(course => ({
      ...course,
      livros: (course.livros || []).filter((livro: any) => !livro.isFinished)
    })).filter(course => course.livros.length > 0);
  }, [courses, isStaff]);

  // Módulos em andamento (não finalizados)
  const modulosAtivos = useMemo(() => {
    return courses.map(course => ({
      ...course,
      livros: (course.livros || []).filter((livro: any) => !livro.isFinished)
    })).filter(course => course.livros.length > 0);
  }, [courses]);

  // Módulos concluídos/arquivados (finalizados)
  const modulosFinalizados = useMemo(() => {
    return courses.map(course => ({
      ...course,
      livros: (course.livros || []).filter((livro: any) => livro.isFinished)
    })).filter(course => course.livros.length > 0);
  }, [courses]);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentDashboardData();
      fetchPayments();
      fetchHistoryGrades();
    }
  }, [profile?.id, fetchStudentDashboardData, fetchPayments, fetchHistoryGrades]);

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

  const availableNucleos: any[] = []; // Se necessário para staff
  const handleChangeNucleo = async (newNucleoId: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('users').update({ nucleo_id: newNucleoId }).eq('id', profile.id);
      if (error) throw error;
      refreshProfile();
      showToast('Núcleo alterado!');
    } catch (err: any) {
      showToast(err.message, 'error');
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
    <div className="admin-layout">
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

      {/* Standardized Dashboard Navigation Header */}
      <header className="dashboard-header-modern">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo size={120} />
          
          <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
            <button onClick={() => navigate('/')} className="nav-btn-premium" title="Ir para Home do Site">
              <HomeIcon size={18} />
            </button>
            <button 
              onClick={handleStudentBack} 
              className="nav-btn-premium" 
              title="Voltar"
              style={{ display: (activeTab === 'home') ? 'none' : 'inline-flex' }}
            >
              <ChevronLeft size={18} /> <span className="mobile-hide">Voltar</span>
            </button>
            <button onClick={() => navigate('/modulos-finalizados')} className="nav-btn-premium" title="Ver Concluídos" style={{ border: '1px solid var(--success-border)', background: 'rgba(16, 185, 129, 0.05)' }}>
              <Award size={18} color="var(--success)" /> <span className="mobile-hide">Módulos Finalizados</span>
            </button>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
           {activeTab !== 'home' && (
             <div className="nav-breadcrumb-modern">
               <LayoutGrid size={16} /> <span>Painel do Aluno</span>
               <ChevronRight size={14} className="divider" />
               <span className="current">
                 {activeTab === 'cursos' ? 'Meus Cursos' :
                  activeTab === 'documentos' ? 'Documentos' :
                  activeTab === 'financeiro' ? 'Pagamentos' :
                  activeTab === 'modulos-concluidos' ? 'Boletim' : 'Fórum'}
               </span>
             </div>
           )}
        </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {((profile?.tipo === 'admin' || profile?.caminhos_acesso?.includes('admin')) || profile?.email === 'edi.ben.jr@gmail.com') && (
              <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.5rem' }}>
                {profile?.caminhos_acesso?.includes('coordenador_polo') ? (
                  <button onClick={() => { localStorage.setItem('fatesa_active_role', 'coordenador'); navigate('/coordenador'); }} className="nav-btn-premium" style={{ width: 'auto' }}>
                    <Users size={18} /> <span className="mobile-hide">Painel Coordenador</span>
                  </button>
                ) : null}
                {profile?.caminhos_acesso?.includes('professor') ? (
                  <button onClick={() => { localStorage.setItem('fatesa_active_role', 'professor'); navigate('/professor'); }} className="nav-btn-premium" style={{ width: 'auto' }}>
                    <GraduationCap size={18} /> <span className="mobile-hide">Painel Professor</span>
                  </button>
                ) : null}
                <button onClick={() => { localStorage.setItem('fatesa_active_role', 'admin'); navigate('/admin'); }} className="nav-btn-premium" style={{ width: 'auto' }}>
                  <LayoutGrid size={18} /> <span className="mobile-hide">Painel Admin</span>
                </button>
              </div>
            )}
            <button className="nav-btn-premium danger" onClick={() => signOut()}>
              <LogOut size={18} /> <span className="mobile-hide">Sair</span>
            </button>
          </div>
      </header>

      <main className="admin-main">
         <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'home' && (
            <div className="admin-dashboard-grid transition-fade-in" style={{ marginTop: '1rem' }}>
              <div className="admin-action-card" onClick={() => setActiveTab('cursos')}>
                <div className="icon-wrapper"><BookOpen size={32} /></div>
                <h3>Meus Cursos</h3>
                <p>Acesse suas aulas, materiais e continue seus estudos.</p>
              </div>

              <div className="admin-action-card" onClick={() => setActiveTab('forum')}>
                <div className="icon-wrapper"><MessageSquare size={32} /></div>
                <h3>Fórum</h3>
                <p>Participe de discussões e tire dúvidas com a comunidade.</p>
              </div>

              <div className="admin-action-card" onClick={() => setActiveTab('documentos')}>
                <div className="icon-wrapper"><FileText size={32} /></div>
                <h3>Documentação</h3>
                <p>Envie e gerencie seus documentos de matrícula.</p>
              </div>

              {!isStaff && (
                <div className="admin-action-card" onClick={() => setActiveTab('financeiro')}>
                  <div className="icon-wrapper"><CreditCard size={32} /></div>
                  <h3>Pagamentos</h3>
                  <p>Consulte mensalidades e gere bônus/PIX de pagamento.</p>
                  {isPastDue && (
                    <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--error)', color: '#fff', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '50px', fontWeight: 800 }}>
                      PENDENTE
                    </span>
                  )}
                </div>
              )}

              <div className="admin-action-card" onClick={() => { fetchAvailableModules(); setShowModuleCompletionModal(true); }}>
                <div className="icon-wrapper"><Award size={32} /></div>
                <h3>Módulos Concluídos</h3>
                <p>Marque módulos que você já concluiu fora da plataforma.</p>
              </div>

              <div className="admin-action-card" onClick={() => navigate('/modulos-finalizados')}>
                <div className="icon-wrapper"><Award size={32} /></div>
                <h3>Meu Boletim</h3>
                <p>Consulte suas notas e desempenho acadêmico.</p>
              </div>
            </div>
          )}

          {isAlumniData && activeTab === 'home' && (
            <div style={{ marginBottom: '2rem', padding: '2rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '24px', border: '1px solid rgba(var(--primary-rgb), 0.2)', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Award size={48} color="var(--primary)" />
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Parabéns pela Conclusão!</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px' }}>Você concluiu com aproveitamento o **Curso Básico de Teologia**. Seu certificado oficial está pronto para download abaixo.</p>
                <AlumniCertificate aluno={{
                  nome: profile?.nome || isAlumniData.nome,
                  email: profile?.email || isAlumniData.email,
                  ano_formacao: isAlumniData.ano_formacao,
                  matricula: isAlumniData.matricula
                }} />
              </div>
            </div>
          )}

          {isBlocked && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid var(--error)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ color: 'var(--error)' }}>Acesso suspenso pelo administrador.</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Seu acesso aos cursos e materiais está restrito. Regularize seu pagamento abaixo para reativar todos os recursos.</p>
              </div>
            </div>
          )}

          {activeTab === 'cursos' && (
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
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Meus Módulos Ativos</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Acompanhe seu progresso atual e continue seus estudos.</p>
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
                  courses={currentCourses}
                  progressoAulas={progressoAulas}
                  atividades={atividades}
                />

                {modulosFinalizados.length > 0 && (
                  <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', fontWeight: 800, color: '#d97706', marginBottom: '1.5rem' }}>
                      <Award size={22} /> Módulos Finalizados e Concluídos
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Estes módulos você já finalizou com aprovação. Seu histórico de notas está preservado.
                    </p>
                    <CourseList 
                      courses={modulosFinalizados}
                      progressoAulas={progressoAulas}
                      atividades={atividades}
                    />
                  </div>
                )}
            </>
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

          {activeTab === 'forum' && (
            <ForumPanel userProfile={profile} />
          )}
        </div>
      </main>

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

    </div>
  )
}

export default Dashboard
