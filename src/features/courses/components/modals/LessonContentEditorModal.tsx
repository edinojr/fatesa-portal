import React from 'react'
import { FileText, Trash2, Edit, Upload, Loader2, Plus } from 'lucide-react'

interface LessonContentEditorModalProps {
  editingLessonContent: any
  setEditingLessonContent: (val: any) => void
  lessonBlocks: any[]
  setLessonBlocks: (blocks: any[]) => void
  lessonMaterials: any[]
  setLessonMaterials: (materials: any[]) => void
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  showToast: (msg: string, type?: 'success' | 'error') => void
  fetchLessons: (bookId: string) => Promise<void>
  selectedBook: any
  normalizeFileName: (name: string) => string
}

const LessonContentEditorModal: React.FC<LessonContentEditorModalProps> = ({
  editingLessonContent,
  setEditingLessonContent,
  lessonBlocks,
  setLessonBlocks,
  lessonMaterials,
  setLessonMaterials,
  actionLoading,
  setActionLoading,
  supabase,
  showToast,
  fetchLessons,
  selectedBook,
  normalizeFileName
}) => {
  if (!editingLessonContent) return null;

  return (
    <div className="modal-overlay" onClick={() => setEditingLessonContent(null)}>
      <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem' }}>Editor de Conteúdo: {editingLessonContent.titulo}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Construa sua aula com textos e imagens.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setEditingLessonContent(null)}>Cancelar</button>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={async () => {
              setActionLoading('save-lesson-content');
              try {
                const { error } = await supabase.from('aulas').update({ 
                  conteudo: lessonBlocks,
                  materiais: lessonMaterials
                }).eq('id', editingLessonContent.id);
                if (error) throw error;
                showToast('Conteúdo da aula salvo com sucesso!');
                setEditingLessonContent(null);
                fetchLessons(selectedBook.id);
              } catch (err: any) {
                showToast('Erro ao salvar: ' + err.message, 'error');
              } finally {
                setActionLoading(null);
              }
            }} disabled={actionLoading === 'save-lesson-content'}>
              {actionLoading === 'save-lesson-content' ? <Loader2 className="spinner" /> : 'Salvar Aula'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '300px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', padding: '1.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
          {lessonBlocks.map((block, idx) => (
            <div key={idx} style={{ position: 'relative', padding: '1.5rem', background: 'var(--glass)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto' }} onClick={() => {
                  const newBlocks = [...lessonBlocks];
                  if (idx > 0) {
                    [newBlocks[idx], newBlocks[idx-1]] = [newBlocks[idx-1], newBlocks[idx]];
                    setLessonBlocks(newBlocks);
                  }
                }}>↑</button>
                <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto' }} onClick={() => {
                  const newBlocks = [...lessonBlocks];
                  if (idx < newBlocks.length - 1) {
                    [newBlocks[idx], newBlocks[idx+1]] = [newBlocks[idx+1], newBlocks[idx]];
                    setLessonBlocks(newBlocks);
                  }
                }}>↓</button>
                <button className="btn btn-outline" style={{ padding: '0.3rem', width: 'auto', color: 'var(--error)' }} onClick={() => setLessonBlocks(lessonBlocks.filter((_, i) => i !== idx))}><Trash2 size={14} /></button>
              </div>

              {block.type === 'text' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Bloco de Texto</label>
                  <textarea 
                    className="form-control" 
                    rows={6} 
                    value={block.content} 
                    placeholder="Digite o conteúdo da aula aqui..."
                    onChange={(e) => {
                      const newBlocks = [...lessonBlocks];
                      newBlocks[idx].content = e.target.value;
                      setLessonBlocks(newBlocks);
                    }}
                  ></textarea>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: 0, display: 'block' }}>Bloco de Imagem</label>
                  {block.content ? (
                    <div style={{ position: 'relative', width: 'fit-content' }}>
                      <img src={block.content} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                      <button className="btn btn-outline" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none' }} onClick={() => {
                        const newBlocks = [...lessonBlocks];
                        newBlocks[idx].content = '';
                        setLessonBlocks(newBlocks);
                      }}><Edit size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                      <input 
                        type="file" 
                        id={`img-upload-${idx}`} 
                        hidden 
                        accept="image/*" 
                        multiple
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          setActionLoading(`upload-block-${idx}`);
                          try {
                            const newBlocks = [...lessonBlocks];
                            
                            // Handle first file for the current block
                            const firstFile = files[0];
                            const firstSafeName = normalizeFileName(firstFile.name);
                            const firstPath = `lesson-elements/${Date.now()}_${firstSafeName}`;
                            const { error: firstError } = await supabase.storage.from('livros').upload(firstPath, firstFile);
                            if (firstError) throw firstError;
                            const { data: { publicUrl: firstUrl } } = supabase.storage.from('livros').getPublicUrl(firstPath);
                            newBlocks[idx].content = firstUrl;

                            // Handle subsequent files by adding new blocks
                            for (let i = 1; i < files.length; i++) {
                              const file = files[i];
                              const safeName = normalizeFileName(file.name);
                              const filePath = `lesson-elements/${Date.now()}_${safeName}`;
                              const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file);
                              if (uploadError) throw uploadError;
                              const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
                              newBlocks.push({ type: 'image', content: publicUrl });
                            }
                            
                            setLessonBlocks(newBlocks);
                            showToast(`${files.length} imagem(ns) enviada(s)!`);
                          } catch (err: any) {
                            showToast('Erro: ' + err.message, 'error');
                          } finally {
                            setActionLoading(null);
                          }
                        }} 
                      />
                      <label htmlFor={`img-upload-${idx}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        {actionLoading === `upload-block-${idx}` ? <Loader2 className="spinner" size={32} /> : (
                          <>
                            <Upload size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Clique para enviar imagem</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {lessonBlocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
              Sua aula está vazia. Comece adicionando um bloco de texto ou imagem abaixo.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <button className="btn btn-outline" style={{ width: 'auto', display: 'flex', gap: '0.75rem' }} onClick={() => setLessonBlocks([...lessonBlocks, { type: 'text', content: '' }])}>
            <FileText size={20} /> Adicionar Texto
          </button>
          <button className="btn btn-outline" style={{ width: 'auto', display: 'flex', gap: '0.75rem' }} onClick={() => setLessonBlocks([...lessonBlocks, { type: 'image', content: '' }])}>
            <Plus size={20} /> Adicionar Imagem
          </button>
        </div>

        <div style={{ marginTop: '3rem', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Upload size={20} /> Materiais da Aula (Downloads)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lessonMaterials.map((mat, mIdx) => (
              <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileText size={18} color="var(--primary)" />
                  <span>{mat.name}</span>
                </div>
                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', color: 'var(--error)' }} onClick={() => setLessonMaterials(lessonMaterials.filter((_, i) => i !== mIdx))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div style={{ marginTop: '1rem' }}>
              <input 
                type="file" 
                id="mat-upload" 
                hidden 
                multiple
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  setActionLoading('upload-material');
                  try {
                    const newMaterials = [...lessonMaterials];
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      const safeName = normalizeFileName(file.name);
                      const filePath = `materiais/${Date.now()}_${safeName}`;
                      const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file);
                      if (uploadError) throw uploadError;
                      const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
                      newMaterials.push({ name: file.name, url: publicUrl });
                    }
                    setLessonMaterials(newMaterials);
                    showToast(`${files.length} material(is) adicionado(s)!`);
                  } catch (err: any) {
                    showToast('Erro: ' + err.message, 'error');
                  } finally {
                    setActionLoading(null);
                  }
                }} 
              />
              <label htmlFor="mat-upload" className="btn btn-primary" style={{ width: 'auto', cursor: 'pointer' }}>
                {actionLoading === 'upload-material' ? <Loader2 className="spinner" /> : <><Upload size={18} /> Enviar Materiais (Multi-seleção)</>}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonContentEditorModal;
