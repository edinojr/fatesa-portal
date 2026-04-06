import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, XCircle, LogIn, Users, Home, Info, BookOpen, UserCheck, GraduationCap, Mail } from 'lucide-react'
import Logo from './Logo'
import { supabase } from '../../lib/supabase'

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

    const navLinks = [
        { name: 'Home', path: '/', icon: <Home size={18} /> },
        { name: 'A Fatesa', path: '/sobre', icon: <Info size={18} /> },
        { name: 'Metodologia', path: '/metodologia', icon: <BookOpen size={18} /> },
        { name: 'Patrono', path: '/patrono', icon: <UserCheck size={18} /> },
        { name: 'Cursos', path: '/cursos', icon: <GraduationCap size={18} /> },
        { name: 'Contato', path: '/contato', icon: <Mail size={18} /> },
    ];

    return (
        <nav className="landing-nav">
            <div className="nav-content">
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <Logo size={250} />
                </Link>
                
                <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
                    {navLinks.map((link) => (
                        <Link 
                            key={link.path} 
                            to={link.path} 
                            className={`nav-link-item ${location.pathname === link.path ? 'active' : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="nav-icon">{link.icon}</span>
                            <span className="nav-text">{link.name}</span>
                        </Link>
                    ))}
                    
                    <button 
                        className="btn btn-primary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.6rem 1.2rem' }}
                        onClick={() => {
                            if (sessionUser) navigate('/dashboard');
                            else navigate('/login');
                            setMobileMenuOpen(false);
                        }}
                    >
                        {sessionUser ? <><Users size={18} /> Meu Painel</> : <><LogIn size={18} /> Entrar</>}
                    </button>
                </div>

                <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <XCircle size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
