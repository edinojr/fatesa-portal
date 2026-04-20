import React from 'react'
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Trash2, MapPin, Users, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react'
import { Submission } from '../../../types/professor'

interface GradingPanelProps {
  courses?: any[]
  submissions: Submission[]
  professorNucleos?: { id: string; nome: string }[]
  selectedSubmission: Submission | null
  setSelectedSubmission: (sub: Submission | null) => void
  handleSelectSubmission: (sub: Submission) => void
  deleting: string | null
  handleDeleteSubmission: (id: string) => void
  gradeInput: string
  setGradeInput: (val: string) => void
  avaliacaoComentario: string
  setAvaliacaoComentario: (val: string) => void
  questionEvaluations: Record<string, boolean>
  questionComments: Record<string, string>
  setQuestionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  toggleEvaluation: (id: string, correct: boolean) => void
  savingGrade: boolean
  handleSaveGrade: () => void
}

const GradingPanel: React.FC<GradingPanelProps> = ({
  courses = [],
  submissions,
  professorNucleos = [],
  selectedSubmission,
  setSelectedSubmission,
  handleSelectSubmission,
  deleting,
  handleDeleteSubmission,
  gradeInput,
  setGradeInput,
  avaliacaoComentario,
  setAvaliacaoComentario,
  questionEvaluations,
  questionComments,
  setQuestionComments,
  toggleEvaluation,
  savingGrade,
  handleSaveGrade
}) => {
  const [showGabaritosModal, setShowGabaritosModal] = React.useState(false);
  const [selectedNucleoFilter, setSelectedNucleoFilter] = React.useState<string>('todos');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<'pendente' | 'aprovado' | 'reprovado'>('pendente');

  const renderSubmissionCard = (sub: any) => (
    <div key={sub.submission_id} style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1.25rem', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '16px', 
      border: '1px solid rgba(255,255,255,0.05)',
      transition: 'transform 0.2s',
      cursor: 'default'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '4px 8px', borderRadius: '6px', background: !sub.lesson_id ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: !sub.lesson_id ? 'var(--error)' : 'var(--text-muted)' }}>
            {!sub.lesson_id ? '⚠️ CONTEÚDO REMOVIDO' : (activeStatusFilter === 'pendente' ? 'Pendente' : (activeStatusFilter === 'aprovado' ? 'Aprovado' : 'Reprovado'))}
          </div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: !sub.lesson_id ? 'var(--error)' : 'inherit' }}>
            {sub.lesson_title || sub.aulas?.titulo || 'Aula Inexistente'}
          </h4>
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 800 }}>V{sub.tentativas || 1}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <Users size={14} color="var(--primary)" />
          <strong style={{ color: 'var(--text)' }}>{sub.student_name || sub.users?.nome}</strong>
        </div>
        <p style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
          <AlertCircle size={10} /> {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}
          {activeStatusFilter !== 'pendente' && (
            <span style={{ marginLeft: '1rem', color: activeStatusFilter === 'aprovado' ? 'var(--success)' : 'var(--error)', fontWeight: 800 }}>
              • NOTA: {sub.nota?.toFixed(1) || '0.0'}
            </span>
          )}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
        <button 
          className="btn btn-primary" 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', background: activeStatusFilter !== 'pendente' ? 'rgba(255,255,255,0.1)' : 'var(--primary)', color: '#fff' }} 
          onClick={() => handleSelectSubmission(sub)}
        >
          {activeStatusFilter === 'pendente' ? 'Corrigir' : 'Revisar'}
        </button>
        <button 
          className="btn btn-icon" 
          style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', width: '38px', height: '38px' }}
          onClick={() => handleDeleteSubmission(sub.submission_id)}
          disabled={deleting === sub.submission_id}
          title="Excluir submissão"
        >
          {deleting === sub.submission_id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      {!selectedSubmission ? (
        <div className="data-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle color="var(--primary)" /> Correção de Provas</h3>
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setShowGabaritosModal(true)}
            >
              📖 Ver Gabaritos
            </button>
          </div>

          {/* ESTATÍSTICA DE AVALIAÇÕES POR NÚCLEO (CARDS) */}
            {(() => {
              const allExamsStats = submissions.filter(s => 
                (s as any).lesson_type === 'prova' || 
                (s as any).aulas?.tipo === 'prova' || 
                (s as any).is_bloco_final === true || 
                (s as any).aulas?.is_bloco_final === true
              );
              if (professorNucleos.length === 0 || allExamsStats.length === 0) return null;
             
             return (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                 {professorNucleos.map(nuc => {
                   const nucSubs = allExamsStats.filter(s => s.nucleus_name === nuc.nome || (s.users as any)?.nucleos?.nome === nuc.nome);
                   const pendentes = nucSubs.filter(s => s.status === 'pendente').length;
                   const aprovados = nucSubs.filter(s => (s.status === 'corrigida') && (s.nota || 0) >= ((s as any).aulas?.min_grade || (s as any).min_grade || 7.0)).length;
                   const reprovados = nucSubs.filter(s => (s.status === 'corrigida') && (s.nota || 0) < ((s as any).aulas?.min_grade || (s as any).min_grade || 7.0)).length;

                   return (
                     <div key={nuc.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                         <div style={{ padding: '0.4rem', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '8px', display: 'flex' }}><MapPin size={16} color="var(--primary)" /></div>
                         <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{nuc.nome}</h4>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto' }}>
                         <div 
                           onClick={() => { setSelectedNucleoFilter(nuc.nome); setActiveStatusFilter('pendente'); }}
                           style={{ flex: 1, background: selectedNucleoFilter === nuc.nome && activeStatusFilter === 'pendente' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.05)', border: `1px solid ${selectedNucleoFilter === nuc.nome && activeStatusFilter === 'pendente' ? '#eab308' : 'rgba(234, 179, 8, 0.2)'}`, padding: '0.5rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: (selectedNucleoFilter === 'todos' || selectedNucleoFilter === nuc.nome) ? 1 : 0.5 }}
                         >
                           <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#eab308' }}>{pendentes}</div>
                           <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pendente</div>
                         </div>
                         <div 
                           onClick={() => { setSelectedNucleoFilter(nuc.nome); setActiveStatusFilter('aprovado'); }}
                           style={{ flex: 1, background: selectedNucleoFilter === nuc.nome && activeStatusFilter === 'aprovado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${selectedNucleoFilter === nuc.nome && activeStatusFilter === 'aprovado' ? 'var(--success)' : 'rgba(16, 185, 129, 0.2)'}`, padding: '0.5rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: (selectedNucleoFilter === 'todos' || selectedNucleoFilter === nuc.nome) ? 1 : 0.5 }}
                         >
                           <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>{aprovados}</div>
                           <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Aprovado</div>
                         </div>
                         <div 
                           onClick={() => { setSelectedNucleoFilter(nuc.nome); setActiveStatusFilter('reprovado'); }}
                           style={{ flex: 1, background: selectedNucleoFilter === nuc.nome && activeStatusFilter === 'reprovado' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${selectedNucleoFilter === nuc.nome && activeStatusFilter === 'reprovado' ? 'var(--error)' : 'rgba(239, 68, 68, 0.2)'}`, padding: '0.5rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: (selectedNucleoFilter === 'todos' || selectedNucleoFilter === nuc.nome) ? 1 : 0.5 }}
                         >
                           <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--error)' }}>{reprovados}</div>
                           <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Reprovado</div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             );
          })()}

          {/* NUCLEUS FILTER CHIPS — shown only when professor has multiple nucleos */}
          {professorNucleos.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: '100%', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={13} /> Filtrar por Núcleo
              </div>
              <button
                onClick={() => setSelectedNucleoFilter('todos')}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '50px',
                  border: `1px solid ${selectedNucleoFilter === 'todos' ? 'var(--primary)' : 'var(--glass-border)'}`,
                  background: selectedNucleoFilter === 'todos' ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                  color: selectedNucleoFilter === 'todos' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: selectedNucleoFilter === 'todos' ? 800 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Todos os Núcleos
              </button>
              {professorNucleos.map(n => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNucleoFilter(n.nome)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '50px',
                    border: `1px solid ${selectedNucleoFilter === n.nome ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedNucleoFilter === n.nome ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                    color: selectedNucleoFilter === n.nome ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: selectedNucleoFilter === n.nome ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {n.nome}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(() => {
              const filteredSubmissions = submissions.filter(s => {
                const isProva = (s as any).lesson_type === 'prova' || (s as any).aulas?.tipo === 'prova' || (s as any).is_bloco_final === true || (s as any).aulas?.is_bloco_final === true;
                if (!isProva) return false;

                if (selectedNucleoFilter !== 'todos') {
                  const nName = s.nucleus_name || (s.users as any)?.nucleos?.nome || 'Sem Polo';
                  if (nName !== selectedNucleoFilter) return false;
                }

                const minGrade = (s as any).aulas?.min_grade || (s as any).min_grade || 7.0;
                
                if (activeStatusFilter === 'pendente') return s.status === 'pendente';
                if (activeStatusFilter === 'aprovado') return (s.status === 'corrigida') && (s.nota || 0) >= minGrade;
                if (activeStatusFilter === 'reprovado') return (s.status === 'corrigida') && (s.nota || 0) < minGrade;
                
                return false;
              });

              if (filteredSubmissions.length === 0) {
                return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum resultado de aluno {activeStatusFilter} no filtro atual.</p>;
              }

              // 1. Group by Nucleo
              const groupedByNucleo = filteredSubmissions.reduce((acc: any, sub: any) => {
                let nucName = sub.nucleus_name || (sub.users as any)?.nucleos?.nome;
                if (!nucName || nucName === 'Sem Polo') nucName = 'Polo não identificado';
                
                if (!acc[nucName]) acc[nucName] = {};
                
                const modName = sub.book_title || 'Módulo Geral / Sem Título';
                if (!acc[nucName][modName]) acc[nucName][modName] = { provas: [] };
                
                acc[nucName][modName].provas.push(sub);
                
                return acc;
              }, {} as Record<string, Record<string, { provas: any[] }>>);

              const getNucleoColor = (name: string) => {
                if (name === 'Polo não identificado') return '#64748b';
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                  hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                return colors[Math.abs(hash) % colors.length];
              };

              return Object.keys(groupedByNucleo).sort((a, b) => {
                if (a === 'Polo não identificado') return 1;
                if (b === 'Polo não identificado') return -1;
                return a.localeCompare(b);
              }).map(nuc => {
                const color = getNucleoColor(nuc);
                const modulos = groupedByNucleo[nuc];
                
                return (
                  <div key={nuc} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '24px', border: nuc === 'Polo não identificado' ? '1px dashed var(--error)' : '1px solid var(--glass-border)' }}>
                    {/* NUCLEO HEADER */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '1rem 1.5rem', 
                      background: `${color}15`, 
                      borderRadius: '16px', 
                      borderLeft: `4px solid ${color}`,
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', color }}>{nuc}</span>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Núcleo de Ensino</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingLeft: '1rem' }}>
                      {Object.keys(modulos).sort().map(mod => (
                        <div key={mod} style={{ borderLeft: '2px dashed rgba(255,255,255,0.1)', paddingLeft: '1.5rem' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={18} /> {mod}
                          </h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* PROVAS SECTION */}
                            {modulos[mod].provas.length > 0 && (
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <ShieldCheck size={14} /> Fila de Provas ({modulos[mod].provas.length})
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                                  {modulos[mod].provas.map((sub: any) => renderSubmissionCard(sub))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="data-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="btn btn-outline" style={{ width: 'auto', marginBottom: '2rem', padding: '0.5rem 1rem' }} onClick={() => setSelectedSubmission(null)}>
            <ChevronLeft size={16} /> Voltar para Fila
          </button>

          <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: !selectedSubmission.lesson_id ? 'var(--error)' : 'inherit' }}>
                  {selectedSubmission.lesson_title || selectedSubmission.aulas?.titulo || '⚠️ Prova de Aula Removida do Cadastro'}
                </h2>
                {!selectedSubmission.lesson_id && (
                  <div style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--error)', marginBottom: '1rem', fontWeight: 600 }}>
                    Esta prova pertence a uma aula que foi deletada do sistema. Você ainda pode corrigi-la usando o JSON de respostas abaixo.
                  </div>
                )}
                <p style={{ color: 'var(--text-muted)' }}>Aluno: <strong style={{ color: '#fff' }}>{selectedSubmission.student_name || selectedSubmission.users?.nome || 'Aluno Não Localizado'}</strong></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                   <MapPin size={12} color="var(--primary)" /> {selectedSubmission.nucleus_name || (selectedSubmission.users as any)?.nucleos?.nome || 'Sem Núcleo'}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail: {selectedSubmission.student_email || selectedSubmission.users?.email}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="admin-badge status-pendente" style={{ background: selectedSubmission.tentativas > 1 ? 'var(--warning-dark)' : 'rgba(var(--primary-rgb), 0.1)' }}>
                  {selectedSubmission.tentativas || 1}ª Tentativa (V{selectedSubmission.tentativas || 1})
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            {/* 1. Render questions from the Lesson Questionnaire */}
            {Array.isArray(selectedSubmission.aulas?.questionario) ? (
              selectedSubmission.aulas.questionario.map((q: any, idx: number) => {
                const studentAnswer = selectedSubmission.respostas?.[q.id || idx];
                let displayAnswer: React.ReactNode = <em style={{ color: 'var(--text-muted)' }}>Sem resposta</em>;

                if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
                  if (q.type === 'multiple_choice' || !q.type) {
                    displayAnswer = <span><strong>Opção {parseInt(studentAnswer) + 1} selecionada:</strong> {q.options?.[studentAnswer]}</span>;
                  } else if (q.type === 'true_false') {
                    displayAnswer = <span>Marcou como: <strong style={{ color: studentAnswer ? 'var(--success)' : 'var(--error)' }}>{studentAnswer ? 'Verdadeiro' : 'Falso'}</strong></span>;
                  } else if (q.type === 'matching') {
                    const answerMap = studentAnswer as Record<string, string>;
                    displayAnswer = (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Associações Efetuadas (Correção Individual):</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '1rem', alignItems: 'center' }}>
                          {q.matchingPairs?.map((pair: any, pIdx: number) => {
                            const selectedRightIdx = answerMap[pIdx];
                            const idxNum = parseInt(selectedRightIdx);
                            const selectedRight = (!isNaN(idxNum) && q.matchingPairs?.[idxNum]) 
                              ? q.matchingPairs[idxNum].right 
                              : (selectedRightIdx && typeof selectedRightIdx === 'string' && selectedRightIdx !== '' ? selectedRightIdx : '---');
                              
                              const pairKey = `${q.id || idx}_${pIdx}`;
                              const isCorrect = questionEvaluations[pairKey] !== undefined 
                                ? questionEvaluations[pairKey] === true 
                                : String(answerMap[pIdx]) === String(pIdx);

                              return (
                                <React.Fragment key={pIdx}>
                                  <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 600, border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>{pair.left}</div>
                                  <div style={{ color: isCorrect ? 'var(--success)' : 'var(--error)', opacity: 0.8 }}>{isCorrect ? <CheckCircle size={18} /> : <span>&rarr;</span>}</div>
                                  <div style={{ padding: '0.8rem 1.2rem', background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', fontSize: '0.9rem', color: '#fff', border: isCorrect ? '1px solid var(--success)' : '1px solid var(--error)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>{selectedRight}</div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      onClick={() => toggleEvaluation(pairKey, true)}
                                      style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: questionEvaluations[pairKey] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}
                                    >V</button>
                                    <button 
                                      onClick={() => toggleEvaluation(pairKey, false)}
                                      style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: questionEvaluations[pairKey] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}
                                    >X</button>
                                  </div>
                                </React.Fragment>
                              );
                          })}
                        </div>
                      </div>
                    );
                  } else if (q.type === 'discursive') {
                    displayAnswer = <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{studentAnswer}</div>;
                  }
                }

                return (
                  <div key={q.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                      <span style={{ opacity: 0.3, marginRight: '0.5rem' }}>{idx + 1}.</span> {q.text}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Gabarito Correto</div>
                        <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
                          {q.type === 'multiple_choice' || !q.type ? (
                            q.options?.[q.correct] ? (<span><strong>Opção {parseInt(q.correct) + 1}:</strong> {q.options[q.correct]}</span>) : <span>Não definido</span>
                          ) : q.type === 'true_false' ? (
                            <strong style={{color: q.isTrue ? 'var(--success)' : 'var(--error)'}}>{q.isTrue ? 'Verdadeiro' : 'Falso'}</strong>
                          ) : q.type === 'matching' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
                              {q.matchingPairs?.map((pair: any, pIdx: number) => (
                                <React.Fragment key={pIdx}>
                                  <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'right' }}>{pair.left}</div>
                                  <div style={{ color: 'var(--primary)', opacity: 0.5 }}><ChevronRight size={14} /></div>
                                  <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: '#fff' }}>{pair.right}</div>
                                </React.Fragment>
                              ))}
                            </div>
                          ) : <p>{q.expectedAnswer || 'Avaliação manual necessária.'}</p>}
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Resposta do Aluno:</div>
                        <div style={{ fontSize: '1.05rem', color: '#fff' }}>{displayAnswer}</div>
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem', background: questionEvaluations[q.id || idx] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)' }} onClick={() => toggleEvaluation(q.id || idx, true)}>✓ Correta</button>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem', background: questionEvaluations[q.id || idx] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)' }} onClick={() => toggleEvaluation(q.id || idx, false)}>✗ Incorreta</button>
                          </div>
                          <div style={{ marginTop: '1rem' }}>
                            <textarea className="form-control" rows={2} value={questionComments[q.id || idx] || ''} onChange={(e) => setQuestionComments(p => ({ ...p, [q.id || idx]: e.target.value }))} placeholder="Justificativa para esta correção..." style={{ background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* 2. Fallback: If no questionnaire is found, show raw data so teacher can still grade */
              <div style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '1.5rem', borderRadius: '20px' }}>
                <h4 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18} /> Visualização de Dados Brutos</h4>
                <div style={{ background: '#000', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedSubmission.respostas ? Object.entries(selectedSubmission.respostas).map(([key, val]: [string, any], i) => (
                    <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>Questão/ID {key}:</div>
                      <div style={{ fontSize: '1rem', color: '#fff', whiteSpace: 'pre-wrap' }}>{typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}</div>
                    </div>
                  )) : <p>Nenhuma resposta encontrada.</p>}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Resultado Final (0 a 10)</h3>
            <input type="number" min="0" max="10" step="0.1" className="form-control" style={{ fontSize: '2rem', width: '120px', textAlign: 'center', margin: '0 auto', background: '#000' }} value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="Ex: 8.5" />
            <div style={{ marginTop: '2rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>Avaliação / Feedback (Obrigatório)</label>
              <textarea className="form-control" rows={4} style={{ background: '#000' }} value={avaliacaoComentario} onChange={e => setAvaliacaoComentario(e.target.value)} placeholder="Escreva sua avaliação detalhada..." required />
            </div>
            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }} disabled={savingGrade || !gradeInput || !avaliacaoComentario.trim()} onClick={handleSaveGrade}>
                {savingGrade ? <Loader2 className="spinner" /> : 'Salvar Nota e Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BANCO DE GABARITOS */}
      {showGabaritosModal && (
        <div className="modal-overlay" onClick={() => setShowGabaritosModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>📖 Banco de Gabaritos</h2>
              <button className="btn-icon" onClick={() => setShowGabaritosModal(false)}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {courses.map(c => (
                <div key={c.id}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem' }}>{c.nome}</h3>
                  {c.livros?.map((l: any) => (
                    <div key={l.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem' }}>{l.titulo}</h4>
                      {(l.aulas || []).filter((a: any) => a.questionario?.length > 0).map((av: any) => (
                        <details key={av.id} style={{ marginTop: '0.5rem' }}>
                          <summary style={{ cursor: 'pointer' }}>{av.titulo}</summary>
                          <div style={{ padding: '1rem' }}>
                            {av.questionario.map((q: any, i: number) => (
                              <div key={i} style={{ marginBottom: '1rem', borderLeft: '2px solid var(--primary)', paddingLeft: '1rem' }}>
                                <p><strong>{i+1}. {q.text}</strong></p>
                                <p style={{ color: 'var(--success)' }}>Gabarito: {q.type === 'multiple_choice' ? q.options[q.correct] : q.type === 'true_false' ? (q.isTrue ? 'V' : 'F') : q.expectedAnswer}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GradingPanel
