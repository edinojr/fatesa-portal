import React from 'react';
import { 
  FileText, 
  ExternalLink, 
  Search, 
  Download,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface FinanceReportProps {
  data: any[];
  searchTerm: string;
}

const FinanceReport: React.FC<FinanceReportProps> = ({ data, searchTerm }) => {
  // Filtrar por termo de pesquisa
  const filteredData = data.filter(item => 
    item.users?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.users?.nucleo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.modulo?.toString().includes(searchTerm)
  );

  // Agrupar por Módulo
  const groupedByModulo = filteredData.reduce((acc: any, item: any) => {
    const modulo = item.modulo ? `Módulo ${item.modulo}` : 'Módulo Não Informado';
    if (!acc[modulo]) acc[modulo] = [];
    acc[modulo].push(item);
    return acc;
  }, {});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> APROVADO</span>;
      case 'pago':
        return <span className="badge badge-warning"><Clock size={12} /> PENDENTE</span>;
      case 'rejeitado':
        return <span className="badge badge-error"><AlertCircle size={12} /> REJEITADO</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Aluno', 'Email', 'Núcleo', 'Módulo', 'Vencimento', 'Valor', 'Status', 'Link Comprovante'];
    const rows = filteredData.map(item => [
      item.users?.nome,
      item.users?.email,
      item.users?.nucleo || 'N/A',
      item.modulo || 'N/A',
      new Date(item.data_vencimento).toLocaleDateString(),
      item.valor,
      item.status,
      item.comprovante_url
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_pagamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="finance-report-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}>
            <FileText size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Relatório de Alunos Pagantes</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {filteredData.length} comprovantes enviados via portal
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.5rem' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {filteredData.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-card)' }}>
          <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
          <h3>Nenhum registro encontrado</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tente ajustar seus filtros de pesquisa.</p>
        </div>
      ) : (
        Object.entries(groupedByModulo).sort((a,b) => a[0].localeCompare(b[0])).map(([modulo, payments]: [string, any]) => (
          <div key={modulo} className="report-group" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <FileText size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {modulo} <small style={{ fontWeight: 400, opacity: 0.6 }}>({payments.length} comprovantes)</small>
              </h3>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Núcleo</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: any) => (
                    <tr key={payment.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 650, fontSize: '0.95rem' }}>{payment.users?.nome}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{payment.users?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <MapPin size={14} opacity={0.5} />
                          {payment.users?.nucleo || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <Calendar size={14} opacity={0.5} />
                          {new Date(payment.data_vencimento).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getStatusBadge(payment.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a 
                          href={payment.comprovante_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-icon" 
                          title="Ver Comprovante"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '36px', height: '36px' }}
                        >
                          <ExternalLink size={18} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .badge-warning { background: rgba(234, 179, 8, 0.1); color: #eab308; }
        .badge-error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .badge-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); }
        
        .report-group .admin-table tr:hover {
          background: rgba(var(--primary-rgb), 0.03);
        }
      `}</style>
    </div>
  );
};

export default FinanceReport;
