import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MapPin, Phone } from 'lucide-react'
import Logo from '../common/Logo'

const Footer = () => {
  return (
    <footer id="contato" className="portal-footer" style={{ background: '#111827', color: '#fff', paddingTop: '4rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', paddingBottom: '4rem' }}>
          
          <div className="footer-brand">
             <div style={{ marginBottom: '1.5rem' }}>
               <Link to="/">
                 <Logo size={180} />
               </Link>
             </div>
            <p style={{ opacity: 0.9, fontSize: '0.95rem', lineHeight: '1.8', maxWidth: '300px' }}>
              Formando líderes e servos para o Reino de Deus através do ensino teológico de excelência.
            </p>
          </div>
          
          <div className="footer-links">
            <h4 style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Navegação</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.8rem' }}><Link to="/" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>Início</Link></li>
              <li style={{ marginBottom: '0.8rem' }}><Link to="/sobre" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>Instituição</Link></li>
              <li style={{ marginBottom: '0.8rem' }}><Link to="/patrono" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>Patrono</Link></li>
              <li style={{ marginBottom: '0.8rem' }}><Link to="/cursos" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>Nossos Cursos</Link></li>
              <li style={{ marginBottom: '0.8rem' }}><Link to="/login" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>Acesso ao Portal</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4 style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Contato</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', gap: '0.8rem', opacity: 0.8 }}>
                <MapPin size={18} color="var(--secondary)" />
                <span>Rua da Sapiência, 123 - Centro</span>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', opacity: 0.8 }}>
                <Phone size={18} color="var(--secondary)" />
                <span>(11) 99972-0904</span>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', opacity: 0.8 }}>
                <Mail size={18} color="var(--secondary)" />
                <span>suporte@fatesacasadosaber.com.br</span>
              </div>
            </div>
          </div>

          <div className="footer-social">
              <h4 style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Atendimento</h4>
              <a href="https://wa.me/5511939014534" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textDecoration: 'none', color: '#fff', marginBottom: '1rem' }}>
                 <MessageCircle size={24} color="#25D366" />
                 <div>
                    <span style={{ display: 'block', fontWeight: 700 }}>WhatsApp Suporte</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(11) 93901-4534</span>
                 </div>
              </a>
              <a href="https://wa.me/5511999720904" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
                 <MessageCircle size={24} color="#25D366" />
                 <div>
                    <span style={{ display: 'block', fontWeight: 700 }}>WhatsApp Secretaria</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(11) 99972-0904</span>
                 </div>
              </a>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem 0', textAlign: 'center', fontSize: '0.85rem', opacity: 0.8 }}>
          <p>&copy; {new Date().getFullYear()} FATESA A Casa do Saber. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
