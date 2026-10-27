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
  ArrowRight
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

  // Extrair todos os livros / módulos dos cursos
  const modulos = courses.flatMap((c) =>
    (c.livros || []).map((l: any) => ({
      id: l.id,
      titulo: l.titulo,
      capa_url: l.capa_url,
      descricao: l.descricao || `Apostila e material de estudos para ${l.titulo}.`,
      curso: c.nome,
      tipo: 'apostila',
      aulasCount: (l.aulas || []).length,
    }))
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

  const filteredModulos = modulos.filter((m) => {
    const matchesSearch =
      m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.curso.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || selectedCategory === 'apostilas';
    return matchesSearch && matchesCategory;
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
          background: 'linear-gradient(135deg, #003875 0%, #0056b3 100%)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0, 56, 117, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            <Library size={16} /> Acervo Digital FATESA
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.75rem 0', letterSpacing: '-0.02em' }}>
            Biblioteca & Materiais Teológicos
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.9, maxWidth: '680px', margin: 0, lineHeight: 1.6 }}>
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
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Categorias em Pílulas */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'todos', label: 'Todos os Recursos' },
            { id: 'apostilas', label: 'Apostilas dos Módulos' },
            { id: 'biblia', label: 'Bíblia & Leituras' },
            { id: 'manuais', label: 'Manuais & Normas' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '50px',
                border: 'none',
                backgroundColor: selectedCategory === cat.id ? '#0056b3' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === cat.id ? '#ffffff' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Filtrar por nome ou tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.2rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* SEÇÃO 1: RECURSOS FUNDAMENTAIS / DESTAQUES */}
      {filteredFixos.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
            <Sparkles size={20} color="#60a5fa" /> Recursos Bíblicos & Institucionais
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredFixos.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, border-color 0.2s',
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
                    <BookMarked size={20} color="#60a5fa" />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff', lineHeight: 1.3 }}>
                    {item.titulo}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
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
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#60a5fa',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
              <BookOpen size={20} color="#0056b3" /> Apostilas e Módulos do Curso ({filteredModulos.length})
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Material didático oficial FATESA
            </span>
          </div>

          {filteredModulos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <BookMarked size={42} style={{ color: '#64748b', marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma apostila encontrada para o termo pesquisado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredModulos.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div>
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
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '56px',
                            height: '76px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #003875 0%, #0056b3 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <BookOpen size={24} />
                        </div>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#60a5fa',
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
                            color: '#ffffff',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={mod.titulo}
                        >
                          {mod.titulo}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                          {mod.aulasCount} aula{mod.aulasCount > 1 ? 's' : ''} e avaliações
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                      {mod.descricao}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/module/${mod.id}`)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      backgroundColor: '#0056b3',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span>Acessar Material & Aulas</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
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
