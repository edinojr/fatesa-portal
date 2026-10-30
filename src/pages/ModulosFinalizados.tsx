import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BookOpen, ChevronLeft, GraduationCap, FileText } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { supabase } from '../lib/supabase'
import Logo from '../components/common/Logo'
import CourseList from '../features/courses/components/CourseList'
import { getBookStats, areModuleTitlesEqual } from '../features/courses/utils/courseUtils'
import { GRADUATION_CONFIG, isNivelBasico, isNivelMedio } from '../config/graduation'
import GraduationFormModal from '../features/users/components/GraduationFormModal'
import LevelCertificate from '../features/users/components/LevelCertificate'
import { graduationService } from '../services/graduationService'
import { generateCertificadoPDF, generateHistoricoPDF } from '../utils/pdfGenerator'
import { PanelSwitcher } from '../components/common/PanelSwitcher'
import { fetchStudentAcademicSummary } from '../services/academicService'
import { sortModulesByCurriculum, getOfficialBookIndex, getOfficialBookTitle, cleanModuleTitle, LEGACY_AULA_TO_BOOK_TITLE } from '../lib/courseTitles'


const ModulosFinalizados = () => {
    const { profile, loading: profileLoading } = useProfile();
    const { courses, progressoAulas, atividades, loading: coursesLoading, fetchStudentDashboardData, finishedBasicCount, finishedMediumCount } = useStudentCourses(profile);
    const navigate = useNavigate();

const goToPanel = () => {
        navigate('/dashboard');
    };


    const [showGraduationForm, setShowGraduationForm] = React.useState(false);
    const [showCertificate, setShowCertificate] = React.useState(false);
    const [completedCourse, setCompletedCourse] = React.useState<any>(null);
    const [alumniRecord, setAlumniRecord] = React.useState<any>(null);
    const [historyGrades, setHistoryGrades] = useState<any[]>([]);

    // Verificar se algum curso foi finalizado totalmente
    useEffect(() => {
        if (!coursesLoading && courses && courses.length > 0 && profile) {
            courses.forEach(course => {
                const isBasic = isNivelBasico(course.nivel || '') || !course.nivel;
                const isMedium = isNivelMedio(course.nivel || '');

                let meetsGraduationRequirement = false;
                if (isBasic && (finishedBasicCount || 0) >= GRADUATION_CONFIG.basico.requiredModules) {
                    meetsGraduationRequirement = true;
                } else if (isMedium && (finishedMediumCount || 0) >= GRADUATION_CONFIG.medio.requiredModules) {
                    meetsGraduationRequirement = true;
                }

                if (meetsGraduationRequirement) {
                    setCompletedCourse(course);
                    checkAlumni(profile.id);
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coursesLoading, courses, finishedBasicCount, finishedMediumCount, profile]);

    const checkAlumni = async (userId: string) => {
        const record = await graduationService.checkAlumniStatus(userId);
        if (record) {
            setAlumniRecord(record);
        } else if (profile?.tipo !== 'ex_aluno') {
            // Se for formado mas não tiver registro de alumni, e ainda não tiver status ex_aluno
            setShowGraduationForm(true);
        }
    };

    const handleGraduationComplete = async (formData: any) => {
        if (!profile || !completedCourse) return;
        const record = await graduationService.graduateStudent(profile.id, {
            ...formData,
            courseId: completedCourse.id,
            courseName: completedCourse.nome,
            levelName: completedCourse.nivel === 'basico' ? 'Teologia Básico' : 'Teologia Médio'
        });
        setAlumniRecord(record);
    };

    useEffect(() => {
        if (!profileLoading && profile?.id) {
            fetchStudentDashboardData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile?.id]);

    const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');

    useEffect(() => {
        if (!profileLoading && profile?.id) {
            const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
            const hasValidId = isUUID(profile.id);
            const userEmail = (profile.email || '').toLowerCase().trim();

            let alumniQuery = supabase.from('registros_alumni').select('*');
            if (hasValidId && userEmail) {
                alumniQuery = alumniQuery.or(`user_id.eq.${profile.id},email.eq.${userEmail}`);
            } else if (hasValidId) {
                alumniQuery = alumniQuery.eq('user_id', profile.id);
            } else if (userEmail) {
                alumniQuery = alumniQuery.eq('email', userEmail);
            }

            Promise.all([
                supabase.from('historico_notas').select('*').eq('aluno_id', profile.id).order('created_at', { ascending: false }),
                alumniQuery,
                supabase.from('respostas_aulas').select('id, aula_id, nota, status, created_at, updated_at').eq('aluno_id', profile.id)
            ]).then(async ([histRes, alumniRes, respRes]) => {
                if (histRes.error) console.error('[ModulosFinalizados] Erro ao buscar histórico:', histRes.error.message);
                const combined: any[] = [];
                const upsertCombined = (entry: any) => {
                    if (!entry || !entry.modulo_nome || entry.nota == null) return;
                    const numNota = parseFloat(String(entry.nota).replace(',', '.'));
                    if (isNaN(numNota)) return;
                    const canonical = getOfficialBookTitle(entry.modulo_nome);
                    const existingIdx = combined.findIndex(h => areModuleTitlesEqual(h.modulo_nome, entry.modulo_nome) || areModuleTitlesEqual(h.modulo_nome, canonical));
                    if (existingIdx === -1) {
                        combined.push({ ...entry, modulo_nome: canonical, nota: numNota });
                    } else if (numNota > Number(combined[existingIdx].nota || 0)) {
                        combined[existingIdx] = {
                            ...combined[existingIdx],
                            modulo_nome: canonical,
                            nota: numNota,
                            data_conclusao: entry.data_conclusao || combined[existingIdx].data_conclusao
                        };
                    }
                };

                (histRes.data || []).forEach(upsertCombined);
                const alumniList = alumniRes.data || [];
                
                // Salvar registro de aluno formado se existir
                if (alumniList.length > 0 && !alumniRecord) {
                    setAlumniRecord(alumniList[0]);
                }

                alumniList.forEach((al: any) => {
                    if (Array.isArray(al.historico)) {
                        al.historico.forEach((item: any, idx: number) => {
                            if (item && item.modulo && item.nota != null && String(item.nota).trim() !== '') {
                                const numNota = parseFloat(String(item.nota).replace(',', '.'));
                                if (!isNaN(numNota)) {
                                    upsertCombined({
                                        id: `alumni-${al.id}-${idx}`,
                                        aluno_id: profile.id,
                                        curso_nome: al.curso || 'Teologia Básico',
                                        modulo_nome: item.modulo,
                                        nota: numNota,
                                        data_conclusao: item.data || new Date().toLocaleDateString('pt-BR'),
                                        observacao: 'Histórico oficial de notas (Formados)'
                                    });
                                }
                            }
                        });
                    }
                });

                // Incorporar notas aprovadas do processo online (respostas_aulas)
                const onlineSubs = (respRes?.data || []).filter((r: any) => r && r.nota != null);
                if (onlineSubs.length > 0) {
                    const aulaIds = Array.from(new Set(onlineSubs.map((r: any) => r.aula_id).filter(Boolean)));
                    const { data: aData } = await supabase
                        .from('aulas')
                        .select('id, titulo, tipo, is_bloco_final, livro_id')
                        .in('id', aulaIds);
                    const aulasMap: Record<string, any> = {};
                    (aData || []).forEach((a: any) => { aulasMap[a.id] = a; });

                    const livroIds = Array.from(new Set((aData || []).map((a: any) => a.livro_id).filter(Boolean)));
                    const livrosMap: Record<string, any> = {};
                    if (livroIds.length > 0) {
                        const { data: lData } = await supabase
                            .from('livros')
                            .select('id, titulo, curso_id')
                            .in('id', livroIds);
                        (lData || []).forEach((l: any) => { livrosMap[l.id] = l; });
                    }

                    onlineSubs.forEach((r: any) => {
                        const numNota = parseFloat(String(r.nota).replace(',', '.'));
                        if (isNaN(numNota) || numNota < 7.0) return;
                        const aula = aulasMap[r.aula_id];
                        const livro = aula?.livro_id ? livrosMap[aula.livro_id] : null;
                        let modTitle = livro?.titulo || (r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) || aula?.titulo;
                        if (!modTitle) return;
                        const canonical = getOfficialBookTitle(modTitle);
                        upsertCombined({
                            id: `online-${r.id}`,
                            aluno_id: profile.id,
                            curso_nome: 'Teologia Básico',
                            modulo_nome: canonical,
                            nota: numNota,
                            data_conclusao: r.updated_at ? new Date(r.updated_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
                            observacao: 'Avaliação online realizada no portal'
                        });
                    });
                }

                console.log('[ModulosFinalizados] total de notas carregadas:', combined.length);
                setHistoryGrades(combined);
            });
        }
    }, [profileLoading, profile?.id, profile?.email]);

    // Filtrar apenas cursos que possuem pelo menos um livro finalizado (ou aprovado por histórico manual)
    const { finishedCourses, orfaosAprovados } = useMemo(() => {
        // Normalização de título simples
        const normalizeTitle = (s: string) =>
          (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[.,;:!?]+$/g, '').replace(/\s+/g, ' ');

        // Detectar nível (Básico/Médio) a partir de qualquer string
        const detectNivel = (s: string) => {
            const n = (s || '').toLowerCase();
            if (n.includes('medio') || n.includes('médio')) return 'medio';
            return 'basico';
        };

        // 1) Históricos aprovados (nota >= 7)
        const approvedHistory = (historyGrades || []).filter((h: any) => h && h.nota != null && Number(h.nota) >= 7);

        // 2) finishedCourses — marca books finalizados por prova OU por histórico manual, sempre exibindo a maior nota (Math.max)
        let localFinishedCourses = (courses || []).map(course => {
            const finishedBooks = (course.livros || []).map(l => {
                const stats = getBookStats(l, atividades, progressoAulas);
                const matchingHistoryEntries = approvedHistory.filter((h: any) => areModuleTitlesEqual(h.modulo_nome, l.titulo));
                const approvedManual = matchingHistoryEntries.length > 0;
                const bestHistNota = matchingHistoryEntries.length > 0
                    ? Math.max(...matchingHistoryEntries.map((h: any) => Number(h.nota) || 0))
                    : -1;
                const lNota = (l as any).nota != null && !isNaN(Number((l as any).nota)) ? Number((l as any).nota) : -1;
                const lNotaHist = (l as any).notaHistorico != null && !isNaN(Number((l as any).notaHistorico)) ? Number((l as any).notaHistorico) : -1;
                const statsNota = stats.examGrade != null && !isNaN(Number(stats.examGrade)) && stats.examGrade > 0 ? Number(stats.examGrade) : -1;

                const maxCandidate = Math.max(bestHistNota, lNota, lNotaHist, statsNota);
                const notaVal: number | undefined = maxCandidate >= 0 ? maxCandidate : undefined;

                const isFin = (l.isFinished || stats.isFinished || approvedManual || (notaVal != null && notaVal >= 7)) && notaVal != null;

                return { l, stats, approvedManual, notaManual: notaVal, isFin };
            }).filter(({ isFin }) => isFin)
            .map(({ l, stats, approvedManual, notaManual }) => ({
                ...l,
                isUnlocked: true,
                isReleased: true,
                isFinished: true,
                isApproved: true,
                notaHistorico: notaManual,
                nota: notaManual
            }));
            return { ...course, livros: finishedBooks };
        }).filter(course => course.livros.length > 0);

        // 3) Construir lista única de títulos já exibidos (para evitar duplicação)
        const displayedTitles = new Set<string>();
        localFinishedCourses.forEach(c => c.livros.forEach((l: any) => displayedTitles.add(l.titulo)));

        // 4) Módulos do histórico que ainda não foram exibidos como livros cadastrados
        //    — criar "books" sintéticos e colocá-los no curso Básico ou Médio
        const localOrfaosAprovados = approvedHistory.filter((h: any) => {
            for (const disp of displayedTitles) {
                if (areModuleTitlesEqual(disp, h.modulo_nome)) {
                    return false;
                }
            }
            return true;
        });

        // Incluir também submissões online aprovadas que não estão na lista de livros exibidos
        (atividades || []).forEach((at: any) => {
            if (at.nota != null && Number(at.nota) >= 7) {
                const isExamOrManual = at.is_bloco_final || at.lesson_type === 'prova' || at.lesson_type === 'avaliacao' || at.aulas?.tipo === 'prova' || at.aulas?.tipo === 'avaliacao' || at.is_manual || at.status === 'corrigida' || Number(at.nota) >= 7;
                if (!isExamOrManual) return;
                const rawTitle = at.book_title || (at.lesson_id && LEGACY_AULA_TO_BOOK_TITLE[at.lesson_id]) || (at.aula_id && LEGACY_AULA_TO_BOOK_TITLE[at.aula_id]) || at.modulo_nome || at.lesson_title;
                if (!rawTitle) return;
                const title = getOfficialBookTitle(rawTitle);
                let alreadyDisplayed = false;
                for (const disp of displayedTitles) {
                    if (areModuleTitlesEqual(disp, title)) {
                        alreadyDisplayed = true;
                        break;
                    }
                }
                if (!alreadyDisplayed) {
                    const existingOrfaoIdx = localOrfaosAprovados.findIndex((h: any) => areModuleTitlesEqual(h.modulo_nome, title));
                    if (existingOrfaoIdx === -1) {
                        localOrfaosAprovados.push({
                            id: at.book_id || at.lesson_id || at.id,
                            modulo_nome: title,
                            nota: Number(at.nota),
                            data_conclusao: at.submitted_at || at.created_at || new Date().toISOString(),
                            curso_nome: at.curso_nivel || 'Teologia Básico'
                        });
                    } else if (Number(at.nota) > Number(localOrfaosAprovados[existingOrfaoIdx].nota || 0)) {
                        localOrfaosAprovados[existingOrfaoIdx].nota = Number(at.nota);
                    }
                }
            }
        });

        if (localOrfaosAprovados.length > 0) {
            const allCourseBooks = (courses || []).flatMap(c => c.livros || []);
            const orfaosByNivel: Record<string, any[]> = { basico: [], medio: [] };
            localOrfaosAprovados.forEach((h: any) => {
                const nivel = detectNivel(h.curso_nome || h.modulo_nome || '');
                const matchedCourseBook = allCourseBooks.find((b: any) => areModuleTitlesEqual(b.titulo, h.modulo_nome));
                orfaosByNivel[nivel].push({
                    ...(matchedCourseBook || {}),
                    id: matchedCourseBook?.id || `historico-${h.id || h.modulo_nome}`,
                    titulo: matchedCourseBook?.titulo || h.modulo_nome,
                    aulas: matchedCourseBook?.aulas || [],
                    capa_url: matchedCourseBook?.capa_url || undefined,
                    isUnlocked: true,
                    isReleased: true,
                    isFinished: true,
                    isApproved: true,
                    nota: h.nota,
                    notaHistorico: h.nota,
                    data_conclusao: h.data_conclusao,
                    curso_nome: h.curso_nome,
                });
            });

            ['basico', 'medio'].forEach((nivel) => {
                if (orfaosByNivel[nivel].length === 0) return;
                const cursoAlvo = localFinishedCourses.find(c => detectNivel(c.nivel || c.nome || '') === nivel);
                if (cursoAlvo) {
                    cursoAlvo.livros.push(...orfaosByNivel[nivel]);
                } else {
                    localFinishedCourses.push({
                        id: `sintetico-${nivel}`,
                        nome: nivel === 'basico' ? 'Teologia Básico' : 'Teologia Médio',
                        nivel: nivel as any,
                        livros: orfaosByNivel[nivel],
                    });
                }
            });
        }

        const sortedCourses = localFinishedCourses.map(course => ({
            ...course,
            livros: sortModulesByCurriculum(course.livros || [], (l: any) => l.titulo)
        }));

        return { finishedCourses: sortedCourses, orfaosAprovados: localOrfaosAprovados };
    }, [courses, historyGrades, atividades, progressoAulas, profile?.tipo, alumniRecord?.status_aprovacao]);

    // Extrair lista plana de todos os módulos com notas para a tabela de boletim (desduplicando por título e mantendo a maior nota)
    const allCompletedBooksFlat = useMemo(() => {
        const list: Array<{ id: string; titulo: string; curso: string; nota: number | null; data: string }> = [];
        finishedCourses.forEach(c => {
            (c.livros || []).forEach((l: any) => {
                const n1 = l.notaHistorico != null && !isNaN(Number(l.notaHistorico)) ? Number(l.notaHistorico) : -1;
                const n2 = l.nota != null && !isNaN(Number(l.nota)) ? Number(l.nota) : -1;
                const bestN = Math.max(n1, n2);
                const n = bestN >= 0 ? bestN : null;

                const rawTitle = l.titulo || l.modulo_nome || l.book_title || '';
                const canonicalTitle = getOfficialBookTitle(rawTitle);
                const existingIdx = list.findIndex(item => areModuleTitlesEqual(item.titulo, rawTitle) || areModuleTitlesEqual(item.titulo, canonicalTitle));
                if (existingIdx === -1) {
                    list.push({
                        id: l.id,
                        titulo: canonicalTitle || rawTitle || 'Módulo',
                        curso: (c.nome || (c.nivel === 'basico' ? 'Teologia Básico' : 'Teologia Médio')).toUpperCase(),
                        nota: n,
                        data: l.data_conclusao || 'Concluído'
                    });
                } else if (n !== null && (list[existingIdx].nota === null || n > list[existingIdx].nota!)) {
                    list[existingIdx].nota = n;
                    list[existingIdx].titulo = canonicalTitle || rawTitle || list[existingIdx].titulo;
                }
            });
        });
        return sortModulesByCurriculum(list, item => item.titulo);
    }, [finishedCourses]);

    const mediaGeral = useMemo(() => {
        const notasValidas = allCompletedBooksFlat.map(b => b.nota).filter((n): n is number => n !== null);
        if (notasValidas.length === 0) return null;
        const sum = notasValidas.reduce((a, b) => a + b, 0);
        return (sum / notasValidas.length).toFixed(1);
    }, [allCompletedBooksFlat]);

    if (profileLoading || coursesLoading) {
        return (
            <div className="auth-container">
                <div className="spinner"></div>
                <p>Carregando seus módulos finalizados e notas...</p>
            </div>
        );
    }

    const totalModulosConcluidos = finishedCourses.reduce((acc, c) => acc + c.livros.length, 0);

    return (
        <div className="admin-layout">
            <header className="dashboard-header-modern" style={{ height: '60px', minHeight: '60px', maxHeight: '60px', padding: '0 1.5rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <Logo size={72} maxHeight={42} />
                    <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1rem' }}>
                        <button onClick={() => goToPanel()} className="nav-btn-premium" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} title="Voltar ao Painel">
                            <ChevronLeft size={16} /> <span className="mobile-hide">Painel do Aluno</span>
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
                     <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Meu Boletim & Módulos Finalizados</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'nowrap', flexShrink: 0 }}>
                    <PanelSwitcher currentPanel="aluno" />
                    <div className="mobile-hide" style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                        <Award size={16} color="#ffffff" />
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff' }}>{totalModulosConcluidos}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase' }}>Módulos</span>
                    </div>
                </div>
            </header>

            <main className="admin-main" style={{ padding: '2rem 4rem' }}>
                {/* Header de Resumo com Estatísticas e Certificado */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '1.5rem', 
                    marginBottom: '2.5rem' 
                }}>
                    {/* Card 1: Status Geral */}
                    <div style={{ background: 'var(--glass)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Award size={22} color="var(--primary)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Total de Módulos Concluídos
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>{totalModulosConcluidos}</span>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>de 27 matérias</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>
                            ✓ Histórico escolar e notas integradas
                        </div>
                    </div>

                    {/* Card 2: Média Geral */}
                    <div style={{ background: 'var(--glass)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <GraduationCap size={22} color="#10b981" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Média Geral de Notas
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>{mediaGeral ?? '10.0'}</span>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10.0</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Aproveitamento escolar excelente
                        </div>
                    </div>

                    {/* Card 3: Formatura e Certificado */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.12) 0%, rgba(147, 51, 234, 0.08) 100%)', 
                        padding: '1.5rem 2rem', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(var(--primary-rgb), 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                <Award size={20} color="var(--primary)" />
                                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                    {totalModulosConcluidos >= 27 || profile?.tipo === 'ex_aluno' || alumniRecord ? 'Formado no Curso Básico' : 'Em Formação'}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {totalModulosConcluidos >= 27 || profile?.tipo === 'ex_aluno' || alumniRecord
                                    ? 'Seu curso está concluído com certificado e histórico oficial disponíveis.'
                                    : 'Acompanhe as notas de cada módulo finalizado.'}
                            </p>
                        </div>
                        {(alumniRecord || totalModulosConcluidos >= 27 || profile?.tipo === 'ex_aluno') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ width: 'auto', gap: '0.5rem', padding: '0.65rem 1.4rem', background: 'var(--primary, #0056b3)', color: '#ffffff', borderColor: '#004494', fontWeight: 800, display: 'inline-flex' }}
                                    onClick={async () => {
                                        try {
                                            const summary = await fetchStudentAcademicSummary(profile);
                                            const nivel = summary.nivelCertificado;
                                            await generateCertificadoPDF(summary.alunoData.nome, nivel, summary.dataConclusao);
                                        } catch (e) {
                                            console.error('Erro ao gerar certificado:', e);
                                            const nivel = (alumniRecord?.nivel_curso || '').toLowerCase().includes('méd') || totalModulosConcluidos >= 35 ? 'medio' : 'basico';
                                            await generateCertificadoPDF(alumniRecord?.nome || profile?.nome || 'Aluno', nivel, alumniRecord?.ano_formacao || new Date());
                                        }
                                    }}
                                >
                                    <Award size={18} /> Baixar Certificado Oficial (PDF)
                                </button>
                                <button 
                                    className="btn btn-outline" 
                                    style={{ width: '100%', gap: '0.5rem', padding: '0.65rem 1rem' }}
                                    onClick={async () => {
                                        try {
                                            const summary = await fetchStudentAcademicSummary(profile);
                                            const alunoData = {
                                                nome: summary.alunoData.nome,
                                                nucleo: summary.alunoData.nucleo,
                                                matricula: summary.alunoData.matricula,
                                                dataMatricula: summary.alunoData.dataMatricula,
                                                status: summary.alunoData.status
                                            };
                                            const materiasParaHistorico = summary.materias.map(m => ({
                                                nome: m.nome,
                                                media: m.media
                                            }));
                                            const nivelStr = summary.nivelCertificado === 'medio' ? 'Médio' : 'Básico';
                                            await generateHistoricoPDF(alunoData, materiasParaHistorico, nivelStr);
                                        } catch (e) {
                                            console.error('Erro ao gerar histórico pelo academicService:', e);
                                            const alunoData = {
                                                nome: alumniRecord?.nome || profile?.nome || 'Aluno',
                                                nucleo: profile?.nucleos?.nome || alumniRecord?.nucleo || 'SEDE',
                                                matricula: alumniRecord?.matricula || 'N/A',
                                                dataMatricula: alumniRecord?.ano_formacao || 'N/A',
                                                status: 'Formado'
                                            };
                                            const materiasParaHistorico = allCompletedBooksFlat.map(b => ({
                                                nome: b.titulo,
                                                media: b.nota ?? 10
                                            }));
                                            await generateHistoricoPDF(alunoData, materiasParaHistorico, totalModulosConcluidos >= 35 ? 'Médio' : 'Básico');
                                        }
                                    }}
                                >
                                    <FileText size={18} /> Baixar Histórico Escolar Oficial (PDF)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="gold-separator-line" style={{ marginBottom: '2rem' }} />

                {/* Barra de Seleção de Visualização: Cards vs Tabela */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Histórico de Matérias e Notas</h2>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Visualize os módulos concluídos em cards detalhados ou em formato de boletim oficial.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={() => setViewMode('cards')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: viewMode === 'cards' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'cards' ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Visualização em Cards
                        </button>
                        <button
                            onClick={() => setViewMode('tabela')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: viewMode === 'tabela' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'tabela' ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Boletim Escolar (Tabela)
                        </button>
                    </div>
                </div>

                {finishedCourses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                        <BookOpen size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                        <h2>Nenhum módulo finalizado ainda.</h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>
                            Continue seus estudos para ver aqui suas conquistas e certificados.
                        </p>
                        <button onClick={() => navigate('/dashboard?tab=cursos')} className="btn btn-primary" style={{ width: 'auto' }}>Ir para Meus Cursos</button>
                    </div>
                ) : viewMode === 'tabela' ? (
                    /* Visualização em Tabela de Boletim */
                    <div style={{ 
                        background: 'var(--glass)', 
                        borderRadius: '20px', 
                        border: '1px solid var(--glass-border)',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', width: '60px' }}>#</th>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disciplina / Módulo</th>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Curso</th>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Conclusão</th>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Nota Oficial</th>
                                        <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Situação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCompletedBooksFlat.map((item, idx) => {
                                        const officialIdx = getOfficialBookIndex(item.titulo);
                                        const modNum = (officialIdx >= 0 && officialIdx < 900) ? (officialIdx + 1) : (idx + 1);
                                        const cleanTitle = cleanModuleTitle(item.titulo) || item.titulo;
                                        return (
                                        <tr key={item.id + idx} style={{ borderBottom: '1px solid var(--glass-border, rgba(0, 51, 102, 0.08))', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: 800, color: 'var(--text-muted, #1e40af)', fontSize: '0.9rem' }}>{modNum}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main, #003366)' }}>{cleanTitle}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted, #1e40af)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                {item.curso}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted, #1e40af)', fontSize: '0.85rem' }}>
                                                {item.data}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    display: 'inline-block',
                                                    padding: '4px 12px', 
                                                    borderRadius: '8px', 
                                                    fontWeight: 900, 
                                                    fontSize: '0.95rem',
                                                    background: 'rgba(16, 185, 129, 0.12)', 
                                                    color: 'var(--success)'
                                                }}>
                                                    {item.nota != null ? item.nota.toFixed(1) : '10.0'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '3px 10px',
                                                    borderRadius: '50px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    color: 'var(--success)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                                }}>
                                                    ✓ Aprovado
                                                </span>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Total de disciplinas listadas: <strong>{allCompletedBooksFlat.length}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>
                                    Média Final Consolidada: {mediaGeral ?? '10.0'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Visualização em Cards */
                    <>
                        <CourseList 
                            courses={finishedCourses}
                            atividades={atividades}
                            progressoAulas={progressoAulas}
                            showOnlyFinished={true}
                        />
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                            <button onClick={() => navigate('/dashboard?tab=cursos')} className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.75rem 2rem' }}>
                                <ChevronLeft size={18} /> Voltar para Meus Cursos
                            </button>
                        </div>
                    </>
                )}
            </main>

            {showGraduationForm && completedCourse && profile && (
                <GraduationFormModal 
                    studentName={profile.nome}
                    studentEmail={profile.email}
                    courseId={completedCourse.id}
                    courseName={completedCourse.nome}
                    levelName={completedCourse.nivel === 'basico' ? 'Teologia Básico' : 'Teologia Médio'}
                    onComplete={handleGraduationComplete}
                    onClose={() => setShowGraduationForm(false)}
                />
            )}

            {showCertificate && alumniRecord && (
                <LevelCertificate 
                    studentName={alumniRecord.nome}
                    courseName={alumniRecord.curso}
                    levelName={alumniRecord.nivel_curso}
                    date={new Date(alumniRecord.created_at).toLocaleDateString()}
                    verificationCode={alumniRecord.codigo_verificacao}
                    onClose={() => setShowCertificate(false)}
                />
            )}

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default ModulosFinalizados;
