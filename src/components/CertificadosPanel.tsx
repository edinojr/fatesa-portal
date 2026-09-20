import React, { useEffect, useState } from 'react';
import { GraduationCap, FileText, Download } from 'lucide-react';
import { generateHistoricoPDF, generateCertificadoPDF } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabase';

export const CertificadosPanel = ({ profile }: { profile: any }) => {
  const [academicData, setAcademicData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        // Fetch respostas_aulas
        const { data: respData, error: respErr } = await supabase
          .from('respostas_aulas')
          .select('id, aula_id, nota, status')
          .eq('aluno_id', profile.id);

        if (respErr) throw respErr;

        // Fetch historico_notas
        const { data: histData } = await supabase
          .from('historico_notas')
          .select('*')
          .eq('aluno_id', profile.id);

        // Fetch aulas and livros for the respData
        const aulaIds = Array.from(new Set((respData || []).map(r => r.aula_id).filter(Boolean)));
        let aulasData: any[] = [];
        let livrosData: any[] = [];

        if (aulaIds.length > 0) {
          const { data: aData } = await supabase
            .from('aulas')
            .select('id, tipo, is_bloco_final, livro_id')
            .in('id', aulaIds);
          
          aulasData = aData || [];
          const livroIds = Array.from(new Set(aulasData.map(a => a.livro_id).filter(Boolean)));
          
          if (livroIds.length > 0) {
            const { data: lData } = await supabase
              .from('livros')
              .select('id, titulo')
              .in('id', livroIds);
            livrosData = lData || [];
          }
        }

        // Map everything together
        const mappedRespData = (respData || []).map(r => {
          const aula = aulasData.find(a => a.id === r.aula_id);
          const livro = aula ? livrosData.find(l => l.id === aula.livro_id) : null;
          return {
            ...r,
            is_manual: false,
            aulas: aula ? {
              ...aula,
              livros: livro ? { titulo: livro.titulo } : null
            } : null
          };
        });

        const combined = [
          ...mappedRespData,
          ...(histData || []).map(h => ({ ...h, is_manual: true }))
        ];
        setAcademicData(combined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.id]);

  const handleDownloadHistorico = () => {
    if (!profile || !academicData) return;

    try {
      const alunoData = {
        nome: profile.nome || 'Aluno',
        nucleo: profile.nucleos?.nome || 'SEDE',
        matricula: 'N/A',
        dataMatricula: profile.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'N/A',
        status: profile.tipo === 'ex_aluno' ? 'Formado' : 'Ativo'
      };

      const materiasParaHistorico: { nome: string; media: string | number }[] = [];
      
      const grouped: Record<string, { nota: number }> = {};
      
      academicData.forEach((item: any) => {
        const isManual = item.is_manual;
        const modName = isManual ? item.modulo_nome : item.aulas?.livros?.titulo;
        const isExam = isManual || item.aulas?.is_bloco_final || item.aulas?.tipo === 'prova';
        
        if (isExam && modName && item.nota !== null) {
          const notaStr = String(item.nota).replace(',', '.');
          const notaValue = parseFloat(notaStr);
          if (!isNaN(notaValue)) {
            if (!grouped[modName] || notaValue > grouped[modName].nota) {
              grouped[modName] = { nota: notaValue };
            }
          }
        }
      });

      Object.entries(grouped).forEach(([nome, info]) => {
        if (info.nota >= 7.0) { 
          materiasParaHistorico.push({
            nome,
            media: Number(info.nota).toFixed(1)
          });
        }
      });

      materiasParaHistorico.sort((a, b) => a.nome.localeCompare(b.nome));

      generateHistoricoPDF(alunoData, materiasParaHistorico);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar o Histórico Escolar em PDF. Tente novamente mais tarde.');
    }
  };

  const handleDownloadCertificado = () => {
    if (!profile || !academicData) return;

    // Calcular concluidos (Básico e Médio)
    const finishedBooks = new Set<string>();
    academicData.forEach((item: any) => {
      const isManual = item.is_manual;
      const modName = isManual ? item.modulo_nome : item.aulas?.livros?.titulo;
      const isExam = isManual || item.aulas?.is_bloco_final || item.aulas?.tipo === 'prova';
      
      if (isExam && modName && item.nota !== null) {
        const notaStr = String(item.nota).replace(',', '.');
        const notaValue = parseFloat(notaStr);
        if (!isNaN(notaValue) && notaValue >= 7.0) {
          finishedBooks.add(modName.trim().toUpperCase());
        }
      }
    });

    // Nivel a gerar
    let nivel: 'basico' | 'medio' = 'basico';

    if (finishedBooks.size >= 35) {
      nivel = 'medio';
    } else if (finishedBooks.size >= 27) {
      nivel = 'basico';
    } else {
      alert(`Você ainda não concluiu todos os módulos obrigatórios. Modulos concluídos: ${finishedBooks.size}`);
      return;
    }

    generateCertificadoPDF(profile.nome, nivel);
  };

  return (
    <div className="panel-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Históricos e Certificados</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>Baixe seus documentos escolares</p>
          </div>
        </div>
      </div>

      <div className="panel-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6' }}>
              <FileText size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Histórico Escolar</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
              O Histórico Escolar contém todas as matérias que você já concluiu e foi aprovado, com suas respectivas notas.
            </p>
            <button 
              onClick={handleDownloadHistorico}
              disabled={loading}
              className="btn" 
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', width: '100%' }}
            >
              {loading ? 'Carregando...' : <><Download size={18} /> Baixar Histórico Parcial/Completo</>}
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#eab308' }}>
              <GraduationCap size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Certificado de Conclusão</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
              O Certificado de Conclusão é liberado assim que você finaliza todas as matérias obrigatórias do seu curso.
            </p>
            <button 
              onClick={handleDownloadCertificado}
              className="btn" 
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', width: '100%' }}
            >
              <Download size={18} /> Baixar Certificado
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
