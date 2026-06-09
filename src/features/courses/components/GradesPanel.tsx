import React, { useState } from 'react'
import {
  Award, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock,
  BookOpen, BarChart2, Target, ChevronRight, FileText
} from 'lucide-react'
import { UserProfile } from '../../../types/dashboard'
import { useNavigate } from 'react-router-dom'

interface GradesPanelProps {
  profile: UserProfile | null
  availableNucleos: any[]
  handleChangeNucleo: (id: string) => void
  atividades: any[]
  courses: any[]
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcExerciseScore(questionnaire: any[], respostas: Record<string, any>) {
  if (!Array.isArray(questionnaire) || questionnaire.length === 0)
    return { correct: 0, total: 0, pct: 0 }
  let correct = 0
  questionnaire.forEach((q: any, idx: number) => {
    const key = q.id ?? idx
    const ans = respostas?.[key]
    const manual = respostas?.[`${key}_avaliacao`]
    let ok = false
    if (manual !== undefined) { ok = manual === true }
    else if (q.type === 'multiple_choice' || !q.type) { ok = ans !== undefined && ans !== null && String(ans) === String(q.correct) }
    else if (q.type === 'true_false') { ok = ans === q.isTrue }
    else if (q.type === 'matching') { ok = q.matchingPairs?.every((_: any, i: number) => String(ans?.[i]) === String(i)) ?? false }
    if (ok) correct++
  })
  return { correct, total: questionnaire.length, pct: Math.round((correct / questionnaire.length) * 100) }
}

function scoreColor(pct: number) {
  return pct >= 70 ? 'var(--success)' : pct >= 50 ? '#f59e0b' : 'var(--error)'
}
function scoreBg(pct: number) {
  return pct >= 70 ? 'rgba(16,185,129,0.08)' : pct >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
}
function scoreBorder(pct: number) {
  return pct >= 70 ? 'rgba(16,185,129,0.3)' : pct >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'
}

// ─── Gabarito inline de uma questão ──────────────────────────────────────────

function QuestionGabarito({ q, idx, respostas }: { q: any; idx: number; respostas: Record<string, any> }) {
  const key = q.id ?? idx
  const ans = respostas?.[key]
  const manual = respostas?.[`${key}_avaliacao`]
  const comment = respostas?.[`${key}_comentario`]

  let isCorrect = false
  if (manual !== undefined) { isCorrect = manual === true }
  else if (q.type === 'multiple_choice' || !q.type) { isCorrect = ans !== undefined && ans !== null && String(ans) === String(q.correct) }
  else if (q.type === 'true_false') { isCorrect = ans === q.isTrue }
  else if (q.type === 'matching') { isCorrect = q.matchingPairs?.every((_: any, i: number) => String(ans?.[i]) === String(i)) ?? false }

  const ok = isCorrect
  const c = ok ? 'var(--success)' : 'var(--error)'

  // render student answer text
  const studentText = (() => {
    if (q.type === 'multiple_choice' || !q.type) return q.options?.[ans] ?? <em style={{ opacity: 0.4 }}>Sem resposta</em>
    if (q.type === 'true_false') {
      if (ans === true) return 'Verdadeiro'
      if (ans === false) return 'Falso'
      return <em style={{ opacity: 0.4 }}>Sem resposta</em>
    }
    if (q.type === 'discursive') return <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ans ?? <em style={{ opacity: 0.4 }}>Sem resposta</em>}</span>
    if (q.type === 'matching') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {q.matchingPairs?.map((pair: any, i: number) => {
            const r = ans?.[i]
            const rTxt = r !== undefined && q.matchingPairs[r] ? q.matchingPairs[r].right : '?'
            const matchOk = String(r) === String(i)
            return (
              <div key={i} style={{ fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{pair.left}</span>
                <ChevronRight size={12} style={{ opacity: 0.4 }} />
                <span style={{ color: matchOk ? 'var(--success)' : 'var(--error)' }}>{rTxt}</span>
              </div>
            )
          })}
        </div>
      )
    }
    return ans ?? <em style={{ opacity: 0.4 }}>Sem resposta</em>
  })()

  // render correct answer text
  const correctText = (() => {
    if (q.type === 'multiple_choice' || !q.type) return q.options?.[q.correct] ?? '—'
    if (q.type === 'true_false') return q.isTrue ? 'Verdadeiro' : 'Falso'
    if (q.type === 'discursive') return q.expectedAnswer || <em>Avaliação qualitativa do professor.</em>
    if (q.type === 'matching') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {q.matchingPairs?.map((pair: any, i: number) => (
            <div key={i} style={{ fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{pair.left}</span>
              <ChevronRight size={12} style={{ opacity: 0.4 }} />
              <span style={{ color: 'var(--success)' }}>{pair.right}</span>
            </div>
          ))}
        </div>
      )
    }
    return '—'
  })()

  return (
    <div style={{
      borderRadius: '16px',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      background: ok ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
      overflow: 'hidden'
    }}>
      {/* Question header */}
      <div style={{
        padding: '0.9rem 1.2rem',
        borderBottom: `1px solid ${ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, flex: 1, lineHeight: 1.5 }}>
          <span style={{ opacity: 0.35, marginRight: '0.4rem', fontWeight: 900 }}>{idx + 1}.</span>
          {q.text}
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.72rem', fontWeight: 900, flexShrink: 0,
          padding: '0.3rem 0.75rem', borderRadius: '8px',
          background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: c
        }}>
          {ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
          {ok ? 'CORRETO' : 'INCORRETO'}
        </div>
      </div>

      {/* Two-column: sua resposta | gabarito */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Sua resposta */}
        <div style={{ padding: '0.9rem 1.2rem', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Sua Resposta
          </div>
          <div style={{ fontSize: '0.9rem', color: ok ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {studentText}
          </div>
        </div>

        {/* Gabarito oficial */}
        <div style={{ padding: '0.9rem 1.2rem', background: 'rgba(16,185,129,0.04)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle size={10} /> Gabarito Oficial
          </div>
          <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
            {correctText}
          </div>
          {q.explanation && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
              {q.explanation}
            </div>
          )}
        </div>
      </div>

      {/* Feedback professor */}
      {comment && (
        <div style={{ padding: '0.75rem 1.2rem', background: 'rgba(var(--primary-rgb),0.06)', borderTop: '1px solid rgba(var(--primary-rgb),0.15)', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--primary)', fontStyle: 'normal', marginRight: '0.4rem' }}>Prof:</strong>
          {comment}
        </div>
      )}
    </div>
  )
}

// ─── Gabarito da prova (modal-style inline) ──────────────────────────────────

function ExamGabaritoInline({ sub }: { sub: any }) {
  const [open, setOpen] = useState(false)
  const aula = Array.isArray(sub.aulas) ? (sub.aulas as any)[0] : sub.aulas
  const questionnaire = aula?.questionario
  if (!Array.isArray(questionnaire) || questionnaire.length === 0) return null

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button
        className="btn btn-outline"
        style={{ width: '100%', padding: '0.6rem', fontSize: '0.78rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        <FileText size={14} />
        {open ? 'Ocultar Gabarito' : 'Ver Gabarito e Correção'}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questionnaire.map((q: any, idx: number) => (
            <QuestionGabarito key={q.id ?? idx} q={q} idx={idx} respostas={sub.respostas || {}} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Exercício com gabarito inline ───────────────────────────────────────────

function FormativeCard({ f }: { f: any }) {
  const [open, setOpen] = useState(false)
  const aula = Array.isArray(f.aulas) ? (f.aulas as any)[0] : f.aulas
  const questionnaire: any[] = Array.isArray(aula?.questionario) ? aula.questionario : []
  const respostas = f.respostas || {}
  const score = calcExerciseScore(questionnaire, respostas)
  const hasQ = score.total > 0
  const sc = scoreColor(score.pct)
  const sb = scoreBg(score.pct)
  const sbd = scoreBorder(score.pct)

  return (
    <div style={{
      borderRadius: '18px',
      border: `1px solid ${hasQ ? sbd : 'rgba(59,130,246,0.15)'}`,
      background: hasQ ? sb : 'rgba(59,130,246,0.04)',
      overflow: 'hidden'
    }}>
      {/* Card header — sempre visível */}
      <div
        style={{ padding: '1.1rem 1.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', cursor: hasQ ? 'pointer' : 'default' }}
        onClick={() => hasQ && setOpen(v => !v)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.lesson_title || aula?.titulo || 'Atividade'}
          </div>
          {hasQ && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: sc, fontWeight: 800 }}>{score.correct}/{score.total} acertos</span>
              <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', maxWidth: '80px' }}>
                <div style={{ height: '100%', width: `${score.pct}%`, background: sc, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: sc, fontWeight: 900 }}>{score.pct}%</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '2px 7px', borderRadius: '6px' }}>
            REALIZADO
          </span>
          {hasQ && (
            open
              ? <ChevronUp size={16} color={sc} />
              : <ChevronDown size={16} color={sc} />
          )}
        </div>
      </div>

      {/* Gabarito inline expandido */}
      {hasQ && open && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: `1px solid ${sbd}` }}>
          <div style={{
            padding: '0.6rem 0.8rem',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            fontSize: '0.72rem', fontWeight: 900, color: sc,
            textTransform: 'uppercase', letterSpacing: '1px',
            marginBottom: '0.25rem', paddingTop: '0.8rem'
          }}>
            <Target size={13} /> Gabarito Oficial — {score.correct}/{score.total} corretas ({score.pct}%)
          </div>
          {questionnaire.map((q: any, idx: number) => (
            <QuestionGabarito key={q.id ?? idx} q={q} idx={idx} respostas={respostas} />
          ))}
        </div>
      )}

      {/* Mensagem se sem questionário */}
      {!hasQ && (
        <div style={{ padding: '0.5rem 1.3rem 0.9rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Gabarito não configurado para este exercício.
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const GradesPanel: React.FC<GradesPanelProps> = ({ profile, availableNucleos, handleChangeNucleo, atividades, courses }) => {
  const navigate = useNavigate()
  const [expandedModule, setExpandedModule] = useState<string | null>(null)

  // Agrupar por módulo
  const modulesMap: Record<string, { title: string; id: string; items: any[] }> = {}
  atividades.forEach(a => {
    const id = a.book_id || a.aulas?.livros?.id || 'outros'
    const title = a.book_title || a.aulas?.livros?.titulo || 'Complementares'
    if (!modulesMap[id]) modulesMap[id] = { title, id, items: [] }
    modulesMap[id].items.push(a)
  })
  const modules = Object.values(modulesMap)

  return (
    <div className="data-card">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem', fontWeight: 800 }}>
          <Award color="var(--primary)" size={32} /> Meu Boletim
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Notas, provas e gabaritos oficiais de todos os exercícios realizados.
        </p>
      </div>

      {modules.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.5 }}>
          <BookOpen size={48} style={{ marginBottom: '1rem' }} />
          <p>Nenhuma atividade registrada ainda.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {modules.map(m => {
          const isExpanded = expandedModule === m.id
          const formative = m.items.filter(i => (i.lesson_type || i.aulas?.tipo) === 'atividade')
          const examSubs = m.items.filter(i => (i.lesson_type || i.aulas?.tipo) === 'prova' || !!i.is_bloco_final)
          const approved = examSubs.find(s => s.status === 'corrigida' && s.nota && s.nota >= 7)

          const libro = (courses || []).flatMap((c: any) => c.livros || []).find((l: any) => l.id === m.id)

          // Score médio dos exercícios
          const scores = formative.map(f => {
            const aula = Array.isArray(f.aulas) ? (f.aulas as any)[0] : f.aulas
            return calcExerciseScore(Array.isArray(aula?.questionario) ? aula.questionario : [], f.respostas || {})
          }).filter(s => s.total > 0)
          const avgPct = scores.length ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length) : null

          return (
            <div
              key={m.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '22px',
                border: `1px solid ${approved ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`,
                overflow: 'hidden'
              }}
            >
              {/* Módulo header */}
              <div
                onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                style={{ padding: '1.4rem 1.6rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'rgba(var(--primary-rgb),0.04)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: approved ? 'rgba(16,185,129,0.12)' : 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {approved ? <CheckCircle size={22} color="var(--success)" /> : <BookOpen size={22} color="var(--primary)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {formative.length} exercício{formative.length !== 1 ? 's' : ''} · {examSubs.length} prova{examSubs.length !== 1 ? 's' : ''}
                      </span>
                      {approved && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: '6px' }}>
                          ✓ APROVADO {approved.nota?.toFixed(1)}
                        </span>
                      )}
                      {avgPct !== null && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: scoreColor(avgPct), background: scoreBg(avgPct), padding: '1px 7px', borderRadius: '6px' }}>
                          <BarChart2 size={10} style={{ display: 'inline', marginRight: '3px' }} />
                          {avgPct}% exercícios
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={20} style={{ flexShrink: 0 }} /> : <ChevronDown size={20} style={{ flexShrink: 0 }} />}
              </div>

              {/* Conteúdo expandido */}
              {isExpanded && (
                <div style={{ padding: '0 1.6rem 1.6rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                  {/* ── SEÇÃO: PROVAS ── */}
                  <div style={{ paddingTop: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 900, marginBottom: '1rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Award size={14} /> Provas do Módulo
                    </h5>

                    {(() => {
                      if (!libro) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Módulo não encontrado.</p>
                      const allExams = (libro.aulas || []).filter((a: any) => a.tipo === 'prova' || !!a.is_bloco_final).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
                      if (allExams.length === 0) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem provas configuradas.</p>

                      const subs = m.items.filter(i => (i.lesson_type || i.aulas?.tipo) === 'prova' || !!i.is_bloco_final).sort((a: any, b: any) => (a.tentativas || 1) - (b.tentativas || 1))
                      const approved = subs.find(s => s.status === 'corrigida' && s.nota && s.nota >= 7)

                      if (approved) return (
                        <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.07)', borderRadius: '18px', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Award size={28} color="var(--success)" />
                            <div>
                              <div style={{ fontWeight: 900, color: 'var(--success)', fontSize: '1.1rem' }}>Módulo Concluído com Sucesso!</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nota final: <strong style={{ color: '#fff' }}>{approved.nota?.toFixed(1)}</strong></div>
                            </div>
                          </div>
                          <ExamGabaritoInline sub={approved} />
                        </div>
                      )

                      const currentStage = subs.length + 1
                      const activeExam = allExams.find((ex: any) => (ex.versao || 1) === currentStage) || allExams[allExams.length - 1]
                      const lastSub = subs[subs.length - 1]
                      const waiting = lastSub && lastSub.status === 'pendente'

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {subs.map((sub: any, idx: number) => {
                            const subAula = Array.isArray(sub.aulas) ? (sub.aulas as any)[0] : sub.aulas
                            const isApproved = sub.nota && sub.nota >= 7
                            return (
                              <div key={sub.id} style={{ padding: '1rem 1.2rem', borderRadius: '14px', border: `1px solid ${isApproved ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`, background: isApproved ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Tentativa {idx + 1}</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: sub.status === 'pendente' ? '#eab308' : (isApproved ? 'var(--success)' : 'var(--error)') }}>
                                    {sub.status === 'pendente' ? 'EM CORREÇÃO' : (isApproved ? sub.nota?.toFixed(1) : 'NÃO APROVADO')}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#ddd', fontWeight: 600 }}>{subAula?.titulo}</div>
                                {isApproved && <ExamGabaritoInline sub={sub} />}
                              </div>
                            )
                          })}

                          {waiting ? (
                            <div style={{ padding: '1.2rem', background: 'rgba(234,179,8,0.05)', borderRadius: '14px', border: '1px solid var(--warning)', textAlign: 'center' }}>
                              <Clock size={24} color="var(--warning)" style={{ marginBottom: '0.4rem' }} />
                              <div style={{ fontWeight: 800, color: 'var(--warning)' }}>Aguardando Correção</div>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Sua tentativa está sendo avaliada pelo professor.</p>
                            </div>
                          ) : subs.length >= 3 ? (
                            <div style={{ padding: '1.2rem', background: 'rgba(239,68,68,0.06)', borderRadius: '14px', border: '1px solid var(--error)', textAlign: 'center' }}>
                              <XCircle size={24} color="var(--error)" style={{ marginBottom: '0.4rem' }} />
                              <div style={{ fontWeight: 800, color: 'var(--error)' }}>Limite de tentativas atingido</div>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Entre em contato com a secretaria pedagógica.</p>
                            </div>
                          ) : (
                            <div style={{ padding: '1rem 1.2rem', borderRadius: '14px', border: '2px dashed var(--primary)', background: 'rgba(var(--primary-rgb),0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                              <div>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{activeExam?.titulo}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Versão V{currentStage} disponível</div>
                              </div>
                              <button className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 1.4rem', fontWeight: 800, borderRadius: '10px', whiteSpace: 'nowrap' }} onClick={() => navigate(`/lesson/${activeExam?.id}`)}>
                                {subs.length > 0 ? 'Recuperação' : 'Fazer Prova'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* ── SEÇÃO: EXERCÍCIOS COM GABARITO ── */}
                  {formative.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                      <h5 style={{ fontSize: '0.72rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={14} /> Exercícios de Fixação &amp; Gabaritos ({formative.length})
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {formative.map(f => <FormativeCard key={f.id} f={f} />)}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GradesPanel
