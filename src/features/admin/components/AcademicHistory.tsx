import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download,
  User,
  MapPin,
  GraduationCap
} from 'lucide-react';

interface AcademicHistoryProps {
  data: any[];
  searchTerm: string;
}

const AcademicHistory: React.FC<AcademicHistoryProps> = ({ data, searchTerm }) => {
  // Filter data based on search term (name, nucleus, or module)
  const filteredData = data.filter(item => 
    item.users?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.users?.nucleos?.nome || 'N/A').toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.aulas?.livros?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.aulas?.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Aluno', 'Email', 'Núcleo', 'Livro/Módulo', 'Atividade/Bloco', 'Nota', 'Data Correção'];
    const rows = filteredData.map(item => [
      item.users?.nome || 'N/A',
      item.users?.email || 'N/A',
      item.users?.nucleos?.nome || 'Sem Núcleo',
      item.aulas?.livros?.titulo || 'N/A',
      item.aulas?.titulo || 'N/A',
      item.nota?.toFixed(1) || '0.0',
      item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_academico_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="academic-history-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '10px', borderRadius: '12px' }}>
            <GraduationCap size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Histórico Acadêmico</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {filteredData.length} registros de avaliações concluídas
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.5rem', width: 'auto' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Núcleo</th>
              <th>Módulo / Bloco</th>
              <th style={{ textAlign: 'center' }}>Nota Final</th>
              <th style={{ textAlign: 'right' }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                  <div>Nenhum registro encontrado no histórico.</div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: '0.95rem' }}>{item.users?.nome}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{item.users?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <MapPin size={14} opacity={0.5} />
                      {item.users?.nucleos?.nome || 'Sem Núcleo'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.aulas?.livros?.titulo || 'Módulo'}</div>
                      <div style={{ opacity: 0.7 }}>{item.aulas?.titulo}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      background: item.nota >= 7 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.nota >= 7 ? '#10b981' : '#ef4444',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}>
                      {item.nota?.toFixed(1)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.85rem', opacity: 0.6 }}>
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '---'}
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

export default AcademicHistory;
