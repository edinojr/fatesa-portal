import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AlertTriangle, Info, AlertOctagon, Wrench, X, ChevronLeft, ChevronRight } from 'lucide-react';

const tipoConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  info: { icon: <Info size={28} />, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  warning: { icon: <AlertTriangle size={28} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  error: { icon: <AlertOctagon size={28} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  maintenance: { icon: <Wrench size={28} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }
};

const PopupAlertsDisplay = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const storageKey = `fatesa_popup_dismissed_${user.id}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        try { setDismissedIds(new Set(JSON.parse(stored))); } catch { }
      }

      const now = new Date().toISOString();
      const { data } = await supabase
        .from('popup_alerts')
        .select('*')
        .eq('ativo', true)
        .lte('data_inicio', now)
        .or(`data_fim.is.null,data_fim.gte.${now}`)
        .order('created_at', { ascending: false });

      setAlerts(data || []);
    };

    fetchAlerts();
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const current = visibleAlerts[currentIndex];
  if (!current) return null;

  const tipo = tipoConfig[current.tipo] || tipoConfig.info;

  const dismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);

    const storageKey = `fatesa_popup_dismissed_${currentIndex}_${id}`;
    const userKey = `fatesa_popup_dismissed_user`;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const key = `fatesa_popup_dismissed_${user.id}`;
        const stored = sessionStorage.getItem(key);
        const ids = stored ? JSON.parse(stored) : [];
        ids.push(id);
        sessionStorage.setItem(key, JSON.stringify(ids));
      }
    });

    if (currentIndex >= visibleAlerts.length - 1) {
      if (visibleAlerts.length === 1) return;
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="modal-overlay" style={{
      zIndex: 10000,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="modal-content" style={{
        maxWidth: '520px',
        width: '94%',
        textAlign: 'center',
        padding: '2.5rem 2rem',
        background: '#fff',
        borderRadius: '32px',
        border: `1px solid ${tipo.color}40`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.1), 0 0 0 1px ${tipo.color}15`,
        position: 'relative',
        overflow: 'hidden',
        animation: 'zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#000'
      }}>
        <button
          onClick={() => dismiss(current.id)}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.1)',
            color: 'rgba(0,0,0,0.4)',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#000'; e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(0,0,0,0.4)'; e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        >
          <X size={18} />
        </button>

        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '200px',
          height: '200px',
          background: `${tipo.color}10`,
          filter: 'blur(50px)',
          borderRadius: '50%',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${tipo.color} 0%, ${tipo.color}dd 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#fff',
            boxShadow: `0 10px 20px ${tipo.color}40`,
            transform: 'rotate(-5deg)'
          }}>
            {tipo.icon}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.02em', color: '#000' }}>
            {current.titulo}
          </h2>

          <p style={{ color: '#555', marginBottom: '2rem', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
            {current.conteudo}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {visibleAlerts.length > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)'
              }}>
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  style={{
                    background: 'none', border: 'none', cursor: currentIndex === 0 ? 'default' : 'pointer',
                    opacity: currentIndex === 0 ? 0.3 : 1, color: '#000'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {currentIndex + 1} / {visibleAlerts.length}
                </span>
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(visibleAlerts.length - 1, prev + 1))}
                  disabled={currentIndex === visibleAlerts.length - 1}
                  style={{
                    background: 'none', border: 'none', cursor: currentIndex === visibleAlerts.length - 1 ? 'default' : 'pointer',
                    opacity: currentIndex === visibleAlerts.length - 1 ? 0.3 : 1, color: '#000'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <button
              className="btn"
              style={{
                width: '100%',
                height: '48px',
                justifyContent: 'center',
                borderRadius: '14px',
                background: tipo.color,
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#fff',
                boxShadow: `0 10px 20px ${tipo.color}30`
              }}
              onClick={() => dismiss(current.id)}
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupAlertsDisplay;
