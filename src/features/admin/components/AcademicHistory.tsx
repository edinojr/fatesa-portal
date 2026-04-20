import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Download,
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AcademicHistoryProps {
  data: any[];
  searchTerm: string;
  onDelete?: (id: string) => Promise<void>;
  allStudents?: any[];
}

const AcademicHistory: React.FC<AcademicHistoryProps> = ({ data, searchTerm, onDelete, allStudents }) => {
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const toggleStudent = (id: string) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este registro permanentemente?')) {
      if (onDelete) await onDelete(id);
    }
  };

  // Deep Hierarchy Logic
  const hierarchicalData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    // 1. Initial Filtering
    const filtered = data.filter(item => {
      return (
        item.users?.nome?.toLowerCase().includes(term) ||
        (item.users?.nucleos?.nome || 'N/A').toLowerCase().includes(term) ||
        item.aulas?.livros?.titulo?.toLowerCase().includes(term) ||
        item.aulas?.titulo?.toLowerCase().includes(term)
      );
    });

    // 2. Grouping: Nucleo -> Aluno -> Modulo -> Type
    const groups: Record<string, any> = {};

    // Ensure the admin edi.ben.jr@gmail.com is included if search matches or no search
    const adminUser = (allStudents || []).find(s => s.email === 'edi.ben.jr@gmail.com');
    if (adminUser && (!term || adminUser.nome?.toLowerCase().includes(term) || adminUser.email?.toLowerCase().includes(term))) {
       const nucName = adminUser.nucleos?.nome || 'Administração';
       const studentId = adminUser.id;
       if (!groups[nucName]) groups[nucName] = {};
       groups[nucName][studentId] = {
         name: adminUser.nome,
         email: adminUser.email,
         tipo: adminUser.tipo,
         modulos: {}
       };
    }

    filtered.forEach(item => {
      const nucName = item.users?.nucleos?.nome || 'Geral / Sem Núcleo';
      const studentId = item.users?.id || 'unknown';
      const studentName = item.users?.nome || 'Aluno Desconhecido';
      const modName = item.aulas?.livros?.titulo || 'Módulo Geral';
      const isExam = item.aulas?.is_bloco_final || item.aulas?.tipo === 'prova';

      if (!groups[nucName]) groups[nucName] = {};
      if (!groups[nucName][studentId]) {
        groups[nucName][studentId] = {
          name: studentName,
          email: item.users?.email,
          tipo: item.users?.tipo,
          modulos: {}
        };
      }
      if (!groups[nucName][studentId].modulos[modName]) {
        groups[nucName][studentId].modulos[modName] = { atividades: [], provas: [] };
      }

      if (isExam) {
        groups[nucName][studentId].modulos[modName].provas.push(item);
      } else {
        groups[nucName][studentId].modulos[modName].atividades.push(item);
      }
    });

    return groups;
  }, [data, searchTerm]);

  const exportToCSV = () => {
    const headers = ['Aluno', 'Email', 'Núcleo', 'Livro/Módulo', 'Atividade/Bloco', 'Nota', 'Data'];
    const rows: string[][] = [];

    Object.entries(hierarchicalData).forEach(([nuc, students]) => {
      Object.values(students).forEach((std: any) => {
        Object.entries(std.modulos).forEach(([mod, content]: [string, any]) => {
          [...content.atividades, ...content.provas].forEach(item => {
            rows.push([
              std.name,
              std.email || 'N/A',
              nuc,
              mod,
              item.aulas?.titulo || 'N/A',
              item.nota !== null ? item.nota.toFixed(1) : 'Pendente',
              new Date(item.updated_at || item.created_at).toLocaleDateString()
            ]);
          });
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_detalhado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="academic-history-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)', padding: '12px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)' }}>
            <GraduationCap size={28} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Histórico Consolidado</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
              Visão hierárquica por Núcleo e Desempenho do Aluno
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.6rem', width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
          <Download size={18} /> Exportar Relatório
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {Object.keys(hierarchicalData).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
            <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
            <h3 style={{ opacity: 0.5 }}>Nenhum registro localizado</h3>
            <p style={{ opacity: 0.3, maxWidth: '400px', margin: '0.5rem auto' }}>Tente ajustar os filtros de busca ou verifique se há alunos vinculados.</p>
          </div>
        ) : (
          Object.entries(hierarchicalData).sort().map(([nucName, students]) => (
            <section key={nucName} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(var(--primary-rgb), 0.1)', width: 'fit-content', borderRadius: '10px', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                <MapPin size={16} color="var(--primary)" />
                <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>{nucName}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {Object.entries(students).map(([stdId, std]: [string, any]) => (
                  <div key={stdId} className="card" style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: '20px', 
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* STUDENT HEADER */}
                    <div 
                      onClick={() => toggleStudent(stdId)}
                      style={{ 
                        padding: '1.25rem 1.5rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        background: expandedStudents[stdId] ? 'rgba(255,255,255,0.03)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                          <User size={24} color={std.tipo === 'ex_aluno' ? '#EAB308' : 'var(--primary)'} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{std.name}</h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{std.email} • <span style={{ color: std.tipo === 'ex_aluno' ? '#EAB308' : 'var(--success)' }}>{std.tipo === 'ex_aluno' ? 'ALUNO FORMADO' : 'ALUNO ATIVO'}</span></div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Módulos em curso</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{Object.keys(std.modulos).length}</div>
                        </div>
                        {expandedStudents[stdId] ? <ChevronUp size={20} opacity={0.5} /> : <ChevronDown size={20} opacity={0.5} />}
                      </div>
                    </div>

                    {/* STUDENT CONTENT (MODULOS) */}
                    {expandedStudents[stdId] && (
                      <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideDown 0.3s ease-out' }}>
                        {Object.entries(std.modulos).map(([modName, content]: [string, any]) => (
                          <div key={modName} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h5 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <BookOpen size={18} /> {modName}
                            </h5>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                              {/* EXERCICIOS SECTION */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <ClipboardList size={14} /> Exercícios ({content.atividades.length})
                                </div>
                                {content.atividades.length === 0 ? (
                                  <div style={{ fontSize: '0.8rem', opacity: 0.3, fontStyle: 'italic', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>Nenhum exercício registrado</div>
                                ) : (
                                  content.atividades.map((item: any) => (
                                    <div key={item.id} style={{ 
                                      background: 'rgba(59, 130, 246, 0.05)', 
                                      padding: '1rem', 
                                      borderRadius: '14px', 
                                      border: '1px solid rgba(59, 130, 246, 0.1)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.5rem',
                                      position: 'relative',
                                      group: 'true'
                                    }} className="activity-card">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.4, paddingRight: '2rem' }}>{item.aulas?.titulo}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                          <div style={{ 
                                            fontSize: '0.8rem', 
                                            fontWeight: 900, 
                                            color: item.nota !== null ? (item.nota >= 7 ? 'var(--success)' : 'var(--error)') : '#eab308',
                                            background: item.nota !== null ? (item.nota >= 7 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(234, 179, 8, 0.1)',
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                          }}>
                                            {item.nota !== null ? item.nota.toFixed(1) : 'PENDENTE'}
                                          </div>
                                          <button 
                                            onClick={(e) => handleDelete(e, item.id)}
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}
                                            title="Excluir Atividade"
                                          >
                                            <Search size={14} style={{ display: 'none' }} /> {/* dummy to avoid lucide issues if any */}
                                            <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </div>
                                          </button>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 600 }}>Realizado em: {new Date(item.created_at).toLocaleDateString()}</div>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* PROVAS SECTION */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <ShieldCheck size={14} /> Provas Finais ({content.provas.length})
                                </div>
                                {content.provas.length === 0 ? (
                                  <div style={{ fontSize: '0.8rem', opacity: 0.3, fontStyle: 'italic', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>Nenhuma prova realizada</div>
                                ) : (
                                  content.provas.map((item: any) => (
                                    <div key={item.id} style={{ 
                                      background: 'rgba(245, 158, 11, 0.08)', 
                                      padding: '1.25rem', 
                                      borderRadius: '16px', 
                                      border: '1px solid rgba(245, 158, 11, 0.2)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.75rem',
                                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.05)',
                                      position: 'relative'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#f59e0b', paddingRight: '2rem' }}>{item.aulas?.titulo}</div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                          <div style={{ 
                                            fontSize: '1rem', 
                                            fontWeight: 950, 
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: item.nota !== null ? (item.nota >= 7 ? 'var(--success)' : 'var(--error)') : 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                          }}>
                                            {item.nota !== null ? item.nota.toFixed(1) : 'PENDENTE'}
                                          </div>
                                          <button 
                                            onClick={(e) => handleDelete(e, item.id)}
                                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ff4d4d', padding: '6px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            title="Excluir Prova"
                                          >
                                            <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </div>
                                          </button>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avaliação de Bloco</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 600 }}>{new Date(item.created_at).toLocaleDateString()}</div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default AcademicHistory;
