import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'primary' | 'muted';
  className?: string;
  style?: React.CSSProperties;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '', style }) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.2)' };
      case 'error':
        return { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)' };
      case 'warning':
        return { background: 'var(--primary, #0056b3)', color: '#ffffff', border: '1px solid #004494' };
      case 'muted':
        return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255, 255, 255, 0.1)' };
      default:
        return { background: 'var(--primary, #0056b3)', color: '#ffffff', border: '1px solid #004494' };
    }
  };

  return (
    <span 
      className={`admin-badge ${className}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        padding: '2px 8px', 
        borderRadius: '10px', 
        fontSize: '0.75rem', 
        fontWeight: 700,
        ...getStyles(),
        ...style 
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
