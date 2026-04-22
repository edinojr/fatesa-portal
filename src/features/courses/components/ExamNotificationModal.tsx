import React from 'react';
import { AlertCircle, ChevronRight, GraduationCap, ArrowRight } from 'lucide-react';
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
        border: `1px solid ${isRecoveryMode ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
        boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Element */}
        <div style={{ 
          position: 'absolute', 
          top: '-80px', 
          right: '-80px', 
          width: '200px', 
          height: '200px', 
          background: isRecoveryMode ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          filter: 'blur(50px)',
          borderRadius: '50%',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            background: isRecoveryMode ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#fff',
            boxShadow: isRecoveryMode ? '0 10px 20px rgba(244, 63, 94, 0.3)' : '0 10px 20px rgba(245, 158, 11, 0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {isRecoveryMode ? 'Recuperação Disponível!' : 'Prova Pendente!'}
          </h2>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.9rem' }}>
            Identificamos que você possui <strong>{exams.length} avaliação(ões)</strong> pendente(s). 
            {isRecoveryMode ? ' Uma delas é uma prova de recuperação para ajudar em sua média.' : ' Complete-as para progredir em sua trilha de aprendizado.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
            {exams.slice(0, 3).map(exam => (
              <div key={exam.id} style={{ 
                padding: '1rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '16px', 
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease'
              }}>
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
                <div style={{ 
                  fontSize: '0.6rem', 
                  padding: '3px 8px', 
                  background: exam.isRecovery ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                  color: exam.isRecovery ? '#f43f5e' : '#f59e0b',
                  borderRadius: '6px',
                  fontWeight: 900,
                  border: `1px solid ${exam.isRecovery ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  flexShrink: 0
                }}>
                  {exam.isRecovery ? 'RECUPERAÇÃO' : 'V1'}
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
              className="nav-btn-premium" 
              onClick={onClose}
              style={{ flex: 1, height: '48px', justifyContent: 'center', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}
            >
              Depois
            </button>
            <button 
              className="nav-btn-premium active" 
              style={{ 
                flex: 1.5, 
                height: '48px', 
                justifyContent: 'center', 
                borderRadius: '14px', 
                background: isRecoveryMode ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' : 'var(--primary)',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 800,
                boxShadow: isRecoveryMode ? '0 10px 20px rgba(244, 63, 94, 0.2)' : '0 10px 20px rgba(var(--primary-rgb), 0.2)'
              }}
              onClick={handleAction}
            >
              Iniciar Prova <ArrowRight size={18} style={{ marginLeft: '0.4rem' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamNotificationModal;
