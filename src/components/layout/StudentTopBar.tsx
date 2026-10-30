import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Menu,
  X,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PanelSwitcher } from '../common/PanelSwitcher';

interface StudentTopBarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  activeTabTitle: string;
  profile: any;
  signOut: () => void;
  courses: any[];
  searchTerm: string;
  onSearchChange: (q: string) => void;
  pendingExams: any[];
  isPastDue: boolean;
  onSelectTab: (tab: any) => void;
}

export const StudentTopBar: React.FC<StudentTopBarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
  activeTabTitle,
  profile,
  signOut,
  courses = [],
  searchTerm,
  onSearchChange,
  pendingExams = [],
  isPastDue = false,
  onSelectTab,
}) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fecha popups ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resultados dinâmicos da busca global
  const searchResults = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: Array<{
      id: string;
      titulo: string;
      tipo: 'Curso' | 'Módulo' | 'Aula' | 'Avaliação';
      curso?: string;
      link: string;
    }> = [];

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
        height: '60px',
        backgroundColor: 'var(--primary, #0056b3)',
        background: 'var(--primary, #0056b3)',
        borderBottom: '2.5px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0, 86, 179, 0.16), 0 0 10px rgba(0, 86, 179, 0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 900,
        gap: '0.75rem',
      }}
    >
      {/* LADO ESQUERDO: TOGGLE & TÍTULO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.6)',
            color: '#ffffff',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
          title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Menu size={20} color="#ffffff" />
        </button>

        <div className="mobile-hide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)', whiteSpace: 'nowrap' }}>
            <span>Portal do Aluno</span>
            <span>/</span>
            <span style={{ color: '#ffffff', fontWeight: 800 }}>{activeTabTitle}</span>
          </div>
        </div>
      </div>

      {/* CENTRO: BARRA DE BUSCA GLOBAL */}
      <div ref={searchRef} style={{ position: 'relative', flex: '1 1 auto', maxWidth: '420px', minWidth: '80px', margin: '0 0.5rem' }}>
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
              color: isSearchFocused ? '#0056b3' : '#1e40af',
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
              backgroundColor: '#f8fafd',
              border: `1.5px solid ${isSearchFocused ? '#d4af37' : 'rgba(212, 175, 55, 0.45)'}`,
              boxShadow: isSearchFocused ? '0 0 10px rgba(0, 86, 179, 0.25)' : 'none',
              borderRadius: '50px',
              color: '#003366',
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
                color: '#1e40af',
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
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #d4af37',
              boxShadow: '0 12px 30px rgba(0, 86, 179, 0.22), 0 0 12px rgba(0, 86, 179, 0.25)',
              overflow: 'hidden',
              zIndex: 1100,
            }}
          >
            <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#003366', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', backgroundColor: '#f8fafd' }}>
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
                  borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 86, 179, 0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#003366' }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#1e40af' }}>
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
                    backgroundColor: item.tipo === 'Avaliação' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 86, 179, 0.1)',
                    color: item.tipo === 'Avaliação' ? '#b45309' : '#0056b3',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                  }}
                >
                  {item.tipo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LADO DIREITO: SELETOR DE PAINÉIS, NOTIFICAÇÕES & PERFIL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <PanelSwitcher currentPanel="aluno" profile={profile} />
        {/* SINO DE NOTIFICAÇÕES */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.6)',
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
            <Bell size={18} color="#ffffff" />
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
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 6px rgba(220, 38, 38, 0.5)',
                }}
              >
                {totalNotifications}
              </span>
            )}
          </button>

          {/* BACKDROP MOBILE PARA NOTIFICAÇÕES */}
          {showNotifications && (
            <div
              onClick={() => setShowNotifications(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 51, 102, 0.2)',
                backdropFilter: 'blur(2px)',
                zIndex: 1040,
              }}
            />
          )}

          {/* DROPDOWN DE NOTIFICAÇÕES RESPONSIVO */}
          {showNotifications && (
            <div className="student-notifications-dropdown">
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
                  backgroundColor: '#f8fafd',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontSize: '0.85rem', color: '#003366', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Bell size={15} color="#0056b3" /> Notificações & Prazos
                </strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>
                    {totalNotifications} ativa{totalNotifications > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: '#003366',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                    }}
                    title="Fechar notificações"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {pendingExams.length > 0 && (
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '0.4rem' }}>
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
                          backgroundColor: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          marginBottom: '0.4rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#003366' }}>
                          {ex.titulo}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#1e40af' }}>
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
                      backgroundColor: 'rgba(220, 38, 38, 0.06)',
                      borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>
                      Mensalidade com Pagamento Pendente
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#1e40af' }}>
                      Clique para gerar o código PIX ou anexar o comprovante.
                    </div>
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#1e40af', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: '#003366' }}>Você não possui notificações pendentes.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default StudentTopBar;
