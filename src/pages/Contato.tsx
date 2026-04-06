import React, { useEffect } from 'react'
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const Contato = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="landing-container">
            <Navbar />
            
            <section className="hero-section" style={{ height: '40vh', minHeight: '300px' }}>
                <div className="hero-overlay" style={{ opacity: 0.8 }}></div>
                <div className="hero-content">
                    <h1>Contato</h1>
                    <p className="slogan">Estamos prontos para atender você.</p>
                </div>
            </section>

            <section className="contact-page-section" style={{ padding: '8rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
                        <div>
                            <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Fale Conosco</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
                                Tire suas dúvidas sobre matrículas, cursos, polos ou suporte técnico. Nossa equipe está à disposição para ajudar em sua jornada teológica.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <MessageCircle size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>WhatsApp Administrativo</h4>
                                        <a href="https://wa.me/5511999720904" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700 }}>+55 11 99972-0904</a>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Phone size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Suporte Técnico</h4>
                                        <a href="https://wa.me/5511939014534" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700 }}>+55 11 93901-4534</a>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <MapPin size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Polo Sede (Vila Luzita)</h4>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Av. Dom Pedro I, 3145 - Vila Pires, Santo André, SP</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="contact-form-card" style={{ background: 'var(--glass)', padding: '3rem', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ marginBottom: '2rem' }}>Envie uma Mensagem</h3>
                            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={(e) => e.preventDefault()}>
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <input type="text" className="form-control" placeholder="Seu nome" />
                                </div>
                                <div className="form-group">
                                    <label>E-mail</label>
                                    <input type="email" className="form-control" placeholder="seu@email.com" />
                                </div>
                                <div className="form-group">
                                    <label>Assunto</label>
                                    <select className="form-control">
                                        <option>Informações sobre Cursos</option>
                                        <option>Dúvidas sobre Matrícula</option>
                                        <option>Suporte ao Aluno</option>
                                        <option>Outros</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Mensagem</label>
                                    <textarea className="form-control" rows={4} placeholder="Como podemos ajudar?"></textarea>
                                </div>
                                <button className="btn btn-primary">Enviar Mensagem</button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Contato;
