import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import TopBar from './TopBar';

export type LayoutVariant = 'public' | 'auth' | 'dashboard';

interface MainLayoutProps {
  children: React.ReactNode;
  variant?: LayoutVariant;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, variant = 'public' }) => {
  if (variant === 'dashboard') {
    return <div className="dashboard-root">{children}</div>;
  }

  if (variant === 'auth') {
    return <div className="auth-root">{children}</div>;
  }

  return (
    <div className="portal-container" style={{ background: 'var(--bg-subtle)' }}>
      <TopBar />
      <Navbar />
      <main className="public-main">{children}</main>
      <Footer />
    </div>
  );
};

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MainLayout variant="public">{children}</MainLayout>
);

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MainLayout variant="auth">{children}</MainLayout>
);

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MainLayout variant="dashboard">{children}</MainLayout>
);

export default MainLayout;
