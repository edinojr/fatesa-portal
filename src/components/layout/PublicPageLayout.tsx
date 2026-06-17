import React, { useEffect } from 'react';
import PublicPageHero from './PublicPageHero';

interface PublicPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  heroSize?: 'page' | 'home';
}

const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({
  children,
  title,
  subtitle,
  heroSize = 'page',
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-container">
      {title && <PublicPageHero title={title} subtitle={subtitle} size={heroSize} />}
      {children}
    </div>
  );
};

export default PublicPageLayout;
