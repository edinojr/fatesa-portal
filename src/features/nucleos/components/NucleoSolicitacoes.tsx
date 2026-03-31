import React from 'react';
import { Loader2 } from 'lucide-react';

interface NucleoSolicitacoesProps {
  students: any[];
  actionLoading: string | null;
  handleApproveStudent: (id: string) => void;
  handleRejectStudent: (id: string) => void;
}

const NucleoSolicitacoes: React.FC<NucleoSolicitacoesProps> = ({
  students,
  actionLoading,
  handleApproveStudent,
  handleRejectStudent
}) => {
  const pending = students.filter(s => s.status_nucleo === 'pendente');

  if (pending.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma nova solicitação de vínculo aguardando aprovação.</p>;
  }

  return (
    <table className="admin-table">
      <thead><tr><th>Aluno</th><th>Ações</th></tr></thead>
      <tbody>
        {pending.map(aluno => (
          <tr key={aluno.id}>
            <td>{aluno.nome} <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{aluno.email}</div></td>
            <td>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.3rem 0.6rem', width: 'auto', fontSize: '0.8rem' }} 
                  onClick={() => handleApproveStudent(aluno.id)} 
                  disabled={actionLoading === `approve_${aluno.id}`}
                >
                  {actionLoading === `approve_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : 'Aprovar'}
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.3rem 0.6rem', width: 'auto', fontSize: '0.8rem', color: 'var(--error)' }} 
                  onClick={() => handleRejectStudent(aluno.id)} 
                  disabled={actionLoading === `reject_${aluno.id}`}
                >
                  {actionLoading === `reject_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : 'Recusar'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default NucleoSolicitacoes;
