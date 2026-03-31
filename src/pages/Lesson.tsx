import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Award, ChevronLeft, ArrowRight, Loader2, FileText, Lock, ChevronRight, CheckCircle, XCircle, AlertCircle, Clock, LayoutDashboard } from 'lucide-react'
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
  const [complete, setComplete] = useState(false)
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
    setAnswers({})
    setQuestions([])
    setResult(null)
    setSubmitted(false)
    setExistingSubmission(null)
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
              if (pData?.some(p => p.aula_id === id && p.concluida)) setComplete(true);
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
          const { data: blockItems } = await supabase.from('aulas').select('id, min_grade, questionario, tipo, is_bloco_final').eq('bloco_id', lessonData.bloco_id).eq('livro_id', lessonData.livro_id).eq('tipo', 'atividade').limit(1);
          if (blockItems?.length) {
            const linked = blockItems[0];
            const { data: linkedSub } = await supabase.from('respostas_aulas').select('id, respostas, nota, status, tentativas').eq('aula_id', linked.id).eq('aluno_id', user.id).maybeSingle();
            (lessonData as any).linkedActivity = linked;
            (lessonData as any).linkedSubmission = linkedSub;
            if (Array.isArray(linked.questionario)) setQuestions(linked.questionario);
            if (linkedSub) {
              setAnswers(linkedSub.respostas || {});
              if (linkedSub.nota !== null) setResult({ score: linkedSub.nota, passed: linkedSub.nota >= (linked.min_grade || 0), pendingReview: linkedSub.status === 'pendente' });
              setSubmitted(true);
            }
            const { data: pData } = await supabase.from('progresso_aulas').select('concluida').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
            if (pData?.concluida) setComplete(true);
          }
        }

        // Main submission fetch
        const { data: subData } = await supabase.from('respostas_aulas').select('id, respostas, nota, status, start_time, data_liberacao, tentativas').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
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
        const { data: progData } = await supabase.from('progresso_aulas').select('concluida').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
        if (progData?.concluida) setComplete(true);

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
          .select('id, titulo, tipo, ordem')
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
            .select('id, titulo, tipo, ordem')
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
        const qKey = q.id || idx;
        const studentAns = answers[qKey];
        if (q.type === 'multiple_choice' || !q.type) {
          if (studentAns !== undefined && studentAns !== null && String(studentAns) === String(q.correct)) score++;
        }
        else if (q.type === 'true_false' && studentAns === q.isTrue) score++;
        else if (q.type === 'matching') {
          const uA = studentAns || {};
          // No novo formato, uA[index_esq] armazena o index_dir selecionado
          if (q.matchingPairs?.every((_, mIdx) => String(uA[mIdx]) === String(mIdx))) {
            score++;
          }
        }
      });
      const finalS = questions.length > 0 ? (score / questions.length) * 10 : 0;
      const hasD = questions.some(q => q.type === 'discursive');
      const targetId = (lesson as any).linkedActivity?.id || id;

      // Determine correct reference for current attempt count
      const currentSub = (lesson as any).linkedActivity ? (lesson as any).linkedSubmission : existingSubmission;
      const targetLesson = (lesson as any).linkedActivity || lesson;

      // Rule: Provas and final assessments are ALWAYS manual/teacher-corrected.
      const isFinal = targetLesson.tipo === 'prova' || targetLesson.is_bloco_final;
      const status = (!isFinal && !hasD) ? 'corrigida' : 'pendente';
      const pass = isFinal ? false : (hasD ? false : (finalS || 0) >= (targetLesson.min_grade || 7));

      const payload: any = {
        aluno_id: userProfile.id, 
        aula_id: targetId, 
        respostas: answers, 
        nota: finalS || 0, // Recorded but not yet definitive/official for finals
        status: status,
        tentativas: (currentSub?.tentativas || 0) + 1, 
        updated_at: new Date().toISOString()
      };
      if (currentSub?.id) payload.id = currentSub.id;

      const { error } = await supabase.from('respostas_aulas').upsert(payload, { onConflict: 'aluno_id,aula_id' });
      if (error) throw error;

      // Pop-ups based on lesson type
      if (isFinal) {
        alert('Prova enviada com sucesso! O professor corrigirá todas as questões manualmente com base no gabarito oficial.');
      } else {
        alert('Exercício finalizado! Progresso registrado.');
      }

      setResult({ score: finalS, passed: pass, pendingReview: status === 'pendente' });
      setSubmitted(true); setIsExamStarted(false); setTimeLeft(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Official Progress tracking: 
      // Activities (exercícios/vídeos) fill the progress bar.
      // Exams (provas) unlock the next module but NOT the progress bar.
      if (!isFinal) {
        // Regular activity or content
        await supabase.from('progresso_aulas').upsert({ aluno_id: userProfile.id, aula_id: targetId, concluida: true }, { onConflict: 'aluno_id,aula_id' });
        setComplete(true);
      } else {
        // This is a Prova (isFinal is true).
        // It DOES NOT record progress (concluida: true) in progresso_aulas, 
        // because evaluations don't fill the progress bar as per user request.
        if (targetLesson.is_bloco_final && pass) {
          // Special scroll for module completion
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 500);
        }
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
      await supabase.from('progresso_aulas').upsert({ aluno_id: userProfile.id, aula_id: id, concluida: true }, { onConflict: 'aluno_id,aula_id' });
      setComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {!complete && <button className="btn btn-primary" onClick={handleMarkAsComplete} style={{marginTop:'2rem', width:'auto', margin:'2rem auto', display:'block'}}>Marcar como Concluída</button>}
        </div>
      )}

      {lesson.tipo === 'material' && (
        <div style={{ background: 'var(--glass)', padding: '4rem 2rem', borderRadius: '24px', textAlign: 'center', marginBottom: '4rem' }}>
          <FileText size={80} color="var(--primary)" style={{marginBottom:'1rem'}}/>
          <h2>Material de Estudo</h2>
          <button className="btn btn-primary" onClick={() => navigate(`/book/${lesson.id}?type=aula`)} style={{width:'auto', marginTop:'1rem'}}>Ver Conteúdo</button>
          {!complete && <button className="btn btn-outline" onClick={handleMarkAsComplete} style={{width:'auto', marginTop:'1rem', marginLeft:'1rem'}}>Concluir Leitura</button>}
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
              {questions.map((q, idx) => {
                const qKey = q.id || idx;
                const studentAns = answers[qKey];
                const isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                  q.type === 'true_false' ? studentAns === q.isTrue :
                                  q.type === 'matching' ? q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) : true;
                
                // O gabarito agora só é mostrado no modo de revisão (GradesPanel) ou se for prova já corrigida
                const showGabarito = reviewMode || ((lesson?.tipo === 'prova' || lesson?.is_bloco_final) && existingSubmission?.status === 'corrigida');

                return (
                  <div key={qKey} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: showGabarito && submitted ? `1px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}` : '1px solid var(--glass-border)' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <p style={{fontWeight:600, fontSize:'1.1rem', marginBottom:'1.5rem', flex: 1}}>{idx + 1}. {q.text}</p>
                      {showGabarito && submitted && (
                        <div style={{color: isCorrect ? 'var(--success)' : 'var(--error)', display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.85rem', whiteSpace:'nowrap', background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding:'0.4rem 0.8rem', borderRadius:'8px', marginLeft:'1rem'}}>
                          {isCorrect ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                          {isCorrect ? 'Correto' : 'Resposta Incorreta'}
                        </div>
                      )}
                    </div>
                    
                    {(q.type === 'multiple_choice' || !q.type) && q.options?.map((opt, oIdx) => (
                      <label key={oIdx} style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', 
                        background: answers[qKey] === oIdx ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', 
                        border: showGabarito && submitted && q.correct === oIdx ? '1px solid var(--success)' : (showGabarito && submitted && answers[qKey] === oIdx && !isCorrect ? '1px solid var(--error)' : '1px solid var(--glass-border)'), 
                        cursor: 'pointer', marginBottom:'0.5rem' 
                      }}>
                        <input type="radio" checked={answers[qKey] === oIdx} onChange={() => setAnswers(p => ({...p, [qKey]: oIdx}))} disabled={submitted && !reviewMode} /> 
                        <span style={{flex:1}}>{opt}</span>
                        {showGabarito && submitted && q.correct === oIdx && <CheckCircle size={16} color="var(--success)"/>}
                        {showGabarito && submitted && answers[qKey] === oIdx && !isCorrect && <XCircle size={16} color="var(--error)"/>}
                      </label>
                    ))}

                    {q.type === 'true_false' && (
                      <div style={{display:'flex', gap:'1rem'}}>
                        {[true, false].map(v => (
                          <button 
                            key={v.toString()} 
                            className={`btn ${answers[qKey] === v ? 'btn-primary' : 'btn-outline'}`} 
                            onClick={() => setAnswers(p => ({...p, [qKey]: v}))} 
                            style={{
                              width:'auto',
                              border: showGabarito && submitted && q.isTrue === v ? '2px solid var(--success)' : (showGabarito && submitted && answers[qKey] === v && !isCorrect ? '2px solid var(--error)' : '')
                            }}
                            disabled={submitted}
                          >
                            {v ? 'Verdadeiro' : 'Falso'}
                            {showGabarito && submitted && q.isTrue === v && <CheckCircle size={14} style={{marginLeft:'0.5rem'}}/>}
                            {showGabarito && submitted && answers[qKey] === v && !isCorrect && <XCircle size={14} style={{marginLeft:'0.5rem'}}/>}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'matching' && (shuffledMatchingRows[qKey] || q.matchingPairs || []).map((pair, pIdx) => {
                      const originalLeftIdx = q.matchingPairs?.findIndex(mp => mp.left === pair.left);
                      const currentAnswerIdxStr = answers[qKey]?.[originalLeftIdx !== -1 ? originalLeftIdx! : pIdx];
                      const currentAnswerIdx = currentAnswerIdxStr !== undefined && currentAnswerIdxStr !== '' ? parseInt(currentAnswerIdxStr) : undefined;
                      const isRowCorrect = currentAnswerIdx === (originalLeftIdx !== -1 ? originalLeftIdx : pIdx);
                      
                      return (
                        <div key={pIdx} style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.5rem'}}>
                          <div style={{flex:1, padding:'0.75rem', background:'rgba(255,255,255,0.05)', borderRadius:'8px'}}>{pair.left}</div>
                          <select 
                            className="form-control" 
                            style={{
                              flex:1,
                              border: showGabarito && submitted ? (isRowCorrect ? '1px solid var(--success)' : '1px solid var(--error)') : ''
                            }} 
                            value={currentAnswerIdx !== undefined ? q.matchingPairs?.[currentAnswerIdx]?.right || '' : ''} 
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
                            {(shuffledOptions[qKey] || q.matchingPairs?.map(mp => mp.right) || []).map((rightOpt, roIdx) => (
                              <option key={roIdx} value={rightOpt}>{rightOpt}</option>
                            ))}
                          </select>
                          {showGabarito && submitted && (isRowCorrect ? <CheckCircle size={18} color="var(--success)"/> : <XCircle size={18} color="var(--error)"/>)}
                        </div>
                      );
                    })}

                    {q.type === 'discursive' && (
                      <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                        <textarea className="form-control" rows={4} value={answers[qKey] || ''} onChange={e => setAnswers(p => ({...p, [qKey]: e.target.value}))} placeholder="Sua resposta..." disabled={submitted}></textarea>
                        {showGabarito && submitted && q.expectedAnswer && (
                          <div style={{marginTop:'1rem', padding:'1rem', background:'rgba(var(--primary-rgb), 0.1)', borderRadius:'12px', fontSize:'0.9rem'}}>
                            <strong style={{color:'var(--primary)', display:'block', marginBottom:'0.5rem'}}>Gabarito sugerido:</strong>
                            {q.expectedAnswer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!submitted && <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 className="spinner"/> : 'Finalizar e Enviar'}</button>}
              {submitted && result && (
                <div style={{textAlign:'center', marginTop:'2rem', padding:'2rem', background:'var(--glass)', borderRadius:'16px', border: '1px solid var(--glass-border)'}}>
                  {((lesson?.tipo === 'prova' || lesson?.is_bloco_final) && (existingSubmission?.status !== 'corrigida' && result.pendingReview)) ? (
                    <>
                      <Clock size={48} color="var(--warning)" style={{marginBottom:'1rem'}}/>
                      <h3>Avaliação Enviada!</h3>
                      <p style={{color:'var(--text-muted)'}}>Sua prova foi enviada para correção. Por favor, aguarde o feedback do professor no seu boletim.</p>
                    </>
                  ) : (
                    <>
                      {(lesson.tipo === 'prova' || lesson.is_bloco_final) && result.pendingReview ? (
                        <>
                          <Clock size={40} color="var(--warning)" style={{marginBottom:'1rem'}}/>
                          <h2 style={{ color: 'var(--warning)', fontWeight: 800, marginBottom: '0.5rem' }}>Prova em Correção</h2>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Sua avaliação foi enviada e será corrigida manualmente pelo professor.</p>
                        </>
                      ) : (
                        <>
                          <Award size={40} color="var(--primary)" style={{marginBottom:'1rem'}}/>
                          {lesson.is_bloco_final && result.passed && (
                            <>
                              <h2 style={{ color: 'var(--success)', fontWeight: 800, marginBottom: '0.5rem' }}>Módulo Completo!</h2>
                              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--success) 0%, #10b981 100%)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}></div>
                              </div>
                            </>
                          )}
                          {lesson.is_bloco_final && !result.passed && (
                            <h2 style={{ color: 'var(--error)', fontWeight: 800, marginBottom: '1rem' }}>Refazer o Módulo</h2>
                          )}
                          <h3>Resultado: {result.score?.toFixed(1)} / 10</h3>
                          {result.passed ? (
                            <p>Parabéns! Você atingiu a nota mínima.</p>
                          ) : (
                            <h2 style={{ color: 'var(--error)', fontWeight: 800, marginTop: '1rem' }}>Refazer o Módulo</h2>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <div style={{display:'flex', gap:'1rem', justifyContent:'center', marginTop:'2rem'}}>
                    <button className="btn btn-outline" onClick={() => navigate('/dashboard')} style={{width:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                      <LayoutDashboard size={18}/> Voltar ao Painel
                    </button>
                    {nextLessonId && (
                      <button className="btn btn-primary" onClick={() => navigate(`/lesson/${nextLessonId}`)} style={{width:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        Próxima Aula <ChevronRight size={18}/>
                      </button>
                    )}
                  </div>
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
