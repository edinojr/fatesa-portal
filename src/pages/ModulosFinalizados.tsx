import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BookOpen, ChevronLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import { supabase } from '../lib/supabase'
import Logo from '../components/common/Logo'
import CourseList from '../features/courses/components/CourseList'
import { getBookStats } from '../features/courses/utils/courseUtils'
import { GRADUATION_CONFIG, isNivelBasico, isNivelMedio } from '../config/graduation'
import GraduationFormModal from '../features/users/components/GraduationFormModal'
import LevelCertificate from '../features/users/components/LevelCertificate'
import { graduationService } from '../services/graduationService'

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
        if (!profileLoading && profile) {
            fetchStudentDashboardData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile]);

    useEffect(() => {
        if (!profileLoading && profile?.id) {
            supabase.from('historico_notas').select('*').eq('aluno_id', profile.id).order('created_at', { ascending: false }).then(({ data, error }) => {
                if (error) console.error('[ModulosFinalizados] Erro ao buscar histórico:', error.message);
                console.log('[ModulosFinalizados] historyGrades carregados:', data?.length || 0, data);
                setHistoryGrades(data || []);
            });
        }
    }, [profileLoading, profile?.id]);

    // Filtrar apenas cursos que possuem pelo menos um livro finalizado (ou aprovado por histórico manual)
    console.log('[ModulosFinalizados] cursos:', courses?.length, 'atividades:', atividades?.length, 'progresso:', progressoAulas?.length, 'historyGrades:', historyGrades?.length);

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
    const approvedByHistoryTitles = new Set(approvedHistory.map((h: any) => normalizeTitle(h.modulo_nome)));

    // 2) finishedCourses — marca books finalizados por prova OU por histórico manual
    const finishedCourses = (courses || []).map(course => {
        const finishedBooks = (course.livros || []).map(l => {
            const stats = getBookStats(l, atividades, progressoAulas);
            const approvedManual = approvedByHistoryTitles.has(normalizeTitle(l.titulo));
            return { l, stats, approvedManual };
        }).filter(({ l, stats, approvedManual }) =>
            l.isFinished || stats.isFinished || approvedManual
        ).map(({ l, stats, approvedManual }) => ({
            ...l,
            isFinished: true,
            // Não forçar aprovação: só fica aprovado se passou na prova (stats/l.isApproved)
            // ou se foi aprovado por histórico manual (approvedManual).
            // Alunos em DP (reprovaram na V3) continuam isApproved=false para exibir "D.P.".
            isApproved: !!(stats.isApproved || l.isApproved || approvedManual)
        }));
        return { ...course, livros: finishedBooks };
    }).filter(course => course.livros.length > 0);

    // 3) Construir lista única de títulos já exibidos (para evitar duplicação)
    const displayedTitles = new Set<string>();
    finishedCourses.forEach(c => c.livros.forEach((l: any) => displayedTitles.add(normalizeTitle(l.titulo))));

    // 4) Módulos do histórico que ainda não foram exibidos como livros cadastrados
    //    — criar "books" sintéticos e colocá-los no curso Básico ou Médio
    const orfaosAprovados = approvedHistory.filter((h: any) =>
        !displayedTitles.has(normalizeTitle(h.modulo_nome))
    );

    if (orfaosAprovados.length > 0) {
        const orfaosByNivel: Record<string, any[]> = { basico: [], medio: [] };
        orfaosAprovados.forEach((h: any) => {
            const nivel = detectNivel(h.curso_nome || h.modulo_nome || '');
            orfaosByNivel[nivel].push({
                id: `historico-${h.id || h.modulo_nome}`,
                titulo: h.modulo_nome,
                aulas: [],
                capa_url: undefined,
                isFinished: true,
                isApproved: true,
                nota: h.nota,
                data_conclusao: h.data_conclusao,
                curso_nome: h.curso_nome,
            });
        });

        ['basico', 'medio'].forEach((nivel) => {
            if (orfaosByNivel[nivel].length === 0) return;
            // Procurar um curso do mesmo nível para anexar; se não houver, criar sintético
            const cursoAlvo = finishedCourses.find(c => detectNivel(c.nivel || c.nome || '') === nivel);
            if (cursoAlvo) {
                cursoAlvo.livros.push(...orfaosByNivel[nivel]);
            } else {
                finishedCourses.push({
                    id: `sintetico-${nivel}`,
                    nome: nivel === 'basico' ? 'Teologia Básico' : 'Teologia Médio',
                    nivel: nivel as any,
                    livros: orfaosByNivel[nivel],
                });
            }
        });
    }

    if (profileLoading || coursesLoading) {
        return (
            <div className="auth-container">
                <div className="spinner"></div>
                <p>Carregando seus módulos finalizados...</p>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <header className="dashboard-header-modern">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Logo size={120} />
                    <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
                        <button onClick={() => goToPanel()} className="nav-btn-premium" title="Voltar ao Painel">
                            <ChevronLeft size={18} /> <span className="mobile-hide">Painel do Aluno</span>
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                     <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Módulos Finalizados</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '0.4rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--glass-border)' }}>
                        <Award size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 800 }}>{finishedCourses.reduce((acc, c) => acc + c.livros.length, 0)}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Módulos</span>
                    </div>
                </div>
            </header>

            <main className="admin-main" style={{ padding: '2rem 4rem' }}>
                <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Aqui você encontra o histórico de todos os módulos que você já finalizou com sucesso.</p>
                    </div>
                    
                    {alumniRecord && (
                        <div style={{ 
                            background: 'rgba(var(--primary-rgb), 0.05)', 
                            border: '1px solid var(--primary)', 
                            borderRadius: '16px', 
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            maxWidth: '400px',
                            animation: 'slideInRight 0.5s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Award size={24} color="var(--primary)" />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Parabéns, Formado!</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Seu certificado de nível está disponível.</p>
                                </div>
                            </div>
                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', gap: '0.5rem' }}
                                onClick={() => setShowCertificate(true)}
                            >
                                <Award size={18} /> Imprimir Meu Certificado
                            </button>
                        </div>
                    )}
                </header>

                {finishedCourses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                        <BookOpen size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                        <h2>Nenhum módulo finalizado ainda.</h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>
                            Continue seus estudos para ver aqui suas conquistas e certificados.
                        </p>
                        <button onClick={() => navigate('/dashboard?tab=cursos')} className="btn btn-primary" style={{ width: 'auto' }}>Ir para Meus Cursos</button>
                    </div>
                ) : (
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
