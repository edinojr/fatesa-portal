import React, { useEffect } from 'react'
import { Award, Shield, Book, Users } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const Patrono = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="landing-container">
            <Navbar />
            
            <section className="hero-section" style={{ height: '40vh', minHeight: '300px' }}>
                <div className="hero-overlay" style={{ opacity: 0.8 }}></div>
                <div className="hero-content">
                    <h1>Nosso Patrono</h1>
                    <p className="slogan">Liderança e Visão Teológica.</p>
                </div>
            </section>

            <section id="professores" className="faculty-section" style={{ padding: '6rem 2rem' }}>
                <div className="container">
                    <div className="faculty-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span className="badge">Nosso Magistério</span>
                        <h1 className="section-title" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Corpo Docente</h1>
                        <p className="section-subtitle" style={{ fontSize: '1.2rem', opacity: 0.8 }}>Conheça os mestres que dedicam suas vidas ao ensino da Palavra.</p>
                    </div>

                    <div className="faculty-grid" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <div className="faculty-card glass-card">
                            <div className="faculty-photo-container">
                                <img 
                                    src="https://www.fatesacasadosaber.education/image/profes/profes.jpg" 
                                    alt="Dr. Pr. Antônio Sebastião da Silva" 
                                    className="faculty-photo" 
                                />
                            </div>
                            <div className="faculty-info">
                                <div className="faculty-title">
                                    <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Dr. Pr. Antônio Sebastião da Silva</h2>
                                    <span className="faculty-role" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Patrono & Diretor Fundador</span>
                                </div>

                                <div className="faculty-credentials" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="credential-item">
                                        <Award className="text-primary" size={20} />
                                        <span>Graduado em Odontologia (Alfenas - MG)</span>
                                    </div>
                                    <div className="credential-item">
                                        <Shield className="text-primary" size={20} />
                                        <span>Graduado em Direito (São Bernardo - SP)</span>
                                    </div>
                                    <div className="credential-item">
                                        <Book className="text-primary" size={20} />
                                        <span>Bacharel em Teologia (São Miguel Paulista)</span>
                                    </div>
                                    <div className="credential-item">
                                        <Users className="text-primary" size={20} />
                                        <span>Pastor e Mestre (AD Santo André - SP)</span>
                                    </div>
                                </div>

                                <div className="faculty-bio" style={{ marginTop: '2.5rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1.5rem', textAlign: 'left' }}>
                                    <p style={{ marginBottom: '1rem' }}>
                                        Nascido em um lar não evangélico, converteu-se em sua adolescência, sendo batizado nas águas em 9 de agosto de 1953, aos 13 anos. Desde cedo, demonstrou um amor profundo pelas Escrituras, sendo um aluno assíduo da Escola Bíblica Dominical em Santa Rita de Sapucaí, MG.
                                    </p>
                                    <p style={{ marginBottom: '1rem' }}>
                                        Inspirado pelo Espírito Santo e motivado pelo desejo de elevar o nível do ensino teológico, idealizou a FATESA (Casa do Saber). Seu objetivo central sempre foi preparar novos obreiros e aperfeiçoar os que já militam na causa do Mestre, oferecendo uma formação sólida e transformadora.
                                    </p>
                                    <p>
                                        Além de fundador da FATESA, é o criador e diretor do CAPED (Centro Avançado de Preparo de Educadores para a EBD), consolidando-se como uma das maiores referências no ensino teológico das Assembleias de Deus no Brasil.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Patrono;
