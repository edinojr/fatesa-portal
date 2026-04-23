import React, { useEffect, useState, useMemo } from 'react'
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
  MessageSquare,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Logo from '../components/common/Logo'

// Hooks Feature-based
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { useFinanceControl } from '../features/finance/hooks/useFinanceControl'

// Componentes Feature-based
import CourseList from '../features/courses/components/CourseList'
import GradesPanel from '../features/courses/components/GradesPanel'
import ForumPanel from '../features/forum/components/ForumPanel'
import AlumniCertificate from '../components/documents/AlumniCertificate'
import DocumentUpload from '../features/finance/components/DocumentUpload'
import FinancePanel from '../features/finance/components/FinancePanel'
import ExamNotificationModal from '../features/courses/components/ExamNotificationModal'

type Tab = 'home' | 'cursos' | 'documentos' | 'financeiro' | 'boletim' | 'forum'

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
    const validTabs: Tab[] = ['home', 'cursos', 'documentos', 'financeiro', 'boletim', 'forum'];
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

  const isBlocked = profile?.bloqueado;
  const isAlumniData = (profile as any)?.isAlumni;

  // Exam notification state
  const [showExamNotice, setShowExamNotice] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Logica de Provas Pendentes e Recuperação
  const pendingExams = useMemo(() => {
    // Se o perfil estiver bloqueado, não mostrar notificações de provas
    if (!courses.length || profile?.bloqueado) return [];
    
    const pending: any[] = [];
    courses.forEach(course => {
      course.livros.forEach(libro => {
        // Módulo precisa estar liberado
        if (!libro.isReleased) return;

        libro.aulas.forEach(aula => {
          // É uma prova, não está oculta e não está bloqueada pelo professor
          const title = aula.titulo || '';
          const isExam = aula.tipo === 'prova' || !!aula.is_bloco_final || /V[1-3]|RECUPERAÇ/i.test(title);
          
          // REGRA 1: status_liberacao === true E data_liberacao <= hoje
          const isReleasedNow = (aula as any).status_liberacao !== false && 
                                (!(aula as any).data_liberacao || new Date((aula as any).data_liberacao) <= new Date());
          
          const isDoable = !aula.isHidden && !aula.lockedByProfessor && isReleasedNow;
          
          if (isExam && isDoable) {
            // REGRA 2 & 3: Se já aprovado no módulo ou em versão anterior, oculta
            const bookSubmissions = atividades.filter(s => s.book_id === libro.id);
            const isApprovedInModule = bookSubmissions.some(s => {
              const sa = (libro.aulas || []).find((pa: any) => pa.id === s.lesson_id);
              const isEx = sa?.is_bloco_final || sa?.tipo === 'prova' || /V[1-3]|RECUPERAÇ/i.test(sa?.titulo || '');
              return isEx && s.status === 'corrigida' && (s.nota || 0) >= 7.0;
            });

            if (isApprovedInModule) return; // Se já aprovado, ignora todas as provas deste módulo

            const sub = atividades.find(s => s.lesson_id === aula.id);
            const versao = (aula as any).versao || 1;

            if (!sub) {
              // Se é V2/V3, só mostra se a anterior foi feita e reprovada (handled by isHidden in hook, but double check here)
              pending.push({
                id: aula.id,
                titulo: title || 'Avaliação',
                livro: libro.titulo,
                versao: versao,
                isRecovery: versao > 1 || /V[2-3]|RECUPERAÇ/i.test(title)
              });
            } else {
              // Se já tem submissão, checa se é uma reprova que permite recuperação (V2/V3)
              const isFailed = sub.status === 'corrigida' && sub.nota !== null && sub.nota < 7.0;
              if (isFailed && !aula.isHidden) {
                 pending.push({
                   id: aula.id,
                   titulo: title || 'Avaliação',
                   livro: libro.titulo,
                   versao: versao,
                   isRecovery: true,
                   failed: true
                 });
              }
            }
          }
        });
      });
    });

    // Ordenar: primeiro as recuperações, depois por ordem de livro (implícito na iteração anterior)
    return pending.sort((a, b) => (b.isRecovery ? 1 : 0) - (a.isRecovery ? 1 : 0));
  }, [courses, atividades, profile?.bloqueado]);


  // Filtra cursos para mostrar apenas o vigente no Dashboard (Home e Cursos)
  const currentCourses = useMemo(() => {
    if (isStaff || !courses.length) return courses;
    
    return courses.map(course => ({
      ...course,
      livros: course.livros.filter(libro => libro.isReleased)
    })).filter(course => course.livros.length > 0);
  }, [courses, isStaff]);

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
    // If already at home, we don't navigate out to avoid quitting the dashboard unexpectedly
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
                  activeTab === 'boletim' ? 'Boletim' : 'Fórum'}
               </span>
             </div>
           )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {(profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.caminhos_acesso?.includes('admin') || profile?.email === 'edi.ben.jr@gmail.com') && (
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-btn-premium" 
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <GraduationCap size={18} /> <span className="mobile-hide">Trocar Painel</span>
              </button>
              {showRoleSwitcher && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.5rem', zIndex: 110, display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '180px', marginTop: '0.5rem' }}>
                  <button className="nav-btn-premium" style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 'none' }} onClick={() => navigate('/professor')}>Painel do Professor</button>
                  <button className="nav-btn-premium" style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 'none' }} onClick={() => navigate('/admin')}>Painel Administrativo</button>
                </div>
              )}
            </div>
          )}
          <button className="nav-btn-premium danger" onClick={() => signOut()}>
            <LogOut size={18} /> <span className="mobile-hide">Sair</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <header className="mobile-col-flex" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {activeTab === 'home' && 'Área do Aluno'}
              {activeTab === 'cursos' && 'Meus Cursos'}
              {activeTab === 'documentos' && 'Meus Documentos'}
              {activeTab === 'financeiro' && 'Meus Pagamentos'}
              {activeTab === 'boletim' && 'Meu Boletim'}
              {activeTab === 'forum' && 'Fórum da Comunidade'}
            </h1>
            <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              Bem-vindo de volta, {profile?.nome || 'Aluno'}. 
              {profile?.nucleo && (
                <span className="badge" style={{ 
                  fontSize: '0.75rem', 
                  background: 'rgba(var(--primary-rgb), 0.1)', 
                  color: 'var(--primary)', 
                  padding: '0.2rem 0.75rem', 
                  borderRadius: '50px',
                  border: '1px solid var(--primary)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <GraduationCap size={14} /> Polo: {profile.nucleo}
                </span>
              )}
            </p>
          </div>
        </header>

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

              <div className="admin-action-card" onClick={() => setActiveTab('boletim')}>
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
                       <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{Math.min(finishedBasicCount || 0, 27)}/27</span>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                       <div style={{ 
                         height: '100%', 
                         width: `${Math.min(((finishedBasicCount || 0) / 27) * 100, 100)}%`, 
                         background: 'linear-gradient(90deg, var(--primary) 0%, #9333ea 100%)',
                         borderRadius: '10px',
                         transition: 'width 1s ease-out'
                       }}></div>
                    </div>
                    {(finishedBasicCount || 0) >= 27 && (
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
                   opacity: (finishedBasicCount || 0) < 27 ? 0.6 : 1
                 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <GraduationCap size={20} color={(finishedBasicCount || 0) < 27 ? 'var(--text-muted)' : 'var(--primary)'} />
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Progresso Nível Médio</span>
                       </div>
                       <span style={{ fontWeight: 900 }}>{Math.min(finishedMediumCount || 0, 8)}/8</span>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                       <div style={{ 
                         height: '100%', 
                         width: `${Math.min(((finishedMediumCount || 0) / 8) * 100, 100)}%`, 
                         background: (finishedBasicCount || 0) < 27 ? 'var(--text-muted)' : 'linear-gradient(90deg, #9333ea 0%, #7c3aed 100%)',
                         borderRadius: '10px',
                         transition: 'width 1s ease-out'
                       }}></div>
                    </div>
                    {(finishedBasicCount || 0) < 27 && (
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
                showOnlyOngoing={true}
              />
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
              isExempt={isStaff || profile?.bolsista}
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

          {activeTab === 'boletim' && (
            <GradesPanel 
              profile={profile}
              availableNucleos={availableNucleos}
              handleChangeNucleo={handleChangeNucleo} 
              courses={courses}
              atividades={atividades}
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
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '1rem 2rem',
          borderRadius: '12px',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default Dashboard
