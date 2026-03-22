import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayCircle, Award, ChevronLeft, ArrowRight, RefreshCcw, Loader2, BookOpen, FileText, Search, CheckCircle, X, AlertCircle, Lock, LogOut } from 'lucide-react'

interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'matching' | 'discursive'
  text: string
  options?: string[]
  correctOption?: number
  correctAnswer?: boolean
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
  const [result, setResult] = useState<{ score: number | null; passed: boolean; pendingReview?: boolean } | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null)
  
  // Questions from database
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    fetchLessonData()
  }, [id])

  const fetchLessonData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('aulas')
        .select('*, livros(*)')
        .eq('id', id)
        .single();
        
      if (lessonError) {
        // showToast if possible, otherwise console.error
        console.error('Erro Supabase:', lessonError);
        throw lessonError;
      }
      
      setLesson(lessonData)
      setBook(lessonData?.livros)
      setQuestions(Array.isArray(lessonData?.questionario) ? lessonData.questionario : [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch user profile to get nucleo_id
        const { data: profile } = await supabase
          .from('users')
          .select('id, nucleo_id, tipo')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)

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
            setResult({ score: subData.nota, passed: subData.nota >= 7, pendingReview: subData.status === 'pendente' })
          }

          // Rule for Final Prova Redo:
          // If grade < 7 and attempts < 3 and within 30 days of first correction
          const firstCorrDate = subData.primeira_correcao_at ? new Date(subData.primeira_correcao_at).getTime() : 0;
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const isWithinTimeLimit = firstCorrDate > 0 ? (Date.now() - firstCorrDate < thirtyDaysInMs) : true;

          const canRedo = lesson?.tipo === 'prova' && 
                          subData.nota !== null && 
                          subData.nota < 7 && 
                          (subData.tentativas || 0) < 3 && 
                          isWithinTimeLimit;

          if (canRedo) {
            setSubmitted(false); // Aluno pode refazer
          } else {
            // Mark as submitted to hide the form for others
            setSubmitted(true);
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && lesson) {
        const { error: upsertError } = await supabase
          .from('respostas_aulas')
          .upsert({
            aluno_id: user.id,
            aula_id: lesson.id,
            respostas: answers,
            nota: null, // Nota será dada manualmente pelo professor
            status: 'pendente',
            updated_at: new Date().toISOString(),
            nucleo_id: userProfile?.nucleo_id || null,
            tentativas: (existingSubmission?.tentativas || 0) + 1,
            primeira_correcao_at: existingSubmission?.primeira_correcao_at || null
          }, { onConflict: 'aluno_id,aula_id' })
        
        if (upsertError) throw upsertError

        setResult({ score: null, passed: false, pendingReview: true })
        setSubmitted(true)
        alert('Respostas enviadas com sucesso! Sua nota será dada após a correção do professor.')
      }
    } catch (err) {
      console.error("Erro ao salvar respostas:", err)
      alert("Erro ao enviar respostas. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to render video player correctly
  const renderVideoPlayer = (url: string) => {
    if (!url) return null;
    
    // YouTube
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
    
    // Vimeo
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

    // Generic Default
    return (
      <div className="video-player-mock">
        <PlayCircle size={48} style={{ marginBottom: '1rem' }} />
        <span>Assista em: <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{url}</a></span>
      </div>
    );
  }

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /> Carregando aula...</div>

  if (!lesson) {
    return (
      <div className="auth-container">
        <h2>Aula não encontrada</h2>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Voltar ao Painel</button>
      </div>
    )
  }

  return (
    <div className="lesson-container">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            <ChevronLeft size={18} /> Voltar
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            Painel Inicial
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {book && (
            <button onClick={() => navigate(`/book/${book.id}`)} className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <BookOpen size={18} /> Acessar Livro do Módulo
            </button>
          )}
          <button 
            onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} 
            className="btn" 
            style={{ width: 'auto', background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error)', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      <div className="auth-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{lesson.titulo}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Módulo: {book?.titulo || '---'}</p>
      </div>

      {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
        <div className="video-wrapper" style={{ aspectRatio: '16/9', background: '#000', borderRadius: '16px', marginBottom: '3rem', overflow: 'hidden' }}>
          {lesson.video_url ? renderVideoPlayer(lesson.video_url) : (
            <div className="video-player-mock" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <PlayCircle size={64} color="var(--text-muted)" />
              <span style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Nenhum vídeo disponível para esta aula.</span>
            </div>
          )}
        </div>
      )}

      {/* Lesson Content Blocks */}
      {Array.isArray(lesson.conteudo) && lesson.conteudo.length > 0 && (
        <div className="lesson-content-body" style={{ marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {lesson.conteudo.map((block: any, idx: number) => (
            <div key={idx} className="content-block">
              {block.type === 'text' ? (
                <div style={{ fontSize: '1.2rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}>
                  {block.content}
                </div>
              ) : (
                <div 
                  style={{ textAlign: 'center', position: 'relative', cursor: 'zoom-in' }} 
                  onClick={() => setSelectedImage(block.content)}
                  className="lesson-image-container"
                >
                  <img 
                    src={block.content} 
                    alt={`Conteúdo da aula ${idx}`} 
                    style={{ maxWidth: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} 
                  />
                  <div className="zoom-overlay" style={{ 
                    position: 'absolute', 
                    top: '1rem', 
                    right: '1rem', 
                    background: 'rgba(0,0,0,0.5)', 
                    borderRadius: '50%', 
                    padding: '0.5rem',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}>
                    <Search size={20} color="#fff" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Supplementary Materials */}
      {Array.isArray(lesson.materiais) && lesson.materiais.length > 0 && (
        <div style={{ marginBottom: '4rem', padding: '2rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '24px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={24} color="var(--primary)" />
            Materiais Complementares
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {lesson.materiais.map((mat: any, idx: number) => (
              <a 
                key={idx} 
                href={mat.url} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', padding: '1rem', gap: '1rem' }}
              >
                <div style={{ width: '40px', height: '40px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{mat.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Clique para baixar</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="quiz-section" style={{ background: 'var(--glass)', padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
        <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
          <Award size={24} color="var(--primary)" />
          Questionário de Avaliação
        </h3>

        {existingSubmission && existingSubmission.nota !== null && existingSubmission.nota < 7 && (
          <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '16px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <AlertCircle color="#EAB308" />
             <div>
               <div style={{ fontWeight: 700, color: '#EAB308' }}>Recuperação Ativa - {existingSubmission.tentativas + 1}ª Tentativa</div>
               <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                 Sua nota anterior foi {existingSubmission.nota.toFixed(1)}. Você pode refazer esta prova até 3 vezes dentro de 30 dias após a primeira correção.
               </p>
             </div>
          </div>
        )}

        {questions.map((q, idx) => (
          <div key={q.id} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem' }}>{idx + 1}. {q.text}</div>
            
            {/* Multiple Choice */}
            {(!q.type || q.type === 'multiple_choice') && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {q.options.map((opt, oIdx) => (
                  <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: result ? 'default' : 'pointer', padding: '0.5rem', borderRadius: '8px', background: answers[q.id] === oIdx ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent' }}>
                    <input 
                      type="radio" 
                      name={`q-${q.id}`} 
                      onChange={() => handleOptionChange(q.id, oIdx)}
                      disabled={!!result}
                      checked={answers[q.id] === oIdx}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.type === 'true_false' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: result ? 'default' : 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: answers[q.id] === true ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)' }}>
                  <input type="radio" name={`q-${q.id}`} onChange={() => handleOptionChange(q.id, true)} disabled={!!result} checked={answers[q.id] === true} />
                  Verdadeiro
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: result ? 'default' : 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: answers[q.id] === false ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)' }}>
                  <input type="radio" name={`q-${q.id}`} onChange={() => handleOptionChange(q.id, false)} disabled={!!result} checked={answers[q.id] === false} />
                  Falso
                </label>
              </div>
            )}

            {/* Matching (Ancoragem) */}
            {q.type === 'matching' && q.matchingPairs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Associe a Coluna 1 com a respectiva resposta da Coluna 2.</p>
                {q.matchingPairs.map((pair, pIdx) => (
                   <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                       <strong>{pIdx + 1}.</strong> {pair.left}
                     </div>
                     <ChevronLeft style={{ transform: 'rotate(180deg)' }} color="var(--text-muted)" />
                     <select 
                       className="form-control" 
                       style={{ flex: 1 }} 
                       disabled={!!result}
                       value={answers[q.id]?.[pIdx] || ''}
                       onChange={(e) => {
                         const currentMapping = answers[q.id] || {};
                         handleOptionChange(q.id, { ...currentMapping, [pIdx]: e.target.value });
                       }}
                     >
                       <option value="">Selecione...</option>
                       {q.matchingPairs?.map((_, optIdx) => (
                         // Na vida real, a Coluna 2 estaria embaralhada para o aluno. Neste código, exibimos options originais para teste.
                         <option key={optIdx} value={optIdx}>{q.matchingPairs![optIdx].right}</option>
                       ))}
                     </select>
                   </div>
                ))}
              </div>
            )}

            {/* Discursive */}
            {q.type === 'discursive' && (
              <div style={{ marginTop: '0.5rem' }}>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="Escreva sua resposta..." 
                  disabled={!!result}
                  value={answers[q.id] || ''}
                  onChange={(e) => handleOptionChange(q.id, e.target.value)}
                ></textarea>
                {result && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                    <strong>Gabarito Esperado:</strong> {q.expectedAnswer || 'Sem gabarito registrado.'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!submitted && !result ? (
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || submitting}
            style={{ width: 'auto', padding: '1rem 3rem' }}
          >
            {submitting ? <Loader2 className="spinner" /> : 'Finalizar Questionário'}
          </button>
        ) : (
          <div style={{ textAlign: 'left', background: 'var(--glass)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--glass-border)', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--success)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle size={32} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Atividade Concluída!</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Você já respondeu este questionário. Veja abaixo o que foi enviado:</p>
              
              {result && (
                <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-block', minWidth: '240px' }}>
                  <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Sua Pontuação</div>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: (result && result.score != null && result.score >= 7) ? 'var(--success)' : 'var(--error)' }}>
                    {result && result.score != null ? result.score.toFixed(1) : (
                      <span style={{ fontSize: '1rem', color: 'var(--primary)', letterSpacing: '0' }}>Aguardando Correção</span>
                    )}
                  </div>
                </div>
              )}

              {lesson?.tipo === 'prova' && result && result.score != null && result.score < 7 && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '16px', textAlign: 'left', maxWidth: '600px', margin: '2rem auto 0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#EAB308', marginBottom: '0.5rem', fontWeight: 700 }}>
                     <AlertCircle size={20} /> Recuperação de Ciclo
                   </div>
                   <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                     Você atingiu o limite de tentativas nesta prova ou o prazo de recuperação expirou. 
                     <strong> Fique tranquilo:</strong> você pode seguir para os próximos módulos normalmente. 
                     Este conteúdo aparecerá automaticamente para você repetir (refazer) ao final do ciclo de estudos do seu curso.
                   </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
              {questions.map((q: QuizQuestion, idx: number) => {
                const studentAns = answers[q.id];
                const isCorrect = q.type === 'multiple_choice' || !q.type ? (studentAns === q.correctOption) : (studentAns === q.correctAnswer);
                const isAuto = q.type !== 'discursive';
                
                return (
                  <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.05rem', display: 'flex', gap: '0.75rem' }}>
                      <span style={{ opacity: 0.3 }}>{idx + 1}.</span> {q.text}
                    </div>
                    
                    <div style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sua Resposta:</span>
                        <span style={{ textTransform: 'none' }}>Em correção</span>
                      </div>
                      <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
                        {(() => {
                          if (q.type === 'multiple_choice' || !q.type) {
                            return q.options?.[studentAns] || studentAns;
                          }
                          if (q.type === 'true_false') {
                            return studentAns === true ? 'Verdadeiro' : 'Falso';
                          }
                          if (q.type === 'matching' && typeof studentAns === 'object') {
                            return (
                              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                                {q.matchingPairs?.map((_: any, pIdx: number) => (
                                  <div key={pIdx}>
                                    {q.matchingPairs![pIdx].left} ➔ {q.matchingPairs![parseInt(studentAns[pIdx])]?.right || '---'}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return studentAns; // Texto simples (discursiva)
                        })()}
                      </div>

                      {/* Gabarito (Template) para o aluno conferir */}
                      <div style={{ 
                        marginTop: '1.25rem', 
                        paddingTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(var(--primary-rgb), 0.05)', 
                        border: '1px solid rgba(var(--primary-rgb), 0.1)',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '1px' }}>
                          Gabarito / Resposta Esperada:
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                          {(() => {
                            if (q.type === 'multiple_choice' || !q.type) {
                              return <span>Opção {(q.correctOption !== undefined ? q.correctOption : (q as any).correct) + 1}: {q.options?.[(q.correctOption !== undefined ? q.correctOption : (q as any).correct)]}</span>;
                            }
                            if (q.type === 'true_false') {
                              return q.correctAnswer ? 'Verdadeiro' : 'Falso';
                            }
                            if (q.type === 'matching' && q.matchingPairs) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  {q.matchingPairs.map((pair: { left: string; right: string }, pIdx: number) => (
                                    <div key={pIdx}>{pair.left} ➔ {pair.right}</div>
                                  ))}
                                </div>
                              );
                            }
                            return q.expectedAnswer || 'Será avaliado pelo professor.';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {lesson?.tipo === 'prova' && (
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', padding: '1rem 2rem' }}
                  onClick={() => {
                    setResult(null);
                    setSubmitted(false);
                    setAnswers({});
                  }}
                >
                  Refazer Prova (Zerar Respostas)
                </button>
              )}
              <button className="btn btn-outline" style={{ width: 'auto', padding: '1rem 2rem' }} onClick={() => navigate(-1)}>
                Voltar à Matéria
              </button>
              <button className="btn btn-outline" style={{ width: 'auto', padding: '1rem 2rem' }} onClick={() => navigate('/dashboard')}>
                Ir para o Início
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 10000, background: 'rgba(0,0,0,0.95)' }} 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedImage(null)}
          >
            <X size={40} />
          </button>
          <img 
            src={selectedImage} 
            alt="Zoom" 
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 0 50px rgba(156, 39, 176, 0.3)', borderRadius: '8px' }} 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default Lesson
