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
    fetchStudentDashboardData 
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
    if (!courses.length) return [];
    
    const pending: any[] = [];
    courses.forEach(course => {
      course.livros.forEach(libro => {
        // Só mostrar provas de módulos liberados E vigentes
        if (!libro.isReleased || !libro.isCurrent) return;

        libro.aulas.forEach(aula => {
          if (libro.isReleased && (aula.tipo === 'prova' || !!aula.is_bloco_final) && !aula.isHidden) {
            const hasSubmission = atividades.some(sub => sub.lesson_id === aula.id);
            if (!hasSubmission) {
              pending.push({
                id: aula.id,
                titulo: aula.titulo || 'Avaliação',
                livro: libro.titulo,
                versao: aula.versao || 1,
                isRecovery: (aula.versao || 1) > 1
              });
            }
          }
        });
      });
    });
    return pending;
  }, [courses, atividades]);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentDashboardData();
      fetchPayments();
    }
  }, [profile?.id, fetchStudentDashboardData, fetchPayments]);

  useEffect(() => {
    if (pendingExams.length > 0) {
      const dismissed = sessionStorage.getItem('fatesa_exam_notice_dismissed');
      if (!dismissed) setShowExamNotice(true);
    }
  }, [pendingExams]);

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
      const filePath = type === 'pay' ? `comprovantes/${fileName}` : fileName; 

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

      showToast('Arquivo enviado com sucesso!');
      fetchPayments();
    } catch (err: any) {
      showToast(err.message, 'error');
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
      const { error } = await supabase.from('alunos').update({ nucleo_id: newNucleoId }).eq('id', profile.id);
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
                courses={courses}
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
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ 
            maxWidth: '500px', 
            textAlign: 'center', 
            padding: '2.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: '32px',
            border: `1px solid ${pendingExams.some(e => e.isRecovery) ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '24px', 
              background: pendingExams.some(e => e.isRecovery) ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: pendingExams.some(e => e.isRecovery) ? '#f43f5e' : '#f59e0b'
            }}>
              <AlertCircle size={40} />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              {pendingExams.some(e => e.isRecovery) ? '⚠️ Recuperação Disponível!' : '📋 Prova Pendente!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Identificamos que você possui {pendingExams.length} avaliação(ões) disponível(eis) no seu portal. 
              {pendingExams.some(e => e.isRecovery) && ' Uma delas é uma prova de recuperação para ajudar você a alcançar a nota necessária.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
              {pendingExams.slice(0, 3).map(exam => (
                <div key={exam.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>{exam.livro}</div>
                  <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{exam.titulo}</span>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      padding: '2px 8px', 
                      background: exam.isRecovery ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
                      color: exam.isRecovery ? '#f43f5e' : '#f59e0b',
                      borderRadius: '50px',
                      fontWeight: 800
                    }}>
                      {exam.isRecovery ? 'RECUPERAÇÃO' : 'VERSÃO V1'}
                    </span>
                  </div>
                </div>
              ))}
              {pendingExams.length > 3 && (
                <div style={{ fontSize: '0.8rem', textAlign: 'center', opacity: 0.5 }}>E mais {pendingExams.length - 3} avaliações...</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowExamNotice(false); sessionStorage.setItem('fatesa_exam_notice_dismissed', '1'); }}
                style={{ flex: 1, height: '54px' }}
              >
                Depois
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.5, height: '54px', background: pendingExams.some(e => e.isRecovery) ? '#f43f5e' : 'var(--primary)' }}
                onClick={() => {
                  setShowExamNotice(false);
                  sessionStorage.setItem('fatesa_exam_notice_dismissed', '1');
                  navigate(`/lesson/${pendingExams[0].id}`);
                }}
              >
                Fazer Prova Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
