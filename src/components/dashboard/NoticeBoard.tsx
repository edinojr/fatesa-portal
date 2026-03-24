import React from 'react';
import { 
  Megaphone, 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  Clock,
  ChevronRight,
  Download
} from 'lucide-react';

interface NoticeBoardProps {
  avisos: any[];
  materiais: any[];
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ avisos, materiais }) => {
  if (avisos.length === 0 && materiais.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', marginBottom: '3rem' }}>
      {/* Quadro de Avisos */}
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
    </div>
  );
};

export default NoticeBoard;
