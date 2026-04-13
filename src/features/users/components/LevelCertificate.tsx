import React from 'react';
import Logo from '../../../components/common/Logo';

interface LevelCertificateProps {
  studentName: string;
  courseName: string;
  levelName: string; // e.g., "Teologia Básico" or "Teologia Médio"
  date: string;
  verificationCode: string;
  onClose: () => void;
}

const LevelCertificate: React.FC<LevelCertificateProps> = ({
  studentName,
  courseName,
  levelName,
  date,
  verificationCode,
  onClose
}) => {
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
      {/* Container de Impressão */}
      <div 
        className="certificate-paper"
        onClick={e => e.stopPropagation()}
        style={{ 
          background: '#fff', 
          width: '297mm', 
          height: '210mm', 
          margin: '0 auto', 
          padding: '1mm', // Sangria mínima
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2px',
          color: '#1a1a1a',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Bordas Ornamentais Douradas */}
        <div style={{
          position: 'absolute',
          top: '10mm',
          left: '10mm',
          right: '10mm',
          bottom: '10mm',
          border: '2px solid #D4AF37', // Gold
          pointerEvents: 'none'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '12mm',
          left: '12mm',
          right: '12mm',
          bottom: '12mm',
          border: '1px solid #D4AF37',
          opacity: 0.5,
          pointerEvents: 'none'
        }}></div>

        {/* Cantos Ornamentais (SVG) */}
        <div style={{ position: 'absolute', top: '15mm', left: '15mm', width: '50px', height: '50px', borderTop: '4px solid #D4AF37', borderLeft: '4px solid #D4AF37' }}></div>
        <div style={{ position: 'absolute', top: '15mm', right: '15mm', width: '50px', height: '50px', borderTop: '4px solid #D4AF37', borderRight: '4px solid #D4AF37' }}></div>
        <div style={{ position: 'absolute', bottom: '15mm', left: '15mm', width: '50px', height: '50px', borderBottom: '4px solid #D4AF37', borderLeft: '4px solid #D4AF37' }}></div>
        <div style={{ position: 'absolute', bottom: '15mm', right: '15mm', width: '50px', height: '50px', borderBottom: '4px solid #D4AF37', borderRight: '4px solid #D4AF37' }}></div>

        {/* Conteúdo */}
        <div style={{ width: '80%', textAlign: 'center', zIndex: 10 }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <Logo size={180} />
          </div>

          <h1 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '3.5rem', 
            fontWeight: 700, 
            color: '#B8860B', // Dark Goldenrod
            margin: '0 0 0.5rem 0',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Certificado de Conclusão
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            fontWeight: 500, 
            textTransform: 'uppercase', 
            letterSpacing: '5px',
            margin: '0 0 3rem 0',
            opacity: 0.7
          }}>
            Nível {levelName}
          </p>

          <p style={{ fontSize: '1.4rem', marginBottom: '1rem', fontStyle: 'italic' }}>
            Certificamos que para os devidos fins de direito, o(a) aluno(a)
          </p>

          <h2 style={{ 
            fontFamily: "'Pinyon Script', cursive", 
            fontSize: '5rem', 
            fontWeight: 400, 
            margin: '1rem 0 2rem 0', 
            color: '#1a1a1a' 
          }}>
            {studentName}
          </h2>

          <p style={{ fontSize: '1.3rem', lineHeight: '1.8', maxWidth: '90%', margin: '0 auto' }}>
            Concluiu com êxito todas as exigências acadêmicas do curso de <br />
            <strong style={{ fontSize: '1.8rem', color: '#B8860B' }}>{courseName}</strong> <br />
            em nível <strong>{levelName}</strong>, conforme os registros internos desta instituição.
          </p>

          {/* Assinaturas */}
          <div style={{ 
            marginTop: '5rem', 
            display: 'flex', 
            justifyContent: 'space-around', 
            width: '100%', 
            alignItems: 'flex-end' 
          }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '0.75rem', width: '280px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase' }}>Dr. Antônio Sebastião da Silva</p>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Diretor Acadêmico</p>
            </div>
            
            <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '0.75rem', width: '280px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase' }}>Aparecida Panisso</p>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Secretária Geral</p>
            </div>
          </div>

          {/* Rodapé com Verificação */}
          <div style={{ 
            marginTop: '4rem', 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '0.8rem',
            opacity: 0.6
          }}>
            <p>Emitido em: {date}</p>
            <div style={{ 
              padding: '8px 15px', 
              border: '1px solid #ddd', 
              background: '#f9f9f9',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}>
              CÓDIGO DE VERIFICAÇÃO: {verificationCode.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação (Não saem na impressão) */}
      <div className="no-print" style={{ 
        marginTop: '2rem', 
        display: 'flex', 
        gap: '1rem' 
      }}>
        <button 
          className="btn btn-primary" 
          onClick={() => window.print()} 
          style={{ width: 'auto', padding: '0.75rem 2rem', background: '#333' }}
        >
          Imprimir Certificado
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
            width: 297mm;
            height: 210mm;
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .no-print-backdrop {
            background: none !important;
            padding: 0 !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* Importação de Fontes se não houver globalmente */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Pinyon+Script&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
    </div>
  );
};

export default LevelCertificate;
