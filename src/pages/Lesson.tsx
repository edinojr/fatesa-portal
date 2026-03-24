import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayCircle, Award, ChevronLeft, ArrowRight, RefreshCcw, Loader2, BookOpen, FileText, Search, CheckCircle, CheckCircle2, X, AlertCircle, Lock, LogOut, ClipboardList, XCircle, Upload } from 'lucide-react'

interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'matching' | 'discursive'
  text: string
  options?: string[]
  correct?: number
  isTrue?: boolean
  matchingPairs?: { left: string, right: string }[]
  expectedAnswer?: string
}

const Lesson = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<any>(null)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<{ score: number | null; passed: boolean; pendingReview?: boolean; scoreOriginal?: number | null } | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    fetchLessonData()
  }, [id])

  const fetchLessonData = async () => {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('aulas')
        .select('*, livros(*)')
        .eq('id', id)
        .single();
        
      if (lessonError) {
        console.error('Erro Supabase:', lessonError);
        setLoading(false)
        return
      }
      
      setLesson(lessonData)
      setBook(lessonData?.livros)
      setQuestions(Array.isArray(lessonData?.questionario) ? lessonData.questionario : [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserProfile(user)

        const { data: subData } = await supabase
          .from('respostas_aulas')
          .select('*')
          .eq('aula_id', id)
          .eq('aluno_id', user.id)
          .maybeSingle()
        
        if (subData) {
          setExistingSubmission(subData)
          setAnswers(subData.respostas || {})
          
          if (subData.nota !== null) {
            setResult({ 
              score: subData.nota, 
              passed: subData.nota >= (lessonData.min_grade || (lessonData.tipo === 'prova' ? 7 : 0)), 
              pendingReview: subData.status === 'pendente',
              scoreOriginal: subData.nota_original
            })
          }
          setSubmitted(true);
        } else {
          // Check if user is staff (professor/admin) to show as "read-only gabarito"
          const { data: profile } = await supabase.from('users').select('tipo').eq('id', user.id).single();
          if (['admin', 'professor', 'suporte'].includes(profile?.tipo || '')) {
            setSubmitted(true);
            setReviewMode(true);
            const gabarito: Record<string, any> = {};
            (Array.isArray(lessonData.questionario) ? lessonData.questionario : []).forEach((q: any) => {
              if (q.type === 'multiple_choice') gabarito[q.id] = q.correct;
              else if (q.type === 'true_false') gabarito[q.id] = q.isTrue;
            });
            setAnswers(gabarito);
            setResult({ score: 10, passed: true });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar aula:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOptionChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!lesson || !userProfile) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let score = 0
      let total = questions.length
      let allAnswered = true

      if (total > 0) {
        questions.forEach(q => {
          if (q.type === 'multiple_choice') {
            if (answers[q.id] === q.correct) score++
          } else if (q.type === 'true_false') {
            if (answers[q.id] === q.isTrue) score++
          } else if (q.type === 'matching') {
            // Check if all pairs match
            const userAnswers = answers[q.id] || {};
            const isCorrect = q.matchingPairs?.every(pair => userAnswers[pair.left] === pair.right);
            if (isCorrect) score++
          }
          // Discursive requires review
        })
      }
      
      const finalScore = total > 0 ? (score / total) * 10 : 10
      const hasDiscursive = questions.some(q => q.type === 'discursive')
      
      const minGradeNeeded = lesson.tipo === 'prova' ? 7 : 0;
      const passed = hasDiscursive ? false : finalScore >= minGradeNeeded;
      const scoreToSave = existingSubmission?.nota_original != null ? existingSubmission.nota_original : (hasDiscursive ? null : finalScore);
      
      const { error } = await supabase
        .from('respostas_aulas')
        .upsert({
          aluno_id: user.id,
          aula_id: id,
          respostas: answers,
          nota: scoreToSave,
          nota_original: scoreToSave,
          status: hasDiscursive ? 'pendente' : (passed ? 'concluido' : 'reprovado'),
          tentativas: (existingSubmission?.tentativas || 0) + 1,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setResult({ score: hasDiscursive ? null : finalScore, passed, pendingReview: hasDiscursive })
      setSubmitted(true)
      
      // Auto-mark as completed in progress table if passed
      if (passed && !hasDiscursive) {
        await supabase.from('progresso_aulas').upsert({
          aluno_id: user.id,
          aula_id: id,
          concluida: true,
          updated_at: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error('Erro ao enviar:', err)
      alert('Erro ao enviar respostas. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAsComplete = async () => {
    if (!lesson || !userProfile) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('progresso_aulas').upsert({
        aluno_id: userProfile.id,
        aula_id: id,
        concluida: true,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSubmitted(true);
      setResult({ score: 10, passed: true });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false)
    }
  }

  const renderVideoPlayer = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vidId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      return (
        <iframe 
          width="100%" 
          height="100%" 
          src={`https://www.youtube.com/embed/${vidId}`}
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
          style={{ borderRadius: '16px' }}
        ></iframe>
      );
    }
    if (url.includes('vimeo.com')) {
      const vidId = url.split('/').pop();
      return (
        <iframe 
          src={`https://player.vimeo.com/video/${vidId}`} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowFullScreen
          style={{ borderRadius: '16px' }}
        ></iframe>
      );
    }
    return (
      <div className="video-player-mock">
        <PlayCircle size={48} style={{ marginBottom: '1rem' }} />
        <span>Assista em: <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{url}</a></span>
      </div>
    );
  }

  useEffect(() => {
    if (lesson && !loading) {
      // Se for apenas material (sem vídeo e sem quiz)
      const hasMaterial = lesson.arquivo_url || lesson.pdf_url;
      const hasVideo = lesson.video_url || lesson.video_id;
      const isQuiz = lesson.tipo === 'atividade' || lesson.tipo === 'prova';

      if (hasMaterial && !hasVideo && !isQuiz) {
        navigate(`/book/${lesson.id}?type=aula`, { replace: true });
      }
    }
  }, [lesson, loading, navigate]);

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando aula...</div>
  if (!lesson) return (
    <div className="auth-container">
      <h2>Aula não encontrada</h2>
      <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Voltar ao Painel</button>
    </div>
  )

  return (
    <div className="lesson-container">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChevronLeft size={20} /> Voltar
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>
            Painel Geral
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn btn-outline" style={{ width: 'auto', color: 'var(--error)' }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {book?.titulo}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>{lesson.titulo}</h1>
      </div>

      {/* Global Content Blocks */}
      {lesson.conteudo && Array.isArray(lesson.conteudo) && lesson.conteudo.length > 0 && (
        <div className="lesson-content-blocks" style={{ marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {lesson.conteudo.map((block: any, bIdx: number) => (
            <div key={bIdx} className="content-block">
              {block.type === 'text' ? (
                <div 
                  style={{ 
                    fontSize: '1.2rem', 
                    lineHeight: '1.8', 
                    color: 'rgba(255,255,255,0.9)',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '2rem',
                    borderRadius: '20px',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  {block.content}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <img 
                    src={block.content} 
                    alt={`Conteúdo ${bIdx}`} 
                    style={{ 
                      maxWidth: '100%', 
                      borderRadius: '20px', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      cursor: 'zoom-in',
                      transition: 'transform 0.3s ease'
                    }} 
                    onClick={() => setSelectedImage(block.content)}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
        <div className="video-section" style={{ marginBottom: '4rem' }}>
          <div className="video-wrapper" style={{ aspectRatio: '16/9', background: '#000', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            {lesson.video_url ? renderVideoPlayer(lesson.video_url) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.5 }}>
                <PlayCircle size={64} />
                <span>Vídeo não disponível</span>
              </div>
            )}
          </div>
          {!submitted && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', padding: '1rem 3rem' }} 
                onClick={handleMarkAsComplete}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="spinner" /> : (
                  <> <CheckCircle size={20} style={{ marginRight: '0.5rem' }} /> Marcar como Concluída </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Material Highlight */}
      {lesson.tipo === 'material' && lesson.arquivo_url && (
        <div style={{ background: 'var(--glass)', padding: '4rem 2rem', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center', marginBottom: '4rem' }}>
          <FileText size={80} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Material de Estudo Principal</h2>
          <p style={{ opacity: 0.7, maxWidth: '500px', margin: '0 auto 2.5rem' }}>Baixe o material principal para acompanhar os estudos deste módulo.</p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => navigate(`/book/${lesson.id}?type=aula`)} 
              className="btn btn-primary" 
              style={{ width: 'auto', padding: '1rem 2.5rem' }}
            >
              <FileText size={20} /> Ver Material no Visualizador
            </button>
          </div>
          {!submitted && (
            <button 
              className="btn btn-outline" 
              style={{ marginTop: '2rem', width: 'auto', padding: '0.8rem 2rem', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              onClick={handleMarkAsComplete}
            >
              Concluir Leitura
            </button>
          )}
        </div>
      )}

      {/* Additional Materials List */}
      {lesson.materiais && Array.isArray(lesson.materiais) && lesson.materiais.length > 0 && (
        <div className="additional-materials" style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem', borderRadius: '24px', border: '1px solid var(--glass-border)', marginBottom: '4rem' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
            <Upload size={24} color="var(--primary)" />
            Materiais Complementares
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {lesson.materiais.map((mat: any, mIdx: number) => (
              <div 
                key={mIdx} 
                className="material-item-standard"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1.5rem', 
                  background: 'var(--glass)', 
                  borderRadius: '16px', 
                  border: '1px solid var(--glass-border)',
                  color: 'inherit',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
              >
                <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Material Protegido</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(lesson.tipo === 'atividade' || lesson.tipo === 'prova' || questions.length > 0) && (
        <div className="quiz-section" style={{ background: 'var(--glass)', padding: '3rem', borderRadius: '24px', border: '1px solid var(--glass-border)', marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
              {lesson.tipo === 'prova' ? <Award size={32} color="#EAB308" /> : <ClipboardList size={32} color="var(--success)" />}
              {lesson.tipo === 'prova' ? 'Prova Final' : 'Atividade / Questionário'}
            </h2>
            {submitted && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => setReviewMode(!reviewMode)}
                >
                  {reviewMode ? 'Ver Resultado' : 'Revisar Respostas'}
                </button>
                <div style={{ padding: '0.5rem 1.5rem', background: (result?.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'), color: (result?.passed ? 'var(--success)' : 'var(--error)'), borderRadius: '50px', fontWeight: 700, border: '1px solid currentColor' }}>
                  {result?.passed ? 'CONCLUÍDO' : 'REPROVADO'}
                </div>
              </div>
            )}
          </div>

          {(!submitted || reviewMode) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {submitted ? "Modo de Estudo: Você pode alterar suas respostas para praticar, mas sua nota original será preservada." : "Responda todas as questões para finalizar a atividade."}
              </div>
              {questions.map((q, idx) => {
                const isCorrect = () => {
                  if (q.type === 'multiple_choice') return answers[q.id] === q.correct;
                  if (q.type === 'true_false') return answers[q.id] === q.isTrue;
                  if (q.type === 'matching') return q.matchingPairs?.every(pair => answers[q.id]?.[pair.left] === pair.right);
                  return null;
                };

                return (
                  <div key={q.id} style={{ 
                    padding: '2rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '20px', 
                    border: submitted && isCorrect() === false ? '2px solid rgba(239, 68, 68, 0.3)' : (submitted && isCorrect() ? '2px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.03)')
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{idx + 1}. {q.text}</span>
                      {submitted && (
                        isCorrect() ? <CheckCircle2 color="var(--success)" /> : <XCircle color="var(--error)" />
                      )}
                    </div>
                    
                    {(!q.type || q.type === 'multiple_choice') && q.options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {q.options.map((opt, oIdx) => {
                          const isStudentChoice = answers[q.id] === oIdx;
                          const isRightValue = q.correct === oIdx;
                          
                          let bg = 'transparent';
                          let border = '1px solid var(--glass-border)';
                          
                          if (submitted) {
                            if (isRightValue) { bg = 'rgba(16, 185, 129, 0.1)'; border = '1px solid var(--success)'; }
                            else if (isStudentChoice) { bg = 'rgba(239, 68, 68, 0.1)'; border = '1px solid var(--error)'; }
                          } else if (isStudentChoice) {
                            bg = 'rgba(var(--primary-rgb), 0.1)'; border = '1px solid var(--primary)';
                          }

                          return (
                            <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '12px', background: bg, border, transition: 'all 0.2s' }}>
                              <input type="radio" name={`q-${q.id}`} onChange={() => handleOptionChange(q.id, oIdx)} checked={isStudentChoice} disabled={submitting} />
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{opt}</span>
                                {submitted && isRightValue && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>(CORRETO)</span>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {[true, false].map(val => {
                          const isStudentChoice = answers[q.id] === val;
                          const isRightValue = q.isTrue === val;
                          
                          let bg = 'transparent';
                          let border = '1px solid var(--glass-border)';
                          
                          if (submitted) {
                            if (isRightValue) { bg = 'rgba(16, 185, 129, 0.1)'; border = '1px solid var(--success)'; }
                            else if (isStudentChoice) { bg = 'rgba(239, 68, 68, 0.1)'; border = '1px solid var(--error)'; }
                          } else if (isStudentChoice) {
                            bg = 'rgba(var(--primary-rgb), 0.1)'; border = '1px solid var(--primary)';
                          }

                          return (
                            <label key={val.toString()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '12px', background: bg, border }}>
                              <input type="radio" name={`q-${q.id}`} onChange={() => handleOptionChange(q.id, val)} checked={isStudentChoice} disabled={submitting} />
                              {val ? 'Verdadeiro' : 'Falso'}
                              {submitted && isRightValue && <CheckCircle2 size={14} color="var(--success)" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    
                    {q.type === 'matching' && q.matchingPairs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Relacione as colunas corretamente:</p>
                        {q.matchingPairs.map((pair, pIdx) => {
                          const studentAnswer = answers[q.id]?.[pair.left];
                          const isLineCorrect = studentAnswer === pair.right;
                          
                          return (
                            <div key={pIdx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.5fr', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: submitted ? (isLineCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'rgba(255,255,255,0.02)', borderRadius: '12px', border: submitted ? (isLineCorrect ? '1px solid var(--success)' : '1px solid var(--error)') : '1px solid transparent' }}>
                              <span style={{ fontWeight: 600 }}>{pair.left}</span>
                              <ArrowRight size={16} color="var(--text-muted)" />
                              <div style={{ position: 'relative' }}>
                                <select 
                                  className="form-control" 
                                  style={{ padding: '0.5rem', height: 'auto', background: 'rgba(0,0,0,0.2)' }}
                                  value={studentAnswer || ''}
                                  onChange={(e) => {
                                    const currentAnswers = answers[q.id] || {};
                                    handleOptionChange(q.id, { ...currentAnswers, [pair.left]: e.target.value });
                                  }}
                                  disabled={submitting}
                                >
                                  <option value="">Selecione...</option>
                                  {q.matchingPairs?.map(p => p.right).sort().map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                {submitted && !isLineCorrect && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.25rem' }}>Gabarito: {pair.right}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'discursive' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <textarea 
                          className="form-control" 
                          rows={5} 
                          placeholder="Sua resposta..." 
                          value={answers[q.id] || ''}
                          onChange={(e) => handleOptionChange(q.id, e.target.value)}
                          style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}
                          disabled={submitting}
                        ></textarea>
                        {submitted && q.expectedAnswer && (
                          <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>Expectativa de Resposta / Gabarito:</strong>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>{q.expectedAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length < questions.length || submitting}
                  style={{ width: 'auto', padding: '1.2rem 4rem', fontSize: '1.1rem' }}
                >
                  {submitting ? <Loader2 className="spinner" /> : (submitted ? 'Salvar Alterações de Estudo' : 'Finalizar e Enviar')}
                </button>
                {submitted && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '1.2rem 2rem', marginLeft: '1rem' }} onClick={() => setReviewMode(false)}>
                    Ver Nota
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.8 }}>
                {result?.pendingReview ? (
                  "Sua atividade foi enviada e está aguardando correção pelo tutor."
                ) : (
                  <> 
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', display: 'inline-block' }}>
                      Metodologia: (Acertos / Total Questões) × 10
                    </div>
                    <div>Sua nota final foi:</div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: result?.passed ? 'var(--success)' : 'var(--error)', display: 'block', marginTop: '0.5rem' }}>
                      {result?.score?.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
              <button className="btn btn-outline" style={{ width: 'auto', padding: '1rem 3rem' }} onClick={() => navigate('/dashboard')}>
                Voltar ao Painel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div className="modal-overlay" style={{ zIndex: 10000, background: 'rgba(0,0,0,0.95)' }} onClick={() => setSelectedImage(null)}>
          <button style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedImage(null)}>
            <X size={40} />
          </button>
          <img src={selectedImage} alt="Zoom" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 0 50px rgba(156, 39, 176, 0.3)', borderRadius: '8px' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default Lesson
