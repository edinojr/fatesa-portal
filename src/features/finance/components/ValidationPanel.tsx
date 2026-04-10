import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  Mail, 
  MapPin, 
  FileText, 
  CreditCard, 
  Eye, 
  ChevronLeft,
  Calendar,
  FileCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface ValidationPanelProps {
  pendingDocs: any[];
  pendingPays: any[];
  handleValidar: (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado', modulo?: string) => Promise<void>;
  handleDeleteValidation: (target: 'doc' | 'pay', id: string) => Promise<void>;
  actionLoading: string | null;
}

const labelMap: Record<string, string> = {
  'cpf': 'CPF',
  'rg': 'RG / Identidade',
  'diploma': 'Diploma de Graduação',
  'historico': 'Histórico Escolar',
  'comprovante_residencia': 'Comprovante de Residência',
  'foto': 'Foto 3x4 / Perfil',
  'titulo': 'Título de Eleitor',
  'reservista': 'Certificado de Reservista',
  'certidao_nascimento': 'Certidão de Nascimento/Casamento'
};

const modulos = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const ValidationPanel: React.FC<ValidationPanelProps> = ({ 
  pendingDocs = [], 
  pendingPays = [], 
  handleValidar, 
  handleDeleteValidation,
  actionLoading
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') === 'docs' ? 'docs' : 'pays') as 'docs' | 'pays';
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedModulos, setSelectedModulos] = useState<Record<string, string>>({});

  // Agrupar documentos e pagamentos por usuário para o Dossiê
  const groupedStudents = useMemo(() => {
    const students: Record<string, any> = {};

    pendingDocs.forEach(doc => {
      if (!students[doc.user_id]) {
        students[doc.user_id] = {
          user_id: doc.user_id,
          nome: doc.users?.nome || 'Usuário Desconhecido',
          email: doc.users?.email || '',
          nucleo: doc.users?.nucleos?.nome || doc.users?.nucleo,
          docs: [],
          pays: []
        };
      }
      students[doc.user_id].docs.push(doc);
    });

    pendingPays.forEach(pay => {
      if (!students[pay.user_id]) {
        students[pay.user_id] = {
          user_id: pay.user_id,
          nome: pay.users?.nome || 'Usuário Desconhecido',
          email: pay.users?.email || '',
          nucleo: pay.users?.nucleos?.nome || pay.users?.nucleo,
          docs: [],
          pays: []
        };
      }
      students[pay.user_id].pays.push(pay);
    });

    return Object.values(students);
  }, [pendingDocs, pendingPays]);

  const filteredStudents = useMemo(() => {
    if (activeView === 'docs') {
      return groupedStudents.filter(s => s.docs.length > 0);
    }
    return groupedStudents.filter(s => s.pays.length > 0);
  }, [groupedStudents, activeView]);

  const selectedStudent = groupedStudents.find(s => s.user_id === selectedUserId);

  useEffect(() => {
    if (selectedUserId && !groupedStudents.find(s => s.user_id === selectedUserId)) {
      setSelectedUserId(null);
    }
  }, [groupedStudents, selectedUserId]);

  if (selectedUserId) {
    if (!selectedStudent) {
      return (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--error)', marginBottom: '1.5rem' }} />
          <h3>Estudante não encontrado</h3>
          <button className="btn btn-primary" style={{ width: 'auto', marginTop: '1.5rem' }} onClick={() => setSelectedUserId(null)}>
            Voltar para Lista
          </button>
        </div>
      );
    }

    return (
      <div className="validation-dossier transition-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Cabecalho Voltar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setSelectedUserId(null)} style={{ border: 'none', background: 'var(--glass)', padding: '0.5rem 1rem', width: 'auto' }}>
            <ChevronLeft size={20} /> Voltar para Lista
          </button>
        </div>

        {/* Informações do Estudante */}
        <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={32} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Dossiê: {selectedStudent.nome}</h2>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><Mail size={14} /> {selectedStudent.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><MapPin size={14} /> {selectedStudent.nucleo || 'Sem Núcleo'}</span>
            </div>
          </div>
        </div>

        {/* Documentos */}
        {selectedStudent.docs.length > 0 && (
          <section className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem' }}>
              <FileText color="var(--primary)" /> Verificação de Identidade e Requisitos
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tipo / Requisito</th>
                  <th>Visualizar Arquivo</th>
                  <th style={{ textAlign: 'right' }}>Veredito</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudent.docs.map((doc: any) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="admin-badge" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)', padding: '6px 12px', fontSize: '0.85rem' }}>
                        {labelMap[doc.tipo] || doc.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-outline" 
                        style={{ display: 'inline-flex', width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        <Eye size={16} /> Abrir Documento
                      </a>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleValidar('doc', doc.id, 'aprovado')} 
                          disabled={actionLoading === doc.id}
                          title="Aprovar Documento"
                          style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem' }}
                        >
                          <CheckCircle2 size={16} /> Aprovar
                        </button>
                        <button 
                          className="btn" 
                          style={{ background: 'var(--error)', color: '#fff', padding: '0.5rem', width: '40px' }} 
                          onClick={() => handleValidar('doc', doc.id, 'rejeitado')} 
                          disabled={actionLoading === doc.id}
                          title="Recusar Documento"
                        >
                          <XCircle size={16} />
                        </button>
                        <button 
                          className="btn btn-icon" 
                          style={{ background: 'var(--glass)', color: 'var(--error)', width: '40px', height: '40px' }} 
                          onClick={() => {
                            if (window.confirm('Excluir este documento permanentemente?')) {
                              handleDeleteValidation('doc', doc.id)
                            }
                          }} 
                          disabled={actionLoading === doc.id}
                          title="Excluir Registro de Documento Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Financeiro */}
        {selectedStudent.pays.length > 0 && (
          <section className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem' }}>
              <CreditCard color="#10b981" /> Histórico de Pagamentos e Comprovantes
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Módulo Liberação</th>
                  <th>Comprovante Submetido</th>
                  <th style={{ textAlign: 'right' }}>Homologação (Depto. Financeiro)</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudent.pays.map((pay: any) => (
                  <tr key={pay.id}>
                    <td><div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>R$ {pay.valor.toFixed(2)}</div></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                        <Calendar size={14} /> {new Date(pay.data_vencimento).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Liberar Mod.</span>
                        <select 
                          value={selectedModulos[pay.id] || '1'} 
                          onChange={(e) => setSelectedModulos({ ...selectedModulos, [pay.id]: e.target.value })}
                          style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid var(--glass-border)', 
                            color: '#fff', 
                            padding: '4px 8px', 
                            borderRadius: '6px',
                            fontSize: '0.85rem'
                          }}
                        >
                          {modulos.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      {pay.comprovante_url ? (
                        <a 
                          href={pay.comprovante_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-outline" 
                          style={{ display: 'inline-flex', width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          <FileCheck size={16} /> Ver Recibo / Comprovante
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--warning)', opacity: 0.8 }}>Sem arquivo / Manual</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button 
                          className="btn" 
                          style={{ background: '#10b981', color: '#fff', display: 'flex', gap: '0.4rem', padding: '0.5rem 1rem', fontWeight: 700 }}
                          onClick={() => handleValidar('pay', pay.id, 'aprovado', selectedModulos[pay.id] || '1')} 
                          disabled={actionLoading === pay.id}
                        >
                          <CheckCircle2 size={16} /> HOMOLOGAR PAGAMENTO
                        </button>
                        
                        <button 
                          className="btn btn-outline" 
                          style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '0.5rem 1rem' }} 
                          onClick={() => handleValidar('pay', pay.id, 'rejeitado')} 
                          disabled={actionLoading === pay.id}
                          title="Rejeitar Comprovante"
                        >
                          Recusar
                        </button>

                        <button 
                          className="btn btn-icon" 
                          style={{ background: 'var(--glass)', color: 'var(--error)', width: '38px', height: '38px' }} 
                          onClick={() => {
                            if (window.confirm('Excluir este registro de pagamento permanentemente?')) {
                              handleDeleteValidation('pay', pay.id)
                            }
                          }} 
                          disabled={actionLoading === pay.id}
                          title="Excluir Registro de Pagamento Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="validation-panel-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Abas de Navegação Interna */}
      <div style={{ display: 'flex', background: 'var(--glass)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)', width: 'fit-content' }}>
        <button 
          className={`nav-btn-premium ${activeView === 'pays' ? 'active' : ''}`}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('view', 'pays');
            setSearchParams(params);
          }}
          style={{ border: 'none', background: activeView === 'pays' ? 'var(--primary)' : 'transparent', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <CreditCard size={16} /> Pagamentos ({pendingPays.length})
        </button>
        <button 
          className={`nav-btn-premium ${activeView === 'docs' ? 'active' : ''}`}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('view', 'docs');
            setSearchParams(params);
          }}
          style={{ border: 'none', background: activeView === 'docs' ? 'var(--primary)' : 'transparent', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <FileText size={16} /> Documentos ({pendingDocs.length})
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidato / Aluno</th>
              <th style={{ textAlign: 'center' }}>Documentos</th>
              <th style={{ textAlign: 'center' }}>Pagamentos</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle2 size={48} opacity={0.3} />
                    <p>Excelente! Nenhum {activeView === 'pays' ? 'pagamento' : 'documento'} aguardando validação no momento.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.user_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{student.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {student.docs.length > 0 ? (
                      <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
                        {student.docs.length} docs
                      </span>
                    ) : (
                      <span style={{ opacity: 0.3 }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {student.pays.length > 0 ? (
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
                        {student.pays.length} faturas
                      </span>
                    ) : (
                      <span style={{ opacity: 0.3 }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1.25rem', width: 'auto' }}
                      onClick={() => setSelectedUserId(student.user_id)}
                    >
                      Abrir Dossiê
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValidationPanel;
