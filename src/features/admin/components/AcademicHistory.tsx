import React, { useMemo } from 'react';
import { 
  Search, 
  Download,
  User,
  MapPin,
  GraduationCap
} from 'lucide-react';

interface AcademicHistoryProps {
  data: any[];
  searchTerm: string;
  onDelete?: (id: string) => Promise<void>;
}

const AcademicHistory: React.FC<AcademicHistoryProps> = ({ data, searchTerm, onDelete }) => {
  const [showAllActivities, setShowAllActivities] = React.useState(true);
  // Filter and Category Logic
  const processedData = useMemo(() => {
    // 1. Initial Filtering (Term + Exam Type)
    const filtered = data.filter(item => {
      const isExam = item.aulas?.is_bloco_final || item.aulas?.tipo === 'prova';
      if (!showAllActivities && !isExam) return false;

      const term = searchTerm.toLowerCase();
      return (
        item.users?.nome?.toLowerCase().includes(term) ||
        (item.users?.nucleos?.nome || 'N/A').toLowerCase().includes(term) ||
        item.aulas?.livros?.titulo?.toLowerCase().includes(term) ||
        item.aulas?.titulo?.toLowerCase().includes(term) ||
        (item.users?.ano_graduacao || '').includes(term)
      );
    });

    // 2. Grouping Logic
    const activeGroups: Record<string, any[]> = {};
    const alumniGroups: Record<string, any[]> = {};

    filtered.forEach(item => {
      const isAlumni = item.users?.tipo === 'ex_aluno';
      
      if (isAlumni) {
        const year = item.users?.ano_graduacao || 'Ano não informado';
        if (!alumniGroups[year]) alumniGroups[year] = [];
        alumniGroups[year].push(item);
      } else {
        const nucleusName = item.users?.nucleos?.nome || 'Geral / Sem Núcleo';
        if (!activeGroups[nucleusName]) activeGroups[nucleusName] = [];
        activeGroups[nucleusName].push(item);
      }
    });

    return { activeGroups, alumniGroups };
  }, [data, searchTerm, showAllActivities]);

  const exportToCSV = () => {
    // Flatten grouped data for CSV export to maintain current behavior
    const allFiltered = [
      ...Object.values(processedData.activeGroups).flat(),
      ...Object.values(processedData.alumniGroups).flat()
    ];

    const headers = ['Aluno', 'Email', 'Status', 'Núcleo', 'Ano Graduação', 'Livro/Módulo', 'Atividade/Bloco', 'Nota', 'Data Correção'];
    const rows = allFiltered.map(item => [
      item.users?.nome || 'N/A',
      item.users?.email || 'N/A',
      item.users?.tipo === 'ex_aluno' ? 'Formado' : 'Ativo',
      item.users?.nucleos?.nome || 'Sem Núcleo',
      item.users?.ano_graduacao || '---',
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

  const renderGroupTable = (items: any[]) => (
    <div className="table-responsive" style={{ marginTop: '1rem' }}>
      <table className="admin-table mini">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Módulo / Bloco</th>
            <th style={{ textAlign: 'center' }}>Nota Final</th>
            <th style={{ textAlign: 'right' }}>Data</th>
            {onDelete && <th style={{ textAlign: 'right' }}>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={14} opacity={0.5} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.users?.nome}</span>
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.aulas?.livros?.titulo}</div>
                  <div style={{ opacity: 0.6 }}>{item.aulas?.titulo}</div>
                  {!showAllActivities && item.aulas?.tipo === 'prova' && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>PROVA</span>}
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{ 
                   padding: '2px 8px', 
                   borderRadius: '4px', 
                   background: item.nota !== null ? (item.nota >= 7 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(234, 179, 8, 0.1)',
                   color: item.nota !== null ? (item.nota >= 7 ? '#10b981' : '#ef4444') : '#eab308',
                   fontWeight: 800,
                   fontSize: '0.85rem'
                 }}>
                   {item.nota !== null ? item.nota?.toFixed(1) : 'PENDENTE'}
                 </span>
               </td>
               <td style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.5 }}>
                 {new Date(item.updated_at || item.created_at).toLocaleDateString()}
               </td>
              {onDelete && (
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn-icon" 
                    onClick={() => onDelete(item.id)}
                    style={{ color: 'var(--error)', padding: '4px' }}
                    title="Excluir Atividade"
                  >
                    <Download size={14} style={{ transform: 'rotate(180deg)' }} /> 
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="academic-history-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '10px', borderRadius: '12px' }}>
            <GraduationCap size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Histórico Acadêmico</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Notas consolidadas agrupadas por unidade
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowAllActivities(!showAllActivities)} 
            style={{ width: 'auto', gap: '0.5rem', background: showAllActivities ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', borderColor: showAllActivities ? 'var(--primary)' : 'var(--glass-border)' }}
          >
            {showAllActivities ? 'Ocultar Exercícios' : 'Mostrar Tudo (Exercícios)'}
          </button>
          <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.5rem', width: 'auto' }}>
            <Download size={18} /> Exportar Geral
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* GRUPOS DE ALUNOS ATIVOS POR NÚCLEO */}
        {Object.keys(processedData.activeGroups).length > 0 && (
          <section>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} /> Alunos em Atividade por Núcleo
            </h3>
            <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {Object.entries(processedData.activeGroups).sort().map(([name, items]) => (
                <div key={name} className="card group-card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{name}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{items.length} registros</span>
                  </div>
                  {renderGroupTable(items)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GRUPOS DE EX-ALUNOS POR ANO */}
        {Object.keys(processedData.alumniGroups).length > 0 && (
          <section>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', color: '#EAB308', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} /> Alunos Formados (por Ano)
            </h3>
            <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {Object.entries(processedData.alumniGroups).sort(([a], [b]) => b.localeCompare(a)).map(([year, items]) => (
                <div key={year} className="card group-card" style={{ padding: '1.25rem', background: 'rgba(234, 179, 8, 0.03)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(234, 179, 8, 0.1)', paddingBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#EAB308' }}>🎓 Graduação {year}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{items.length} registros</span>
                  </div>
                  {renderGroupTable(items)}
                </div>
              ))}
            </div>
          </section>
        )}

        {Object.keys(processedData.activeGroups).length === 0 && Object.keys(processedData.alumniGroups).length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
            <Search size={48} style={{ margin: '0 auto 1rem' }} />
            <p>Nenhum registro encontrado para os critérios de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicHistory;
