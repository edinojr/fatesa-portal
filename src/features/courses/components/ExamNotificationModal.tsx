import React from 'react';
import { AlertCircle, ChevronRight, GraduationCap, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingExam {
  id: string;
  titulo: string;
  livro: string;
  versao: number;
  isRecovery: boolean;
}

interface ExamNotificationModalProps {
  exams: PendingExam[];
  onClose: () => void;
}

const ExamNotificationModal: React.FC<ExamNotificationModalProps> = ({ exams, onClose }) => {
  const navigate = useNavigate();

  if (!exams.length) return null;

  const handleAction = () => {
    onClose();
    // Navega para a primeira prova da lista
    navigate(`/lesson/${exams[0].id}`);
  };

  const isRecoveryMode = exams.some(e => e.isRecovery);
  const hasFailures = exams.some(e => (e as any).status === 'reprovado');

  return (
    <div className="modal-overlay" style={{ 
      zIndex: 10000,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="modal-content" style={{ 
        maxWidth: '480px', 
        width: '94%',
        textAlign: 'center', 
        padding: '2rem 1.5rem', 
        background: 'rgba(15, 16, 18, 0.98)', 
        borderRadius: '32px',
        border: `1px solid ${hasFailures ? 'rgba(244, 63, 94, 0.4)' : isRecoveryMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(124, 58, 237, 0.4)'}`,
        boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close Button Top Right */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <X size={18} />
        </button>

        {/* Decorative Background Element */}
        <div style={{ 
          position: 'absolute', 
          top: '-80px', 
          right: '-80px', 
          width: '200px', 
          height: '200px', 
          background: hasFailures ? 'rgba(244, 63, 94, 0.1)' : 'rgba(124, 58, 237, 0.1)',
          filter: 'blur(50px)',
          borderRadius: '50%',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            background: hasFailures ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' : isRecoveryMode ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#fff',
            boxShadow: hasFailures ? '0 10px 20px rgba(244, 63, 94, 0.3)' : '0 10px 20px rgba(124, 58, 237, 0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {hasFailures ? 'Atenção: Resultado de Prova' : isRecoveryMode ? 'Recuperação Disponível!' : 'Avisos Pedagógicos'}
          </h2>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.9rem' }}>
            {hasFailures 
              ? 'Você possui resultados que exigem atenção ou uma nova tentativa de avaliação.' 
              : 'Identificamos atividades pendentes importantes para sua progressão acadêmica.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
            {exams.slice(0, 3).map(exam => (
              <div 
                key={exam.id} 
                onClick={() => { onClose(); navigate(`/lesson/${exam.id}`); }}
                className="modal-list-item-hover"
                style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0
                }}>
                  <GraduationCap size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exam.livro}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exam.titulo}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    fontSize: '0.6rem', 
                    padding: '3px 8px', 
                    background: (exam as any).status === 'reprovado' ? 'rgba(244, 63, 94, 0.15)' : (exam as any).status === 'recuperacao' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(124, 58, 237, 0.15)', 
                    color: (exam as any).status === 'reprovado' ? '#f43f5e' : (exam as any).status === 'recuperacao' ? '#f59e0b' : '#7c3aed',
                    borderRadius: '6px',
                    fontWeight: 900,
                    border: `1px solid ${(exam as any).status === 'reprovado' ? 'rgba(244, 63, 94, 0.2)' : (exam as any).status === 'recuperacao' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`,
                    flexShrink: 0
                  }}>
                    {(exam as any).status === 'reprovado' ? `NOTA ${(exam as any).nota || 'INS.'}` : (exam as any).status === 'recuperacao' ? 'RECUPERAÇÃO' : 'PENDENTE'}
                  </div>
                  <ChevronRight size={14} className="mobile-hide" style={{ opacity: 0.3 }} />
                </div>
              </div>
            ))}
            {exams.length > 3 && (
              <div style={{ 
                fontSize: '0.75rem', 
                textAlign: 'center', 
                opacity: 0.5, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}>
                <ChevronRight size={12} /> E mais {exams.length - 3} avaliações
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-outline" 
              onClick={onClose}
              style={{ flex: 1, height: '48px', justifyContent: 'center', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              Fechar
            </button>
            <button 
              className="btn btn-primary" 
              style={{ 
                flex: 1.5, 
                height: '48px', 
                justifyContent: 'center', 
                borderRadius: '14px', 
                background: isRecoveryMode ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'var(--primary)',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#fff',
                boxShadow: isRecoveryMode ? '0 10px 20px rgba(245, 158, 11, 0.2)' : '0 10px 20px rgba(var(--primary-rgb), 0.2)'
              }}
              onClick={handleAction}
            >
              Iniciar Tudo <ArrowRight size={18} style={{ marginLeft: '0.4rem' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamNotificationModal;
