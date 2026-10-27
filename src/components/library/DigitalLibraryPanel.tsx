import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Download,
  ExternalLink,
  BookMarked,
  FileText,
  Sparkles,
  Bookmark,
  CheckCircle2,
  Library,
  ArrowRight,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BibleReaderPopup } from '../BibleReaderPopup';

interface DigitalLibraryPanelProps {
  courses: any[];
}

export const DigitalLibraryPanel: React.FC<DigitalLibraryPanelProps> = ({ courses = [] }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'apostilas' | 'biblia' | 'manuais'>('todos');
  const [showBibleModal, setShowBibleModal] = useState(false);

  // Extrair todos os livros / módulos dos cursos preservando status de aprovação, nota manual e liberação
  const modulos = courses.flatMap((c) =>
    (c.livros || []).map((l: any) => {
      const rawNota = l.notaHistorico ?? l.nota;
      const numNota = rawNota != null && !isNaN(Number(rawNota)) ? Number(rawNota) : null;
      const isManualApproved = l.notaHistorico != null && !isNaN(Number(l.notaHistorico)) && Number(l.notaHistorico) >= 7;
      const isApproved = !!l.isApproved || !!l.isFinished || (numNota != null && numNota >= 7);
      const isUnlocked = !!l.isUnlocked || !!l.isReleased || isApproved;

      return {
        id: l.id,
        titulo: l.titulo,
        capa_url: l.capa_url,
        descricao: l.descricao || `Apostila e material de estudos para ${l.titulo}.`,
        curso: c.nome,
        tipo: 'apostila',
        aulasCount: (l.aulas || []).length,
        isUnlocked,
        isApproved,
        isManualApproved,
        nota: numNota,
      };
    })
  );

  // Materiais complementares e guias
  const materiaisFixos = [
    {
      id: 'mat-biblia-online',
      titulo: 'Bíblia Sagrada Digital (Almeida Revista e Corrigida)',
      descricao: 'Texto integral do Antigo e Novo Testamento com ferramenta rápida de busca por versículos e palavras-chave.',
      categoria: 'biblia',
      tipoBadge: 'Bíblia Online',
      actionType: 'open-bible',
    },
    {
      id: 'mat-manual-aluno',
      titulo: 'Manual Acadêmico do Aluno FATESA',
      descricao: 'Orientações pedagógicas, sistema avaliativo por versões (V1, V2 e V3), critérios de aprovação e prazos de formatura.',
      categoria: 'manuais',
      tipoBadge: 'Guia Oficial',
      url: 'https://www.fatesacasadosaber.com.br',
    },
    {
      id: 'mat-plano-leitura',
      titulo: 'Plano Anual de Leitura Bíblica Comentada',
      descricao: 'Cronograma diário estruturado para leitura completa das Escrituras Sagradas ao longo do ano acadêmico.',
      categoria: 'biblia',
      tipoBadge: 'Cronograma',
    },
    {
      id: 'mat-normas-artigo',
      titulo: 'Guia de Pesquisa e Hermenêutica Teológica',
      descricao: 'Princípios essenciais para interpretação dos textos sagrados, exegese bíblica e elaboração de reflexões teológicas.',
      categoria: 'manuais',
      tipoBadge: 'Metodologia',
    },
  ];

  const filteredModulos = modulos
    .filter((m) => {
      const matchesSearch =
        m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.curso.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'todos' || selectedCategory === 'apostilas';
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aLib = a.isUnlocked || a.isApproved ? 1 : 0;
      const bLib = b.isUnlocked || b.isApproved ? 1 : 0;
      if (aLib !== bLib) return bLib - aLib;
      return 0;
    });

  const filteredFixos = materiaisFixos.filter((m) => {
    const matchesSearch =
      m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'todos' || selectedCategory === m.categoria;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '1200px', margin: '0 auto' }}>
      {/* HEADER DA BIBLIOTECA */}
      <div
        style={{
          background: 'linear-gradient(135deg, #002d62 0%, #0056b3 100%)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0, 56, 117, 0.25), 0 0 12px rgba(0, 86, 179, 0.25)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderBottom: '3.5px solid #d4af37',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', color: '#ffffff' }}>
            <Library size={16} color="#d4af37" /> Acervo Digital FATESA
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.75rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Biblioteca & Materiais Teológicos
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.95, maxWidth: '680px', margin: 0, lineHeight: 1.6, color: '#e0edff' }}>
            Consulte apostilas completas dos módulos do seu curso, a Bíblia Sagrada Digital integrada, manuais de estudo e materiais de apoio acadêmico.
          </p>
        </div>
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '220px', height: '220px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', filter: 'blur(30px)' }} />
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          background: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: '0 4px 16px rgba(0, 86, 179, 0.08), 0 0 8px rgba(0, 86, 179, 0.12)',
        }}
      >
        {/* Categorias em Pílulas */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'todos', label: 'Todos os Recursos' },
            { id: 'apostilas', label: 'Apostilas dos Módulos' },
            { id: 'biblia', label: 'Bíblia & Leituras' },
            { id: 'manuais', label: 'Manuais & Normas' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '50px',
                  border: isSelected ? '1px solid #0056b3' : '1px solid rgba(212, 175, 55, 0.35)',
                  backgroundColor: isSelected ? '#0056b3' : '#f8fafd',
                  color: isSelected ? '#ffffff' : '#003366',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 86, 179, 0.35)' : 'none',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0056b3' }} />
          <input
            type="text"
            placeholder="Filtrar por nome ou tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.2rem',
              backgroundColor: '#f8fafd',
              border: '1.5px solid rgba(212, 175, 55, 0.45)',
              borderRadius: '50px',
              color: '#003366',
              fontSize: '0.85rem',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0, 86, 179, 0.05)',
            }}
          />
        </div>
      </div>

      {/* SEÇÃO 1: RECURSOS FUNDAMENTAIS / DESTAQUES */}
      {filteredFixos.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#003366' }}>
            <Sparkles size={20} color="#0056b3" /> Recursos Bíblicos & Institucionais
          </h2>
          <div className="gold-separator-line" style={{ marginBottom: '1.25rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredFixos.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderTop: '3.5px solid #d4af37',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 20px rgba(0, 86, 179, 0.08), 0 0 10px rgba(0, 86, 179, 0.12)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: '#0056b3',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {item.tipoBadge}
                    </span>
                    <BookMarked size={20} color="#0056b3" />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#003366', lineHeight: 1.3 }}>
                    {item.titulo}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                    {item.descricao}
                  </p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  {item.actionType === 'open-bible' ? (
                    <button
                      onClick={() => setShowBibleModal(true)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 1rem',
                        backgroundColor: '#0056b3',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 86, 179, 0.3)',
                      }}
                    >
                      <BookOpen size={16} /> Abrir Bíblia Sagrada
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (item.url) window.open(item.url, '_blank');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.7rem 1rem',
                        backgroundColor: '#f8fafd',
                        color: '#0056b3',
                        border: '1.5px solid #0056b3',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <FileText size={16} /> Acessar Documento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: APOSTILAS DOS MÓDULOS */}
      {(selectedCategory === 'todos' || selectedCategory === 'apostilas') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#003366' }}>
              <BookOpen size={20} color="#0056b3" /> Apostilas e Módulos do Curso ({filteredModulos.length})
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
              Material didático oficial FATESA
            </span>
          </div>
          <div className="gold-separator-line" style={{ marginBottom: '1.25rem' }} />

          {filteredModulos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(212, 175, 55, 0.35)', boxShadow: '0 4px 16px rgba(0, 86, 179, 0.08)' }}>
              <BookMarked size={42} style={{ color: '#0056b3', marginBottom: '0.75rem', opacity: 0.6 }} />
              <p style={{ color: '#1e40af', margin: 0, fontWeight: 600 }}>Nenhuma apostila encontrada para o termo pesquisado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredModulos.map((mod) => {
                const isLiberadoOuAprovado = mod.isUnlocked || mod.isApproved;
                return (
                <div
                  key={mod.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: isLiberadoOuAprovado
                      ? '1.5px solid rgba(21, 128, 61, 0.35)'
                      : '1px solid rgba(212, 175, 55, 0.35)',
                    borderTop: isLiberadoOuAprovado
                      ? '4px solid #16a34a'
                      : '3.5px solid #d4af37',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(0, 86, 179, 0.08), 0 0 10px rgba(0, 86, 179, 0.12)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div>
                    {/* Status em Verde nos Módulos Liberados / Aprovados */}
                    {isLiberadoOuAprovado ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem',
                          backgroundColor: '#dcfce7',
                          border: '1px solid #86efac',
                          borderRadius: '10px',
                          padding: '0.4rem 0.65rem',
                          marginBottom: '0.85rem',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#15803d',
                            fontSize: '0.73rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          <CheckCircle2 size={14} color="#15803d" style={{ flexShrink: 0 }} />
                          {mod.isApproved
                            ? mod.isManualApproved
                              ? 'Aprovado / Liberado (Nota Manual)'
                              : 'Aprovado / Liberado'
                            : 'Módulo Liberado'}
                        </span>
                        {mod.nota != null && mod.nota >= 7 && (
                          <span
                            style={{
                              backgroundColor: '#15803d',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              flexShrink: 0,
                            }}
                          >
                            Nota {mod.nota.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '0.4rem 0.65rem',
                          marginBottom: '0.85rem',
                        }}
                      >
                        <Lock size={13} color="#64748b" style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          Aguardando Liberação
                        </span>
                      </div>
                    )}

                    {/* Cabeçalho do Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                      {mod.capa_url ? (
                        <img
                          src={mod.capa_url}
                          alt={mod.titulo}
                          style={{
                            width: '56px',
                            height: '76px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            boxShadow: '0 4px 10px rgba(0, 86, 179, 0.25)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '56px',
                            height: '76px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #002d62 0%, #0056b3 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 4px 10px rgba(0, 86, 179, 0.25)',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                          }}
                        >
                          <BookOpen size={24} color="#d4af37" />
                        </div>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#0056b3',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          {mod.curso}
                        </span>
                        <h3
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            margin: 0,
                            color: '#003366',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={mod.titulo}
                        >
                          {mod.titulo}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: isLiberadoOuAprovado ? '#15803d' : '#1e40af', display: 'block', marginTop: '4px', fontWeight: 700 }}>
                          {isLiberadoOuAprovado
                            ? `✓ Liberado • ${mod.aulasCount} aula${mod.aulasCount > 1 ? 's' : ''} e avaliações`
                            : `${mod.aulasCount} aula${mod.aulasCount > 1 ? 's' : ''} e avaliações`}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                      {mod.descricao}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (!isLiberadoOuAprovado) return;
                      navigate(`/module/${mod.id}`);
                    }}
                    disabled={!isLiberadoOuAprovado}
                    className="btn-module-access"
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      backgroundColor: isLiberadoOuAprovado ? '#0056b3' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isLiberadoOuAprovado ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: isLiberadoOuAprovado ? '0 4px 12px rgba(0, 86, 179, 0.25)' : 'none',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>
                      {isLiberadoOuAprovado ? 'Acessar Material & Aulas' : 'Módulo Bloqueado'}
                    </span>
                    {isLiberadoOuAprovado ? <ArrowRight size={14} color="#ffffff" /> : <Lock size={14} color="#ffffff" />}
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DA BÍBLIA SAGRADA */}
      {showBibleModal && (
        <BibleReaderPopup onClose={() => setShowBibleModal(false)} />
      )}
    </div>
  );
};

export default DigitalLibraryPanel;
