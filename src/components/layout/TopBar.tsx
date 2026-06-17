import React from 'react';
import { Calendar, MessageCircle } from 'lucide-react';

const TopBar = () => {
  return (
    <div className="top-bar" style={{ background: 'var(--primary)', color: '#fff', padding: '0.5rem 0', fontSize: '0.8rem' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={14} />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MessageCircle size={14} />
            Suporte: (11) 93901-4534
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
