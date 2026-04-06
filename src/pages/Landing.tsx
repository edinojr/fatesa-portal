import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogIn, Info, BookOpen, UserCheck, GraduationCap, ArrowRight, Mail } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const Landing = () => {
    const navigate = useNavigate();

    return (
    <div className="landing-container">
      {/* Top Subjects Banner */}
      <div className="top-subjects-banner">
        <div className="banner-overlay"></div>
        <div className="subjects-scroll">
          <div className="subject-item"><span></span> Doutrina da Salvação</div>
          <div className="subject-item"><span></span> Atos dos Apóstolos</div>
          <div className="subject-item"><span></span> Cristologia</div>
          <div className="subject-item"><span></span> Epístolas aos Hebreus</div>
          <div className="subject-item"><span></span> Teologia Sistemática</div>
          <div className="subject-item"><span></span> Hermenêutica</div>
          <div className="subject-item"><span></span> História da Igreja</div>
        </div>
      </div>

      <Navbar />

      {/* Hero Section */}
      <section id="home" className="hero-section" style={{ padding: '5rem 2rem 3rem' }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Formação Teológica de Alto Nível</h1>
          <p className="slogan" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
            Aprofunde seu conhecimento nas Escrituras com uma metodologia transformadora e professores renomados.
          </p>
          <div className="hero-btns" style={{ justifyContent: 'center' }}>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '1rem 3rem', borderRadius: '50px', fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 15px 30px rgba(156, 39, 176, 0.3)' }}>
              ENTRAR NO PORTAL <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Iconic Navigation Hub - Small Icons Variant */}
      <section className="landing-hub" style={{ padding: '2rem' }}>
        <div className="hub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
          
          <Link to="/cursos" className="nav-card-premium" style={{ textDecoration: 'none' }}>
            <div className="icon-badge-premium" style={{ background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3' }}>
              <GraduationCap size={24} />
            </div>
            <div className="nav-card-content">
              <h3>Cursos</h3>
              <p>Catálogo completo de formação.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>

          <Link to="/sobre" className="nav-card-premium" style={{ textDecoration: 'none' }}>
            <div className="icon-badge-premium" style={{ background: 'rgba(156, 39, 176, 0.1)', color: '#9c27b0' }}>
              <Info size={24} />
            </div>
            <div className="nav-card-content">
              <h3>A Fatesa</h3>
              <p>Nossa história e missão.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>

          <Link to="/metodologia" className="nav-card-premium" style={{ textDecoration: 'none' }}>
            <div className="icon-badge-premium" style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' }}>
              <BookOpen size={24} />
            </div>
            <div className="nav-card-content">
              <h3>Metodologia</h3>
              <p>Sistema EAD e presencial.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>

          <Link to="/patrono" className="nav-card-premium" style={{ textDecoration: 'none' }}>
            <div className="icon-badge-premium" style={{ background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}>
              <UserCheck size={24} />
            </div>
            <div className="nav-card-content">
              <h3>Docentes</h3>
              <p>Mestres que guiarão seus estudos.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>

          <Link to="/contato" className="nav-card-premium" style={{ textDecoration: 'none' }}>
            <div className="icon-badge-premium" style={{ background: 'rgba(233, 30, 99, 0.1)', color: '#e91e63' }}>
              <Mail size={24} />
            </div>
            <div className="nav-card-content">
              <h3>Contato</h3>
              <p>Suporte e secretaria.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>

          <Link to="/login" className="nav-card-premium active" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05))', border: '1px solid rgba(156, 39, 176, 0.2)' }}>
            <div className="icon-badge-premium" style={{ background: 'var(--primary)', color: '#fff' }}>
              <LogIn size={24} />
            </div>
            <div className="nav-card-content">
              <h3>Portal</h3>
              <p>Acesse seu painel exclusivo.</p>
            </div>
            <ArrowRight className="card-arrow" />
          </Link>
        </div>
      </section>

      {/* App Promotion Section */}
      <section className="app-promotion-section" style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', fontWeight: 700 }}>Acesse por Aplicativo</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Leve a Fatesa com você. Estude de qualquer lugar.</p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/app-mobile" className="app-store-btn">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" style={{ height: '40px' }} />
            </Link>
            <Link to="/app-mobile" className="app-store-btn">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" style={{ height: '40px' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Prepare Section (CTA) */}
      <section className="cta-section" style={{ padding: '4rem 2rem' }}>
        <div className="cta-content">
          <h2>Pronto para começar?</h2>
          <Link to="/matricula" className="btn btn-primary btn-lg" style={{ borderRadius: '50px', padding: '1rem 3rem', marginTop: '1rem' }}>
            INICIAR MATRÍCULA
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}


export default Landing

