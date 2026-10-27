import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PanelSwitcher } from '../common/PanelSwitcher';

interface StudentTopBarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  profile: any;
  signOut: () => void;
  activeTabTitle: string;
  courses: any[];
  pendingExams: any[];
  isPastDue: boolean;
  onSelectTab: (tab: any) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const StudentTopBar: React.FC<StudentTopBarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
  profile,
  signOut,
  activeTabTitle,
  courses = [],
  pendingExams = [],
  isPastDue = false,
  onSelectTab,
  searchTerm,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resultados rápidos da busca
  const searchResults = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: Array<{ id: string; titulo: string; tipo: string; curso: string; link: string }> = [];

    courses.forEach((c) => {
      (c.livros || []).forEach((l: any) => {
        if ((l.titulo || '').toLowerCase().includes(q)) {
          results.push({
            id: l.id,
            titulo: l.titulo,
            tipo: 'Módulo',
            curso: c.nome,
            link: `/module/${l.id}`,
          });
        }

        (l.aulas || []).forEach((a: any) => {
          if ((a.titulo || '').toLowerCase().includes(q)) {
            results.push({
              id: a.id,
              titulo: a.titulo,
              tipo: a.tipo === 'prova' ? 'Avaliação' : 'Aula',
              curso: `${c.nome} • ${l.titulo}`,
              link: `/lesson/${a.id}`,
            });
          }
        });
      });
    });

    return results.slice(0, 6);
  }, [searchTerm, courses]);

  const totalNotifications = pendingExams.length + (isPastDue ? 1 : 0);

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#0a0f1d',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 900,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* LADO ESQUERDO: TOGGLE & TÍTULO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Menu size={18} />
        </button>

        <div className="mobile-hide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Portal do Aluno</span>
            <span>/</span>
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{activeTabTitle}</span>
          </div>
        </div>
      </div>

      {/* CENTRO: BARRA DE BUSCA GLOBAL */}
      <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '0 1rem' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: isSearchFocused ? '#60a5fa' : '#64748b',
              transition: 'color 0.2s',
            }}
          />
          <input
            type="text"
            placeholder="Buscar cursos, módulos, aulas ou provas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              width: '100%',
              padding: '0.55rem 2rem 0.55rem 2.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isSearchFocused ? '#0056b3' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '50px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* DROPDOWN DE RESULTADOS DA BUSCA */}
        {isSearchFocused && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              backgroundColor: '#0f172a',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              zIndex: 1100,
            }}
          >
            <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              Resultados ({searchResults.length})
            </div>
            {searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  navigate(item.link);
                  setIsSearchFocused(false);
                  onSearchChange('');
                }}
                style={{
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 86, 179, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {item.curso}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    backgroundColor: item.tipo === 'Avaliação' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0, 86, 179, 0.15)',
                    color: item.tipo === 'Avaliação' ? '#eab308' : '#60a5fa',
                  }}
                >
                  {item.tipo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LADO DIREITO: NOTIFICAÇÕES & PERFIL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* SINO DE NOTIFICAÇÕES */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Notificações e Avisos"
          >
            <Bell size={18} />
            {totalNotifications > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0a0f1d',
                }}
              >
                {totalNotifications}
              </span>
            )}
          </button>

          {/* DROPDOWN DE NOTIFICAÇÕES */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '320px',
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                zIndex: 1100,
              }}
            >
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Notificações & Prazos</strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {totalNotifications} ativa{totalNotifications > 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {pendingExams.length > 0 && (
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '0.4rem' }}>
                      Avaliações Pendentes ({pendingExams.length})
                    </div>
                    {pendingExams.slice(0, 3).map((ex) => (
                      <div
                        key={ex.id}
                        onClick={() => {
                          navigate(`/lesson/${ex.id}`);
                          setShowNotifications(false);
                        }}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          marginBottom: '0.4rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                          {ex.titulo}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {ex.livro} • {ex.isRecovery ? 'Recuperação' : 'Avaliação'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isPastDue && (
                  <div
                    onClick={() => {
                      onSelectTab('financeiro');
                      setShowNotifications(false);
                    }}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(220, 38, 38, 0.08)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171' }}>
                      Mensalidade com Pagamento Pendente
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Clique para gerar o código PIX ou anexar o comprovante.
                    </div>
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={28} color="#22c55e" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0 }}>Você não possui notificações pendentes.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PERFIL DO USUÁRIO & MENU DROPDOWN */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              padding: '0.3rem 0.6rem',
              borderRadius: '50px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0056b3',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: '1.5px solid #60a5fa',
              }}
            >
              {(profile?.nome || 'A').charAt(0).toUpperCase()}
            </div>

            <div className="mobile-hide" style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile?.nome || 'Aluno'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Aluno Fatesa
              </div>
            </div>

            <ChevronDown size={14} style={{ color: '#94a3b8' }} />
          </div>

          {/* DROPDOWN DE PERFIL */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '240px',
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                zIndex: 1100,
                padding: '0.5rem',
              }}
            >
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                  {profile?.nome || 'Aluno'}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {profile?.email || ''}
                </span>
              </div>

              <button
                onClick={() => {
                  onSelectTab('home');
                  setShowProfileMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={15} color="#60a5fa" /> Meus Dados Cadastrais
              </button>

              <button
                onClick={() => {
                  onSelectTab('certificados');
                  setShowProfileMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <GraduationCap size={15} color="#60a5fa" /> Meus Certificados
              </button>

              <div style={{ margin: '0.4rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />

              <div style={{ padding: '0.2rem 0.75rem' }}>
                <PanelSwitcher currentPanel="aluno" />
              </div>

              <div style={{ margin: '0.4rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />

              <button
                onClick={() => signOut()}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: 'none',
                  color: '#f87171',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} /> Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentTopBar;
