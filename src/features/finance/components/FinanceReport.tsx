import React, { useState } from 'react';
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
  AlertCircle,
  Trash2
} from 'lucide-react';

interface FinanceReportProps {
  data: any[];
  searchTerm: string;
  handleDeleteValidation?: (target: 'doc' | 'pay', id: string) => Promise<void>;
  handleValidar?: (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado', modulo?: string) => Promise<void>;
  actionLoading?: string | null;
}

const FinanceReport: React.FC<FinanceReportProps> = ({ data, searchTerm, handleDeleteValidation, handleValidar, actionLoading }) => {
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nome = item.users?.nome || '';
    const email = item.users?.email || '';
    const nucleoNome = item.users?.nucleos?.nome || item.users?.nucleo || '';
    const moduloStr = item.modulo?.toString() || '';
    return nome.toLowerCase().includes(term) || 
           email.toLowerCase().includes(term) || 
           nucleoNome.toLowerCase().includes(term) || 
           moduloStr.includes(term);
  });

  // Agrupar por Módulo
  const groupedByModulo = filteredData.reduce((acc: any, item: any) => {
    const moduloValue = item.modulo || 0;
    const moduloGroup = moduloValue ? `Módulo ${moduloValue}` : 'Módulo Não Definido';
    if (!acc[moduloGroup]) acc[moduloGroup] = [];
    acc[moduloGroup].push(item);
    return acc;
  }, {});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={12} /> APROVADO</span>;
      case 'pago':
      case 'pendente':
        return <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={12} /> PENDENTE</span>;
      case 'rejeitado':
        return <span className="badge badge-error" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><AlertCircle size={12} /> REJEITADO</span>;
      default:
        return <span className="badge badge-secondary" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Aluno', 'Email', 'Núcleo', 'Módulo', 'Vencimento', 'Valor', 'Status', 'Link Comprovante'];
    const rows = filteredData.map(item => [
      item.users?.nome,
      item.users?.email,
      item.users?.nucleos?.nome || item.users?.nucleo || 'N/A',
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

  const [currentView, setCurrentView] = useState<'pending' | 'validated'>('pending');

  const confirmedTotal = filteredData.filter(p => p.status === 'aprovado').length;
  const pendingTotal = filteredData.filter(p => p.status === 'pago' || p.status === 'pendente' || p.status === 'aberto').length;

  const renderTable = (payments: any[], allowValidation: boolean) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Núcleo</th>
            <th>Vencimento / Valor</th>
            <th style={{ textAlign: 'center' }}>Situação</th>
            <th style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment: any) => (
            <tr key={payment.id} style={{ opacity: payment.status === 'rejeitado' ? 0.6 : 1 }}>
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
                  {payment.users?.nucleos?.nome || payment.users?.nucleo || 'N/A'}
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                    <Calendar size={12} opacity={0.5} />
                    {new Date(payment.data_vencimento).toLocaleDateString()}
                  </div>
                  <div style={{ fontWeight: 800, color: '#10b981' }}>R$ {payment.valor?.toFixed(2)}</div>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                {getStatusBadge(payment.status)}
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {payment.comprovante_url && (
                    <a href={payment.comprovante_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', border: 'none' }} title="Ver Comprovante">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  
                  {allowValidation && handleValidar && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: '#10b981', display: 'flex', gap: '0.3rem' }}
                        onClick={() => handleValidar('pay', payment.id, 'aprovado', payment.modulo?.toString() || '1')}
                        disabled={actionLoading === payment.id}
                      >
                        <CheckCircle2 size={14} /> APROVAR
                      </button>
                      <button 
                        className="btn" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)' }}
                        onClick={() => handleValidar('pay', payment.id, 'rejeitado')}
                        disabled={actionLoading === payment.id}
                      >
                        RECUSAR
                      </button>
                    </>
                  )}

                  {handleDeleteValidation && (
                    <button 
                      className="btn btn-outline" 
                      style={{ width: 'auto', padding: '0.4rem', color: 'var(--error)', border: 'none' }} 
                      onClick={() => {
                        if (window.confirm('Excluir este registro permanentemente?')) {
                          handleDeleteValidation('pay', payment.id)
                        }
                      }} 
                      disabled={actionLoading === payment.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="finance-report-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '10px', borderRadius: '12px' }}>
            <FileText size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Relatório de Alunos Pagantes</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {data.length} faturas totais encontradas no banco de dados. {filteredData.length} registros exibidos.
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.5rem', width: 'auto' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {data.length === 0 && (
        <div style={{ padding: '1rem', background: '#330000', color: 'yellow', fontFamily: 'monospace', marginBottom: '1rem' }}>
          ATENÇÃO: A tabela de pagamentos retornou VAZIO (0 registros). 
          Isso pode significar que não há registros no banco, ou que as Permissões do Banco de Dados (RLS) estão bloqueando seu cargo.
        </div>
      )}

      {/* Summary Cards as Navigable Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div 
          className="card" 
          onClick={() => setCurrentView('pending')}
          style={{ 
            cursor: 'pointer',
            padding: '1.5rem', 
            background: currentView === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.02)', 
            border: currentView === 'pending' ? '2px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(245, 158, 11, 0.1)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem',
            transform: currentView === 'pending' ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{pendingTotal}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.7, marginTop: '4px' }}>Aguardando Confirmação</div>
          </div>
        </div>

        <div 
          className="card" 
          onClick={() => setCurrentView('validated')}
          style={{ 
            cursor: 'pointer',
            padding: '1.5rem', 
            background: currentView === 'validated' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.02)', 
            border: currentView === 'validated' ? '2px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(16, 185, 129, 0.1)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem',
            transform: currentView === 'validated' ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{confirmedTotal}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.7, marginTop: '4px' }}>Histórico Consolidado</div>
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-card)' }}>
          <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
          <h3>Nenhum registro encontrado</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tente ajustar seus filtros de pesquisa.</p>
        </div>
      ) : (
        <>
          {/* Pendentes */}
          {currentView === 'pending' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              
              {pendingTotal === 0 ? (
                <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                  <Clock size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.5, color: '#f59e0b' }} />
                  <h3 style={{ color: '#f59e0b' }}>Nenhuma Fatura Pendente</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Todos os comprovantes atuais já foram homologados.</p>
                </div>
              ) : (
                Object.entries(groupedByModulo)
                  .sort((a: any, b: any) => {
                    const modA = parseInt(a[0].replace('Módulo ', '')) || 0;
                    const modB = parseInt(b[0].replace('Módulo ', '')) || 0;
                    return modA - modB;
                  }).map(([modulo, payments]: [string, any]) => {
                    const modulePending = payments.filter((p: any) => p.status === 'pendente' || p.status === 'pago' || p.status === 'aberto');
                    if (modulePending.length === 0) return null;
                    
                    return (
                      <div key={`pending-${modulo}`} className="report-group" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                          <FileText size={16} color="var(--primary)" />
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {modulo} <small style={{ fontWeight: 400, opacity: 0.6 }}>({modulePending.length} pendentes)</small>
                          </h3>
                        </div>
                        {renderTable(modulePending, true)}
                      </div>
                    );
                })
              )}
            </div>
          )}

          {/* Validados */}
          {currentView === 'validated' && (
             <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              
              {confirmedTotal + filteredData.filter(p => p.status === 'rejeitado').length === 0 ? (
                <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.3)' }}>
                  <CheckCircle2 size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.5, color: '#10b981' }} />
                  <h3 style={{ color: '#10b981' }}>Nenhum Histórico Consolidado</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Os envios aprovados/recusados aparecerão aqui.</p>
                </div>
              ) : (
                Object.entries(groupedByModulo)
                  .sort((a: any, b: any) => {
                    const modA = parseInt(a[0].replace('Módulo ', '')) || 0;
                    const modB = parseInt(b[0].replace('Módulo ', '')) || 0;
                    return modA - modB;
                  }).map(([modulo, payments]: [string, any]) => {
                    const moduleValidated = payments.filter((p: any) => p.status === 'aprovado' || p.status === 'rejeitado');
                    if (moduleValidated.length === 0) return null;
                    
                    return (
                      <div key={`validated-${modulo}`} className="report-group" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                          <FileText size={16} color="var(--primary)" />
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {modulo} <small style={{ fontWeight: 400, opacity: 0.6 }}>({moduleValidated.length} consolidados)</small>
                          </h3>
                        </div>
                        {renderTable(moduleValidated, false)}
                      </div>
                    );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinanceReport;
