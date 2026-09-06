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
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { isStaffStudentProxy } from '../../../lib/authUtils';

interface AcademicHistoryProps {
  data: any[];
  searchTerm: string;
  onDelete?: (id: string) => Promise<void>;
  onUpdateStatus?: (userId: string, newType: string) => Promise<void>;
  allStudents?: any[];
  onCorrect?: (id: string) => void;
}

const STUDENT_TYPES = ['presencial', 'online', 'ex_aluno'];

const AcademicHistory: React.FC<AcademicHistoryProps> = ({ data, searchTerm, onDelete, onUpdateStatus, allStudents, onCorrect }) => {
  const [selectedNucleus, setSelectedNucleus] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

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

    // Inclui staff que também são alunos (escopo 'aluno'/'estudante') mesmo sem histórico
    const proxyUsers = (allStudents || []).filter(s => isStaffStudentProxy(s));
    proxyUsers.forEach(adminUser => {
      if (!term || adminUser.nome?.toLowerCase().includes(term) || adminUser.email?.toLowerCase().includes(term)) {
        const nucName = adminUser.nucleos?.nome || 'Administração';
        const studentId = adminUser.id;
        if (!groups[nucName]) groups[nucName] = {};
        groups[nucName][studentId] = {
          name: adminUser.nome,
          email: adminUser.email,
          tipo: adminUser.tipo,
          nucleo: nucName,
          modulos: {},
          stats: {
            finishedBasic: new Set<string>(),
            finishedMedium: new Set<string>(),
            hasManual: false
          }
        };
      }
    });

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
          nucleo: nucName,
          modulos: {},
          stats: {
            finishedBasic: new Set<string>(),
            finishedMedium: new Set<string>(),
            hasManual: false
          }
        };
      }

      if (item.is_manual) {
        groups[nucName][studentId].stats.hasManual = true;
      }
      if (!groups[nucName][studentId].modulos[modName]) {
        groups[nucName][studentId].modulos[modName] = { atividades: [], provas: [] };
      }

      if (isExam) {
        groups[nucName][studentId].modulos[modName].provas.push(item);

        // Contabilizar para requisitos de formatura
        const minGrade = item.aulas?.min_grade || 7.0;
        if (item.status === 'corrigida' && (item.nota || 0) >= minGrade) {
          const nivel = (item.aulas?.livros?.cursos?.nivel || '').toLowerCase();
          const bookId = item.aulas?.livros?.id;
          if (bookId) {
            if (nivel.includes('basico') || nivel.includes('básico') || nivel === '') {
              groups[nucName][studentId].stats.finishedBasic.add(bookId);
            } else if (nivel.includes('medio') || nivel.includes('médio')) {
              groups[nucName][studentId].stats.finishedMedium.add(bookId);
            }
          }
        }
      } else {
        groups[nucName][studentId].modulos[modName].atividades.push(item);
      }
    });

    return groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchTerm]);

  // Opções de núcleo: alunos cadastrados + núcleos presentes no histórico
  const nucleoOptions = useMemo(() => {
    const names = new Set<string>();
    (allStudents || []).forEach(s => { if (s.nucleos?.nome) names.add(s.nucleos.nome); });
    Object.keys(hierarchicalData).forEach(n => {
      if (n !== 'Geral / Sem Núcleo' && n !== 'Administração') names.add(n);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allStudents, hierarchicalData]);

  // Lista de alunos do núcleo selecionado, em ordem alfabética.
  // Inclui alunos sem registros (o histórico abre vazio para eles).
  const studentList = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const byId: Record<string, any> = {};
    (allStudents || []).forEach(s => { byId[s.id] = s; });

    // Alunos que só aparecem no histórico (não vieram em allStudents)
    Object.entries(hierarchicalData).forEach(([nucName, students]: [string, any]) => {
      Object.entries(students).forEach(([id, std]: [string, any]) => {
        if (!byId[id]) {
          byId[id] = { id, nome: std.name, email: std.email, tipo: std.tipo, nucleos: { nome: nucName === 'Geral / Sem Núcleo' ? null : nucName } };
        }
      });
    });

    let list = Object.values(byId).filter(s => STUDENT_TYPES.includes(s.tipo) || isStaffStudentProxy(s));
    if (selectedNucleus) list = list.filter(s => (s.nucleos?.nome || 'Geral / Sem Núcleo') === selectedNucleus);
    if (term) list = list.filter(s => s.nome?.toLowerCase().includes(term) || s.email?.toLowerCase().includes(term));
    return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStudents, hierarchicalData, selectedNucleus, searchTerm]);

  // Dados do aluno selecionado (do agrupamento, com fallback para o cadastro)
  const selectedStudentData = useMemo(() => {
    if (!selectedStudent) return null;
    for (const [nucName, students] of Object.entries(hierarchicalData)) {
      if ((students as any)[selectedStudent]) {
        return { nucName, std: (students as any)[selectedStudent] };
      }
    }
    const u = (allStudents || []).find(s => s.id === selectedStudent);
    if (u) {
      return {
        nucName: u.nucleos?.nome || 'Geral / Sem Núcleo',
        std: {
          name: u.nome,
          email: u.email,
          tipo: u.tipo,
          nucleo: u.nucleos?.nome,
          modulos: {},
          stats: { finishedBasic: new Set<string>(), finishedMedium: new Set<string>(), hasManual: false }
        }
      };
    }
    return null;
  }, [selectedStudent, hierarchicalData, allStudents]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)', padding: '12px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)' }}>
            <GraduationCap size={28} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Histórico Consolidado</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
              Selecione o núcleo, depois o aluno, para abrir o histórico
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportToCSV} style={{ gap: '0.6rem', width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
          <Download size={18} /> Exportar Relatório
        </button>
      </div>

      {/* FILTRO POR NÚCLEO */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} color="var(--primary)" />
          <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Núcleo:</strong>
        </div>
        <select
          value={selectedNucleus || ''}
          onChange={e => { setSelectedNucleus(e.target.value || null); setSelectedStudent(null); }}
          style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--glass)', border: '1px solid var(--glass-border)', fontWeight: 700, minWidth: '260px', color: 'var(--text-main)', fontSize: '0.95rem' }}
        >
          <option value="">Todos os núcleos</option>
          {nucleoOptions.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          {studentList.length} aluno(s)
        </span>
      </div>

      {selectedStudentData ? (
        /* HISTÓRICO DO ALUNO SELECIONADO */
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.01)',
          borderRadius: '24px',
          border: '1px solid var(--glass-border)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <button
            onClick={() => setSelectedStudent(null)}
            className="btn btn-outline"
            style={{ width: 'auto', padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <ChevronLeft size={16} /> Voltar à lista de alunos
          </button>

          {/* HEADER DO ALUNO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(var(--primary-rgb), 0.25)' }}>
                <User size={26} color={selectedStudentData.std.tipo === 'ex_aluno' ? '#EAB308' : 'var(--primary)'} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>{selectedStudentData.std.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>— {selectedStudentData.nucName}</span>
                  {selectedStudentData.std.stats.hasManual && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', background: '#a855f7', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                      HISTÓRICO ALTERADO
                    </span>
                  )}
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedStudentData.std.email} •
                  <span style={{ color: selectedStudentData.std.tipo === 'ex_aluno' ? '#EAB308' : 'var(--success)', fontWeight: 700 }}>
                    {selectedStudentData.std.tipo === 'ex_aluno' ? 'ALUNO FORMADO' : 'ALUNO ATIVO'}
                  </span>
                  {(() => {
                    const basicCount = selectedStudentData.std.stats.finishedBasic.size;
                    const mediumCount = selectedStudentData.std.stats.finishedMedium.size;
                    const isMarkedGraduated = selectedStudentData.std.tipo === 'ex_aluno';
                    const meetsRequirement = basicCount >= 27 || mediumCount >= 8;

                    if (isMarkedGraduated && !meetsRequirement) {
                      return (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          marginLeft: '0.5rem'
                        }}>
                          ⚠️ PENDENTE: {basicCount}/27 Módulos
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {(() => {
                const basicCount = selectedStudentData.std.stats.finishedBasic.size;
                const mediumCount = selectedStudentData.std.stats.finishedMedium.size;
                const isMarkedGraduated = selectedStudentData.std.tipo === 'ex_aluno';
                const meetsRequirement = basicCount >= 27 || mediumCount >= 8;

                if (isMarkedGraduated && !meetsRequirement && onUpdateStatus) {
                  return (
                    <button
                      onClick={() => {
                        if (window.confirm(`Deseja corrigir o status de ${selectedStudentData.std.name} para 'Aluno Ativo'? Este aluno ainda não completou os requisitos.`)) {
                          onUpdateStatus(selectedStudent || '', 'aluno');
                        }
                      }}
                      className="nav-btn-premium"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        fontSize: '0.75rem',
                        padding: '0.5rem 0.75rem'
                      }}
                    >
                      Corrigir Status
                    </button>
                  );
                }
                return null;
              })()}

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Módulos em curso</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{Object.keys(selectedStudentData.std.modulos).length}</div>
              </div>
            </div>
          </div>

          {/* CONTEÚDO DO HISTÓRICO */}
          {Object.keys(selectedStudentData.std.modulos).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed var(--glass-border)' }}>
              <Search size={36} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <h4 style={{ opacity: 0.6, margin: 0 }}>Sem registros no histórico</h4>
              <p style={{ opacity: 0.4, fontSize: '0.85rem', margin: '0.5rem auto 0', maxWidth: '380px' }}>
                Este aluno ainda não realizou atividades ou provas na plataforma.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(selectedStudentData.std.modulos).map(([modName, content]: [string, any]) => (
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
                            position: 'relative'
                          }} className="activity-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, paddingRight: '2rem' }}>{item.aulas?.titulo}</div>
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
                                {item.nota === null && onCorrect && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCorrect(item.id);
                                    }}
                                    style={{ background: 'rgba(59, 130, 246, 0.15)', border: 'none', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                                  >
                                    Corrigir
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDelete(e, item.id)}
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}
                                  title="Excluir Atividade"
                                >
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
                              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#f59e0b', paddingRight: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {item.aulas?.titulo}
                                {item.is_manual && (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', background: '#a855f7', padding: '1px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>MANUAL</span>
                                )}
                              </div>
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
                                {item.nota === null && onCorrect && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCorrect(item.id);
                                    }}
                                    style={{ background: 'rgba(59, 130, 246, 0.2)', border: 'none', color: '#60a5fa', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem', fontWeight: 800 }}
                                  >
                                    Corrigir
                                  </button>
                                )}
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
        </section>
      ) : (
        /* LISTA DE ALUNOS (ORDEM ALFABÉTICA) */
        studentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
            <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
            <h3 style={{ opacity: 0.5 }}>Nenhum aluno localizado</h3>
            <p style={{ opacity: 0.3, maxWidth: '400px', margin: '0.5rem auto' }}>Tente ajustar os filtros de busca ou verifique se há alunos vinculados.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {studentList.map(s => {
              const hist = hierarchicalData[s.nucleos?.nome || 'Geral / Sem Núcleo']?.[s.id];
              const modCount = hist ? Object.keys(hist.modulos).length : 0;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                      <User size={20} color={s.tipo === 'ex_aluno' ? '#EAB308' : 'var(--primary)'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.email} • {s.nucleos?.nome || 'Sem núcleo'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: modCount > 0 ? 'var(--primary)' : 'var(--text-muted)', opacity: modCount > 0 ? 1 : 0.5 }}>
                      {modCount > 0 ? `${modCount} módulo(s)` : 'sem registros'}
                    </span>
                    <ChevronRight size={18} opacity={0.5} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default AcademicHistory;
