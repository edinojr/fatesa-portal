import React, { useEffect, useState } from 'react';
import { GraduationCap, FileText, Download, CheckCircle2, Award, Clock } from 'lucide-react';
import { generateHistoricoPDF, generateCertificadoPDF } from '../utils/pdfGenerator';
import { fetchStudentAcademicSummary, StudentAcademicSummary } from '../services/academicService';

export const CertificadosPanel = ({ profile }: { profile: any }) => {
  const [summary, setSummary] = useState<StudentAcademicSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadAcademicData = async () => {
      if (!profile?.id && !profile?.email) return;
      setLoading(true);
      try {
        const data = await fetchStudentAcademicSummary(profile);
        if (isMounted) {
          setSummary(data);
        }
      } catch (err) {
        console.error('[CertificadosPanel] Erro ao carregar dados consolidados:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAcademicData();
    return () => { isMounted = false; };
  }, [profile?.id, profile?.email]);

  const handleDownloadHistorico = () => {
    if (!summary) return;

    if (summary.materias.length === 0) {
      alert('Nenhuma matéria aprovada (nota >= 7.0) encontrada no histórico.');
      return;
    }

    try {
      const cursoNivelNome = summary.isMedioConcluido ? 'Médio' : 'Básico';
      generateHistoricoPDF(
        summary.alunoData,
        summary.materias.map(m => ({ nome: m.nome, media: m.media })),
        cursoNivelNome
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar o Histórico Escolar em PDF. Tente novamente mais tarde.');
    }
  };

  const handleDownloadCertificado = () => {
    if (!summary) return;

    if (!summary.isBasicoConcluido && !summary.isMedioConcluido) {
      alert(`Você concluiu ${summary.finishedBasicCount} de 27 módulos do Curso Básico. Para emissão do certificado oficial, é necessário completar todas as 27 matérias ou ter graduação confirmada pela secretaria.`);
      return;
    }

    try {
      generateCertificadoPDF(summary.alunoData.nome, summary.nivelCertificado, summary.dataConclusao);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar o Certificado em PDF. Tente novamente mais tarde.');
    }
  };

  const isFormado = summary?.isBasicoConcluido || summary?.isMedioConcluido;

  return (
    <div className="panel-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 86, 179, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #0056b3)' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Históricos e Certificados</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
              Emissão oficial de documentos escolares consolidados (Notas Online + Secretaria)
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores de Progresso Acadêmico e Formatura */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '1.25rem'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Situação Acadêmica</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              {isFormado ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#22c55e', fontWeight: 800, fontSize: '1rem' }}>
                  <CheckCircle2 size={18} /> Formado ({summary.isMedioConcluido ? 'Teologia Médio' : 'Teologia Básico'})
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary, #0056b3)', fontWeight: 800, fontSize: '1rem' }}>
                  <Clock size={18} /> Em Formação
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Curso Básico</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
              {Math.min(summary.finishedBasicCount, 27)} / 27 módulos
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Curso Médio</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
              {Math.min(summary.finishedMediumCount, 8)} / 8 módulos
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Matérias Aprovadas</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
              {summary.totalModulosConcluidos} disciplina(s)
            </div>
          </div>
        </div>
      )}

      <div className="panel-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          {/* Card Histórico Escolar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6' }}>
              <FileText size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Histórico Escolar Oficial</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
              Documento oficial consolidado reunindo todas as matérias cursadas (lançamentos de secretaria e avaliações online), com as respectivas notas e dados da instituição.
            </p>
            <button 
              onClick={handleDownloadHistorico}
              disabled={loading || !summary || summary.materias.length === 0}
              className="btn" 
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Carregando...' : <><Download size={18} /> Baixar Histórico Escolar (PDF)</>}
            </button>
          </div>

          {/* Card Certificado de Conclusão */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary, #0056b3)' }}>
              <Award size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Certificado de Conclusão</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
              {isFormado
                ? `Parabéns! Seu Certificado de Conclusão (${summary?.nivelCertificado === 'medio' ? 'Teologia Médio' : 'Teologia Básico'}) está disponível para download imediato em alta resolução.`
                : 'O Certificado Oficial de Conclusão é liberado automaticamente assim que todos os módulos obrigatórios do curso forem finalizados e aprovados.'}
            </p>
            <button 
              onClick={handleDownloadCertificado}
              disabled={loading || !isFormado}
              className="btn btn-primary" 
              style={{
                background: isFormado ? 'var(--primary, #0056b3)' : 'rgba(255,255,255,0.05)',
                color: isFormado ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isFormado ? 800 : 500,
                border: isFormado ? 'none' : '1px solid var(--glass-border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                width: 'auto',
                cursor: (!isFormado || loading) ? 'not-allowed' : 'pointer',
                boxShadow: isFormado ? '0 6px 20px rgba(0, 86, 179, 0.3)' : 'none'
              }}
            >
              <Download size={18} /> {isFormado ? 'Baixar Certificado Oficial (PDF)' : 'Certificado Bloqueado (Em Curso)'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
