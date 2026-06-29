import React, { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Award, ChevronLeft, ArrowRight, Loader2, FileText, Lock, ChevronRight, CheckCircle, XCircle, Clock, LayoutDashboard, CheckCircle2, MessageSquare, ExternalLink, X, BookOpen, List, Menu } from 'lucide-react'
import AudioReader from '../components/AudioReader'
import QuizEditorModal from '../features/courses/components/modals/QuizEditorModal'
import ExercicioFixacao from '../features/courses/components/ExercicioFixacao'
import AvaliacaoFixacao from '../features/courses/components/AvaliacaoFixacao'
import { QuizQuestion } from '../types/admin'
import { processHtmlForNav, NavItem } from '../features/courses/utils/htmlNav'
import { BibleReaderPopup } from '../components/BibleReaderPopup'
import { processHtmlWithReferences } from '../lib/bibleParser'

function parseBibliaLocal(text: string): Record<string, string> {
  const match = text.match(/(?:const|let|var)\s+BIBLIA_LOCAL\s*=\s*({)/)
  if (!match) return {}

  const objStart = match.index! + match[0].length - 1
  let depth = 0
  let inString = false
  let escape = false
  let objEnd = -1

  for (let i = objStart; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (!inString) {
      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) { objEnd = i; break }
      }
    }
  }

  if (objEnd === -1) return {}

  const objStr = text.substring(objStart, objEnd + 1)

  try {
    return new Function('return (' + objStr + ')')()
  } catch {
    // Fallback: manually parse key-value pairs from the object literal
    const result: Record<string, string> = {}
    let i = 1
    while (i < objStr.length) {
      while (i < objStr.length && objStr[i] !== '"') i++
      if (i >= objStr.length) break
      const keyStart = i + 1
      i++
      while (i < objStr.length) {
        if (objStr[i] === '\\') { i += 2; continue }
        if (objStr[i] === '"') break
        i++
      }
      const key = objStr.substring(keyStart, i)
      i++
      while (i < objStr.length && objStr[i] !== '"') i++
      if (i >= objStr.length) break
      const valStart = i + 1
      i++
      while (i < objStr.length) {
        if (objStr[i] === '\\') { i += 2; continue }
        if (objStr[i] === '"') break
        i++
      }
      const val = objStr.substring(valStart, i)
        .replace(/\\(["\\/bfnrt])/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === 'b' ? '\b' : c === 'f' ? '\f' : c)
        .replace(/\\(u[0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      result[key] = val
      i++
    }
    return Object.keys(result).length > 0 ? result : {}
  }
}

const Lesson = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<any>(null)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<{ score: number | null; passed: boolean; pendingReview?: boolean; scoreOriginal?: number | null; canRetry?: boolean } | null>(null)
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
  const [showExamModal, setShowExamModal] = useState(false)
  const [activeReference, setActiveReference] = useState<{ id: string; text: string; source: string } | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [bibliaLocal, setBibliaLocal] = useState<Record<string, string>>({})
  const [htmlLoading, setHtmlLoading] = useState(false)
  const [toc, setToc] = useState<NavItem[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [examModalConfirmed, setExamModalConfirmed] = useState(false)
  const [isModuleApproved] = useState(false)
  const [isModuleFinished, setIsModuleFinished] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const submittedRef = useRef(submitted)
  submittedRef.current = submitted
  const [alreadyApproved, setAlreadyApproved] = useState(false)
  const [lessonMap, setLessonMap] = useState<Record<string, string>>({})
  const [moduleLessons, setModuleLessons] = useState<any[]>([])
  const [isPanorama, setIsPanorama] = useState(false)
  const [showBibleReader, setShowBibleReader] = useState(false)
  const [wikiPopup, setWikiPopup] = useState<{ titulo: string; texto: string; tipo: string } | null>(null)

  // Assessment System State
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [deadlineInfo] = useState<{ deadline: Date, stage: number, expired: boolean } | null>(null)
  const [relatedExercise, setRelatedExercise] = useState<any>(null)
  const [prevLessonId, setPrevLessonId] = useState<string | null>(null)
  const [nextLessonId, setNextLessonId] = useState<string | null>(null)

  const checarAcessoSeguroAvaliacao = async (alunoId: string, moduloId: string, aulaAtual: any, nucleoId?: string) => {
    const NOTA_APROVACAO = 7.0;

    // Non-exam items are handled by module-level release, not individual exam control
    if (aulaAtual.tipo !== 'prova' && aulaAtual.tipo !== 'avaliacao' && !aulaAtual.is_bloco_final) {
      return true;
    }

    // Get all exams in the module sorted by ordem to determine version position
    const { data: exames } = await supabase
      .from('aulas')
      .select('id, titulo, versao, ordem, is_bloco_final')
      .eq('livro_id', moduloId)
      .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
      .order('ordem', { ascending: true });

    const idx = (exames || []).findIndex((e: any) => e.id === aulaAtual.id);
    if (idx === -1) return false;

    // First exam in module = V1: check professor_active + nucleo release
    if (idx === 0) {
      if (aulaAtual.professor_active === false) return false;
      let query = supabase
        .from('liberacoes_nucleo')
        .select('liberado')
        .eq('item_id', aulaAtual.id);
      if (nucleoId) {
        query = query.or(`nucleo_id.eq.${nucleoId},nucleo_id.is.null`);
      } else {
        query = query.is('nucleo_id', null);
      }
      const { data: rel } = await query.maybeSingle();
      return !!rel?.liberado;
    }

    // V2/V3+: check if the previous exam was attempted and failed
    const prevExam = exames![idx - 1];
    const { data: sub } = await supabase
      .from('respostas_aulas')
      .select('nota, status')
      .eq('aula_id', prevExam.id)
      .eq('aluno_id', alunoId)
      .maybeSingle();

    return !!sub && sub.status === 'corrigida' && (sub.nota ?? 0) < NOTA_APROVACAO;
  };

  useEffect(() => {
    fetchLessonData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const fetchLessonData = async () => {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      // Try to match by title (for .html links from lesson content)
      const decoded = decodeURIComponent(id || '').replace(/\/+$/, '').replace(/\.html?$/i, '').toLowerCase().trim()
      if (decoded) {
        const { data: match } = await supabase
          .from('aulas')
          .select('id')
          .ilike('titulo', decoded)
          .limit(1)
        if (match && match.length > 0) {
          navigate(`/lesson/${match[0].id}`, { replace: true })
          return
        }
      }
      setLoading(false)
      return
    }
    setLoading(true)
    setAnswers({})
    setQuestions([])
    setResult(null)
    setSubmitted(false)
    setExistingSubmission(null)
        const { data: lessonData, error: lessonError } = await supabase
          .from('aulas')
          .select('*')
          .eq('id', id)
          .maybeSingle();
            
        if (lessonError) throw lessonError;
        if (!lessonData) return;
        const versao = lessonData.versao || 1;
        
        // Fetch book separately to avoid join issues with RLS
        const { data: bookData } = await supabase
          .from('livros')
          .select('*')
          .eq('id', lessonData.livro_id)
          .maybeSingle();

        setLesson(lessonData);
        setBook(bookData);
        setQuestions(Array.isArray(lessonData?.questionario) ? lessonData.questionario : []);
        
        // Check if this is a Panorama (by title)
        const isPanoramaLesson = lessonData.titulo?.toLowerCase().startsWith('panorama');
        setIsPanorama(isPanoramaLesson);
        
        // If Panorama, fetch all lessons in the module for the Tópicos menu
        if (isPanoramaLesson && lessonData.livro_id) {
          const { data: allModuleLessons } = await supabase
            .from('aulas')
            .select('id, titulo, ordem, tipo')
            .eq('livro_id', lessonData.livro_id)
            .neq('tipo', 'atividade')
            .neq('tipo', 'prova')
            .neq('tipo', 'avaliacao')
            .neq('tipo', 'exercicio')
            .order('ordem', { ascending: true });
          
          if (allModuleLessons) {
            // Filter to only actual lessons (not panorama)
            const lessons = allModuleLessons.filter(l => 
              (l.tipo === 'licao' || l.tipo === 'material' || l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video') 
              && !l.titulo?.toLowerCase().startsWith('panorama')
            );
            setModuleLessons(lessons);
          }
        }


      // Fetch HTML content from arquivo_url if it's a supported type
      if (lessonData.arquivo_url) {
        const isHtml = /\.html?$/i.test(lessonData.arquivo_url);
        const isPdf = /\.pdf$/i.test(lessonData.arquivo_url);
       if (isHtml && !isPdf) {
          setHtmlLoading(true);
          try {
            const resp = await fetch(lessonData.arquivo_url);
            const text = await resp.text();
            const { processedHtml, toc: extractedToc } = processHtmlForNav(text);
            const { processed: bibleProcessed } = processHtmlWithReferences(processedHtml);
            setHtmlContent(bibleProcessed);
            setToc(extractedToc);

            const dict = parseBibliaLocal(text);
            setBibliaLocal(dict);
         } catch (err) {
           console.error('Failed to fetch HTML content:', err);
         } finally {
           setHtmlLoading(false);
         }
       }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('tipo, caminhos_acesso, nucleo_id').eq('id', user.id).maybeSingle();
        const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo?.toLowerCase() || '') || (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r.toLowerCase()));
        setUserProfile({ ...user, profile_tipo: profile?.tipo, caminhos_acesso: profile?.caminhos_acesso, nucleo_id: profile?.nucleo_id, isStaff });

        // 1. Audit: Content Release Policy — fetch submissions + aula data without nested join
        let modulePassed = false;
        let allSubs: any[] = [];
        if (lessonData.livro_id) {
          const { data: rawSubs } = await supabase.from('respostas_aulas')
            .select('id, aula_id, nota, status, tentativas, created_at')
            .eq('aluno_id', user.id);

          const subAulaIds = [...new Set((rawSubs || []).map((s: any) => s.aula_id).filter(Boolean))];
          const aulaMap: Record<string, any> = {};
          if (subAulaIds.length > 0) {
            const { data: aulasData } = await supabase.from('aulas')
              .select('id, livro_id, tipo, versao, min_grade, is_bloco_final, titulo')
              .in('id', subAulaIds);
            (aulasData || []).forEach((a: any) => { aulaMap[a.id] = a; });
          }
          allSubs = (rawSubs || []).map((s: any) => ({
            ...s,
            aulas: aulaMap[s.aula_id] || null
          }));

          const moduleSubs = allSubs.find((s: any) => 
            s.aulas?.livro_id === lessonData.livro_id && 
            s.aulas?.is_bloco_final && 
            s.status === 'corrigida' && 
            (s.nota || 0) >= 7.0
          );
          if (moduleSubs) modulePassed = true;

          if (!modulePassed) {
            const approvedInAny = allSubs.some((s: any) => {
              const isExam = s.aulas?.tipo === 'prova' || s.aulas?.tipo === 'avaliacao' || s.aulas?.is_bloco_final;
              const minGrade = s.aulas?.min_grade || 7.0;
              return s.aulas?.livro_id === lessonData.livro_id && isExam && s.status === 'corrigida' && (s.nota || 0) >= minGrade;
            });
            if (approvedInAny) modulePassed = true;
          }
        }

        const isExam = lessonData.tipo === 'prova' || lessonData.tipo === 'avaliacao' || !!lessonData.is_bloco_final;

        // Staff e alunos com módulo completo têm acesso total
        if (isStaff || modulePassed) {
          setIsReleased(true);
        } else {
          const acesso = await checarAcessoSeguroAvaliacao(user.id, lessonData.livro_id, lessonData, profile?.nucleo_id);
          setIsReleased(acesso);
        }

        // 2. Main Logic: Submission Fetch & Timer
        const { data: subData } = await supabase.from('respostas_aulas').select('*').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
        if (subData) {
          setExistingSubmission(subData);
          setAnswers(subData.respostas || {});
          if (subData.nota !== null && subData.status !== 'liberado') setResult({ score: subData.nota, passed: subData.nota >= (lessonData.min_grade || (lessonData.tipo === 'prova' || lessonData.tipo === 'avaliacao' ? 7 : 0)), pendingReview: subData.status === 'pendente' });
          
          if (lessonData.is_bloco_final && subData.start_time && subData.status === 'liberado') {
            const startTime = new Date(subData.start_time).getTime();
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed < 2400) { setTimeLeft(2400 - elapsed); setIsExamStarted(true); } 
            else { setSubmitted(true); setIsExamStarted(false); handleSubmit(); }
          }

          if (subData.status !== 'liberado') {
            const isExam = lessonData.tipo === 'prova' || lessonData.tipo === 'avaliacao' || lessonData.is_bloco_final;
            const canRetake = isExam && subData.status === 'corrigida' && subData.nota !== null && subData.nota < (lessonData.min_grade || (lessonData.tipo === 'prova' || lessonData.tipo === 'avaliacao' ? 7 : 0)) && (subData.tentativas || 0) < 3;
            
            if (!canRetake) {
              setSubmitted(true);
            }
            if (isExam && subData.status !== 'corrigida' && !isStaff) {
              alert('Você já enviou esta avaliação. Por favor, aguarde o feedback do professor.');
              navigate('/dashboard');
              return;
            }
          }
        }

        // 2.5 BLOQUEIO DE RECUPERAÇÃO: Se for V2/V3 e já passou na V1/V2, ou não fez a anterior
        if (!isStaff && (versao === 2 || versao === 3)) {
          // Use the already-fetched allSubs (no join needed)
          const moduleSubs = allSubs.filter((s: any) => s.aulas?.livro_id === lessonData.livro_id);
          
          // Check if student already passed the HIGHEST version of the exam for this module
          const examSubs = moduleSubs.filter(s => {
            const aula = s.aulas as any;
            return aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || aula?.is_bloco_final || /V[1-3]|RECUPERAÇ/i.test(aula?.titulo || '');
          });
          
          let passedAny = false;
          if (examSubs.length > 0) {
            const highestExam = examSubs.reduce((prev, current) => {
              const prevV = (prev.aulas as any)?.versao || 1;
              const currV = (current.aulas as any)?.versao || 1;
              if (currV > prevV) return current;
              if (currV < prevV) return prev;
              return new Date(current.created_at || 0).getTime() > new Date(prev.created_at || 0).getTime() ? current : prev;
            });
            const highestAula = highestExam.aulas as any;
            const minGrade = highestAula?.min_grade || 7.0;
            // Se a última prova feita tem versão menor que a atual, e ele passou nela, então alreadyApproved
            if (((highestAula?.versao || 1) < versao) && highestExam.status === 'corrigida' && (highestExam.nota || 0) >= minGrade) {
              passedAny = true;
            }
          }

          const { data: individualRelease, error: indivErr } = await supabase
            .from('liberacoes_excecao_atividade')
            .select('id')
            .eq('user_id', user.id)
            .eq('aula_id', id)
            .maybeSingle();

          const tableMissing = indivErr && (indivErr.code === '42P01' || /does not exist/i.test(indivErr.message));
          const hasIndividualRelease = !tableMissing && !!individualRelease;

          if (!hasIndividualRelease && passedAny) {
            setAlreadyApproved(true);
            setLoading(false);
            return;
          }
          
          const didPrevious = moduleSubs.some(s => {
            const aula = s.aulas as any;
            const isExam = aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || aula?.is_bloco_final;
            const v = aula?.versao || 1;
            return isExam && v === versao - 1 && s.status === 'corrigida';
          });

          if (!hasIndividualRelease && !didPrevious) {
            alert('Você precisa realizar a versão anterior desta prova antes de acessar a recuperação.');
            navigate('/dashboard');
            return;
          }
        }

        const { data: progData } = await supabase.from('progresso').select('concluida').eq('aula_id', id).eq('aluno_id', user.id).maybeSingle();
        if (progData?.concluida) setComplete(true);

        // Linked Activity logic (for materials)
        if (lessonData.tipo === 'material' && lessonData.bloco_id) {
           const { data: blockItems } = await supabase.from('aulas').select('id, min_grade, questionario, tipo, is_bloco_final').eq('bloco_id', lessonData.bloco_id).eq('livro_id', lessonData.livro_id).eq('tipo', 'atividade').limit(1);
           if (blockItems?.length) {
              const linked = blockItems[0];
              const { data: linkedSub } = await supabase.from('respostas_aulas').select('*').eq('aula_id', linked.id).eq('aluno_id', user.id).maybeSingle();
              (lessonData as any).linkedActivity = linked;
              if (linkedSub) {
                 if (linkedSub.nota !== null) setResult({ score: linkedSub.nota, passed: linkedSub.nota >= (linked.min_grade || 0), pendingReview: linkedSub.status === 'pendente' });
                 setSubmitted(true);
              }
           }
        }
        // 3. Check if module is finished
        if (lessonData.livro_id) {
          const { data: bookAulas } = await supabase.from('aulas').select('id, tipo, is_bloco_final, livro_id').eq('livro_id', lessonData.livro_id);
          const bookSubs = allSubs.filter((s: any) => s.aulas?.livro_id === lessonData.livro_id);
          
          const finished = bookSubs.some(s => {
            const isEx = (bookAulas || []).some(ba => ba.id === s.aula_id && (ba.tipo === 'prova' || ba.tipo === 'avaliacao' || ba.is_bloco_final));
            return isEx && s.status === 'corrigida' && ((s.nota || 0) >= 7.0);
          });
          setIsModuleFinished(finished);
        }
      }
      setLoading(false)
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
        
        // Previous lesson for navigation (only actual lessons: licao, material)
        const { data: prev } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', lesson.livro_id)
          .lt('ordem', lesson.ordem || 0)
          .in('tipo', ['licao', 'material'])
          .order('ordem', { ascending: false })
          .limit(1);
        
        let prevId = prev && prev.length > 0 ? prev[0].id : null;

        // If Panorama is positioned after lessons (higher ordem), 
        // lessons before it won't find Panorama as prev. Fallback to Panorama.
        if (!prevId && !isPanorama && lesson.livro_id) {
          const { data: panorama } = await supabase
            .from('aulas')
            .select('id')
            .eq('livro_id', lesson.livro_id)
            .ilike('titulo', 'Panorama')
            .limit(1);
          if (panorama && panorama.length > 0) {
            prevId = panorama[0].id;
          }
        }
        
        setPrevLessonId(prevId);

        // Next lesson for navigation (only actual lessons: licao, material)
        const { data: nxt } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', lesson.livro_id)
          .gt('ordem', lesson.ordem || 0)
          .in('tipo', ['licao', 'material'])
          .order('ordem', { ascending: true })
          .limit(1);
        
        let nextId = nxt && nxt.length > 0 ? nxt[0].id : null;

        // If Panorama is positioned after lessons (e.g. ordem 11), 
        // fallback to the first lesson as "next"
        if (!nextId && isPanorama && lesson.livro_id) {
          const { data: firstLesson } = await supabase
            .from('aulas')
            .select('id')
            .eq('livro_id', lesson.livro_id)
            .in('tipo', ['licao', 'material'])
            .neq('id', lesson.id)
            .order('ordem', { ascending: true })
            .limit(1);
          if (firstLesson && firstLesson.length > 0) {
            nextId = firstLesson[0].id;
          }
        }
        
        setNextLessonId(nextId);

        // Load all lessons from this book for content link mapping
        const { data: allLessons } = await supabase
          .from('aulas')
          .select('id, titulo')
          .eq('livro_id', lesson.livro_id);
        if (allLessons) {
          const map: Record<string, string> = {};
          for (const l of allLessons) {
            if (l.titulo) map[l.titulo.toLowerCase().trim()] = l.id;
          }
          setLessonMap(map);
        }
      } else {
        setRelatedExercise(null);
        setPrevLessonId(null);
        setNextLessonId(null);
      }
    }
    fetchRelated();
  }, [lesson, id]);

  const handleStartExam = async () => {
    if (!lesson || !userProfile) return;
    
    // Staffs don't start the "exam mode" (no timer, no lock)
    if (userProfile?.isStaff) {
      setExamModalConfirmed(true);
      setSubmitted(false);
      return;
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('respostas_aulas').upsert({ 
      id: existingSubmission?.id,
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
    setExamModalConfirmed(true);
    setSubmitted(false);
  }

  const handleStartRegularProva = async () => {
    if (!lesson || !userProfile) return;

    if (userProfile?.isStaff) {
      setExamModalConfirmed(true);
      setSubmitted(false);
      return;
    }

    const now = new Date().toISOString();
    const payload: any = { 
      aluno_id: userProfile.id, 
      aula_id: id, 
      start_time: existingSubmission?.start_time || now, 
      status: 'liberado', 
      updated_at: now 
    };
    // Only initialize respostas for NEW exams; preserve existing answers for in-progress exams
    if (!existingSubmission) {
      payload.respostas = {};
    } else if (existingSubmission.status !== 'liberado') {
      payload.respostas = answers;
    }
    if (existingSubmission?.id) payload.id = existingSubmission.id;
    const { error } = await supabase.from('respostas_aulas').upsert(payload, { onConflict: 'aluno_id,aula_id' });
    if (error) return alert('Não foi possível iniciar a prova: ' + error.message);
    const { data: sub } = await supabase.from('respostas_aulas').select('id').eq('aula_id', id as string).eq('aluno_id', userProfile.id).maybeSingle();
    if (sub) setExistingSubmission(sub);
    setExamModalConfirmed(true);
    setSubmitted(false);
  }


  const handleSaveProgress = async () => {
    if (!lesson || !userProfile) return;
    setSubmitting(true);
    try {
      const targetId = (lesson as any).linkedActivity?.id || id;
      const currentSub = existingSubmission;
      
      const payload: any = {
        aluno_id: userProfile.id, 
        aula_id: targetId, 
        respostas: answers, 
        status: 'pendente',
        updated_at: new Date().toISOString()
      };
      if (currentSub?.id) payload.id = currentSub.id;

      const { error } = await supabase.from('respostas_aulas').upsert(payload, { onConflict: 'aluno_id,aula_id' });
      if (error) throw error;

      alert('Respostas salvas com sucesso! Você pode continuar depois.');
    } catch (err: any) { 
      console.error(err);
      alert('Erro ao salvar respostas: ' + (err.message || 'Tente novamente.'));
    }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (isSavingGabarito: boolean = false) => {
    console.log('[Lesson.handleSubmit] Iniciando');
    console.log('[Lesson.handleSubmit] lesson:', lesson);
    console.log('[Lesson.handleSubmit] userProfile:', userProfile);
    console.log('[Lesson.handleSubmit] id:', id);
    
    if (!lesson || !userProfile) {
      console.error('[Lesson.handleSubmit] ERRO: lesson ou userProfile é null/undefined');
      return
    }
    
    const targetId = (lesson as any).linkedActivity?.id || id;
    
    if (userProfile?.isStaff && isSavingGabarito) {
      const gabarito = questions.map((q, idx) => {
        const qKey = q.id || idx;
        const adminAns = answers[qKey];
        const gabaritoQ = { ...q };
        if (q.type === 'multiple_choice' || !q.type) {
          gabaritoQ.correct = typeof adminAns === 'number' ? adminAns : (q.correct ?? 0);
        } else if (q.type === 'true_false') {
          gabaritoQ.isTrue = typeof adminAns === 'boolean' ? adminAns : (q.isTrue ?? true);
        } else if (q.type === 'matching') {
          gabaritoQ.matchingPairs = q.matchingPairs?.map((pair, mIdx) => {
            const selectedIdx = adminAns?.[mIdx];
            if (selectedIdx !== undefined && selectedIdx !== '') {
              const selectedRight = q.matchingPairs?.[parseInt(selectedIdx)];
              return { left: pair.left, right: selectedRight?.right || pair.right };
            }
            return pair;
          });
        } else if (q.type === 'discursive') {
          gabaritoQ.expectedAnswer = adminAns || q.expectedAnswer || '';
        }
        return gabaritoQ;
      });

      const { error } = await supabase.from('aulas').update({ questionario: gabarito }).eq('id', targetId);
      if (error) throw error;
      alert('Gabarito Oficial salvo com sucesso!');
      setSubmitting(false);
      return;
    }
    try {
      let score = 0; 
      
      const targetId = (lesson as any).linkedActivity?.id || id;

      const targetLesson = (lesson as any).linkedActivity || lesson;
      const currentSub = (lesson as any).linkedActivity ? (lesson as any).linkedSubmission : existingSubmission;
      
      console.log('[Lesson.handleSubmit] targetId:', targetId);
      console.log('[Lesson.handleSubmit] targetLesson:', targetLesson);
      console.log('[Lesson.handleSubmit] currentSub:', currentSub);
      console.log('[Lesson.handleSubmit] answers:', answers);
      

      // Se for admin, salvar as respostas como gabarito oficial na aula
      if (isSavingGabarito && userProfile?.isStaff) {
        const gabarito = questions.map((q, idx) => {
          const qKey = q.id || idx;
          const adminAns = answers[qKey];
          const gabaritoQ = { ...q };

          if (q.type === 'multiple_choice' || !q.type) {
            gabaritoQ.correct = typeof adminAns === 'number' ? adminAns : (q.correct || 0);
          } else if (q.type === 'true_false') {
            gabaritoQ.isTrue = typeof adminAns === 'boolean' ? adminAns : (q.isTrue ?? true);
          } else if (q.type === 'matching') {
            gabaritoQ.matchingPairs = q.matchingPairs?.map((pair, mIdx) => {
              const selectedIdx = adminAns?.[mIdx];
              if (selectedIdx !== undefined && selectedIdx !== '') {
                const selectedRight = q.matchingPairs?.[parseInt(selectedIdx)];
                return { left: pair.left, right: selectedRight?.right || pair.right };
              }
              return pair;
            });
          } else if (q.type === 'discursive') {
            gabaritoQ.expectedAnswer = adminAns || q.expectedAnswer || '';
          }
          return gabaritoQ;
        });

        const { error } = await supabase.from('aulas').update({ questionario: gabarito }).eq('id', targetId);
        if (error) throw error;
        alert('Gabarito Oficial salvo com sucesso!');
        setSubmitting(false);
        return;
      }

       // Regra Fatesa: Avaliações agora possuem correção automática baseada no gabarito oficial.
       // Padrão: 10 Verdadeiro/Falso (5 pts), 4 Múltipla Escolha (2 pts), 1 Relacione Colunas 6 pares (3 pts).
       const isFinal = targetLesson.tipo === 'prova' || targetLesson.tipo === 'avaliacao' || !!targetLesson.is_bloco_final;
       
       // Calculamos a pontuação para todas as avaliações (agora automática)
       questions.forEach((q, idx) => {
         const qKey = q.id || idx;
         const studentAns = answers[qKey];
         
         if (q.type === 'matching' && q.matchingPairs?.length) {
           const uA = studentAns || {};
           const correctPairs = q.matchingPairs.reduce((acc: number, _: any, mIdx: number) => {
             return acc + (String(uA[mIdx]) === String(mIdx) ? 1 : 0);
           }, 0);
           score += Math.min(3.0, correctPairs * 0.5);
         } else {
           if (q.type === 'multiple_choice' || !q.type) {
             if (studentAns !== undefined && studentAns !== null && String(studentAns) === String(q.correct)) score += 0.5;
           }
           else if (q.type === 'true_false' && studentAns === q.isTrue) score += 0.5;
         }
       });

       const finalScore = isFinal ? score : null; 
       const status = 'corrigida'; // Correção agora é automática para todos

       console.log('[Lesson.handleSubmit] isFinal:', isFinal);
       console.log('[Lesson.handleSubmit] score:', score);
       console.log('[Lesson.handleSubmit] finalScore:', finalScore);

      const payload: any = {
        aluno_id: userProfile.id, 
        aula_id: targetId, 
        respostas: answers, 
        nota: finalScore, // null para exercícios pedagógicos
        status: status,
        tentativas: (currentSub?.tentativas || 0) + 1, 
        updated_at: new Date().toISOString()
      };
      if (currentSub?.id) payload.id = currentSub.id;

      console.log('[Lesson.handleSubmit] Payload:', payload);

      const { data: upsertData, error } = await supabase.from('respostas_aulas').upsert(payload, { onConflict: 'aluno_id,aula_id' });
      console.log('[Lesson.handleSubmit] Resultado upsert:', { upsertData, error });
      
      if (error) {
        console.error('[Lesson.handleSubmit] ERRO ao salvar:', error);
        throw error;
      }

      console.log('[Lesson.handleSubmit] Salvo com sucesso!');

       if (isFinal) {
         alert('Avaliação enviada e corrigida automaticamente com sucesso!');
         navigate('/dashboard');
         return;
       }


      // Exercício pedagógico: marcado como concluído independente das respostas
      setResult({ score: null, passed: false, pendingReview: false });
      setSubmitted(true); setIsExamStarted(false); setTimeLeft(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setComplete(true);
    } catch (err: any) { 
      console.error(err);
      alert('Erro ao enviar avaliação: ' + (err.message || 'Tente novamente.'));
    }
    finally { setSubmitting(false); }
  }

  const checkBlockCompletion = async (aId: string, bId: number, lId: string) => {
    const { data: items } = await supabase.from('aulas').select('id').eq('bloco_id', bId).eq('livro_id', lId).not('tipo', 'in', '("gravada","ao_vivo")').eq('is_bloco_final', false);
    if (!items?.length) return;
    const { data: prog } = await supabase.from('progresso').select('aula_id').eq('aluno_id', aId).in('aula_id', items.map(i => i.id)).eq('concluida', true);
    if (prog?.length === items.length) {
      // Logic for completion can be added here
    }
  }

  const handleMarkAsComplete = async () => {
    if (!lesson || !userProfile) return
    setSubmitting(true)
    try {
      await supabase.from('progresso').upsert({ aluno_id: userProfile.id, aula_id: id, concluida: true, updated_at: new Date().toISOString() }, { onConflict: 'aluno_id,aula_id' });
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
    if (!userProfile?.isStaff && isExamStarted && timeLeft && timeLeft > 0) {
      int = setInterval(() => setTimeLeft(p => { if (p && p <= 1) { clearInterval(int); handleSubmit(); return 0; } return p?p-1:0; }), 1000);
    }
    return () => clearInterval(int);
  }, [isExamStarted, timeLeft, userProfile]);

  // Lock window: prevent close/tab switch/cache while exam is active
  useEffect(() => {
    const isActive = !submittedRef.current && !userProfile?.isStaff &&
      ((lesson?.tipo === 'prova' && examModalConfirmed) || (lesson?.is_bloco_final && isExamStarted));
    
    if (!isActive) return;

    // ——— beforeunload: warn on close/refresh ———
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // ——— visibilitychange: detect tab switches ———
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchCount(prev => prev + 1);
      }
    };

    // ——— fullscreenchange: re-apply fullscreen ———
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // ——— popstate: trap back button ———
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    // ——— pageshow: detect bfcache restore ———
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };

    // ——— Cache-prevention meta tags ———
    const metaCache = document.createElement('meta');
    metaCache.httpEquiv = 'Cache-Control';
    metaCache.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(metaCache);

    const metaPragma = document.createElement('meta');
    metaPragma.httpEquiv = 'Pragma';
    metaPragma.content = 'no-cache';
    document.head.appendChild(metaPragma);

    const metaExpires = document.createElement('meta');
    metaExpires.httpEquiv = 'Expires';
    metaExpires.content = '0';
    document.head.appendChild(metaExpires);

    // ——— Trap back navigation ———
    window.history.pushState(null, '', window.location.href);

    // ——— Register all ———
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pageshow', onPageShow);

    // ——— Request fullscreen ———
    document.documentElement.requestFullscreen().catch(() => {});

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pageshow', onPageShow);

      metaCache.remove();
      metaPragma.remove();
      metaExpires.remove();

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [examModalConfirmed, isExamStarted, lesson, submitted]);

  // Extract references from lesson conteudo
  const lessonReferences: { id: string; text: string; source: string }[] = React.useMemo(() => {
    if (!lesson?.conteudo) return [];
    const refBlock = (Array.isArray(lesson.conteudo) ? lesson.conteudo : []).find((b: any) => b.type === 'references');
    return refBlock?.data || [];
  }, [lesson]);

  // Render text content with reference markers as clickable pop-ups
  const renderContentBlock = (block: any, idx: number) => {
    if (block.type === 'image') {
      return (
        <div key={idx} style={{ marginBottom: '2rem' }}>
          <img src={block.content} alt="" style={{ maxWidth: '100%', borderRadius: '16px' }} />
        </div>
      );
    }
    if (block.type === 'text') {
      // Replace <sup data-ref="X"> with clickable reference buttons
      const processedHtml = block.content.replace(
        /<sup\s+data-ref="([^"]+)"[^>]*>.*?<\/sup>/g,
        (_: string, refId: string) => {
          const ref = lessonReferences.find(r => r.id === refId);
          return `<button type="button" class="ref-btn" data-ref="${refId}" style="
            background: rgba(var(--primary-rgb), 0.15);
            border: none;
            color: var(--primary);
            font-size: 0.7em;
            font-weight: 800;
            padding: 0.1em 0.45em;
            border-radius: 6px;
            cursor: pointer;
            vertical-align: super;
            line-height: 1;
            transition: background 0.2s;
          " title="${ref?.text || ''}">${refId}</button>`;
        }
      );
      return (
        <div key={idx} style={{ marginBottom: '2rem', lineHeight: 1.8 }}
          onClick={(e) => {
            const btn = (e.target as HTMLElement).closest('.ref-btn');
            if (btn) {
              const refId = btn.getAttribute('data-ref');
              const ref = lessonReferences.find(r => r.id === refId);
              if (ref) setActiveReference(ref);
            }
          }}
           dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedHtml) }}

        />
      );
    }
    return null;
  };

  const hasContentBlocks = lesson?.conteudo && Array.isArray(lesson.conteudo) && lesson.conteudo.some((b: any) => b.type === 'text' || b.type === 'image');
  const hasHtmlFile = htmlContent !== null;

  const renderHtmlWithReferences = (html: string) => {
    const processed = html.replace(
      /<sup\s+data-ref="([^"]+)"[^>]*>.*?<\/sup>/g,
      (_: string, refId: string) => {
        const ref = lessonReferences.find(r => r.id === refId);
        return `<button type="button" class="ref-btn" data-ref="${refId}" style="
          background: rgba(var(--primary-rgb), 0.15);
          border: none; color: var(--primary);
          font-size: 0.7em; font-weight: 800;
          padding: 0.1em 0.45em; border-radius: 6px;
          cursor: pointer; vertical-align: super;
          line-height: 1; transition: background 0.2s;
        " title="${ref?.text || ''}">${refId}</button>`;
      }
    );
    return processed;
  };

  const handleBibleRefClick = useCallback((target: HTMLElement) => {
    const ref = target.getAttribute('data-ref') || target.textContent?.trim() || '';
    if (!ref) return;
    setActiveReference({
      id: ref,
      text: bibliaLocal[ref] || 'Referência bíblica reconhecida, mas o texto não foi localizado nesta base.',
      source: 'Bíblia ACF',
    });
  }, [bibliaLocal]);

  if (loading) return <div className="auth-container"><Loader2 className="spinner" /></div>

  if (alreadyApproved) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem' }}>
          <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Avaliação Concluída</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Você já foi aprovado nesta avaliação em uma versão anterior. Não é necessário realizar a recuperação.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Ir para o Dashboard
          </button>
        </div>
      </div>
    )
  }

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
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
              {existingSubmission && existingSubmission.status !== 'corrigida' ? 'Ver Dashboard' : 'Ir para o Dashboard'}
            </button>
          </div>
          {existingSubmission && existingSubmission.status !== 'corrigida' && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600 }}>
              Status: Sua tentativa anterior está aguardando correção manual do professor.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem' }}>
          <FileText size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Lição Indisponível</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Esta lição ainda não possui conteúdo disponível. Acesse pelo módulo para ver todas as lições.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => navigate(-1)} className="btn btn-outline">Voltar</button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Ir para o Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const hasDisplayableContent = 
    (lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo' || lesson.tipo === 'video') ||
    lesson.tipo === 'material' ||
    lesson.tipo === 'licao' ||
    hasHtmlFile ||
    hasContentBlocks ||
    lesson.arquivo_url ||
    lesson.pdf_url ||
    lesson.tipo === 'atividade' ||
    lesson.tipo === 'exercicio' ||
    lesson.tipo === 'avaliacao' ||
    lesson.tipo === 'prova' ||
    questions.length > 0;

  if (!hasDisplayableContent && lesson.livro_id) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem' }}>
          <BookOpen size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Lição sem Conteúdo</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Esta lição ainda não possui conteúdo disponível para visualização direta. Acesse todas as lições pelo módulo.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => navigate(-1)} className="btn btn-outline">Voltar</button>
            <button onClick={() => navigate(`/module/${lesson.livro_id}`)} className="btn btn-primary">Ver Módulo</button>
          </div>
        </div>
      </div>
    )
  }

    return (
      <div className="lesson-container reading-page">

        {/* Header da Lição - fixo no topo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.5rem', marginBottom: '10px',
          background: 'rgba(168,85,247,0.08)', borderRadius: '14px',
          borderLeft: '4px solid var(--primary)',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate(`/module/${lesson.livro_id}`)}
              className="btn btn-outline"
              style={{ width: 'auto', padding: '0.4rem' }}
              title="Voltar ao módulo"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{lesson.titulo}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                {book?.titulo || 'Módulo'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Hamburger / Tópicos button — always visible */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="btn btn-outline"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700 }}
              title={isPanorama ? 'Lições do Módulo' : 'Tópicos da Lição'}
            >
              <Menu size={16} />
              <span style={{ display: 'none' }} className="header-menu-label">{isPanorama ? 'Lições' : 'Tópicos'}</span>
            </button>
            {!isPanorama && prevLessonId && (
              <button
                onClick={() => navigate(`/lesson/${prevLessonId}`)}
                className="btn btn-outline"
                style={{ width: 'auto', padding: '0.4rem' }}
                title="Lição Anterior"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {nextLessonId && !lesson.titulo?.toLowerCase().startsWith('lição 10') && (
              <button
                onClick={() => navigate(`/lesson/${nextLessonId}`)}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.4rem' }}
                title="Próxima Lição"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

       
        {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
         <div className="video-section" style={{ marginBottom: '2rem' }}>
            <div className="video-wrapper" style={{ aspectRatio: '16/9', background: '#000', borderRadius: '32px', overflow: 'hidden' }}>
             {lesson.video_url ? renderVideoPlayer(lesson.video_url) : <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Vídeo Indisponível</div>}
           </div>
           {!complete && <button className="btn btn-primary" onClick={handleMarkAsComplete} style={{marginTop:'2rem', width:'auto', margin:'2rem auto', display:'block'}}>Marcar como Concluída</button>}
         </div>
       )}
       
       {/* Lesson Content: HTML file or content blocks */}
       {htmlLoading && (
         <div style={{ textAlign: 'center', padding: '4rem' }}>
           <Loader2 className="spinner" size={32} />
           <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando conteúdo...</p>
         </div>
       )}
       
       {hasHtmlFile && !htmlLoading && (
         <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', position: 'relative' }}>
           {isMenuOpen && (
             <div 
               style={{ 
                 position: 'fixed', 
                 inset: 0, 
                 zIndex: 1000, 
                 display: 'flex', 
                 justifyContent: 'flex-start' 
               }}
             >
               <div 
                 onClick={() => setIsMenuOpen(false)} 
                 style={{ 
                   position: 'absolute', 
                   inset: 0, 
                   background: 'rgba(0,0,0,0.5)', 
                   backdropFilter: 'blur(4px)' 
                 }} 
               />
                <aside style={{ 
                  position: 'relative', 
                  width: '300px', 
                  background: 'var(--bg-dark)', 
                  padding: '2rem', 
                  borderRadius: '0 24px 24px 0', 
                  borderRight: '1px solid var(--glass-border)',
                  height: '100vh',
                  overflowY: 'auto',
                  boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
                  zIndex: 1001,
                  transition: 'transform 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
                      <List size={20} color="var(--primary)" /> {isPanorama ? 'Lições do Módulo' : 'Tópicos da Lição'}
                    </h4>
                    <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={24} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {isPanorama ? (
                        // Panorama shows ALL lessons 1-10
                        moduleLessons.length > 0 ? (
                          moduleLessons.map((lsn, lsnIdx) => {
                             const lessonNum = String(lsnIdx + 1).padStart(2, '0');
                            return (
                              <button
                                key={lsn.id}
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  navigate(`/lesson/${lsn.id}`);
                                }}
                                style={{ 
                                  color: 'var(--text-main)', 
                                  textDecoration: 'none', 
                                  fontSize: '0.88rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.75rem',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: '10px',
                                  transition: 'all 0.2s',
                                  lineHeight: 1.4,
                                  background: 'rgba(255,255,255,0.04)',
                                  cursor: 'pointer',
                                  border: '1px solid var(--glass-border)',
                                  textAlign: 'left',
                                  width: '100%',
                                  fontWeight: 600
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--primary-rgb), 0.12)';
                                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)';
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-main)';
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
                                }}
                              >
                                <div style={{ 
                                  width: '30px', 
                                  height: '30px', 
                                  borderRadius: '50%', 
                                  background: 'var(--primary)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: '#fff',
                                  flexShrink: 0
                                }}>
                                  {lessonNum}
                                </div>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lsn.titulo}</span>
                              </button>
                            );
                          })
                        ) : (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>Nenhuma lição encontrada.</p>
                        )
                      ) : (
                        // Normal lesson: show ALL toc items (with indentation for sub-sections)
                        toc.map((item, idx) => {
                          const label = item.label.trim();
                          const isMain = item.isMainSection;
                          
                          return (
                            <a 
                              key={item.id} 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                setIsMenuOpen(false);
                                setTimeout(() => {
                                  const element = document.getElementById(item.id);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }, 100);
                              }}
                              style={{ 
                                color: isMain ? 'var(--text-main)' : 'var(--text-muted)', 
                                textDecoration: 'none', 
                                fontSize: isMain ? '0.92rem' : '0.83rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.6rem',
                                padding: isMain ? '0.65rem 0.85rem' : '0.45rem 0.85rem 0.45rem 1.75rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                lineHeight: 1.4,
                                background: isMain ? 'rgba(255,255,255,0.04)' : 'transparent',
                                cursor: 'pointer',
                                fontWeight: isMain ? 700 : 500,
                                borderLeft: isMain ? 'none' : '2px solid rgba(var(--primary-rgb), 0.25)',
                                marginLeft: isMain ? '0' : '0.5rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--primary)';
                                e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = isMain ? 'var(--text-main)' : 'var(--text-muted)';
                                e.currentTarget.style.background = isMain ? 'rgba(255,255,255,0.04)' : 'transparent';
                              }}
                            >
                              {isMain 
                                ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                                : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.5)', flexShrink: 0 }} />
                              }
                              {label}
                            </a>
                          );
                        })
                      )}
                  </div>
                </aside>
             </div>
           )}
                <div className="lesson-content" style={{ 
                  flex: 1, 
                  marginBottom: '0', 
                  lineHeight: 1.8, 
                   maxWidth: '100%',
                   width: '100%',
                  textAlign: 'justify',
                  overflow: 'auto',
                  transition: 'all 0.3s ease'
                }}
              onClick={(e) => {
                const target = e.target as HTMLElement;

                // 1. Bible reference click (handles .biblia-ref)
                const bibRef = target.closest('.biblia-ref');
                if (bibRef) {
                  e.preventDefault();
                  handleBibleRefClick(bibRef as HTMLElement);
                  return;
                }

                // 2. Wiki reference click (handles .wiki-ref)
                const wikiRef = target.closest('.wiki-ref');
                if (wikiRef) {
                  e.preventDefault();
                  const title = wikiRef.getAttribute('data-wiki-title') || wikiRef.textContent?.trim() || '';
                  const tipo = wikiRef.getAttribute('data-wiki-tipo') || 'Referência de apoio';
                  const desc = wikiRef.getAttribute('data-wiki-desc') || 'Referência de apoio ao conteúdo da lição.';
                  setWikiPopup({ titulo: title, texto: desc, tipo });
                  return;
                }

                // 3. Hamburger menu click (.hamb-btn)
                const hambBtn = target.closest('.hamb-btn');
                if (hambBtn) {
                  e.preventDefault();
                  const container = e.currentTarget;
                  const drawer = container.querySelector('.drawer');
                  const overlay = container.querySelector('.overlay');
                  if (drawer && overlay) {
                    drawer.classList.toggle('open');
                    overlay.classList.toggle('open');
                    hambBtn.setAttribute('aria-expanded', drawer.classList.contains('open') ? 'true' : 'false');
                  }
                  return;
                }

                // 5. Drawer close click (.drawer-close or clicking the overlay)
                if (target.closest('.drawer-close') || target.closest('.overlay')) {
                  e.preventDefault();
                  const container = e.currentTarget;
                  const drawer = container.querySelector('.drawer');
                  const overlay = container.querySelector('.overlay');
                  if (drawer && overlay) {
                    drawer.classList.remove('open');
                    overlay.classList.remove('open');
                  }
                  return;
                }

                // 6. Original ref-btn (retained for backward compatibility)
                const btn = target.closest('.ref-btn');
                if (btn) {
                  const refId = btn.getAttribute('data-ref');
                  const ref = lessonReferences.find(r => r.id === refId);
                  if (ref) setActiveReference(ref);
                  return;
                }

                // 7. Links and anchors
                const link = target.closest('a');
                if (link && link.href) {
                  const url = new URL(link.href);
                  
                  // Hash/anchor links (e.g. #topic-1)
                  if (url.hash && url.pathname === window.location.pathname) {
                    e.preventDefault();
                    // Close drawer if open
                    const container = e.currentTarget;
                    const drawer = container.querySelector('.drawer');
                    const overlay = container.querySelector('.overlay');
                    if (drawer && overlay) {
                      drawer.classList.remove('open');
                      overlay.classList.remove('open');
                    }
                    
                    // Smooth scroll to the heading
                    const targetId = decodeURIComponent(url.hash.substring(1));
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    return;
                  }
                  
                  e.preventDefault();
                  let path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
                  if (path.endsWith('.html')) path = path.slice(0, -5);
                  const key = path.replace(/^\/lesson\//, '').toLowerCase().trim();
                  
                  // Direct UUID navigation
                  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
                  if (isUuid) {
                    navigate(`/lesson/${key}`);
                  } else {
                    const targetId = lessonMap[key] || lessonMap[path.toLowerCase()];
                    if (targetId) navigate(`/lesson/${targetId}`);
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: renderHtmlWithReferences(htmlContent!) }}
            />
          </div>
        )}

         {hasContentBlocks && !hasHtmlFile && (
             <div className="lesson-content" style={{ 
               marginBottom: '0',
               lineHeight: 1.8,
               maxWidth: '100%',
               width: '100%',
               textAlign: 'justify',
               overflow: 'auto',
               transition: 'all 0.3s ease'
             }}>
               {Array.isArray(lesson.conteudo) && lesson.conteudo.map((block: any, idx: number) => renderContentBlock(block, idx))}
             </div>
         )}

        {/* Indicador de Concluída / Botão Marcar como Concluída para lições e materiais */}
        {(lesson.tipo === 'licao' || lesson.tipo === 'material') && complete && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 2rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '50px',
              color: 'var(--success)',
              fontWeight: 700
            }}>
              <CheckCircle2 size={20} />
              Aula Concluída
            </div>
          </div>
        )}
        {(lesson.tipo === 'licao' || lesson.tipo === 'material') && !complete && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleMarkAsComplete}
              disabled={submitting}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                width: 'auto',
                justifyContent: 'center',
                borderRadius: '50px',
                boxShadow: '0 4px 20px rgba(var(--primary-rgb), 0.35)'
              }}
            >
              {submitting ? <Loader2 className="spinner" size={18} /> : <CheckCircle2 size={20} />}
              Marcar como Concluída
            </button>
          </div>
        )}

        {/* Exercício de Fixação - Componente separado */}
        {lesson.tipo === 'exercicio' && questions.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <ExercicioFixacao
              lessonId={id!}
              questions={questions}
              lessonTitle={lesson.titulo}
            />
          </div>
        )}

        {/* Avaliação - Componente separado com efeito avaliativo */}
        {lesson.tipo === 'avaliacao' && questions.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <AvaliacaoFixacao
              lessonId={id!}
              questions={questions}
              lessonTitle={lesson.titulo}
              minGrade={lesson.min_grade || 7.0}
            />
          </div>
        )}

        {/* Avaliação / Questionário - Componente original */}
        {(lesson.tipo === 'atividade' || lesson.tipo === 'prova' || (questions.length > 0 && lesson.tipo !== 'exercicio' && lesson.tipo !== 'avaliacao')) && (

         <div className="quiz-section quiz-section-modern" style={{ background: 'var(--glass)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
            <h2>{lesson.is_bloco_final ? 'Avaliação Final' : lesson.tipo === 'prova' ? 'Avaliação' : 'Questionário'}</h2>
            {isExamStarted && timeLeft && (
              <div style={{background:'var(--primary)', color:'#fff', padding:'0.5rem 1.5rem', borderRadius:'50px', fontWeight:800}}>
                TEMPO: {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
              </div>
            )}
          </div>

          {/* REGULAR PROVA — show warning gate (only if NOT already in progress) */}
          {lesson.tipo === 'prova' && !lesson.is_bloco_final && !submitted && !examModalConfirmed && !userProfile?.isStaff && existingSubmission?.status !== 'liberado' && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px' }}>
              <Award size={64} color="var(--primary)" style={{marginBottom:'1rem'}}/>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Prova: {lesson.titulo}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Ao iniciar, você não poderá sair e voltar. A prova deve ser concluída de uma só vez.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowExamModal(true)}
                style={{width:'auto', marginTop:'0.5rem', padding:'1rem 2.5rem', fontWeight:800}}
              >
                Iniciar Avaliação
              </button>
            </div>
          )}

           {lesson.is_bloco_final && !isExamStarted && !submitted && !reviewMode && !userProfile?.isStaff ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px' }}>
              <Award size={64} color="var(--primary)" style={{marginBottom:'1rem'}}/>
              <h3>Prova do Bloco {lesson.bloco_id}</h3>
              <p>Duração: 40 minutos | Tentativa: {deadlineInfo?.stage || 1}</p>
              <p>Prazo: {deadlineInfo?.deadline.toLocaleDateString()}</p>
              {deadlineInfo?.expired && userProfile?.profile_tipo === 'aluno' && !userProfile?.isStaff ? <p style={{color:'var(--error)'}}>Prazo Expirado</p> : (
                               <button 
                                 className="btn btn-primary" 
                                 onClick={() => setShowExamModal(true)} 
                                 style={{width:'auto', marginTop:'1rem'}}
                               >
                                 {userProfile?.isStaff ? 'Visualizar Avaliação' : 'Começar Agora'}
                               </button>
              )}
            </div>
          ) : (lesson.tipo === 'prova' && !lesson.is_bloco_final && !submitted && !examModalConfirmed && !userProfile?.isStaff && existingSubmission?.status !== 'liberado') ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {questions.map((q, idx) => {
                const qKey = q.id || idx;
                const studentAns = answers[qKey];
                const isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                  q.type === 'true_false' ? studentAns === q.isTrue :
                                  q.type === 'matching' ? q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) : true;
                
                 // Gabarito: staff sempre vê | aluno vê apenas se submeter e atingir a nota mínima (Efeito Avaliativo)
                 const showGabarito = reviewMode ||
                                      userProfile?.isStaff ||
                                       (submitted && result?.score !== null && (result?.score ?? 0) >= (lesson?.min_grade || 7.0));

                return (
                  <div 
                    key={qKey} 
                    className="question-card"
                    style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: showGabarito && submitted ? `1px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}` : '1px solid var(--glass-border)' }}
                  >
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
                         <input type="radio" checked={answers[qKey] === oIdx} onChange={() => setAnswers(p => ({...p, [qKey]: oIdx}))} disabled={!userProfile?.isStaff && submitted && !reviewMode} /> 
                        <span style={{flex:1}}>{opt}</span>
                                 {showGabarito && (userProfile?.isStaff || submitted) && q.type === 'matching' ? null : (q.correct === oIdx && <div style={{color:'var(--success)', fontSize:'0.75rem', fontWeight:800, display:'flex', alignItems:'center', gap:'0.4rem'}}><CheckCircle size={14}/> GABARITO</div>)}
                                 {showGabarito && (userProfile?.isStaff || submitted) && answers[qKey] === oIdx && !isCorrect && <XCircle size={16} color="var(--error)"/>}

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
                                border: showGabarito && (userProfile?.isStaff || submitted) && q.isTrue === v ? '2px solid var(--success)' : (showGabarito && (userProfile?.isStaff || submitted) && answers[qKey] === v && !isCorrect ? '2px solid var(--error)' : '')
                             }}
                             disabled={!userProfile?.isStaff && submitted}
                           >
                            {v ? 'Verdadeiro' : 'Falso'}
                                 {showGabarito && (userProfile?.isStaff || submitted) && q.type === 'matching' ? null : (q.isTrue === v && <CheckCircle size={14} style={{marginLeft:'0.5rem'}}/>)}
                                 {showGabarito && (userProfile?.isStaff || submitted) && answers[qKey] === v && !isCorrect && <XCircle size={14} style={{marginLeft:'0.5rem'}}/>}

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
                        <div key={pIdx} className="matching-grid-responsive">
                          <div className="matching-item-left">{pair.left}</div>
                          <div className="matching-select-wrapper">
                            <select 
                              className="matching-select" 
                              style={{
                                border: showGabarito && (userProfile?.isStaff || submitted) ? (isRowCorrect ? '1px solid var(--success)' : '1px solid var(--error)') : ''
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
                              disabled={!userProfile?.isStaff && submitted}
                            >
                              <option value="">Selecione...</option>
                              {(shuffledOptions[qKey] || q.matchingPairs?.map(mp => mp.right) || []).map((rightOpt, roIdx) => (
                               <option key={roIdx} value={rightOpt}>{rightOpt}</option>
                              ))}
                            </select>
                          </div>
                           {showGabarito && (userProfile?.isStaff || submitted) && (isRowCorrect ? <CheckCircle size={18} color="var(--success)"/> : <XCircle size={18} color="var(--error)"/>)}
                        </div>
                      );
                    })}


                     {q.type === 'discursive' && (
                       <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                         <textarea className="form-control" rows={4} value={answers[qKey] || ''} onChange={e => setAnswers(p => ({...p, [qKey]: e.target.value}))} placeholder="Sua resposta..." disabled={!userProfile?.isStaff && submitted}></textarea>
                         { (userProfile?.isStaff || (submitted && answers[qKey])) && q.expectedAnswer && (
                           <div style={{marginTop:'1rem', padding:'1rem', background:'rgba(var(--primary-rgb), 0.1)', borderRadius:'12px', fontSize:'0.9rem'}}>
                             <strong style={{color:'var(--primary)', display:'block', marginBottom:'0.5rem'}}>Gabarito sugerido:</strong>
                             {q.expectedAnswer}
                           </div>
                         )}
                       </div>
                     )}


                                {showGabarito && (userProfile?.isStaff || submitted) && q.explanation && (
                                  <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Explicação / Gabarito Comentado:</strong>
                                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>{q.explanation}</div>
                                  </div>
                                )}
                  </div>
                );
              })}
              {isModuleFinished && (
                <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary)', textAlign: 'center', marginBottom: '2rem' }}>
                  <Lock size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>MODO SOMENTE LEITURA</h4>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Este módulo já foi finalizado. Você pode revisar o conteúdo e o gabarito, mas não pode enviar novas respostas.</p>
                </div>
              )}
              
              {/* Painel Staff: Gabarito Oficial */}
              {userProfile?.isStaff && (lesson?.tipo === 'prova' || lesson?.tipo === 'atividade' || lesson?.tipo === 'exercicio' || lesson?.tipo === 'avaliacao' || lesson?.tipo === 'questionario') && questions.length > 0 && (
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.25)', 
                  borderRadius: '20px', padding: '2rem', marginTop: '1.5rem', marginBottom: '2rem' 
                }}>
                  <h4 style={{ color: '#22c55e', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                    ✓ Gabarito Oficial {userProfile?.isStaff ? '(Salvar Gabarito)' : '(Visualização)'}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: userProfile?.isStaff ? '1.75rem' : '0' }}>
                    {questions.map((q, idx) => {
                      let display = '';
                      if (q.type === 'true_false') display = q.isTrue ? 'V' : 'F';
                      else if (q.type === 'multiple_choice' || !q.type) {
                        const letters = ['A', 'B', 'C', 'D', 'E'];
                        display = typeof q.correct === 'number' ? letters[q.correct] : '?';
                      } else if (q.type === 'matching') display = '↔';
                      else display = '—';
                      return (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.25rem', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Q{idx + 1}</span>
                          <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1.1rem' }}>{display}</span>
                        </div>
                      );
                    })}
                  </div>

                  {userProfile?.isStaff && (
                    <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(34, 197, 94, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                        Selecione as respostas corretas nas questões acima e clique para salvar como gabarito oficial.
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleSubmit(true)}
                          disabled={submitting}
                          style={{
                            background: submitting ? 'rgba(34, 197, 94, 0.4)' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                            color: '#fff', border: 'none', padding: '0.95rem 2.75rem', fontSize: '1rem', fontWeight: 800, borderRadius: '50px',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: submitting ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {submitting ? <Loader2 className="spinner" size={18} /> : 'Salvar Gabarito Oficial'}
                        </button>
                        <button
                          onClick={() => setShowQuizEditor(true)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.95rem 2.75rem', fontSize: '1rem', fontWeight: 800, borderRadius: '50px',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                          }}
                        >
                          <FileText size={18} /> Editar Questionário
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

               {!submitted && !isModuleFinished && !userProfile?.isStaff && (
                 <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleSaveProgress()}
                    disabled={submitting}
                    style={{ 
                      padding: '1rem 2.5rem', 
                      fontSize: '1.05rem', 
                      fontWeight: 700,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.6rem',
                      minWidth: '220px',
                      justifyContent: 'center',
                      borderRadius: '50px',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)'
                    }}
                  >
                    {submitting ? <Loader2 className="spinner" size={18} /> : '💾 Salvar Respostas'}
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    style={{ 
                      padding: '1rem 2.5rem', 
                      fontSize: '1.05rem', 
                      fontWeight: 700,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.6rem',
                      minWidth: '220px',
                      justifyContent: 'center',
                      borderRadius: '50px',
                      boxShadow: '0 4px 20px rgba(var(--primary-rgb), 0.35)'
                    }}
                  >
                    {submitting ? <Loader2 className="spinner" size={18} /> : '✓ Enviar Respostas'}
                  </button>
                </div>
              )}

              {submitted && result && (
                <div style={{textAlign:'center', marginTop:'2rem', padding:'2rem', background:'var(--glass)', borderRadius:'16px', border: '1px solid var(--glass-border)'}}>
                  {((lesson?.tipo === 'prova' || lesson?.tipo === 'avaliacao' || lesson?.is_bloco_final) && (existingSubmission?.status !== 'corrigida' && result.pendingReview)) ? (
                    <>
                      <Clock size={48} color="var(--warning)" style={{marginBottom:'1rem'}}/>
                      <h3>Avaliação Enviada!</h3>
                      <p style={{color:'var(--text-muted)'}}>Sua avaliação foi enviada para correção. Por favor, aguarde o feedback do professor no seu boletim.</p>
                    </>
                  ) : (
                    <>
                      {(lesson.tipo === 'prova' || lesson.tipo === 'avaliacao' || lesson.is_bloco_final) && result.pendingReview ? (
                        <>
                          <Clock size={40} color="var(--warning)" style={{marginBottom:'1rem'}}/>
                          <h2 style={{ color: 'var(--warning)', fontWeight: 800, marginBottom: '0.5rem' }}>Avaliação em Correção</h2>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Sua avaliação foi enviada e será corrigida pelo professor.</p>
                        </>
                      ) : (
                        <>
                          {(lesson.tipo === 'prova' || lesson.tipo === 'avaliacao') ? (
                            <>
                              <Award size={40} color="var(--primary)" style={{marginBottom:'1rem'}}/>
                              {lesson.is_bloco_final && result.passed && (
                                <>
                                  <h2 style={{ color: 'var(--success)', fontWeight: 800, marginBottom: '0.5rem' }}>Módulo Completo!</h2>
                                  <svg style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                                    <rect style={{ height: '100%', width: '100%', fill: 'var(--success)' }} />
                                  </svg>
                                </>
                              )}
                               <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                                 {result.passed ? 'Parabéns! Você foi aprovado.' : 'Nota Insuficiente'}
                               </h3>
                               <p>{result.passed ? 'Você atingiu a nota mínima e o gabarito oficial foi liberado.' : 
                                 (lesson.versao === 1 ? 'Você não atingiu a nota mínima. Por favor, realize a V2 (Recuperação) para prosseguir.' : 
                                  lesson.versao === 2 ? 'Você não atingiu a nota mínima. Por favor, realize a V3 (Recuperação 2) para prosseguir.' : 
                                  'Você não atingiu a nota mínima na V3. De acordo com a regra, você deverá refazer o módulo completo.')}
                               </p>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={40} color="var(--success)" style={{marginBottom:'1rem'}}/>
                              <h2 style={{ color: 'var(--success)', fontWeight: 800 }}>Atividade Concluída!</h2>
                              <p style={{ color: 'var(--text-muted)' }}>Você completou este exercício com sucesso e seu progresso foi registrado.</p>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <div style={{display:'flex', gap:'1rem', justifyContent:'center', marginTop:'2rem'}}>
                    <button className="btn btn-outline" onClick={() => navigate('/dashboard')} style={{width:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                      <LayoutDashboard size={18}/> Voltar ao Painel
                    </button>
                    {result.canRetry && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setSubmitted(false);
                          setResult(null);
                          setAnswers({});
                        }} 
                        style={{width:'auto', background:'var(--warning)', color:'#000', fontWeight:800}}
                      >
                        Iniciar Recuperação (V{deadlineInfo?.stage})
                      </button>
                    )}
                    {!result.canRetry && nextLessonId && (
                      <div style={{display:'flex', gap:'1rem', justifyContent:'center', marginTop:'2rem'}}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => navigate(-1)} 
                          style={{width:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}
                        >
                          <ChevronLeft size={18}/> Aula Anterior
                        </button>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => navigate(`/lesson/${nextLessonId}`)} 
                          style={{width:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}
                        >
                          Próxima Aula <ChevronRight size={18}/>
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Gabarito Oficial e Desempenho Detalhado */}
              {submitted && result && questions.length > 0 && (
                <div style={{marginTop:'2.5rem', padding:'2rem', background:'var(--glass)', borderRadius:'20px', border:'1px solid var(--glass-border)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem'}}>
                    <BookOpen size={24} color="var(--primary)"/>
                    <h3 style={{margin:0, fontSize:'1.3rem', fontWeight:800}}>Gabarito Oficial e Seu Desempenho</h3>
                  </div>

                     {(() => {
                       const stats = questions.reduce((acc, q, idx) => {
                         const qKey = q.id || idx;
                         const studentAns = answers[qKey];
                         const isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                           q.type === 'true_false' ? studentAns === q.isTrue :
                                           q.type === 'matching' ? (q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) ?? false) : true;
                         acc.total += 1;
                         if (isCorrect) acc.correct += 1; else acc.incorrect += 1;
                         return acc;
                       }, { total: 0, correct: 0, incorrect: 0 });


                    return (
                      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'1rem', marginBottom:'2rem'}}>
                        <div style={{padding:'1.25rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'1px solid var(--glass-border)', textAlign:'center'}}>
                          <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.5rem'}}>Total</div>
                          <div style={{fontSize:'2rem', fontWeight:900, color:'var(--text)'}}>{stats.total}</div>
                        </div>
                        <div style={{padding:'1.25rem', background:'rgba(16, 185, 129, 0.08)', borderRadius:'14px', border:'1px solid rgba(16, 185, 129, 0.25)', textAlign:'center'}}>
                          <div style={{fontSize:'0.75rem', color:'var(--success)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.5rem', fontWeight:700}}>Acertos</div>
                          <div style={{fontSize:'2rem', fontWeight:900, color:'var(--success)'}}>{stats.correct}</div>
                        </div>
                        <div style={{padding:'1.25rem', background:'rgba(239, 68, 68, 0.08)', borderRadius:'14px', border:'1px solid rgba(239, 68, 68, 0.25)', textAlign:'center'}}>
                          <div style={{fontSize:'0.75rem', color:'var(--error)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.5rem', fontWeight:700}}>Erros</div>
                          <div style={{fontSize:'2rem', fontWeight:900, color:'var(--error)'}}>{stats.incorrect}</div>
                        </div>
                        {lesson?.tipo === 'prova' && result.score !== null && (
                          <div style={{padding:'1.25rem', background:'rgba(var(--primary-rgb), 0.08)', borderRadius:'14px', border:'1px solid rgba(var(--primary-rgb), 0.25)', textAlign:'center'}}>
                            <div style={{fontSize:'0.75rem', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.5rem', fontWeight:700}}>Nota</div>
                            <div style={{fontSize:'2rem', fontWeight:900, color:'var(--primary)'}}>{result.score?.toFixed(1)}<span style={{fontSize:'1rem', color:'var(--text-muted)'}}> / 10</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    {questions.map((q, idx) => {
                      const qKey = q.id || idx;
                      const studentAns = answers[qKey];
                      const isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                         q.type === 'true_false' ? studentAns === q.isTrue :
                                         q.type === 'matching' ? (q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) ?? false) : true;


                      const renderCorrectAnswer = () => {
                        if (q.type === 'multiple_choice' || !q.type) return q.options?.[q.correct as number] || '—';
                        if (q.type === 'true_false') return q.isTrue ? 'Verdadeiro' : 'Falso';
                        if (q.type === 'matching') return (q.matchingPairs || []).map((p: any) => `${p.left} → ${p.right}`).join('; ');
                        return q.expectedAnswer || '—';
                      };

                      const renderStudentAnswer = () => {
                        if (studentAns === undefined || studentAns === '' || studentAns === null) return <em style={{color:'var(--text-muted)'}}>Em branco</em>;
                        if (q.type === 'multiple_choice' || !q.type) return q.options?.[studentAns as number] || '—';
                        if (q.type === 'true_false') return studentAns ? 'Verdadeiro' : 'Falso';
                        if (q.type === 'matching') return (q.matchingPairs || []).map((p: any, i: number) => `${p.left} → ${q.matchingPairs?.[studentAns[i]]?.right || '?'}`).join('; ');
                        return String(studentAns);
                      };

                      return (
                        <div key={qKey} style={{padding:'1.25rem', background:'rgba(255,255,255,0.02)', borderRadius:'14px', border:`1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', marginBottom:'0.75rem'}}>
                            <p style={{fontWeight:600, fontSize:'0.95rem', margin:0, flex:1}}>{idx + 1}. {q.text}</p>
                            <div style={{color: isCorrect ? 'var(--success)' : 'var(--error)', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.75rem', fontWeight:800, whiteSpace:'nowrap', background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding:'0.35rem 0.7rem', borderRadius:'8px'}}>
                              {isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                              {isCorrect ? 'ACERTOU' : 'ERROU'}
                            </div>
                          </div>
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', fontSize:'0.85rem'}}>
                            <div style={{padding:'0.75rem', background:'rgba(var(--primary-rgb), 0.06)', borderRadius:'10px', border:'1px solid rgba(var(--primary-rgb), 0.2)'}}>
                              <div style={{fontSize:'0.7rem', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:700, marginBottom:'0.4rem'}}>Sua resposta</div>
                              <div style={{color: isCorrect ? 'var(--success)' : 'var(--error)', fontWeight:600}}>{renderStudentAnswer()}</div>
                            </div>
                            <div style={{padding:'0.75rem', background:'rgba(16, 185, 129, 0.06)', borderRadius:'10px', border:'1px solid rgba(16, 185, 129, 0.2)'}}>
                              <div style={{fontSize:'0.7rem', color:'var(--success)', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:700, marginBottom:'0.4rem'}}>Gabarito Oficial</div>
                              <div style={{color:'var(--success)', fontWeight:600}}>{renderCorrectAnswer()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {relatedExercise && (
        <div style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px', border: '1px solid var(--glass-border)', textAlign: 'center'}}>
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

      {/* Forum Discussion Section */}
      <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <MessageSquare size={24} color="var(--primary)" />
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dúvidas ou Discussão?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          Participe do fórum oficial para conversar com outros alunos e professores sobre o conteúdo desta aula.
        </p>
        <button 
          className="btn btn-outline" 
          onClick={() => {
            const path = userProfile?.profile_tipo === 'professor' ? '/professor' : (userProfile?.profile_tipo === 'admin' ? '/admin' : '/dashboard');
            navigate(path, { state: { activeTab: 'forum' } });
          }}
          style={{ width: 'auto', padding: '0.75rem 2rem' }}
        >
          Acessar Fórum da Comunidade
        </button>
      </div>

      {/* References Section */}
      {lessonReferences.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} color="var(--primary)" /> Referências
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lessonReferences.map((ref, rIdx) => (
              <div key={rIdx} style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
                onClick={() => setActiveReference(ref)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(var(--primary-rgb), 0.08)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(var(--primary-rgb), 0.12)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                }}>
                  {ref.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{ref.text}</div>
                  {ref.source && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ExternalLink size={12} /> {ref.source}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showQuizEditor && (
        <QuizEditorModal 
          editingQuiz={lesson} setEditingQuiz={() => setShowQuizEditor(false)}
          quizQuestions={questions} setQuizQuestions={setQuestions}
          actionLoading={actionLoading} setActionLoading={setActionLoading}
          supabase={supabase} showToast={(m: string) => alert(m)}
          fetchLessons={async () => fetchLessonData()} 
          fetchLessonItems={async () => fetchLessonData()}
          selectedBook={book} selectedLesson={lesson}
        />
      )}

      {/* EXAM WARNING MODAL */}
      {showExamModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: '32px',
            padding: '3rem',
            maxWidth: '560px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              width: '72px',
              height: '72px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <Lock size={36} color="#ef4444" />
            </div>

            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              textAlign: 'center',
              marginBottom: '0.5rem',
              letterSpacing: '-0.5px'
            }}>Atenção: Regras da Avaliação</h2>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
              Leia com atenção antes de começar.
            </p>

            {/* Rules list */}
            <div className="modal-rules-container" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              marginBottom: '2.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              paddingRight: '0.5rem',
              scrollbarWidth: 'thin'
            }}>
              {[
                { icon: '🚫', text: 'Uma vez iniciada, você NÃO poderá sair e retornar à prova.' },
                { icon: '📋', text: 'Todas as questões devem ser respondidas antes do envio.' },
                { icon: lesson?.is_bloco_final ? '⏱️' : '📝', text: lesson?.is_bloco_final ? 'Você terá 40 minutos para concluir. O tempo NÃO para se você fechar a página.' : 'A prova será enviada ao professor para correção manual após o envio.' },
                { icon: '📶', text: 'Certifique-se de estar em local tranquilo e com boa conexão de internet.' },
                { icon: '🔒', text: 'Saídas ou tentativas de reentrada serão registradas e a avaliação será encerrada automaticamente.' },
              ].map((rule, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{rule.icon}</span>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#cbd5e1', margin: 0 }}>{rule.text}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowExamModal(false)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowExamModal(false);
                  if (lesson?.is_bloco_final) {
                    await handleStartExam();
                  } else {
                    await handleStartRegularProva();
                  }
                }}
                className="btn btn-primary"
                style={{
                  flex: 1.5,
                  padding: '0.85rem',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(var(--primary-rgb), 0.25)'
                }}
              >
                ✅ Iniciar Agora
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .modal-rules-container::-webkit-scrollbar {
              width: 5px;
            }
            .modal-rules-container::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.02);
              border-radius: 10px;
            }
            .modal-rules-container::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
            .modal-rules-container::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.15);
            }
          `}</style>
        </div>
      )}

      {/* REFERENCE POP-UP MODAL */}
      {activeReference && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setActiveReference(null)}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: '24px', padding: '2.5rem',
            maxWidth: '520px', width: '100%',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveReference(null)} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)'
            }}><X size={18} /></button>

            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(var(--primary-rgb), 0.12)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem'
            }}>
              {activeReference.id}
            </div>

            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Referência {activeReference.id}
            </h4>

            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
              {activeReference.text}
            </p>

            {activeReference.source && (
              <a href={activeReference.source} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                marginTop: '1.5rem', padding: '0.6rem 1.2rem',
                background: 'rgba(var(--primary-rgb), 0.1)',
                borderRadius: '10px', color: 'var(--primary)',
                textDecoration: 'none', fontSize: '0.85rem',
                fontWeight: 600, transition: 'background 0.2s'
              }}>
                <ExternalLink size={16} /> Acessar Fonte
              </a>
            )}
          </div>
        </div>
      )}

      {/* Navegação entre lições */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '3rem', padding: '1.5rem 0', borderTop: '1px solid var(--glass-border)',
        gap: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          {!isPanorama && prevLessonId && (
            <button
              onClick={() => navigate(`/lesson/${prevLessonId}`)}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Lição Anterior"
            >
              <ChevronLeft size={20} /> Lição Anterior
            </button>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {nextLessonId && !lesson.titulo?.toLowerCase().startsWith('lição 10') && (
            <button
              onClick={() => navigate(`/lesson/${nextLessonId}`)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Próxima Lição"
            >
              Próxima Lição <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
      <AudioReader />

      {/* WIKI REFERENCE POPUP */}
      {wikiPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setWikiPopup(null)}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: '24px', padding: '2.5rem',
            maxWidth: '520px', width: '100%',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setWikiPopup(null)} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)'
            }}><X size={18} /></button>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {wikiPopup.tipo}
            </h4>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>{wikiPopup.titulo}</h3>
            <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0, color: 'var(--text-muted)' }}>
              {wikiPopup.texto}
            </p>
          </div>
        </div>
      )}

      {/* BIBLE READER POPUP */}
      {showBibleReader && (
        <BibleReaderPopup onClose={() => setShowBibleReader(false)} />
      )}

      {/* FLOATING BIBLE BUTTON */}
      <button
        onClick={() => setShowBibleReader(true)}
        className="bible-floating-btn"
        aria-label="Abrir Bíblia"
        title="Abrir Bíblia"
      >
        <BookOpen size={24} />
      </button>

      <style>{`
        .bible-floating-btn {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a84c, #b8942e);
          color: #1a1a2e;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(201, 168, 76, 0.35);
          transition: all 0.3s ease;
          z-index: 999;
        }
        .bible-floating-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 40px rgba(201, 168, 76, 0.5);
        }
      `}</style>
    </div>
  )
}


export default Lesson
