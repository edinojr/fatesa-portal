import React from 'react';
import { Loader2, Award } from 'lucide-react';

interface StudentRowProps {
  aluno: any;
  isAdmin: boolean;
  actionLoading: string | null;
  handleMarkPago: (aluno: any, e: React.MouseEvent) => void;
  openStudent: (aluno: any) => void;
}

const StudentRow: React.FC<StudentRowProps> = ({
  aluno,
  isAdmin,
  actionLoading,
  handleMarkPago,
  openStudent
}) => {
  return (
    <tr key={aluno.id}>
      <td>
        {aluno.nome}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{aluno.email}</div>
      </td>
      <td>
        {aluno.pagamento?.status === 'pago' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700 }}>
              <span>✔</span> Pago
            </span>
            {aluno.pagamento?.comprovante_url && (
              <a href={aluno.pagamento.comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline' }}>Ver comprovante</a>
            )}
          </div>
        ) : aluno.pagamento?.comprovante_url ? (
          <a
            href={aluno.pagamento.comprovante_url}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
          >
            <span>✔</span> Ver Comprovante
          </a>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(255,77,77,0.12)', color: 'var(--error)', fontSize: '0.78rem', fontWeight: 700 }}>
            <span>⚠</span> Sem comprovante
          </span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isAdmin && aluno.pagamento?.status !== 'pago' && (
            <button
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.78rem' }}
              onClick={(e) => handleMarkPago(aluno, e)}
              disabled={actionLoading === `pago_${aluno.id}`}
            >
              {actionLoading === `pago_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : '✔ Pago'}
            </button>
          )}
          <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', width: 'auto' }} onClick={() => openStudent(aluno)}>
            Ver Boletim <Award size={16} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default StudentRow;
