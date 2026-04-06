import React, { useEffect } from 'react'
import { Book, Clock, History, Award } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const Metodologia = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="landing-container">
            <Navbar />
            
            <section className="hero-section" style={{ height: '40vh', minHeight: '300px' }}>
                <div className="hero-overlay" style={{ opacity: 0.8 }}></div>
                <div className="hero-content">
                    <h1>Metodologia</h1>
                    <p className="slogan">Excelência no ensino presencial e à distância.</p>
                </div>
            </section>

            <section id="metodologia" style={{ padding: '8rem 2rem', background: 'radial-gradient(circle at 10% 50%, rgba(156, 39, 176, 0.03), transparent 40%)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span className="badge">EAD e Presencial</span>
                        <h2>Metodologia de Ensino</h2>
                        <p style={{ maxWidth: '800px', margin: '1rem auto' }}>
                            No final do ano de 2024, a FATESA tomou a decisão de prover também o ensino à distância (EAD) e para tanto, 
                            formatou dois cursos para alcançar os alunos que desejam aprender sobre a Palavra de Deus neste formato.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Card 1: Material */}
                        <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <Book size={24} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>O Material de Estudo</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                Os livros deixam de ser físicos e passam a ser digitais, disponibilizados para acesso imediato na Área do Aluno após a devida matrícula e liberação do módulo.
                            </p>
                        </div>

                        {/* Card 2: Formato */}
                        <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <Clock size={24} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Formato & Avaliações</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                Estudo da disciplina por no mínimo 30 dias. A avaliação (50 min) exige nota mínima 7.
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                <small>Caso a nota seja inferior a 7, uma nova avaliação poderá ser solicitada após 15 dias mediante taxa administrativa.</small>
                            </p>
                        </div>

                        {/* Card 3: Abandono */}
                        <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <History size={24} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Do Abandono</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                O prazo máximo para realizar a avaliação é de 3 meses. A não interação (aquisição de nova disciplina) por período superior a 3 meses caracteriza abandono do curso.
                            </p>
                        </div>

                        {/* Card 4: Conclusão */}
                        <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <Award size={24} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Da Conclusão</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                Após a aprovação em todas as disciplinas e conclusão do cronograma, o aluno terá direito ao Certificado de Conclusão do Curso Teológico FATESA.
                            </p>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.6, fontSize: '0.9rem' }}>
                        * As informações acima se referem tanto ao Curso Básico como o Curso Médio.
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Metodologia;
