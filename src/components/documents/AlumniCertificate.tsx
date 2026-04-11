import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Loader2, Download } from 'lucide-react';

interface CertificateProps {
  aluno: {
    nome: string;
    ano_formacao?: string;
    email: string;
    matricula?: string;
  };
}

const AlumniCertificate: React.FC<CertificateProps> = ({ aluno }) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = React.useState(false);

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setGenerating(true);
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#FFD700' // Vibrant Yellow
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado_Fatesa_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Falha ao gerar o certificado. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const getExtensoDate = () => {
    const data = new Date();
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Hidden Certificate Preview for Export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div 
          ref={certificateRef}
          style={{
            width: '297mm', // A4 Landscape
            height: '210mm',
            backgroundColor: '#FDD835', // Yellow Vibrante
            padding: '15mm',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontFamily: "'Playfair Display', serif", // Requires a premium serif font
            color: '#333',
            overflow: 'hidden'
          }}
        >
          {/* Watermark Logo */}
          <img 
            src="/logo.png" 
            alt="Marca d'água Fatesa Casa do Saber"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              opacity: 0.1, // Marca d'água
              zIndex: 1
            }}
          />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', border: '4px solid #B4962B', height: '100%', padding: '10mm', boxSizing: 'border-box', borderStyle: 'double' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <img src="/logo.png" alt="Logotipo Oficial Fatesa Casa do Saber" style={{ height: '100px', marginBottom: '0.5rem' }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Fatesa - A Casa do Saber</h2>
            </div>

            <h1 style={{ fontSize: '3.5rem', margin: '0.5rem 0', fontWeight: 900, color: '#000' }}>Certificado de Conclusão</h1>
            
            <p style={{ fontSize: '1.8rem', margin: '1rem 0' }}>Certificamos que o(a) aluno(a)</p>
            
            <h2 style={{ fontSize: '3rem', margin: '1rem 0', fontWeight: 800, textDecoration: 'underline', color: '#111' }}>{aluno.nome.toUpperCase()}</h2>
            
            <p style={{ fontSize: '1.8rem', margin: '1rem 0', fontWeight: 600 }}>DIPLOMADO(A)</p>
            
            <div style={{ margin: '2rem 0' }}>
              <p style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>em virtude de haver concluído com aproveitamento o</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1B5E20' }}>Curso Básico de Teologia</h3>
            </div>

            <p style={{ fontSize: '1.2rem', marginTop: '3rem' }}>
              Santo André, {getExtensoDate()}
            </p>

            {/* Footer / Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '4rem', width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', width: '250px', paddingTop: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Dr. Antônio Sebastião da Silva</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Diretor Fatesa</p>
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', width: '250px', paddingTop: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Aparecida Panisso Santos</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Secretária Fatesa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button for Dashboard */}
      <button 
        className="btn btn-primary" 
        style={{ 
          background: 'linear-gradient(135deg, #FFD700 0%, #B4962B 100%)', 
          color: '#000',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1.2rem 2.5rem',
          fontSize: '1.1rem',
          borderRadius: '16px',
          boxShadow: '0 8px 20px rgba(180, 150, 43, 0.3)'
        }}
        onClick={handleDownload}
        disabled={generating}
      >
        {generating ? <Loader2 className="spinner" size={24} /> : <Download size={24} />}
        <span>BAIXAR CERTIFICADO DE CONCLUSÃO</span>
      </button>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>* Formato PDF de alta qualidade para impressão.</p>
    </div>
  );
};

export default AlumniCertificate;
