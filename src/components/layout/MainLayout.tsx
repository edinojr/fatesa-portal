import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Calendar, MessageCircle } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="portal-container" style={{ background: 'var(--bg-subtle)' }}>
      {/* Top Bar Oficial Fatesa */}
      <div className="top-bar" style={{ background: 'var(--primary)', color: '#fff', padding: '0.5rem 0', fontSize: '0.8rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} /> 
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MessageCircle size={14} /> 
              Suporte: (11) 93901-4534
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
          </div>
        </div>
      </div>

      <Navbar />

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
