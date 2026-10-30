import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Award,
  CreditCard,
  BookMarked,
  MessageSquare,
  FileText,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  MapPin,
  User,
  Users
} from 'lucide-react';
import Logo from '../common/Logo';

export type StudentNavTab =
  | 'home'
  | 'cursos'
  | 'modulos'
  | 'modulos-concluidos'
  | 'financeiro'
  | 'biblioteca'
  | 'forum'
  | 'documentos'
  | 'certificados'
  | 'perfil';

interface StudentSidebarProps {
  activeTab: StudentNavTab;
  onSelectTab: (tab: StudentNavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  profile: any;
  signOut: () => void;
  courses: any[];
  finishedCount: number;
  totalRequired: number;
  pendingExamsCount: number;
  isPastDue: boolean;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  profile,
  signOut,
  courses = [],
  finishedCount = 0,
  totalRequired = 27,
  pendingExamsCount = 0,
  isPastDue = false,
}) => {
  const navigate = useNavigate();
  const [coursesTreeOpen, setCoursesTreeOpen] = useState(true);
  const [modulesTreeOpen, setModulesTreeOpen] = useState(true);


  const handleItemClick = (tab: StudentNavTab) => {
    onSelectTab(tab);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const pctConcluido = totalRequired > 0 ? Math.min(100, Math.round((finishedCount / totalRequired) * 100)) : 0;

  const getItemStyle = (tabKey: StudentNavTab, isTreeChild = false) => {
    const isActive = activeTab === tabKey;
    return {
      width: '100%',
      padding: isCollapsed ? '0.75rem 0' : isTreeChild ? '0.5rem 0.8rem' : '0.7rem 0.9rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      gap: '0.75rem',
      backgroundColor: isActive ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
      color: isActive ? '#002d62' : '#003366',
      border: isActive ? '1px solid rgba(0, 86, 179, 0.3)' : '1px solid transparent',
      borderLeft: isActive ? '4px solid #d4af37' : '1px solid transparent',
      boxShadow: isActive ? '0 0 10px rgba(0, 86, 179, 0.2)' : 'none',
      borderRadius: '12px',
      fontSize: isTreeChild ? '0.8rem' : '0.85rem',
      fontWeight: isActive ? 800 : 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };
  };

  return (
    <>
      {/* BACKDROP MOBILE */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 51, 102, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: isCollapsed ? '76px' : '270px',
          backgroundColor: '#ffffff',
          borderRight: '2px solid #d4af37',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          transition: 'width 0.25s ease, transform 0.25s ease',
          transform: isMobileOpen ? 'translateX(0)' : 'translateX(0)',
          boxShadow: '4px 0 18px rgba(0, 86, 179, 0.18), 0 0 12px rgba(0, 86, 179, 0.22)',
        }}
        className={`student-persistent-sidebar ${isMobileOpen ? 'mobile-drawer-open' : ''}`}
      >
        {/* TOPO DA SIDEBAR: LOGO & STATUS */}
        <div
          style={{
            height: '60px',
            minHeight: '60px',
            maxHeight: '60px',
            padding: isCollapsed ? '0 0.5rem' : '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '2.5px solid #d4af37',
            boxShadow: '0 4px 16px rgba(0, 86, 179, 0.16)',
            background: 'var(--primary, #0056b3)',
          }}
        >
          <div
            onClick={() => handleItemClick('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Logo size={26} />
            </div>

            {!isCollapsed && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    color: '#ffffff',
                    display: 'block',
                    lineHeight: 1.1,
                  }}
                >
                  FATESA
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.85)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Área do Aluno
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Recolher menu lateral"
            >
              <ChevronLeft size={16} color="#ffffff" />
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO EM ÁRVORE (SCROLLÁVEL) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed ? '1rem 0.4rem' : '1.25rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            backgroundColor: '#ffffff',
          }}
          className="admin-table-scrollbar"
        >
          {/* TÓPICO FIXO DO ALUNO (DADOS PESSOAIS) */}
          <div
            onClick={() => handleItemClick('perfil')}
            style={{
              padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.85rem',
              marginBottom: '0.45rem',
              borderRadius: '12px',
              backgroundColor: activeTab === 'perfil' ? 'rgba(0, 86, 179, 0.1)' : 'rgba(0, 86, 179, 0.04)',
              border: activeTab === 'perfil' ? '1.5px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.35)',
              borderLeft: activeTab === 'perfil' ? '4px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.35)',
              boxShadow: activeTab === 'perfil' ? '0 0 10px rgba(0, 86, 179, 0.2)' : '0 2px 6px rgba(0, 86, 179, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.75rem',
              transition: 'all 0.15s ease',
            }}
            title={isCollapsed ? `Aluno: ${profile?.nome || 'Dados Pessoais'}` : undefined}
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
                border: '1.5px solid #d4af37',
                flexShrink: 0,
              }}
            >
              {(profile?.nome || 'A').charAt(0).toUpperCase()}
            </div>

            {!isCollapsed && (
              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#003366',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {(profile?.nome || 'Aluno').toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '0.67rem',
                    color: '#0056b3',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Dados Pessoais & Perfil
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 1: VISÃO GERAL */}
          <button
            onClick={() => handleItemClick('home')}
            style={getItemStyle('home')}
            title={isCollapsed ? 'Início / Dashboard' : undefined}
          >
            <LayoutDashboard size={19} color={activeTab === 'home' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Início</span>}
          </button>

          {/* SEÇÃO 2: CURSOS (ÁRVORE HIERÁRQUICA) */}
          <div>
            <div
              onClick={() => {
                if (isCollapsed) {
                  onToggleCollapse();
                  return;
                }
                setCoursesTreeOpen(!coursesTreeOpen);
              }}
              style={{
                width: '100%',
                padding: isCollapsed ? '0.75rem 0' : '0.65rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                color: activeTab === 'cursos' ? '#002d62' : '#003366',
                backgroundColor: activeTab === 'cursos' && !coursesTreeOpen ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'background 0.15s',
              }}
              title={isCollapsed ? 'Cursos' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={19} color={activeTab === 'cursos' ? '#0056b3' : '#003366'} />
                {!isCollapsed && <span>Cursos</span>}
              </div>
              {!isCollapsed && (
                coursesTreeOpen ? <ChevronDown size={14} color="#003366" /> : <ChevronRight size={14} color="#003366" />
              )}
            </div>

            {/* RAMOS DA ÁRVORE DE CURSOS */}
            {!isCollapsed && coursesTreeOpen && (
              <div
                style={{
                  marginLeft: '1.25rem',
                  paddingLeft: '0.75rem',
                  borderLeft: '1.5px solid rgba(212, 175, 55, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  marginTop: '0.2rem',
                }}
              >
                <button
                  onClick={() => handleItemClick('cursos')}
                  style={{
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: activeTab === 'cursos' ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
                    color: activeTab === 'cursos' ? '#002d62' : '#1e40af',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: activeTab === 'cursos' ? 700 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Todos os Cursos</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(0, 86, 179, 0.08)',
                      color: '#0056b3',
                      fontWeight: 700,
                    }}
                  >
                    {courses.length}
                  </span>
                </button>

                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleItemClick('cursos')}
                    style={{
                      padding: '0.45rem 0.75rem',
                      textAlign: 'left',
                      background: 'transparent',
                      color: '#1e40af',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={c.nome}
                  >
                    • {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: MÓDULOS (ÁRVORE HIERÁRQUICA) */}
          <div>
            <div
              onClick={() => {
                if (isCollapsed) {
                  onToggleCollapse();
                  return;
                }
                setModulesTreeOpen(!modulesTreeOpen);
              }}
              style={{
                width: '100%',
                padding: isCollapsed ? '0.75rem 0' : '0.65rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                color: activeTab === 'modulos' || activeTab === 'modulos-concluidos' ? '#002d62' : '#003366',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'background 0.15s',
              }}
              title={isCollapsed ? 'Módulos' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Layers size={19} color={activeTab === 'modulos' || activeTab === 'modulos-concluidos' ? '#0056b3' : '#003366'} />
                {!isCollapsed && <span>Módulos</span>}
              </div>
              {!isCollapsed && (
                modulesTreeOpen ? <ChevronDown size={14} color="#003366" /> : <ChevronRight size={14} color="#003366" />
              )}
            </div>

            {!isCollapsed && modulesTreeOpen && (
              <div
                style={{
                  marginLeft: '1.25rem',
                  paddingLeft: '0.75rem',
                  borderLeft: '1.5px solid rgba(212, 175, 55, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  marginTop: '0.2rem',
                }}
              >
                <button
                  onClick={() => handleItemClick('modulos')}
                  style={{
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: activeTab === 'modulos' ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
                    color: activeTab === 'modulos' ? '#002d62' : '#1e40af',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: activeTab === 'modulos' ? 700 : 600,
                    cursor: 'pointer',
                  }}
                >
                  Em Aberto para Estudo
                </button>

                <button
                  onClick={() => handleItemClick('modulos-concluidos')}
                  style={{
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: activeTab === 'modulos-concluidos' ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
                    color: activeTab === 'modulos-concluidos' ? '#002d62' : '#1e40af',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: activeTab === 'modulos-concluidos' ? 700 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Módulos Concluídos</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      fontWeight: 800,
                    }}
                  >
                    {finishedCount}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: NOTAS & BOLETIM */}
          <button
            onClick={() => handleItemClick('modulos-concluidos')}
            style={getItemStyle('modulos-concluidos')}
            title={isCollapsed ? 'Notas e Boletim' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award size={19} color={activeTab === 'modulos-concluidos' ? '#0056b3' : '#003366'} />
              {!isCollapsed && <span>Notas & Boletim</span>}
            </div>
            {!isCollapsed && pendingExamsCount > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                }}
              >
                {pendingExamsCount} pendente{pendingExamsCount > 1 ? 's' : ''}
              </span>
            )}
          </button>

          {/* SEÇÃO 5: FINANCEIRO */}
          <button
            onClick={() => handleItemClick('financeiro')}
            style={getItemStyle('financeiro')}
            title={isCollapsed ? 'Financeiro e Mensalidades' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CreditCard size={19} color={activeTab === 'financeiro' ? '#0056b3' : '#003366'} />
              {!isCollapsed && <span>Financeiro</span>}
            </div>
            {!isCollapsed && isPastDue && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                }}
              >
                Pendente
              </span>
            )}
          </button>

          {/* SEÇÃO 6: BIBLIOTECA & MATERIAIS */}
          <button
            onClick={() => handleItemClick('biblioteca')}
            style={getItemStyle('biblioteca')}
            title={isCollapsed ? 'Biblioteca e Apostilas' : undefined}
          >
            <BookMarked size={19} color={activeTab === 'biblioteca' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Biblioteca</span>}
          </button>

          {/* SEÇÃO 7: FÓRUM */}
          <button
            onClick={() => handleItemClick('forum')}
            style={getItemStyle('forum')}
            title={isCollapsed ? 'Fórum da Comunidade' : undefined}
          >
            <MessageSquare size={19} color={activeTab === 'forum' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Fórum</span>}
          </button>

          {/* SEÇÃO 8: DOCUMENTOS */}
          <button
            onClick={() => handleItemClick('documentos')}
            style={getItemStyle('documentos')}
            title={isCollapsed ? 'Documentos de Matrícula' : undefined}
          >
            <FileText size={19} color={activeTab === 'documentos' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Documentos</span>}
          </button>

          {/* SEÇÃO 9: CERTIFICADOS */}
          <button
            onClick={() => handleItemClick('certificados')}
            style={getItemStyle('certificados')}
            title={isCollapsed ? 'Certificados e Histórico' : undefined}
          >
            <GraduationCap size={19} color={activeTab === 'certificados' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Certificados</span>}
          </button>

          {/* SEÇÃO 10: DADOS PESSOAIS */}
          <button
            onClick={() => handleItemClick('perfil')}
            style={getItemStyle('perfil')}
            title={isCollapsed ? 'Dados Pessoais & Perfil' : undefined}
          >
            <User size={19} color={activeTab === 'perfil' ? '#0056b3' : '#003366'} />
            {!isCollapsed && <span>Dados Pessoais</span>}
          </button>

          </div>

        {/* PROGRESSO COMPACTO NA SIDEBAR */}
        {!isCollapsed && (
          <div
            style={{
              padding: '1rem 1.25rem',
              margin: '0 0.75rem 0.75rem',
              borderRadius: '14px',
              backgroundColor: '#f8fafd',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 0 10px rgba(0, 86, 179, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#003366' }}>
                Progresso Geral
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0056b3' }}>
                {pctConcluido}%
              </span>
            </div>
            <div
              style={{
                height: '7px',
                width: '100%',
                backgroundColor: 'rgba(0, 86, 179, 0.08)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pctConcluido}%`,
                  background: 'linear-gradient(90deg, #0056b3 0%, #3b82f6 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600, marginTop: '0.35rem' }}>
              {finishedCount} de {totalRequired} módulos concluídos
            </div>
          </div>
        )}

        {/* RODAPÉ DO SIDEBAR: PERFIL COMPACTO & LOGOUT */}
        <div
          style={{
            padding: isCollapsed ? '0.85rem 0.5rem' : '0.85rem 1rem',
            borderTop: '2px solid #d4af37',
            boxShadow: '0 -2px 8px rgba(0, 86, 179, 0.35)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '0.5rem',
          }}
        >
          {!isCollapsed ? (
            <div
              onClick={() => handleItemClick('perfil')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1, cursor: 'pointer' }}
              title="Acessar Meus Dados Pessoais"
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0056b3',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  border: '1.5px solid #d4af37',
                  boxShadow: '0 0 6px rgba(0, 86, 179, 0.3)',
                }}
              >
                {(profile?.nome || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#003366',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={profile?.nome}
                >
                  {(profile?.nome || 'Aluno').toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#1e40af',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <MapPin size={10} color="#0056b3" />
                  <span>{profile?.nucleos?.nome || 'Fatesa EAD'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => handleItemClick('perfil')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#0056b3',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                border: '1.5px solid #d4af37',
                cursor: 'pointer',
              }}
              title={profile?.nome || 'Aluno'}
            >
              {(profile?.nome || 'A').charAt(0).toUpperCase()}
            </div>
          )}

          {!isCollapsed && (
            <button
                onClick={() => signOut()}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#dc2626',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                title="Sair da conta"
              >
                <LogOut size={15} />
              </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default StudentSidebar;
