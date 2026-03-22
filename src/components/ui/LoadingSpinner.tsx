import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 24, className = '', label }) => {
  return (
    <div className={`spinner-container ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
      <Loader2 className="spinner" size={size} />
      {label && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
