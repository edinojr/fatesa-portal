import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Menu, X, Users, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Logo from '../common/Logo'

const Navbar = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionUser(session.user);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <>
      <style>{`
        .portal-nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-desktop-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        .nav-hamburger-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          color: var(--text-main, #1a1a2e);
          border-radius: 8px;
          transition: background 0.2s;
          z-index: 1100;
        }
        .nav-hamburger-btn:hover {
          background: rgba(0,0,0,0.06);
        }
        .nav-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          z-index: 1050;
          animation: fadeIn 0.2s ease;
        }
        .nav-mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 280px;
          background: #fff;
          z-index: 1100;
          box-shadow: -8px 0 40px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          padding: 2rem 1.5rem;
          gap: 0.5rem;
          animation: slideInRight 0.25s cubic-bezier(0.4,0,0.2,1);
          border-radius: 24px 0 0 24px;
        }
        .nav-mobile-drawer .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .nav-mobile-drawer .drawer-link {
          display: flex;
          align-items: center;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main, #1a1a2e);
          transition: all 0.2s;
        }
        .nav-mobile-drawer .drawer-link:hover,
        .nav-mobile-drawer .drawer-link.active {
          background: rgba(var(--primary-rgb, 107,63,175), 0.08);
          color: var(--primary, #6b3faf);
        }
        .nav-mobile-drawer .drawer-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (max-width: 768px) {
          .nav-desktop-links {
            display: none !important;
          }
          .nav-hamburger-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .nav-mobile-overlay.open {
            display: block;
          }
        }
      `}</style>

      <nav className="portal-nav" style={{ background: '#fff', borderBottom: '2px solid var(--primary)', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="container portal-nav-inner">
          <Link to="/" onClick={handleNavClick} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
            <Logo size={120} />
          </Link>

          {/* Desktop Links */}
          <div className="nav-desktop-links">
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

          {/* Hamburger Button (mobile only) */}
          <button
            className="nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <div
        className={`nav-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="nav-mobile-drawer" ref={menuRef}>
          <div className="drawer-header">
            <Logo size={110} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '0.25rem' }}
              aria-label="Fechar menu"
            >
              <X size={24} />
            </button>
          </div>

          <Link to="/" className={`drawer-link${isActive('/') ? ' active' : ''}`} onClick={handleNavClick}>🏠 Home</Link>
          <Link to="/sobre" className={`drawer-link${isActive('/sobre') ? ' active' : ''}`} onClick={handleNavClick}>🏛️ Instituição</Link>
          <Link to="/cursos" className={`drawer-link${isActive('/cursos') ? ' active' : ''}`} onClick={handleNavClick}>📚 Cursos</Link>
          <Link to="/contato" className={`drawer-link${isActive('/contato') ? ' active' : ''}`} onClick={handleNavClick}>✉️ Contato</Link>

          <div className="drawer-actions">
            {location.pathname !== '/' && (
              <button
                onClick={() => { navigate(-1); setMobileMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: 'var(--text-main)', border: 'none', width: '100%' }}
              >
                <ArrowLeft size={18} /> Voltar
              </button>
            )}
            <button 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none', width: '100%' }}
              onClick={async () => {
                setMobileMenuOpen(false);
                if (sessionUser) {
                  const activeRole = localStorage.getItem('fatesa_active_role');
                  if (activeRole === 'admin') navigate('/admin');
                  else if (activeRole === 'professor') navigate('/professor');
                  else navigate('/dashboard');
                } else {
                  navigate('/login');
                }
              }}
            >
              {sessionUser ? <><Users size={18} /> MEU PAINEL</> : <><LogIn size={18} /> ENTRAR</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
