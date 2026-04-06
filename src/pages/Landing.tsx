import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LogIn, Info, BookOpen, UserCheck, GraduationCap } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

const Landing = () => {
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
          <div className="subject-item"><span></span> Doutrina da Salvação</div>
          <div className="subject-item"><span></span> Atos dos Apóstolos</div>
          <div className="subject-item"><span></span> Cristologia</div>
          <div className="subject-item"><span></span> Epístolas aos Hebreus</div>
        </div>
      </div>

      <Navbar />

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Formação Teológica de Alto Nível</h1>
          <p className="slogan">
            Aprofunde seu conhecimento nas Escrituras com uma metodologia transformadora e professores renomados.
          </p>
          <div className="hero-btns">
            <Link to="/matricula" className="btn btn-primary">
              Iniciar Matrícula <ChevronRight size={20} />
            </Link>
            <Link to="/cursos" className="btn btn-outline">Explorar Cursos</Link>
          </div>
        </div>
      </section>

      {/* Access Portal Section */}
      <section id="acesso" className="access-portal-section">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/login" className="access-card" style={{ maxWidth: '600px', width: '100%', justifyContent: 'center', gap: '2rem' }}>
            <div className="access-icon student"><LogIn size={32} /></div>
            <div className="access-info">
              <h3 style={{ fontSize: '1.5rem' }}>Acesso ao Portal</h3>
              <p>Área exclusiva para Alunos, Professores e Administração.</p>
            </div>
            <ChevronRight size={24} />
          </Link>
        </div>
      </section>

      {/* Main Navigation Hub (Replacement for long sections) */}
      <section className="landing-hub">
        <div className="hub-grid">
          <Link to="/sobre" className="hub-card">
            <div className="hub-icon"><Info size={40} /></div>
            <div className="hub-info">
              <h3>A Fatesa</h3>
              <p>Conheça nossa história de 20 anos e nossa missão.</p>
            </div>
            <ChevronRight size={20} className="hub-arrow" />
          </Link>

          <Link to="/metodologia" className="hub-card">
            <div className="hub-icon"><BookOpen size={40} /></div>
            <div className="hub-info">
              <h3>Metodologia</h3>
              <p>Descubra como nosso sistema EAD e presencial funciona.</p>
            </div>
            <ChevronRight size={20} className="hub-arrow" />
          </Link>

          <Link to="/patrono" className="hub-card">
            <div className="hub-icon"><UserCheck size={40} /></div>
            <div className="hub-info">
              <h3>Corpo Docente</h3>
              <p>Conheça os mestres e doutores que guiarão seus estudos.</p>
            </div>
            <ChevronRight size={20} className="hub-arrow" />
          </Link>

          <Link to="/cursos" className="hub-card">
            <div className="hub-icon"><GraduationCap size={40} /></div>
            <div className="hub-info">
              <h3>Nossos Cursos</h3>
              <p>Explore nosso catálogo completo de formação teológica.</p>
            </div>
            <ChevronRight size={20} className="hub-arrow" />
          </Link>
        </div>
      </section>

      {/* Prepare Section (CTA) */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Prepare-se para o seu Chamado</h2>
          <p>
            Seja no ensino, no pastoreio ou na evangelização, a Fatesa é o lugar onde sua vocação encontra a estrutura necessária.
          </p>
          <Link to="/matricula" className="btn btn-primary btn-lg">
            INICIAR MATRÍCULA AGORA
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
