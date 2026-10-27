import React, { useState } from 'react';
import { User, Camera, Save, X, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { getBookStats } from '../../courses/utils/courseUtils';

interface PersonalDataCardProps {
  profile: any;
  onRefresh?: () => void;
  courses?: any[];
  atividades?: any[];
  progressoAulas?: any[];
}

const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');

const maskRG = (v: string): string => {
  const d = onlyDigits(v).slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
};

const maskCPF = (v: string): string => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const maskPhone = (v: string): string => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1.5px solid rgba(212, 175, 55, 0.45)',
  background: '#f8fafd',
  color: '#003366',
  fontSize: '0.92rem',
  fontWeight: 600,
  outline: 'none',
  boxShadow: '0 2px 6px rgba(0, 86, 179, 0.05)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.76rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#0056b3',
  marginBottom: '0.35rem'
};

const PersonalDataCard: React.FC<PersonalDataCardProps> = ({ profile, onRefresh, courses = [], atividades = [], progressoAulas = [] }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [form, setForm] = useState({
    nome: '', rg: '', cpf: '', telefone: '', endereco: '', foto_url: ''
  });

  const startEditing = () => {
    setForm({
      nome: profile?.nome || '',
      rg: profile?.rg ? maskRG(profile.rg) : '',
      cpf: profile?.cpf ? maskCPF(profile.cpf) : '',
      telefone: profile?.telefone ? maskPhone(profile.telefone) : '',
      endereco: profile?.endereco || '',
      foto_url: profile?.foto_url || ''
    });
    setEditing(true);
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 5MB).');
      return;
    }
    setUploadingFoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `perfil/${profile.id}/foto_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('livros').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, foto_url: publicUrl }));
      toast.success('Foto carregada. Clique em Salvar para confirmar.');
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message || 'tente novamente'));
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    if (!form.nome.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nome: form.nome.trim(),
          rg: onlyDigits(form.rg) ? form.rg : null,
          cpf: onlyDigits(form.cpf) ? form.cpf : null,
          telefone: onlyDigits(form.telefone) ? form.telefone : null,
          endereco: form.endereco.trim() || null,
          foto_url: form.foto_url || null
        })
        .eq('id', profile.id);
      if (error) {
        if (error.code === '42703' || /column.*does not exist/i.test(error.message || '')) {
          toast.error('Funcionalidade temporariamente indisponível: execute a migration 20260906_add_rg_foto_users.sql no banco.');
          return;
        }
        throw error;
      }
      toast.success('Dados pessoais salvos!');
      setEditing(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'verifique as permissões'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadHistory = async () => {
    if (!profile) return;
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Cabeçalho
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Fatesa Casa do Saber', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Histórico do Aluno — Módulos Finalizados', 14, 26);
      doc.setDrawColor(0, 86, 179);
      doc.setLineWidth(0.8);
      doc.line(14, 30, 196, 30);

      // Dados pessoais
      let y = 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DADOS PESSOAIS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 7;
      const dados: [string, string][] = [
        ['Nome', profile.nome || '—'],
        ['CPF', profile.cpf ? maskCPF(profile.cpf) : '—'],
        ['RG', profile.rg ? maskRG(profile.rg) : '—'],
        ['Telefone/WhatsApp', profile.telefone ? maskPhone(profile.telefone) : '—'],
        ['E-mail', profile.email || '—'],
        ['Endereço', profile.endereco || '—'],
        ['Núcleo', profile.nucleo || profile.nucleos?.nome || '—']
      ];
      dados.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), 55, y);
        y += 6;
      });

      // Módulos finalizados
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('MÓDULOS FINALIZADOS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const finished: { curso: string; titulo: string; status: string; nota: string }[] = [];
      (courses || []).forEach((c: any) => {
        (c.livros || []).forEach((l: any) => {
          if (l.isFinished) {
            const stats = getBookStats(l, atividades, progressoAulas);
            const status = l.isDP ? 'D.P. (Dependência)' : (l.isApproved || stats.isApproved) ? 'Aprovado' : 'Concluído';
            finished.push({
              curso: c.nome,
              titulo: l.titulo,
              status,
              nota: stats.examGrade ? stats.examGrade.toFixed(1) : (l.nota != null ? Number(l.nota).toFixed(1) : '—')
            });
          }
        });
      });

      if (finished.length === 0) {
        doc.text('Nenhum módulo finalizado registrado até o momento.', 14, y);
        y += 6;
      } else {
        finished.forEach((m, i) => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${m.titulo}`, 14, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`${m.curso} • ${m.status} • Nota: ${m.nota}`, 20, y + 5);
          y += 11;
        });
      }

      // Rodapé
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Documento gerado pelo portal do aluno em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 14, 288);

      doc.save(`Historico_${(profile.nome || 'aluno').replace(/\s+/g, '_')}.pdf`);
      toast.success('Histórico em PDF gerado!');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err.message || 'tente novamente'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        borderTop: '3.5px solid #d4af37',
        borderRadius: '20px',
        padding: '1.75rem',
        boxShadow: '0 8px 24px rgba(0, 86, 179, 0.08), 0 0 10px rgba(0, 86, 179, 0.12)',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'rgba(0, 86, 179, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0056b3', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
            <User size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#003366' }}>Meus Dados Pessoais & Cadastrais</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#1e40af' }}>Consulte e mantenha suas informações acadêmicas sempre atualizadas.</p>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(0, 86, 179, 0.08)', color: '#0056b3', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
          Polo: {profile?.nucleos?.nome || 'Fatesa EAD'}
        </span>
      </div>

      <div className="gold-separator-line" style={{ marginBottom: '1.5rem' }} />

      {!editing ? (
        <>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '20px', overflow: 'hidden', border: '2px solid #d4af37', background: 'rgba(0, 86, 179, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(0, 86, 179, 0.15)' }}>
              {profile?.foto_url ? (
                <img src={profile.foto_url} alt="Foto do perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={46} color="#0056b3" />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem 1.25rem', fontSize: '0.9rem', flex: 1, minWidth: '240px' }}>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>Nome Completo</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.nome || '—'}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>CPF</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.cpf ? maskCPF(profile.cpf) : '—'}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>RG</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.rg ? maskRG(profile.rg) : '—'}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>Telefone / WhatsApp</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.telefone ? maskPhone(profile.telefone) : '—'}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>E-mail</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.email || '—'}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafd', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <span style={labelStyle}>Endereço Residencial</span>
                <strong style={{ color: '#003366', fontSize: '0.95rem' }}>{profile?.endereco || '—'}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={startEditing} style={{ width: 'auto', padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(0, 86, 179, 0.35)' }}>
              <Save size={18} color="#ffffff" /> <span style={{ color: '#ffffff' }}>Editar Dados</span>
            </button>
            <button className="btn btn-outline" onClick={handleDownloadHistory} disabled={generatingPdf} style={{ width: 'auto', padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#003366', borderColor: 'rgba(212, 175, 55, 0.45)', backgroundColor: '#f8fafd' }}>
              {generatingPdf ? <Loader2 size={18} className="spinner" /> : <Download size={18} color="#0056b3" />} Baixar Histórico em PDF
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '20px', overflow: 'hidden', border: '2px dashed #0056b3', background: 'rgba(0, 86, 179, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
              {form.foto_url ? (
                <img src={form.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={44} color="#0056b3" />
              )}
            </div>
            <div>
              <label className="btn btn-outline" style={{ width: 'auto', padding: '0.65rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#003366', borderColor: 'rgba(212, 175, 55, 0.45)', backgroundColor: '#f8fafd' }}>
                {uploadingFoto ? <Loader2 size={16} className="spinner" /> : <Camera size={16} color="#0056b3" />} {form.foto_url ? 'Trocar Foto' : 'Enviar Foto'}
                <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} disabled={uploadingFoto} />
              </label>
              <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: '0.5rem 0 0' }}>JPG ou PNG até 5MB — visível no seu cadastro.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Nome Completo *</label>
              <input style={inputStyle} value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Seu nome completo" />
            </div>
            <div>
              <label style={labelStyle}>RG</label>
              <input style={inputStyle} value={form.rg} onChange={e => setForm(p => ({ ...p, rg: maskRG(e.target.value) }))} placeholder="00.000.000-0" inputMode="numeric" />
            </div>
            <div>
              <label style={labelStyle}>CPF</label>
              <input style={inputStyle} value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" inputMode="numeric" />
            </div>
            <div>
              <label style={labelStyle}>Telefone / WhatsApp</label>
              <input style={inputStyle} value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" inputMode="numeric" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>E-mail (somente leitura)</label>
              <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#e2e8f0' }} value={profile?.email || ''} readOnly />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Endereço Residencial</label>
              <input style={inputStyle} value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade/UF" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setEditing(false)} disabled={saving} style={{ width: 'auto', padding: '0.75rem 1.5rem', color: '#003366', borderColor: 'rgba(212, 175, 55, 0.45)' }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(0, 86, 179, 0.35)' }}>
              {saving ? <Loader2 size={18} className="spinner" /> : <Save size={18} color="#ffffff" />} <span style={{ color: '#ffffff' }}>Salvar Dados</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalDataCard;
