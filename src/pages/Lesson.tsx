import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Award, ChevronLeft, ArrowRight, Loader2, FileText, Lock, ChevronRight } from 'lucide-react'
import QuizEditorModal from '../features/courses/components/modals/QuizEditorModal'
import { QuizQuestion } from '../types/admin'

const Lesson = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<any>(null)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<{ score: number | null; passed: boolean; pendingReview?: boolean; scoreOriginal?: number | null } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isReleased, setIsReleased] = useState<boolean>(true)
  const [reviewMode] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({})
  const [shuffledMatchingRows, setShuffledMatchingRows] = useState<Record<string, any[]>>({})
  
  // Assessment System State
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [deadlineInfo, setDeadlineInfo] = useState<{ deadline: Date, stage: number, expired: boolean } | null>(null)
  const [relatedExercise, setRelatedExercise] = useState<any>(null)
  const [nextLessonId, setNextLessonId] = useState<string | null>(null)

  useEffect(() => {
    fetchLessonData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        
      if (lessonError) throw lessonError;
      
      setLesson(lessonData)
      setBook(lessonData?.livros)
      setQuestions(Array.isArray(lessonData?.questionario) ? lessonData.questionario : [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('tipo, caminhos_acesso, nucleo_id').eq('id', user.id).single();
        const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
        setUserProfile({ ...user, profile_tipo: profile?.tipo, caminhos_acesso: profile?.caminhos_acesso, nucleo_id: profile?.nucleo_id, isStaff });

        // Check Professor Release (liberacoes_nucleo)
        if (!isStaff && profile?.nucleo_id) {
          const itemType = (lessonData.tipo === 'gravada' || lessonData.tipo === 'ao_vivo') ? 'video' : 
                           (lessonData.tipo === 'atividade' || lessonData.tipo === 'prova') ? 'atividade' : 'modulo';
          
          if (itemType === 'video' || itemType === 'atividade') {
            const { data: releaseData } = await supabase
              .from('liberacoes_nucleo')
              .select('id')
              .eq('nucleo_id', profile.nucleo_id)
              .eq('item_id', id)
              .eq('item_type', itemType)
              .eq('liberado', true)
              .maybeSingle();
            
            if (!releaseData) {
              setIsReleased(false);
              setLoading(false);
              return;
            }
          } else if (lessonData.livro_id) {
            // Check if the module (livro) itself is released
            const { data: moduleRelease } = await supabase
              .from('liberacoes_nucleo')
              .select('id')
              .eq('nucleo_id', profile.nucleo_id)
              .eq('item_id', lessonData.livro_id)
              .eq('item_type', 'modulo')
              .eq('liberado', true)
              .maybeSingle();

            if (!moduleRelease) {
              setIsReleased(false);
              setLoading(false);
              return;
            }
          }
        }

        // Access Control (Block logic)
        if ((lessonData.tipo === 'gravada' || lessonData.tipo === 'ao_vivo') && lessonData.bloco_id) {
          if (!isStaff) {
            const { data: bItems } = await supabase.from('aulas').select('id, tipo').eq('bloco_id', lessonData.bloco_id).not('tipo', 'in', '("gravada","ao_vivo")').eq('is_bloco_final', false);
            if (bItems?.length) {
              const [{ data: resData }, { data: pData }] = await Promise.all([
                supabase.from('respostas_aulas').select('aula_id').eq('aluno_id', user.id),
                supabase.from('progresso_aulas').select('aula_id, concluida').eq('aluno_id', user.id)
              ]);
              const unfinished = bItems.some(item => {
                if (item.tipo === 'atividade' || item.tipo === 'prova') return !resData?.some(r => r.aula_id === item.id);
                return !pData?.some(p => p.aula_id === item.id && p.concluida);
              });
              if (unfinished) {
                alert('Conclua os itens obrigatórios do bloco antes.');
                navigate('/dashboard');
                return;
              }
            }
          }
        }

        // Linked Activity logic (for materials)
        if (lessonData.tipo === 'material' && lessonData.bloco_id) {
          const { data: blockItems } = await supabase.from('aulas').select('*').eq('bloco_id', lessonData.bloco_id).eq('livro_id', lessonData.livro_id).eq('tipo', 'atividade').limit(1);
          if (blockItems?.length) {
            const linked = blockItems[0];
            const { data: linkedSub } = await supabase.from('respostas_aulas').select('*').eq('aula_id', linked.id).eq('aluno_id', user.id).maybeSingle();
            (lessonData as any).linkedActivity = linked;
            (lessonData as any).linkedSubmission = linkedSub;
            if (Array.isArray(linked.questionario)) setQuestions(linked.questionario);
            if (linkedSub) {
              setAnswers(linkedSub.respostas || {});
              if (linkedSub.nota !== null) setResult({ score: linkedSub.nota, passed: linkedSub.nota >= (linked.min_grade || 0), pendingReview: linkedSub.status === 'pendente' });
              setSubmitted(true);
            }
          }
        }

        // Main submission fetch
        const { data: subData } = await supabase.from('respostas_aulas').select('*').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
        if (subData) {
          setExistingSubmission(subData);
          setAnswers(subData.respostas || {});
          if (subData.nota !== null) setResult({ score: subData.nota, passed: subData.nota >= (lessonData.min_grade || (lessonData.tipo === 'prova' ? 7 : 0)), pendingReview: subData.status === 'pendente' });
          
          // Timer check
          if (lessonData.is_bloco_final && subData.start_time && subData.status === 'liberado') {
            const startTime = new Date(subData.start_time).getTime();
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed < 2400) { 
              setTimeLeft(2400 - elapsed); 
              setIsExamStarted(true); 
            } else { 
              setSubmitted(true); 
              setIsExamStarted(false);
              // Auto-submit if time ran out while away
              if (subData.status === 'liberado') handleSubmit();
            }
          }
          if (subData.status !== 'liberado') setSubmitted(true);
        }

        // Enhanced Deadline & Version Logic
        if (lessonData.is_bloco_final) {
          const currentSub = subData;
          if (currentSub?.data_liberacao) {
            const libDate = new Date(currentSub.data_liberacao);
            const now = new Date();
            const min = lessonData.min_grade || 7;
            
            // Step 1: 7 days (Attempt 1)
            let stage = 1;
            let deadline = new Date(libDate.getTime() + 7 * 24 * 3600 * 1000);
            
            // Step 2: 10 days (Additional)
            const attempt1Failed = currentSub.tentativas >= 1 && currentSub.nota < min;
            const attempt1Expired = now > deadline && currentSub.tentativas === 0;
            
            if (attempt1Failed || attempt1Expired) {
              stage = 2;
              deadline = new Date(deadline.getTime() + 10 * 24 * 3600 * 1000);
            }
            
            // Step 3: 13 days (Additional)
            const attempt2Failed = currentSub.tentativas >= 2 && currentSub.nota < min;
            const attempt3Expired = now > deadline && currentSub.tentativas < 2;
            
            if (stage === 2 && (attempt2Failed || attempt3Expired)) {
              stage = 3;
              deadline = new Date(deadline.getTime() + 13 * 24 * 3600 * 1000);
            }

            const expired = now > deadline;
            setDeadlineInfo({ deadline, stage, expired });

            // Swap questions based on current stage
            if (stage === 2) {
              setQuestions(Array.isArray(lessonData.questionario_v2) ? lessonData.questionario_v2 : []);
            } else if (stage === 3) {
              setQuestions(Array.isArray(lessonData.questionario_v3) ? lessonData.questionario_v3 : []);
            }
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { 
      setLoading(false); 
    }
  }

  // Shuffle effect for matching questions
  useEffect(() => {
    if (questions.length > 0) {
      const newShuffledOpts: Record<string, string[]> = {};
      const newShuffledRows: Record<string, any[]> = {};
      
      questions.forEach((q, qIdx) => {
        const qKey = q.id || qIdx.toString();
        if (q.type === 'matching' && q.matchingPairs) {
          // Shuffle Right Options (Dropdown)
          const rightOptions = q.matchingPairs.map(p => p.right).filter(Boolean);
          for (let i = rightOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightOptions[i], rightOptions[j]] = [rightOptions[j], rightOptions[i]];
          }
          newShuffledOpts[qKey] = rightOptions;

          // Shuffle Left Rows
          const rows = [...q.matchingPairs];
          for (let i = rows.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rows[i], rows[j]] = [rows[j], rows[i]];
          }
          newShuffledRows[qKey] = rows;
        }
      });
      setShuffledOptions(newShuffledOpts);
      setShuffledMatchingRows(newShuffledRows);
    }
  }, [questions]);

  // Effect to find related exercise when lesson changes
  useEffect(() => {
    const fetchRelated = async () => {
      if (lesson) {
        // Priority 1: Direct child of this lesson (sub-activity)
        const { data: children } = await supabase
          .from('aulas')
          .select('*')
          .eq('parent_aula_id', lesson.id)
          .eq('tipo', 'atividade')
          .order('ordem', { ascending: true })
          .limit(1);

        if (children && children.length > 0) {
          setRelatedExercise(children[0]);
        } else {
          // Priority 2: Next immediate exercise in the sequence
          const { data: nextExer } = await supabase
            .from('aulas')
            .select('*')
            .eq('livro_id', lesson.livro_id)
            .gt('ordem', lesson.ordem || 0)
            .eq('tipo', 'atividade')
            .order('ordem', { ascending: true })
            .limit(1);
          
          if (nextExer && nextExer.length > 0) {
            setRelatedExercise(nextExer[0]);
          } else {
            setRelatedExercise(null);
          }
        }
        
        // Next lesson for navigation (ignore activities/exams)
        const { data: nxt } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', lesson.livro_id)
          .gt('ordem', lesson.ordem || 0)
          .neq('tipo', 'atividade')
          .neq('tipo', 'prova')
          .order('ordem', { ascending: true })
          .limit(1);
        
        setNextLessonId(nxt && nxt.length > 0 ? nxt[0].id : null);
      } else {
        setRelatedExercise(null);
        setNextLessonId(null);
      }
    }
    fetchRelated();
  }, [lesson, id]);

  const handleStartExam = async () => {
    if (!lesson || !userProfile) return;
    
    const confirmMessage = `
      AVISO DE AVALIAÇÃO:
      - Você terá 40 minutos para concluir esta prova.
      - O cronômetro NÃO para se você fechar a página.
      - Certifique-se de estar em um local tranquilo e com boa conexão.
      
      Deseja iniciar agora?
    `;

    if (!window.confirm(confirmMessage)) return;
    
    const now = new Date().toISOString();
    const { error } = await supabase.from('respostas_aulas').upsert({ 
      id: existingSubmission?.id, // Garantir update se já existir registro (ex: reinício)
      aluno_id: userProfile.id, 
      aula_id: id, 
      start_time: now, 
      status: 'liberado', 
      updated_at: now 
    });
    
    if (error) {
      console.error('Error starting exam:', error);
      return alert('Não foi possível iniciar a prova: ' + error.message);
    }
    setTimeLeft(2400); 
    setIsExamStarted(true);
  }

  const handleSubmit = async () => {
    if (!lesson || !userProfile) return
    setSubmitting(true)
    try {
      let score = 0; questions.forEach((q, idx) => {
        if (q.type === 'multiple_choice' && answers[q.id] === q.correct) score++;
        else if (q.type === 'true_false' && answers[q.id] === q.isTrue) score++;
        else if (q.type === 'matching') {
          const uA = answers[q.id || idx] || {};
          // No novo formato, uA[index_esq] armazena o index_dir selecionado
          if (q.matchingPairs?.every((_, mIdx) => String(uA[mIdx]) === String(mIdx))) {
            score++;
          }
        }
      });
      const finalS = questions.length > 0 ? (score / questions.length) * 10 : 0;
      const hasD = questions.some(q => q.type === 'discursive');
      const targetId = (lesson as any).linkedActivity?.id || id;
      const pass = hasD ? false : (finalS || 0) >= (lesson.min_grade || 7);

      const { error } = await supabase.from('respostas_aulas').upsert({
        id: (lesson as any).linkedSubmission?.id || existingSubmission?.id,
        aluno_id: userProfile.id, aula_id: targetId, respostas: answers, 
        nota: finalS || 0, status: 'pendente',
        tentativas: (existingSubmission?.tentativas || 0) + 1, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setResult({ score: finalS, passed: pass, pendingReview: true });
      setSubmitted(true); setIsExamStarted(false); setTimeLeft(null);

      // Even if not passed, we mark as 'complete' in terms of progression for the next module
      // if it was the first attempt of a block final exam.
      if (lesson.is_bloco_final && (existingSubmission?.tentativas || 0) === 0) {
        await supabase.from('progresso_aulas').upsert({ aluno_id: userProfile.id, aula_id: targetId, concluida: true });
      } else if (!lesson.is_bloco_final && pass) {
        await supabase.from('progresso_aulas').upsert({ aluno_id: userProfile.id, aula_id: targetId, concluida: true });
      }
    } catch (err: any) { 
      console.error(err);
      alert('Erro ao enviar avaliação: ' + (err.message || 'Tente novamente.'));
    }
    finally { setSubmitting(false); }
  }

  const checkBlockCompletion = async (aId: string, bId: number, lId: string) => {
    const { data: items } = await supabase.from('aulas').select('id').eq('bloco_id', bId).eq('livro_id', lId).not('tipo', 'in', '("gravada","ao_vivo")').eq('is_bloco_final', false);
    if (!items?.length) return;
    const { data: prog } = await supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', aId).in('aula_id', items.map(i => i.id)).eq('concluida', true);
    if (prog?.length === items.length) {
      // Logic for completion can be added here
    }
  }

  const handleMarkAsComplete = async () => {
    if (!lesson || !userProfile) return
    setSubmitting(true)
    try {
      await supabase.from('progresso_aulas').upsert({ aluno_id: userProfile.id, aula_id: id, concluida: true });
      setSubmitted(true); setResult({ score: 10, passed: true });
      if (lesson.bloco_id) await checkBlockCompletion(userProfile.id, lesson.bloco_id, lesson.livro_id);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  const renderVideoPlayer = (url: string) => {
    const vId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
    if (url.includes('vimeo')) return <iframe src={`https://player.vimeo.com/video/${vId}`} width="100%" height="100%" allowFullScreen style={{ borderRadius: '16px' }}></iframe>
    return <iframe src={`https://www.youtube.com/embed/${vId}`} width="100%" height="100%" allowFullScreen style={{ borderRadius: '16px' }}></iframe>
  }

  useEffect(() => {
    let int: any;
    if (isExamStarted && timeLeft && timeLeft > 0) {
      int = setInterval(() => setTimeLeft(p => { if (p && p <= 1) { clearInterval(int); handleSubmit(); return 0; } return p?p-1:0; }), 1000);
    }
    return () => clearInterval(int);
  }, [isExamStarted, timeLeft]);

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /></div>

  if (!isReleased) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem' }}>
          <Lock size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Conteúdo Bloqueado</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Esta aula ou atividade ainda não foi liberada para o seu núcleo. 
            Por favor, entre em contato com seu professor ou coordenador do pólo para solicitar a liberação.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate(-1)} className="btn btn-outline">Voltar</button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Ir para o Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lesson-container">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{width:'auto'}}>Dashboard</button>
        </div>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book?.titulo}</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{lesson.titulo}</h1>
      </div>

      {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
        <div className="video-section" style={{ marginBottom: '4rem' }}>
          <div className="video-wrapper" style={{ aspectRatio: '16/9', background: '#000', borderRadius: '24px', overflow: 'hidden' }}>
            {lesson.video_url ? renderVideoPlayer(lesson.video_url) : <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Vídeo Indisponível</div>}
          </div>
          {!submitted && <button className="btn btn-primary" onClick={handleMarkAsComplete} style={{marginTop:'2rem', width:'auto', margin:'2rem auto', display:'block'}}>Marcar como Concluída</button>}
        </div>
      )}

      {lesson.tipo === 'material' && (
        <div style={{ background: 'var(--glass)', padding: '4rem 2rem', borderRadius: '24px', textAlign: 'center', marginBottom: '4rem' }}>
          <FileText size={80} color="var(--primary)" style={{marginBottom:'1rem'}}/>
          <h2>Material de Estudo</h2>
          <button className="btn btn-primary" onClick={() => navigate(`/book/${lesson.id}?type=aula`)} style={{width:'auto', marginTop:'1rem'}}>Ver Conteúdo</button>
          {!submitted && <button className="btn btn-outline" onClick={handleMarkAsComplete} style={{width:'auto', marginTop:'1rem', marginLeft:'1rem'}}>Concluir Leitura</button>}
        </div>
      )}

      {(lesson.tipo === 'atividade' || lesson.tipo === 'prova' || questions.length > 0) && (
        <div className="quiz-section" style={{ background: 'var(--glass)', padding: '3rem', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
            <h2>{lesson.is_bloco_final ? 'Avaliação Final' : 'Questionário'}</h2>
            {isExamStarted && timeLeft && (
              <div style={{background:'var(--primary)', color:'#fff', padding:'0.5rem 1.5rem', borderRadius:'50px', fontWeight:800}}>
                TEMPO: {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
              </div>
            )}
          </div>

          {lesson.is_bloco_final && !isExamStarted && !submitted && !reviewMode ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px' }}>
              <Award size={64} color="var(--primary)" style={{marginBottom:'1rem'}}/>
              <h3>Prova do Bloco {lesson.bloco_id}</h3>
              <p>Duração: 40 minutos | Tentativa: {deadlineInfo?.stage || 1}</p>
              <p>Prazo: {deadlineInfo?.deadline.toLocaleDateString()}</p>
              {deadlineInfo?.expired && userProfile?.profile_tipo === 'aluno' && !userProfile?.isStaff ? <p style={{color:'var(--error)'}}>Prazo Expirado</p> : (
                <button className="btn btn-primary" onClick={handleStartExam} style={{width:'auto', marginTop:'1rem'}}>
                  {userProfile?.isStaff ? 'Pré-visualizar Prova' : 'Começar Agora'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {questions.map((q, idx) => (
                <div key={q.id || idx} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <p style={{fontWeight:600, fontSize:'1.1rem', marginBottom:'1.5rem'}}>{idx + 1}. {q.text}</p>
                  
                  {q.type === 'multiple_choice' && q.options?.map((opt, oIdx) => (
                    <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', background: answers[q.id] === oIdx ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', border: '1px solid var(--glass-border)', cursor: 'pointer', marginBottom:'0.5rem' }}>
                      <input type="radio" checked={answers[q.id] === oIdx} onChange={() => setAnswers(p => ({...p, [q.id]: oIdx}))} disabled={submitted && !reviewMode} /> {opt}
                    </label>
                  ))}

                  {q.type === 'true_false' && (
                    <div style={{display:'flex', gap:'1rem'}}>
                      {[true, false].map(v => (
                        <button key={v.toString()} className={`btn ${answers[q.id] === v ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAnswers(p => ({...p, [q.id]: v}))} style={{width:'auto'}}>
                          {v ? 'Verdadeiro' : 'Falso'}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'matching' && (shuffledMatchingRows[q.id || idx] || q.matchingPairs || []).map((pair, pIdx) => {
                    const qKey = q.id || idx;
                    const originalLeftIdx = q.matchingPairs?.findIndex(mp => mp.left === pair.left);
                    const currentAnswerIdx = answers[qKey]?.[originalLeftIdx !== -1 ? originalLeftIdx! : pIdx];
                    
                    return (
                      <div key={pIdx} style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.5rem'}}>
                        <div style={{flex:1, padding:'0.75rem', background:'rgba(255,255,255,0.05)', borderRadius:'8px'}}>{pair.left}</div>
                        <select 
                          className="form-control" 
                          style={{flex:1}} 
                          value={currentAnswerIdx !== undefined ? q.matchingPairs?.[parseInt(currentAnswerIdx)]?.right || '' : ''} 
                          onChange={e => {
                            const selectedRightIdx = q.matchingPairs?.findIndex(mp => mp.right === e.target.value);
                            const leftIdx = originalLeftIdx !== -1 ? originalLeftIdx! : pIdx;
                            setAnswers(p => ({
                              ...p, 
                              [qKey]: {
                                ...(typeof p[qKey] === 'object' ? p[qKey] : {}), 
                                [leftIdx]: selectedRightIdx !== -1 ? String(selectedRightIdx) : ''
                              }
                            }));
                          }} 
                          disabled={submitted}
                        >
                          <option value="">Selecione...</option>
                          {(shuffledOptions[q.id || idx] || q.matchingPairs?.map(mp => mp.right) || []).map((rightOpt, roIdx) => (
                            <option key={roIdx} value={rightOpt}>{rightOpt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {q.type === 'discursive' && (
                    <textarea className="form-control" rows={4} value={answers[q.id] || ''} onChange={e => setAnswers(p => ({...p, [q.id]: e.target.value}))} placeholder="Sua resposta..."></textarea>
                  )}
                </div>
              ))}
              {!submitted && <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 className="spinner"/> : 'Finalizar e Enviar'}</button>}
              {submitted && result && (
                <div style={{textAlign:'center', marginTop:'2rem', padding:'2rem', background:'var(--glass)', borderRadius:'16px'}}>
                  <h3>Resultado: {result.score?.toFixed(1)} / 10</h3>
                  <p>{result.passed ? 'Parabéns! Você atingiu a nota mínima.' : 'Infelizmente você não atingiu a nota mínima.'}</p>
                  <button className="btn btn-outline" onClick={() => navigate('/dashboard')} style={{width:'auto'}}>Voltar ao Painel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {relatedExercise && (
        <div style={{marginTop: '3rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px', border: '1px solid var(--glass-border)', textAlign: 'center'}}>
          <p style={{color: 'var(--text-muted)', marginBottom: '1rem', fontSize:'0.85rem'}}>Pratique agora o que você aprendeu:</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate(`/lesson/${relatedExercise.id}`)}
            style={{width:'auto', padding:'0.75rem 2rem'}}
          >
            Realizar Exercício da Lição <ArrowRight size={18} style={{marginLeft:'0.5rem'}}/>
          </button>
        </div>
      )}

      <div style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{width:'auto', padding:'1rem 2rem', borderRadius:'50px'}} title="Voltar">
          <ChevronLeft size={24} style={{marginRight:'0.5rem'}}/> Aula Anterior
        </button>
        
        {nextLessonId && (
          <button onClick={() => navigate(`/lesson/${nextLessonId}`)} className="btn btn-primary" style={{width:'auto', padding:'1rem 2rem', borderRadius:'50px'}} title="Próxima Aula">
            Próxima Aula <ChevronRight size={24} style={{marginLeft:'0.5rem'}}/>
          </button>
        )}
      </div>

      {showQuizEditor && (
        <QuizEditorModal 
          editingQuiz={lesson} setEditingQuiz={() => setShowQuizEditor(false)}
          quizQuestions={questions} setQuizQuestions={setQuestions}
          actionLoading={actionLoading} setActionLoading={setActionLoading}
          supabase={supabase} showToast={(m: string) => alert(m)}
          fetchLessons={async () => fetchLessonData()} selectedBook={book}
        />
      )}
    </div>
  )
}

export default Lesson
