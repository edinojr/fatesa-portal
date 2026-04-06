import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Logo from './Logo'

const Footer = () => {
  return (
    <footer id="contato" className="landing-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-section" style={{ alignItems: 'center' }}>
            <Logo size={150} />
          </div>
          <p className="footer-description">
            Formando líderes e servos para o Reino de Deus através do ensino teológico de excelência.
          </p>
        </div>
        
        <div className="footer-links">
          <h4>Navegação</h4>
          <Link to="/">Início</Link>
          <Link to="/sobre">Instituição</Link>
          <Link to="/patrono">Patrono</Link>
          <Link to="/cursos">Nossos Cursos</Link>
          <Link to="/login">Acesso ao Portal</Link>
        </div>

        <div className="footer-contact">
          <h4>Canais de Atendimento</h4>
          <div className="contact-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <a href="https://wa.me/5511999720904" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
              <MessageCircle size={18} color="var(--primary)" />
              <span>+55 11 99972-0904 <small style={{ opacity: 0.6 }}>(WhatsApp Adm)</small></span>
            </a>
            <a href="https://wa.me/5511939014534" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
              <MessageCircle size={18} color="var(--primary)" />
              <span>+55 11 93901-4534 <small style={{ opacity: 0.6 }}>(Suporte Técnico)</small></span>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} FATESA A Casa do Saber. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}

export default Footer
