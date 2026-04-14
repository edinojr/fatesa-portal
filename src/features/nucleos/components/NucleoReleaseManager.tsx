import React from 'react';
import { Award, CheckCircle2, XCircle, Loader2, BookOpen, ShieldCheck, ChevronDown, ChevronRight, PlayCircle } from 'lucide-react';

interface NucleoReleaseManagerProps {
  allCourses: any[];
  releasedItems: Record<string, boolean>;
  actionLoading: string | null;
  handleToggleRelease: (itemId: string, itemType: 'modulo' | 'atividade' | 'video', currentStatus: boolean) => void;
  handleBulkRelease: (release: boolean) => void;
  userRole?: string;
}

const NucleoReleaseManager: React.FC<NucleoReleaseManagerProps> = ({
  allCourses,
  releasedItems,
  actionLoading,
  handleToggleRelease,
  handleBulkRelease,
  userRole = 'professor'
}) => {
  const [expandedCourse, setExpandedCourse] = React.useState<string | null>(null);
  const isAdmin = userRole === 'admin' || userRole === 'suporte';
  const isProfessor = userRole === 'professor';


  return (
    <div style={{ flex: '1 1 350px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} /> Liberação de Conteúdo
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', width: 'auto', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)' }}
            onClick={() => handleBulkRelease(true)}
            disabled={actionLoading === 'bulk_release'}
          >
            {actionLoading === 'bulk_release' ? <Loader2 className="spinner" size={14} /> : <CheckCircle2 size={14} style={{ marginRight: '0.3rem' }} />} Liberar Tudo
          </button>
          <button 
            className="btn" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', width: 'auto', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
            onClick={() => handleBulkRelease(false)}
            disabled={actionLoading === 'bulk_release'}
          >
            <XCircle size={14} style={{ marginRight: '0.3rem' }} /> Bloquear Tudo
          </button>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Ative ou desative o acesso dos alunos aos módulos e aulas exclusivas deste núcleo.</p>
      
      <div className="data-card shadow-lg" style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <ShieldCheck size={20} color="var(--primary)" /> Controle de Acesso
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
          {allCourses.map(course => (
            <div key={course.id} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', background: expandedCourse === course.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <div 
                style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {expandedCourse === course.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span style={{ fontWeight: 600 }}>{course.nome}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{course.livros?.length || 0} livros</span>
              </div>

              {expandedCourse === course.id && (
                <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(course.livros || []).map((livro: any) => {
                    const isLivroReleased = releasedItems[`modulo:${livro.id}`];
                    return (
                      <div key={livro.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                             <BookOpen size={14} /> {livro.titulo}
                          </span>
                        <button 
                          className="btn"
                           onClick={() => handleToggleRelease(livro.id, 'modulo', !!isLivroReleased)}
                           disabled={actionLoading === `release_modulo:${livro.id}` || !isAdmin}
                           style={{ 
                             width: 'auto', 
                             padding: '0.2rem 0.6rem', 
                             fontSize: '0.7rem', 
                             background: isLivroReleased ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                             color: '#fff',
                             border: 'none',
                             opacity: isAdmin ? 1 : 0.4,
                             cursor: isAdmin ? 'pointer' : 'not-allowed'
                           }}
                        >
                            {actionLoading === `release_modulo:${livro.id}` ? <Loader2 className="spinner" size={12} /> : isLivroReleased ? 'Liberado' : 'Bloqueado'}
                          </button>
                        </div>

                        {/* Aulas do Livro (Atividades e Vídeos) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginLeft: '0.5rem' }}>
                          {(livro.aulas || []).map((aula: any) => {
                            const type = (aula.tipo === 'atividade' || aula.tipo === 'prova') ? 'atividade' : 'video';
                            const key = `${type}:${aula.id}`;
                            const isAulaReleased = releasedItems[key];
                            
                            return (
                              <div key={aula.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                   {type === 'video' ? <PlayCircle size={12} /> : <Award size={12} />} {aula.titulo}
                                </span>
                                <button 
                                  className="btn"
                                 onClick={() => handleToggleRelease(aula.id, type, !!isAulaReleased)}
                                 disabled={actionLoading === `release_${key}` || (!isProfessor && !isAdmin)}
                                 style={{ 
                                   width: 'auto', 
                                   padding: '0.15rem 0.5rem', 
                                   fontSize: '0.65rem', 
                                   background: isAulaReleased ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                                   color: '#fff',
                                   border: 'none',
                                   opacity: (isProfessor || isAdmin) ? 0.8 : 0.3,
                                   cursor: (isProfessor || isAdmin) ? 'pointer' : 'not-allowed'
                                 }}
                              >
                                  {actionLoading === `release_${key}` ? <Loader2 className="spinner" size={10} /> : isAulaReleased ? 'Liberado' : 'Bloqueado'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NucleoReleaseManager;
