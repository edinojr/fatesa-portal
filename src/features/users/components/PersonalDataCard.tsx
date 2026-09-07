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
  padding: '0.8rem 1rem',
  borderRadius: '12px',
  border: '1px solid var(--glass-border)',
  background: 'rgba(255,255,255,0.03)',
  color: 'var(--text-main)',
  fontSize: '0.95rem',
  fontWeight: 600
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem'
};

const PersonalDataCard: React.FC<PersonalDataCardProps> = ({ profile, onRefresh, courses = [], atividades = [], progressoAulas = [] }) => {
  const [open, setOpen] = useState(false);
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
    <>
      <div className="admin-action-card" onClick={() => setOpen(true)}>
        <div className="icon-wrapper"><User size={32} /></div>
        <h3>Dados Pessoais</h3>
        <p>Atualize seu cadastro: RG, CPF, telefone, endereço e foto.</p>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}><User size={24} color="var(--primary)" /> Dados Pessoais</h2>
              <button className="btn-icon" onClick={() => setOpen(false)}><X size={20} /></button>
            </div>

            {!editing ? (
              <>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ width: '88px', height: '88px', borderRadius: '20px', overflow: 'hidden', border: '2px solid var(--glass-border)', background: 'rgba(var(--primary-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {profile?.foto_url ? (
                      <img src={profile.foto_url} alt="Foto do perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={36} color="var(--primary)" opacity={0.5} />
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem', fontSize: '0.9rem', flex: 1, minWidth: '250px' }}>
                    <strong>Nome:</strong><span>{profile?.nome || '—'}</span>
                    <strong>RG:</strong><span>{profile?.rg ? maskRG(profile.rg) : '—'}</span>
                    <strong>CPF:</strong><span>{profile?.cpf ? maskCPF(profile.cpf) : '—'}</span>
                    <strong>Telefone:</strong><span>{profile?.telefone ? maskPhone(profile.telefone) : '—'}</span>
                    <strong>E-mail:</strong><span>{profile?.email || '—'}</span>
                    <strong>Endereço:</strong><span>{profile?.endereco || '—'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={startEditing} style={{ width: 'auto', padding: '0.9rem 2rem' }}>
                    <Save size={18} /> Editar Dados
                  </button>
                  <button className="btn btn-outline" onClick={handleDownloadHistory} disabled={generatingPdf} style={{ width: 'auto', padding: '0.9rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {generatingPdf ? <Loader2 size={18} className="spinner" /> : <Download size={18} />} Baixar Histórico em PDF
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ width: '88px', height: '88px', borderRadius: '20px', overflow: 'hidden', border: '2px dashed var(--primary)', background: 'rgba(var(--primary-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                    {form.foto_url ? (
                      <img src={form.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={36} color="var(--primary)" opacity={0.5} />
                    )}
                  </div>
                  <div>
                    <label className="btn btn-outline" style={{ width: 'auto', padding: '0.7rem 1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {uploadingFoto ? <Loader2 size={16} className="spinner" /> : <Camera size={16} />} {form.foto_url ? 'Trocar Foto' : 'Enviar Foto'}
                      <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} disabled={uploadingFoto} />
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>JPG/PNG até 5MB — fica visível no seu perfil.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
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
                    <label style={labelStyle}>E-mail (identidade da conta — somente leitura)</label>
                    <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} value={profile?.email || ''} readOnly />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Endereço</label>
                    <input style={inputStyle} value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade/UF" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                  <button className="btn btn-outline" onClick={() => setEditing(false)} disabled={saving} style={{ width: 'auto', padding: '0.8rem 1.5rem' }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {saving ? <Loader2 size={18} className="spinner" /> : <Save size={18} />} Salvar Dados
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PersonalDataCard;
