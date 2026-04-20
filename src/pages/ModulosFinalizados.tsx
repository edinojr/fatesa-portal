import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BookOpen, ChevronLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import Logo from '../components/common/Logo'
import CourseList from '../features/courses/components/CourseList'
import { getBookStats, isCourseCompleted } from '../features/courses/utils/courseUtils'
import GraduationFormModal from '../features/users/components/GraduationFormModal'
import LevelCertificate from '../features/users/components/LevelCertificate'
import { graduationService } from '../services/graduationService'

const ModulosFinalizados = () => {
    const { profile, loading: profileLoading } = useProfile();
    const { courses, progressoAulas, atividades, loading: coursesLoading, fetchStudentDashboardData, finishedBasicCount, finishedMediumCount } = useStudentCourses(profile);
    const navigate = useNavigate();

    const [showGraduationForm, setShowGraduationForm] = React.useState(false);
    const [showCertificate, setShowCertificate] = React.useState(false);
    const [completedCourse, setCompletedCourse] = React.useState<any>(null);
    const [alumniRecord, setAlumniRecord] = React.useState<any>(null);

    // Verificar se algum curso foi finalizado totalmente
    useEffect(() => {
        if (!coursesLoading && courses && courses.length > 0 && profile) {
            courses.forEach(course => {
                const isBasic = (course.nivel || '').toLowerCase().includes('basico') || (course.nivel || '').toLowerCase().includes('básico') || !course.nivel;
                const isMedium = (course.nivel || '').toLowerCase().includes('medio') || (course.nivel || '').toLowerCase().includes('médio');

                let meetsGraduationRequirement = false;
                if (isBasic && (finishedBasicCount || 0) >= 27) {
                    meetsGraduationRequirement = true;
                } else if (isMedium && (finishedMediumCount || 0) >= 8) {
                    meetsGraduationRequirement = true;
                }

                if (meetsGraduationRequirement) {
                    setCompletedCourse(course);
                    checkAlumni(profile.id);
                }
            });
        }
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
    }, [profileLoading, profile]);

    // Filtrar apenas cursos que possuem pelo menos um livro finalizado
    const finishedCourses = (courses || []).map(course => {
        const finishedBooks = (course.livros || []).filter(l => getBookStats(l, atividades, progressoAulas).isFinished);
        return { ...course, livros: finishedBooks };
    }).filter(course => course.livros.length > 0);

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
                        <button onClick={() => navigate('/dashboard')} className="nav-btn-premium" title="Voltar ao Painel">
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
                        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: 'auto' }}>Ir para Meus Cursos</button>
                    </div>
                ) : (
                    <CourseList 
                        courses={finishedCourses}
                        atividades={atividades}
                        progressoAulas={progressoAulas}
                        showOnlyFinished={true}
                    />
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
