import React, { useState } from 'react';
import { 
  Megaphone, 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  Clock,
  ChevronRight,
  Download,
  Award,
  ClipboardList
} from 'lucide-react';
import ExtraAssessmentModal from './ExtraAssessmentModal';

interface NoticeBoardProps {
  avisos: any[];
  materiais: any[];
  atividades?: any[];
  onRefresh?: () => void;
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ avisos, materiais, atividades = [], onRefresh }) => {
  const [activeAtividade, setActiveAtividade] = useState<any | null>(null);

  if (avisos.length === 0 && materiais.length === 0 && atividades.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '2rem', marginBottom: '3rem' }} className="mobile-wrap-flex">
      {/* Quadro de Avisos e Avaliações Extras */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="admin-card" style={{ margin: 0, padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
            <Megaphone color="var(--primary)" size={24} /> Quadro de Avisos do Núcleo
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {avisos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Sem avisos recentes.</p>
            ) : (
              avisos.map(aviso => (
                <div key={aviso.id} style={{ padding: '1rem', background: 'var(--glass)', borderRadius: '12px', border: aviso.prioridade === 'urgente' ? '1px solid var(--error)' : '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {aviso.prioridade === 'urgente' && <AlertCircle size={16} color="var(--error)" />}
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{aviso.titulo}</h4>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {new Date(aviso.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{aviso.conteudo}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NEW: Avaliações Extras do Pólo */}
        {atividades.length > 0 && (
          <div className="admin-card" style={{ margin: 0, padding: '1.5rem', background: 'rgba(234, 179, 8, 0.03)', border: '1px solid rgba(234, 179, 8, 0.1)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              <Award color="#EAB308" size={22} /> Avaliações Extras (Pólo)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {atividades.map(atv => {
                const sub = atv.respostas_atividades_extra?.[0];
                const hasQuestionnaire = atv.questionario && Array.isArray(atv.questionario) && atv.questionario.length > 0;
                
                return (
                  <div key={atv.id} style={{ padding: '1.25rem', background: 'var(--glass)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{atv.titulo}</h4>
                      {sub ? (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontWeight: 700 }}>CONCLUÍDO</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,165,0,0.1)', color: 'orange', fontWeight: 700 }}>PENDENTE</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{atv.descricao}</p>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {sub && sub.nota !== null ? (
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>Nota: {sub.nota.toFixed(1)}</div>
                      ) : <div></div>}
                      
                      {hasQuestionnaire && !sub && (
                        <button 
                          className="btn btn-primary" 
                          style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                          onClick={() => setActiveAtividade(atv)}
                        >
                          Realizar Prova
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Materiais Complementares */}
      <div className="admin-card" style={{ margin: 0, padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          <FileText color="var(--primary)" size={20} /> Materiais Complementares
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {materiais.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Nenhum material extra enviado.</p>
          ) : (
            materiais.map(mat => (
              <div key={mat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>{mat.titulo}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {mat.arquivos?.map((file: any, i: number) => (
                    <a 
                      key={i} 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.3rem', 
                        fontSize: '0.75rem', 
                        padding: '4px 8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '6px', 
                        color: 'var(--primary)', 
                        textDecoration: 'none',
                        border: '1px solid rgba(var(--primary-rgb), 0.1)'
                      }}
                    >
                      <Download size={12} /> {file.name}
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {activeAtividade && (
        <ExtraAssessmentModal 
          atividade={activeAtividade} 
          onClose={() => setActiveAtividade(null)} 
          onSuccess={() => onRefresh && onRefresh()}
        />
      )}
    </div>
  );
};

export default NoticeBoard;
