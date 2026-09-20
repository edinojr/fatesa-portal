import React, { useState } from 'react';
import { FileText, GraduationCap, Plus, Trash2, Download } from 'lucide-react';
import { generateHistoricoPDF, generateCertificadoPDF } from '../../../utils/pdfGenerator';

export const DocumentGenerator = () => {
  const [nome, setNome] = useState('');
  const [nucleo, setNucleo] = useState('SEDE');
  const [dataMatricula, setDataMatricula] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [nivel, setNivel] = useState<'basico' | 'medio'>('basico');
  const [materias, setMaterias] = useState<{ nome: string; media: string }[]>([
    { nome: '', media: '' }
  ]);

  const addMateria = () => setMaterias([...materias, { nome: '', media: '' }]);
  const removeMateria = (idx: number) => setMaterias(materias.filter((_, i) => i !== idx));

  const updateMateria = (idx: number, field: 'nome' | 'media', value: string) => {
    const newM = [...materias];
    newM[idx][field] = value;
    setMaterias(newM);
  };

  const handleDownloadHistorico = () => {
    if (!nome) return alert('Preencha o nome do aluno.');
    const validMaterias = materias.filter(m => m.nome.trim() !== '');
    
    generateHistoricoPDF({
      nome,
      nucleo: nucleo || 'SEDE',
      matricula: 'N/A',
      dataMatricula: dataMatricula || 'N/A',
      status
    }, validMaterias);
  };

  const handleDownloadCertificado = () => {
    if (!nome) return alert('Preencha o nome do aluno.');
    generateCertificadoPDF(nome, nivel);
  };

  return (
    <div className="card transition-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
        <FileText size={24} />
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>Gerador de Documentos Livres</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
        Preencha os dados abaixo manualmente para gerar Históricos ou Certificados de alunos legados ou que não estão no sistema.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Nome do Aluno</label>
          <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" />
        </div>
        <div className="form-group">
          <label className="form-label">Núcleo</label>
          <input className="form-input" value={nucleo} onChange={e => setNucleo(e.target.value)} placeholder="Ex: SEDE" />
        </div>
        <div className="form-group">
          <label className="form-label">Data de Matrícula (Opcional)</label>
          <input type="date" className="form-input" value={dataMatricula} onChange={e => setDataMatricula(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Status (Para Histórico)</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Ativo">Ativo</option>
            <option value="Formado">Formado</option>
            <option value="Trancado">Trancado</option>
            <option value="Desistente">Desistente</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nível (Para Certificado)</label>
          <select className="form-input" value={nivel} onChange={e => setNivel(e.target.value as any)}>
            <option value="basico">Teologia Básico</option>
            <option value="medio">Teologia Médio</option>
          </select>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Disciplinas e Notas (Para Histórico)</h3>
          <button onClick={addMateria} className="btn" style={{ background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <Plus size={16} /> Adicionar Linha
          </button>
        </div>
        
        {materias.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input className="form-input" style={{ flex: 2 }} placeholder="Nome da Matéria" value={m.nome} onChange={e => updateMateria(idx, 'nome', e.target.value)} />
            <input className="form-input" style={{ flex: 1 }} placeholder="Média (Ex: 8.5)" value={m.media} onChange={e => updateMateria(idx, 'media', e.target.value)} />
            <button onClick={() => removeMateria(idx)} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.5rem 1rem' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleDownloadHistorico} className="btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
          <FileText size={18} /> Gerar Histórico em PDF
        </button>
        <button onClick={handleDownloadCertificado} className="btn" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
          <GraduationCap size={18} /> Gerar Certificado em PDF
        </button>
      </div>
    </div>
  );
};
