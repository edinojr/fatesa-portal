import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BookOpen, ChevronLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'
import Logo from '../components/common/Logo'
import CourseList from '../features/courses/components/CourseList'
import { getBookStats } from '../features/courses/utils/courseUtils'

const ModulosFinalizados = () => {
    const { profile, loading: profileLoading } = useProfile();
    const { courses, progressoAulas, atividades, loading: coursesLoading, fetchStudentDashboardData } = useStudentCourses(profile);
    const navigate = useNavigate();

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
                <header style={{ marginBottom: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Aqui você encontra o histórico de todos os módulos que você já finalizou com sucesso.</p>
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
        </div>
    );
};

export default ModulosFinalizados;
