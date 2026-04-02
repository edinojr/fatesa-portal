import { FileText, CreditCard, Eye, CheckCircle2, XCircle, Trash2 } from 'lucide-react'

interface ValidationPanelProps {
  pendingDocs: any[]
  pendingPays: any[]
  userRole: string | null
  actionLoading: string | null
  handleValidar: (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado') => Promise<void>
  handleDeleteValidation: (target: 'doc' | 'pay', id: string) => Promise<void>
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  pendingDocs,
  pendingPays,
  userRole,
  actionLoading,
  handleValidar,
  handleDeleteValidation
}) => {
  const labelMap: Record<string, string> = {
    rg: 'RG / CNH',
    residencia: 'Residência',
    certidao: 'Certidões',
    exame: 'Exame Médico',
    outro: 'Outro'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <section>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <FileText /> Documentos Pendentes
        </h3>
        {pendingDocs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum documento aguardando validação.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Arquivo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingDocs.map(doc => (
                <tr key={doc.id}>
                  <td><div style={{ fontWeight: 600 }}>{doc.users?.nome}</div></td>
                  <td>
                    <span className="admin-badge" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                      {labelMap[doc.tipo] || doc.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-outline" 
                      style={{ display: 'inline-flex', width: 'auto' }}
                    >
                      <Eye size={16} /> Ver
                    </a>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleValidar('doc', doc.id, 'aprovado')} 
                        disabled={actionLoading === doc.id}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        className="btn" 
                        style={{ background: 'var(--error)', color: '#fff' }} 
                        onClick={() => handleValidar('doc', doc.id, 'rejeitado')} 
                        disabled={actionLoading === doc.id}
                      >
                        <XCircle size={16} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ color: 'var(--error)', borderColor: 'var(--error)' }} 
                        onClick={() => handleDeleteValidation('doc', doc.id)} 
                        disabled={actionLoading === doc.id}
                        title="Excluir Registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {userRole === 'admin' && (
        <section>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CreditCard /> Comprovantes de Pagamento
          </h3>
          {pendingPays.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhum pagamento aguardando validação.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Arquivo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendingPays.map(pay => (
                  <tr key={pay.id}>
                    <td><div style={{ fontWeight: 600 }}>{pay.users?.nome}</div></td>
                    <td><div style={{ fontWeight: 700 }}>R$ {pay.valor.toFixed(2)}</div></td>
                    <td>{new Date(pay.data_vencimento).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {pay.descricao || <span style={{ opacity: 0.5 }}>-</span>}
                    </td>
                    <td>
                      <a 
                        href={pay.comprovante_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-outline" 
                        style={{ display: 'inline-flex', width: 'auto' }}
                      >
                        <Eye size={16} /> Ver
                      </a>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleValidar('pay', pay.id, 'aprovado')} 
                          disabled={actionLoading === pay.id}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          className="btn" 
                          style={{ background: 'var(--error)', color: '#fff' }} 
                          onClick={() => handleValidar('pay', pay.id, 'rejeitado')} 
                          disabled={actionLoading === pay.id}
                        >
                          <XCircle size={16} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ color: 'var(--error)', borderColor: 'var(--error)' }} 
                          onClick={() => handleDeleteValidation('pay', pay.id)} 
                          disabled={actionLoading === pay.id}
                          title="Excluir Registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};

export default ValidationPanel;
