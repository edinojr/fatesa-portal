import React, { useState } from 'react';
import { Loader2, Download, Award, FileText, CheckCircle2 } from 'lucide-react';
import { generateCertificadoPDF, generateHistoricoPDF } from '../../utils/pdfGenerator';
import { supabase } from '../../lib/supabase';

interface CertificateProps {
  aluno: {
    nome: string;
    ano_formacao?: string;
    email: string;
    matricula?: string;
    nucleo?: string;
    nivel_curso?: string;
    historico?: { modulo: string; nota: string | number; data?: string }[];
  };
}

const AlumniCertificate: React.FC<CertificateProps> = ({ aluno }) => {
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generatingHist, setGeneratingHist] = useState(false);

  const nivel: 'basico' | 'medio' = (aluno.nivel_curso || '').toLowerCase().includes('méd') ? 'medio' : 'basico';

  const handleDownloadCertificado = async () => {
    setGeneratingCert(true);
    try {
      await generateCertificadoPDF(aluno.nome.trim(), nivel);
    } catch (error: any) {
      console.error('Erro ao gerar certificado:', error);
      alert('Falha ao gerar o certificado: ' + (error?.message || error));
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleDownloadHistorico = async () => {
    setGeneratingHist(true);
    try {
      const alunoData = {
        nome: aluno.nome,
        nucleo: aluno.nucleo || 'SEDE',
        matricula: aluno.matricula || 'N/A',
        dataMatricula: aluno.ano_formacao || 'N/A',
        status: 'Formado'
      };

      let materias: { nome: string; media: string | number }[] = [];

      if (aluno.historico && aluno.historico.length > 0) {
        materias = aluno.historico
          .filter(h => h.modulo && h.nota !== undefined && h.nota !== null)
          .map(h => ({
            nome: h.modulo,
            media: h.nota
          }));
      }

      // Se não houver histórico injetado diretamente nas props, tenta buscar do banco
      if (materias.length === 0) {
        const { data: alumniRow } = await supabase
          .from('registros_alumni')
          .select('historico')
          .ilike('email', aluno.email.trim())
          .maybeSingle();

        if (alumniRow?.historico && Array.isArray(alumniRow.historico) && alumniRow.historico.length > 0) {
          materias = alumniRow.historico
            .filter((h: any) => h.modulo && h.nota)
            .map((h: any) => ({
              nome: h.modulo,
              media: h.nota
            }));
        }
      }

      if (materias.length === 0) {
        alert('Nenhum módulo com nota encontrado no histórico do aluno.');
        return;
      }

      await generateHistoricoPDF(alunoData, materias, nivel === 'medio' ? 'Médio' : 'Básico');
    } catch (error: any) {
      console.error('Erro ao gerar histórico:', error);
      alert('Falha ao gerar histórico escolar: ' + (error?.message || error));
    } finally {
      setGeneratingHist(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%', maxWidth: '650px', margin: '0 auto' }}>
      {/* Card Visual de Apresentação do Certificado Padrão */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '20px',
        padding: '1.75rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /> Certificação Oficial Fatesa
        </div>

        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
          Certificado de Conclusão • Teologia {nivel === 'medio' ? 'Médio' : 'Básico'}
        </h3>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Diplomado(a): <strong style={{ color: '#fff' }}>{aluno.nome.toUpperCase()}</strong>
        </p>

        {/* Botões de Ação para Emissão Oficial */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', 
              color: '#000',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1.75rem',
              fontSize: '0.95rem',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 6px 20px rgba(234, 179, 8, 0.3)',
              cursor: generatingCert ? 'not-allowed' : 'pointer'
            }}
            onClick={handleDownloadCertificado}
            disabled={generatingCert}
          >
            {generatingCert ? <Loader2 className="spinner" size={20} /> : <Award size={20} />}
            <span>{generatingCert ? 'Gerando Certificado...' : 'BAIXAR CERTIFICADO OFICIAL (PDF)'}</span>
          </button>

          <button 
            type="button"
            className="btn btn-outline" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1.5rem',
              fontSize: '0.95rem',
              borderRadius: '12px',
              cursor: generatingHist ? 'not-allowed' : 'pointer'
            }}
            onClick={handleDownloadHistorico}
            disabled={generatingHist}
          >
            {generatingHist ? <Loader2 className="spinner" size={20} /> : <FileText size={20} />}
            <span>{generatingHist ? 'Gerando Histórico...' : 'BAIXAR HISTÓRICO ESCOLAR (PDF)'}</span>
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
        * Documentos oficiais gerados no padrão consolidado com assinatura e formato oficial Fatesa.
      </p>
    </div>
  );
};

export default AlumniCertificate;
