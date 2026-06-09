import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Menu, X, Users, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Logo from '../common/Logo'

const Navbar = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionUser(session.user);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="portal-nav" style={{ background: '#fff', borderBottom: '2px solid var(--primary)', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <Logo size={120} />
        </Link>

        {/* Desktop Links - Maintaining existing navigation structure */}
        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`} style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" className={isActive('/') ? 'active' : ''} style={{ textDecoration: 'none', color: isActive('/') ? 'var(--primary)' : 'var(--text-main)', fontWeight: isActive('/') ? 800 : 600, fontSize: '0.95rem' }}>Home</Link>
          <Link to="/sobre" className={isActive('/sobre') ? 'active' : ''} style={{ textDecoration: 'none', color: isActive('/sobre') ? 'var(--primary)' : 'var(--text-main)', fontWeight: isActive('/sobre') ? 800 : 600, fontSize: '0.95rem' }}>Instituição</Link>
          <Link to="/cursos" className={isActive('/cursos') ? 'active' : ''} style={{ textDecoration: 'none', color: isActive('/cursos') ? 'var(--primary)' : 'var(--text-main)', fontWeight: isActive('/cursos') ? 800 : 600, fontSize: '0.95rem' }}>Cursos</Link>
          <Link to="/contato" className={isActive('/contato') ? 'active' : ''} style={{ textDecoration: 'none', color: isActive('/contato') ? 'var(--primary)' : 'var(--text-main)', fontWeight: isActive('/contato') ? 800 : 600, fontSize: '0.95rem' }}>Contato</Link>
          
          <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
            {location.pathname !== '/' && (
              <button 
                onClick={() => navigate(-1)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none' }}
              >
                <ArrowLeft size={18} /> Voltar
              </button>
            )}
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none' }}
                onClick={async () => {
                  if (sessionUser) {
                     const activeRole = localStorage.getItem('fatesa_active_role');
                     if (activeRole === 'admin') {
                       navigate('/admin');
                     } else if (activeRole === 'professor') {
                       navigate('/professor');
                     } else {
                       navigate('/dashboard');
                     }
                  } else {
                     navigate('/login');
                  }
                }}

            >
              {sessionUser ? <><Users size={18} /> MEU PAINEL</> : <><LogIn size={18} /> ENTRAR</>}
            </button>
          </div>
        </div>

        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display: 'none' }}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
