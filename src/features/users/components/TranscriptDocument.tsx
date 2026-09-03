import React from 'react';
import Logo from '../../../components/common/Logo';

interface TranscriptAlumni {
  nome: string;
  email?: string;
  curso?: string;
  nucleo?: string;
  ano_formacao?: string;
  nivel_curso?: string;
  matricula?: string;
  rg?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigo_verificacao?: string;
  historico?: { modulo: string; nota: string; data: string }[];
}

interface TranscriptDocumentProps {
  alumni: TranscriptAlumni;
  onClose: () => void;
}

const TranscriptDocument: React.FC<TranscriptDocumentProps> = ({ alumni, onClose }) => {
  const entries = alumni.historico || [];
  const notas = entries
    .map(e => parseFloat(String(e.nota).replace(',', '.')))
    .filter(n => !isNaN(n));
  const media = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';

  const today = new Date().toLocaleDateString('pt-BR');

  const dados: { label: string; value: string }[] = [
    { label: 'Nome Completo', value: alumni.nome || '—' },
    { label: 'Matrícula', value: alumni.matricula || '—' },
    { label: 'RG', value: alumni.rg || '—' },
    { label: 'Telefone', value: alumni.telefone || '—' },
    { label: 'Curso / Especialidade', value: alumni.curso || '—' },
    { label: 'Nível', value: alumni.nivel_curso || '—' },
    { label: 'Polo / Núcleo', value: alumni.nucleo || '—' },
    { label: 'Ano de Formação', value: alumni.ano_formacao || '—' },
    { label: 'Cidade / UF', value: [alumni.cidade, alumni.uf].filter(Boolean).join(' - ') || '—' },
    { label: 'E-mail', value: alumni.email || '—' }
  ];

  return (
    <div
      className="certificate-overlay no-print-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      {/* Papel A4 Retrato */}
      <div
        className="certificate-paper"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          padding: '14mm 14mm 12mm 14mm',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          color: '#1a1a1a',
          fontFamily: "'Inter', sans-serif",
          boxSizing: 'border-box'
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px solid #B8860B', paddingBottom: '0.75rem' }}>
          <Logo size={90} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.9rem', fontWeight: 700, color: '#B8860B', margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Histórico Escolar
            </h1>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '3px', opacity: 0.7 }}>
              Faculdade de Teologia Fatesa — Casa do Saber
            </p>
          </div>
        </div>

        {/* Dados do Aluno */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1.5rem', padding: '0.9rem 0', borderBottom: '1px solid #ddd' }}>
          {dados.map(d => (
            <div key={d.label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', lineHeight: '1.4' }}>
              <span style={{ fontWeight: 700, minWidth: '130px', color: '#555' }}>{d.label}:</span>
              <span style={{ fontWeight: 500 }}>{d.value}</span>
            </div>
          ))}
        </div>

        {/* Tabela de Notas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#B8860B', color: '#fff' }}>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '34px' }}>Nº</th>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Matéria / Módulo</th>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '70px' }}>Nota</th>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '110px' }}>Conclusão</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#888' }}>
                  Nenhuma matéria registrada no histórico.
                </td>
              </tr>
            ) : (
              entries.map((item, idx) => {
                const nota = parseFloat(String(item.nota).replace(',', '.'));
                const aprovado = !isNaN(nota) && nota >= 7;
                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#faf7f0' : '#fff', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: '#777' }}>{idx + 1}</td>
                    <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{item.modulo}</td>
                    <td style={{
                      padding: '0.35rem 0.6rem',
                      textAlign: 'center',
                      fontWeight: 800,
                      color: isNaN(nota) ? '#333' : (aprovado ? '#2d7a2d' : '#b3392d')
                    }}>
                      {String(item.nota).replace(',', '.')}
                    </td>
                    <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: '#555' }}>{item.data}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Resumo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.8rem' }}>
          <span>
            <strong>Total de Matérias:</strong> {entries.length}
          </span>
          <span>
            <strong>Média Geral:</strong>{' '}
            <span style={{ fontWeight: 800, color: '#B8860B', fontSize: '0.95rem' }}>{media}</span>
          </span>
        </div>

        {/* Assinaturas */}
        <div style={{ marginTop: '4.5rem', display: 'flex', justifyContent: 'space-around', width: '100%', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '0.6rem', width: '230px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Dr. Antônio Sebastião da Silva</p>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Diretor Acadêmico</p>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '0.6rem', width: '230px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Aparecida Panisso</p>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Secretária Geral</p>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '2.5rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', opacity: 0.65 }}>
          <p style={{ margin: 0 }}>Emitido em: {today}</p>
          <div style={{ padding: '4px 10px', border: '1px solid #ddd', background: '#f9f9f9', fontFamily: 'monospace', letterSpacing: '1px' }}>
            CÓDIGO DE VERIFICAÇÃO: {(alumni.codigo_verificacao || '—').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Botões (não saem na impressão) */}
      <div className="no-print" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
          style={{ width: 'auto', padding: '0.75rem 2rem', background: '#333' }}
        >
          Imprimir Histórico
        </button>
        <button
          className="btn btn-outline"
          onClick={onClose}
          style={{ width: 'auto', padding: '0.75rem 2rem', background: '#fff' }}
        >
          Fechar Visualização
        </button>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .certificate-paper, .certificate-paper * {
            visibility: visible;
          }
          .certificate-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: auto;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .certificate-paper table tr,
          .certificate-paper thead {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
          .no-print-backdrop {
            background: none !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
    </div>
  );
};

export default TranscriptDocument;
