import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import Logo from '../components/common/Logo'

const Sobre = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="landing-container">
            <Navbar />
            
            {/* Hero Section Simplified for Subpages */}
            <section className="hero-section" style={{ height: '40vh', minHeight: '300px' }}>
                <div className="hero-overlay" style={{ opacity: 0.8 }}></div>
                <div className="hero-content">
                    <h1>A Fatesa</h1>
                    <p className="slogan">Duas décadas de excelência no ensino teológico.</p>
                </div>
            </section>

            {/* About Section */}
            <section className="about-section">
                <div className="section-grid">
                    <div className="about-image">
                        <div className="image-card">
                            <Logo size={260} />
                            <h2 style={{ marginTop: '2rem' }}>FATESA</h2>
                            <p style={{ letterSpacing: '2px', opacity: 0.7 }}>EST. 2006</p>
                        </div>
                    </div>
                    <div className="about-text">
                        <span className="section-tag" style={{ background: 'var(--primary)', color: '#fff', padding: '0.2rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>NOSSA MISSÃO</span>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Fatesa Casa do Saber: 20 Anos Formando Obreiros para a Prática do Ide</h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem' }}>
                            Mais do que entender a Palavra, nossa missão é vivê-la com excelência.
                        </p>
                        <p>
                            Ao completarmos duas décadas de trajetória, reafirmamos nossa identidade: somos uma casa de saber que se traduz em serviço. A metodologia da Fatesa nasceu para ser o braço direito das denominações em nossa região, unindo a profundidade do Evangelho de Cristo com a urgência do campo missionário.
                        </p>
                    </div>
                </div>
            </section>

            {/* Vision and Values */}
            <section className="values-section" style={{ padding: '6rem 2rem', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Capacitação que Gera Ação</h2>
                        <p style={{ maxWidth: '800px', margin: '1rem auto', opacity: 0.8 }}>
                            Nossa visão é clara: capacitar novos obreiros para o Ide de Jesus. Entendemos que o chamado ministerial exige mais do que teoria; exige prontidão. 
                            Por isso, nossos cursos são desenhados para que o conhecimento flua da sala de aula diretamente para a prática ministerial.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div className="course-card" style={{ padding: '2rem', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Praticidade</h3>
                            <p>Ferramentas reais para os desafios do dia a dia da igreja.</p>
                        </div>
                        <div className="course-card" style={{ padding: '2rem', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Excelência</h3>
                            <p>O Reino de Deus merece o nosso melhor preparo técnico e espiritual.</p>
                        </div>
                        <div className="course-card" style={{ padding: '2rem', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Serviço</h3>
                            <p>Formamos líderes que não buscam títulos, mas sim a oportunidade de servir com eficácia em todos os ministérios.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Theology of Transformation Section */}
            <section style={{ padding: '8rem 2rem', background: 'radial-gradient(circle at 100% 50%, rgba(156, 39, 176, 0.05), transparent 40%)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>A Teologia da Transformação</h2>
                    <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: '1.8', marginBottom: '3rem' }}>
                        Cremos que o conhecimento verdadeiro é aquele que resulta em edificação e amor. Em um mundo onde o saber pode gerar soberba, a Fatesa escolhe o caminho da humildade.
                    </p>
                    
                    <div style={{ 
                        padding: '3rem', 
                        background: 'var(--glass)', 
                        border: '1px solid var(--primary)', 
                        borderRadius: '24px',
                        position: 'relative',
                        marginBottom: '4rem'
                    }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--primary)' }}>
                            "Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar..."
                        </p>
                        <span style={{ display: 'block', marginTop: '1rem', fontWeight: 700 }}>(2 Timóteo 2:15)</span>
                    </div>

                    <p style={{ maxWidth: '800px', margin: '0 auto', opacity: 0.8 }}>
                        Nesses 20 anos, nossa maior alegria é ver obreiros capacitados atuando com maestria em suas congregações, transformando comunidades através do Evangelho e servindo ao Corpo de Cristo com um coração moldado pela graça.
                    </p>
                </div>
            </section>
            
            {/* CTA Final */}
            <section style={{ padding: '6rem 2rem', textAlign: 'center', background: 'var(--primary)', color: '#fff', borderRadius: '40px', margin: '4rem 2rem' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Prepare-se para o seu Chamado</h2>
                <p style={{ maxWidth: '700px', margin: '0 auto 2.5rem auto', fontSize: '1.1rem', opacity: 0.9 }}>
                    Seja no ensino, no pastoreio, na evangelização ou na administração ministerial, a Fatesa Casa do Saber é o lugar onde a sua vocação encontra a estrutura necessária para frutificar.
                </p>
                <Link to="/matricula" className="btn" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 800, padding: '1rem 3rem', borderRadius: '12px', textDecoration: 'none', display: 'inline-flex', width: 'auto' }}>
                    FAZER MATRÍCULA AGORA
                </Link>
            </section>

            <Footer />
        </div>
    );
};

export default Sobre;
