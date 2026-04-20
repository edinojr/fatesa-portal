import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileText, CheckCircle, XCircle, Search, Eye, AlertCircle } from 'lucide-react';

interface DocumentInfo {
  id: string;
  tipo: string;
  url: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  created_at: string;
  observacao?: string;
}

interface StudentWithDocs {
  id: string;
  nome: string;
  email: string;
  documentos: DocumentInfo[];
}

const DocumentAnalysis: React.FC = () => {
  const [students, setStudents] = useState<StudentWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDocs | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Busca todos os documentos
      const { data: docs, error: docsError } = await supabase
        .from('documentos')
        .select('*, users:user_id(id, nome, email)')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Agrupa documentos por aluno
      const studentsMap = new Map<string, StudentWithDocs>();

      (docs || []).forEach((doc: any) => {
        if (!doc.users) return;
        
        if (!studentsMap.has(doc.user_id)) {
          studentsMap.set(doc.user_id, {
            id: doc.user_id,
            nome: doc.users.nome,
            email: doc.users.email,
            documentos: []
          });
        }
        
        studentsMap.get(doc.user_id)!.documentos.push({
          id: doc.id,
          tipo: doc.tipo,
          url: doc.url,
          status: doc.status || 'pendente',
          created_at: doc.created_at,
          observacao: doc.observacao
        });
      });

      setStudents(Array.from(studentsMap.values()));
    } catch (err) {
      console.error('Erro ao buscar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpdateStatus = async (docId: string, novoStatus: 'aprovado' | 'recusado', obs?: string) => {
    try {
      const { error } = await supabase
        .from('documentos')
        .update({ status: novoStatus, observacao: obs || null })
        .eq('id', docId);

      if (error) throw error;
      
      // Atualiza a lista local
      await fetchDocuments();
      
      // Se tiver um aluno selecionado, atualiza ele também para refletir no painel lateral
      if (selectedStudent) {
        const updatedStudent = students.find(s => s.id === selectedStudent.id);
        // a nova lista de students só estará pronta no próximo render, mas fetchDocuments já a setou.
        // Faremos um refetch completo no modal
      }

    } catch (err) {
      console.error('Erro ao atualizar status do documento:', err);
      alert('Erro ao atualizar. Tente novamente.');
    }
  };

  const filteredStudents = students.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="data-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText color="var(--primary)" /> Análise de Documentos
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie e valide a documentação enviada pelos alunos.</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Buscar aluno por nome ou e-mail..." 
          className="form-control"
          style={{ paddingLeft: '3rem' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Carregando documentos...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1fr 1fr' : '1fr', gap: '2rem' }}>
          
          {/* Lista de Alunos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                Nenhum documento encontrado.
              </div>
            ) : (
              filteredStudents.map(student => {
                const pendentes = student.documentos.filter(d => d.status === 'pendente').length;
                
                return (
                  <div 
                    key={student.id} 
                    style={{ 
                      padding: '1.5rem', 
                      background: selectedStudent?.id === student.id ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '16px', 
                      border: selectedStudent?.id === student.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{student.nome}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{student.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                        <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}>{student.documentos.length} docs</span>
                        {pendentes > 0 && (
                          <span style={{ padding: '2px 8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderRadius: '6px', fontWeight: 700 }}>{pendentes} pends</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Painel de Análise do Aluno Selecionado */}
          {selectedStudent && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Arquivo do Aluno</h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setSelectedStudent(null)}>Fechar</button>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedStudent.nome}</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{selectedStudent.email}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Find actual data from state to have fresh status */}
                {(students.find(s => s.id === selectedStudent.id)?.documentos || []).map(doc => (
                  <div key={doc.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', textTransform: 'capitalize' }}>{doc.tipo.replace('_', ' ')}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enviado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <div style={{ 
                        padding: '4px 12px', 
                        borderRadius: '50px', 
                        fontSize: '0.8rem', 
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: doc.status === 'aprovado' ? 'rgba(16, 185, 129, 0.2)' : doc.status === 'recusado' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: doc.status === 'aprovado' ? '#10b981' : doc.status === 'recusado' ? '#ef4444' : '#eab308'
                      }}>
                        {doc.status}
                      </div>
                    </div>
                    
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.6rem 1.2rem' }}>
                      <Eye size={18} /> Visualizar Documento
                    </a>

                    {doc.status === 'pendente' && (
                      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                        <button 
                          className="btn" 
                          style={{ flex: 1, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}
                          onClick={() => handleUpdateStatus(doc.id, 'aprovado')}
                        >
                          <CheckCircle size={18} /> Aprovar
                        </button>
                        <button 
                          className="btn" 
                          style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}
                          onClick={() => {
                            const obs = prompt('Motivo da recusa (opcional):');
                            if (obs !== null) handleUpdateStatus(doc.id, 'recusado', obs);
                          }}
                        >
                          <XCircle size={18} /> Recusar
                        </button>
                      </div>
                    )}

                    {doc.observacao && doc.status === 'recusado' && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#ef4444' }}>Motivo da Recusa:</strong> {doc.observacao}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentAnalysis;
