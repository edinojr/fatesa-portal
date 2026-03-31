import { Plus, Users, Loader2, Trash2, MapPin } from 'lucide-react';
import React from 'react';

interface AddNucleoModalProps {
  onClose: () => void;
  isAdmin: boolean;
  showCreateForm: boolean;
  setShowCreateForm: (val: boolean) => void;
  handleLinkProfessorToNucleo: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCreateNucleo: (e: React.FormEvent<HTMLFormElement>) => void;
  handleLinkNucleo: (id: string) => void;
  professors: any[];
  nucleos: any[];
  actionLoading: string | null;
  // Schedule state and handlers
  schedules: { day: string; start: string; end: string }[];
  addSchedule: () => void;
  removeSchedule: (index: number) => void;
  updateSchedule: (index: number, field: string, value: string) => void;
  // CEP logic
  cepLoading: boolean;
  handleCepBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  // Edit mode
  initialData?: any;
}

const AddNucleoModal: React.FC<AddNucleoModalProps> = ({
  onClose,
  isAdmin,
  showCreateForm,
  setShowCreateForm,
  handleLinkProfessorToNucleo,
  handleCreateNucleo,
  handleLinkNucleo,
  professors,
  nucleos,
  actionLoading,
  schedules,
  addSchedule,
  removeSchedule,
  updateSchedule,
  cepLoading,
  handleCepBlur,
  initialData
}) => {
  const isEditing = !!initialData;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>
            {isEditing ? `Editar Núcleo: ${initialData.nome}` : (isAdmin ? 'Gerenciar Núcleos' : 'Adicionar Núcleo')}
          </h2>
          <button className="btn-icon" onClick={onClose}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
        </div>
        
        {isAdmin && !isEditing && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              className={`btn ${showCreateForm ? 'btn-primary' : 'btn-outline'}`} 
              onClick={() => setShowCreateForm(true)}
              style={{ flex: 1 }}
            >
              <Plus size={18} /> Criar Novo Núcleo
            </button>
            <button 
              className={`btn ${!showCreateForm ? 'btn-primary' : 'btn-outline'}`} 
              onClick={() => setShowCreateForm(false)}
              style={{ flex: 1 }}
            >
              <Users size={18} /> Vincular Professor
            </button>
          </div>
        )}

        {(isAdmin || isEditing) && !showCreateForm && !isEditing ? (
          <form onSubmit={handleLinkProfessorToNucleo} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Selecione um professor e um núcleo para criar o vínculo.</p>
            <div className="form-group">
              <label>Professor</label>
              <select name="professor_id" className="form-control" required>
                <option value="">-- Selecione o Professor --</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Núcleo</label>
              <select name="nucleo_id" className="form-control" required>
                <option value="">-- Selecione o Núcleo --</option>
                {nucleos.map(n => (
                  <option key={n.id} value={n.id}>{n.nome}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'link_prof'}>
              {actionLoading === 'link_prof' ? <Loader2 className="spinner" size={20} /> : 'Efetuar Vínculo'}
            </button>
          </form>
        ) : (
          <>
            {!isAdmin && !isEditing && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Vincule-se a um núcleo existente</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="nuc_select_modal" className="form-control" style={{ flex: 1 }}>
                    {nucleos.length === 0 && <option value="">Nenhum núcleo encontrado...</option>}
                    {nucleos.map(n => (
                      <option key={n.id} value={n.id}>{n.nome} {n.cidade ? `(${n.cidade})` : ''}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: 'auto' }}
                    disabled={actionLoading === 'link_nuc'}
                    onClick={() => {
                      const sel = document.getElementById('nuc_select_modal') as HTMLSelectElement;
                      if(sel.value) handleLinkNucleo(sel.value);
                    }}
                  >
                    {actionLoading === 'link_nuc' ? <Loader2 className="spinner" size={18} /> : 'Vincular a Mim'}
                  </button>
                </div>
              </div>
            )}

            {!isEditing && (
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} /> {isAdmin ? 'Ou crie um NOVO Núcleo' : 'Ou cadastre um NOVO Núcleo/Pólo'}
              </h4>
            )}
            <form onSubmit={handleCreateNucleo} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* LINHA 1: NOME DO NÚCLEO */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Nome do Núcleo *</label>
                <input type="text" name="nome" defaultValue={initialData?.nome} placeholder="Ex: Pólo Presencial - Vila Luzita" className="form-control" style={{ padding: '0.8rem' }} required />
              </div>

              {/* LINHA 2: PROFESSOR RESPONSÁVEL (OPCIONAL) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Professor Responsável (Opcional)</label>
                <input type="text" name="professor_responsavel" defaultValue={initialData?.professor_responsavel} placeholder="Ex: Pr. João" className="form-control" style={{ padding: '0.8rem' }} />
              </div>

              {/* LINHA 3: CRONOGRAMA DE AULAS */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Cronograma de Aulas (Dias e Horários)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {schedules.map((sch, index) => (
                    <div key={index} className="mobile-wrap-flex" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <select 
                          className="form-control" 
                          style={{ width: '100%', padding: '0.6rem' }} 
                          value={sch.day} 
                          onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                        >
                          <option value="">-- Escolha o Dia --</option>
                          <option value="Segunda">Segunda-feira</option>
                          <option value="Terça">Terça-feira</option>
                          <option value="Quarta">Quarta-feira</option>
                          <option value="Quinta">Quinta-feira</option>
                          <option value="Sexta">Sexta-feira</option>
                          <option value="Sábado">Sábado</option>
                          <option value="Domingo">Domingo</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 3 }}>
                        <input 
                          type="text" 
                          placeholder="Início (00:00)" 
                          className="form-control" 
                          style={{ flex: 1, textAlign: 'center', padding: '0.6rem' }} 
                          value={sch.start} 
                          onChange={(e) => updateSchedule(index, 'start', e.target.value)} 
                        />
                        <span style={{ opacity: 0.5 }}>até</span>
                        <input 
                          type="text" 
                          placeholder="Fim (00:00)" 
                          className="form-control" 
                          style={{ flex: 1, textAlign: 'center', padding: '0.6rem' }} 
                          value={sch.end} 
                          onChange={(e) => updateSchedule(index, 'end', e.target.value)} 
                        />
                      </div>
                      {schedules.length > 1 && (
                        <button type="button" className="btn-icon" style={{ color: 'var(--error)', padding: '0.5rem' }} onClick={() => removeSchedule(index)} title="Remover este horário">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ width: 'auto', fontSize: '0.85rem', padding: '0.5rem 1rem', marginTop: '0.5rem', alignSelf: 'flex-start' }}
                    onClick={addSchedule}
                  >
                    <Plus size={16} /> Adicionar outro dia/horário
                  </button>
                </div>
              </div>

              {/* LINHA 4: LOCALIZAÇÃO (VIA CEP) */}
              <div style={{ padding: '1.25rem', background: 'rgba(3, 169, 244, 0.03)', borderRadius: '12px', border: '1px solid rgba(3, 169, 244, 0.1)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} /> Endereço do Núcleo
                </h4>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.3rem', display: 'block' }}>CEP (Para busca automática) *</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      name="cep" 
                      defaultValue={initialData?.cep}
                      placeholder="00000-000" 
                      className="form-control" 
                      style={{ maxWidth: '150px', padding: '0.7rem' }}
                      maxLength={9}
                      onBlur={handleCepBlur}
                      required 
                    />
                    {cepLoading && <Loader2 className="spinner" size={20} color="var(--primary)" />}
                    {!isEditing && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>← Preencha para carregar</span>}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>Logradouro / Avenida / Rua</label>
                  <input type="text" name="logradouro" id="form_logradouro" defaultValue={initialData?.logradouro} placeholder="Avenida Brasil..." className="form-control" required style={{ padding: '0.7rem' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }} className="mobile-wrap-flex">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>Número *</label>
                    <input type="text" name="numero" id="form_numero" defaultValue={initialData?.numero} placeholder="Ex: 500" className="form-control" required style={{ padding: '0.7rem' }} />
                  </div>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>Bairro</label>
                    <input type="text" name="bairro" id="form_bairro" defaultValue={initialData?.bairro} placeholder="Nome do Bairro" className="form-control" required style={{ padding: '0.7rem' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }} className="mobile-wrap-flex">
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>Cidade</label>
                    <input type="text" name="cidade" id="form_cidade" defaultValue={initialData?.cidade} className="form-control" required style={{ padding: '0.7rem' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>UF / Estado</label>
                    <input type="text" name="estado" id="form_estado" defaultValue={initialData?.estado} className="form-control" maxLength={2} required style={{ padding: '0.7rem', textAlign: 'center' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem 1.25rem' }} onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 2rem', fontSize: '0.95rem', fontWeight: 700 }} disabled={actionLoading === 'create_nuc'}>
                  {actionLoading === 'create_nuc' ? <Loader2 className="spinner" size={18} /> : (isEditing ? 'Atualizar Dados' : 'Criar Núcleo')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddNucleoModal;
