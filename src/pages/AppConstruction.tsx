import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Smartphone, Clock, Bell, Rocket, ArrowRight } from 'lucide-react'
import Logo from '../components/common/Logo'

const AppConstruction = () => {
    const navigate = useNavigate();

    return (
        <div className="auth-container" style={{ minHeight: '100vh', flexDirection: 'column', padding: '2rem' }}>
            <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <button onClick={() => navigate('/')} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className="auth-card" style={{ maxWidth: '600px', textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <Logo size={200} />
                </div>

                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '24px', 
                    background: 'linear-gradient(135deg, var(--primary), #7b1fa2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 2rem',
                    boxShadow: '0 10px 20px rgba(156, 39, 176, 0.3)'
                }}>
                    <Smartphone size={40} color="#fff" />
                </div>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Fatesa Mobile
                </h1>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', padding: '0.5rem 1.25rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2rem', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
                    <Clock size={16} />
                    EM DESENVOLVIMENTO
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '3rem' }}>
                    Estamos preparando uma experiência incrível para você levar o seu conhecimento teológico no bolso. 
                    Em breve, disponível para <strong>iOS</strong> e <strong>Android</strong>.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Bell size={24} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                        <h4 style={{ fontSize: '0.9rem' }}>Notificações</h4>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Rocket size={24} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                        <h4 style={{ fontSize: '0.9rem' }}>Modo Offline</h4>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Smartphone size={24} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                        <h4 style={{ fontSize: '0.9rem' }}>Interface Nativa</h4>
                    </div>
                </div>

                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ width: 'auto', padding: '1rem 2.5rem', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    Voltar ao Início <ArrowRight size={20} />
                </button>
            </div>

            <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                &copy; {new Date().getFullYear()} Fatesa. Todos os direitos reservados.
            </p>
        </div>
    )
}

export default AppConstruction
