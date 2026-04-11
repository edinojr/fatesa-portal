import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Users } from 'lucide-react'
import Logo from './Logo'
import { supabase } from '../../lib/supabase'

const Navbar = () => {
    const [sessionUser, setSessionUser] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setSessionUser(session.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSessionUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <nav className="landing-nav">
            <div className="nav-content">
                <Link to="/">
                    <Logo size={250} />
                </Link>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        className="btn btn-primary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.6rem 1.4rem', fontSize: '0.9rem', fontWeight: 700, borderRadius: '50px' }}
                        onClick={() => {
                            if (sessionUser) navigate('/dashboard');
                            else navigate('/login');
                        }}
                    >
                        {sessionUser ? <><Users size={18} /> MEU PAINEL</> : <><LogIn size={18} /> ENTRAR</>}
                    </button>
                    
                    {/* Mobile toggle might still be needed if user wants to add mobile-only links later, but for now we simplify */}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
