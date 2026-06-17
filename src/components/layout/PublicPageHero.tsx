import React from 'react';

interface PublicPageHeroProps {
  title: string;
  subtitle?: string;
  size?: 'page' | 'home';
}

const PublicPageHero: React.FC<PublicPageHeroProps> = ({ title, subtitle, size = 'page' }) => {
  return (
    <section className={`hero-section hero-section--${size}`}>
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1>{title}</h1>
        {subtitle && <p className="slogan">{subtitle}</p>}
      </div>
    </section>
  );
};

export default PublicPageHero;
