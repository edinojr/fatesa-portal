import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Book, GraduationCap } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const CursosPublic = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="landing-container">
            <Navbar />
            
            <section className="hero-section" style={{ height: '40vh', minHeight: '300px' }}>
                <div className="hero-overlay" style={{ opacity: 0.8 }}></div>
                <div className="hero-content">
                    <h1>Nossos Cursos</h1>
                    <p className="slogan">Formação teológica sólida para o seu ministério.</p>
                </div>
            </section>

            <section id="cursos" className="courses-section" style={{ padding: '8rem 2rem', background: 'radial-gradient(circle at 90% 10%, rgba(156, 39, 176, 0.05), transparent 40%)' }}>
                <div className="section-header" style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <span className="badge" style={{ marginBottom: '1rem' }}>Excelência Acadêmica</span>
                    <h2 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Programas de Formação</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '1rem auto' }}>
                        Escolha a trilha de conhecimento que melhor se adapta ao seu chamado e nível de experiência.
                    </p>
                </div>

                <div className="hub-grid">
                    {/* Básico */}
                    <div className="hub-card" style={{ cursor: 'default' }}>
                        <div className="hub-icon"><BookOpen size={40} /></div>
                        <div className="hub-info">
                            <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Nível de Entrada</span>
                            <h3 style={{ marginTop: '0.5rem' }}>Básico em Teologia</h3>
                            <p style={{ marginBottom: '1.5rem' }}>Fundamentação sólida nos principais pilares da fé cristã e introdução às disciplinas teológicas essenciais.</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="var(--primary)" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Teologia Sistemática I & II</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="var(--primary)" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Introdução Bíblica (Síntese)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="var(--primary)" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>História do Cristianismo</span>
                                </div>
                            </div>

                            <Link to="/matricula" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                INICIAR FORMAÇÃO
                            </Link>
                        </div>
                    </div>

                    {/* Médio */}
                    <div className="hub-card" style={{ cursor: 'default' }}>
                        <div className="hub-icon"><GraduationCap size={40} /></div>
                        <div className="hub-info">
                            <span style={{ color: '#03A9F4', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Avançado</span>
                            <h3 style={{ marginTop: '0.5rem' }}>Médio em Teologia</h3>
                            <p style={{ marginBottom: '1.5rem' }}>Aprofundamento exegético e ferramentas de liderança ministerial para quem busca impactar sua geração.</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="#03A9F4" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Hermenêutica e Exegese</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="#03A9F4" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Homilética (Arte da Pregação)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <Book size={18} color="#03A9F4" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Grego e Hebraico Instrumental</span>
                                </div>
                            </div>

                            <Link to="/matricula" className="btn btn-outline" style={{ width: '100%', padding: '1rem', borderColor: '#03A9F4', color: '#03A9F4' }}>
                                SOLICITAR DETALHES
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default CursosPublic;
