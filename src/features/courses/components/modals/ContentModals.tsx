import React, { useState } from 'react'
import { Loader2, Eye, EyeOff, Upload, Award } from 'lucide-react'

interface AddTeacherModalProps {
  showAddTeacher: boolean
  setShowAddTeacher: (val: boolean) => void
  newTeacherEmail: string
  setNewTeacherEmail: (val: string) => void
  newTeacherNome: string
  setNewTeacherNome: (val: string) => void
  newTeacherPassword: string
  setNewTeacherPassword: (val: string) => void
  handleAddTeacher: (e: React.FormEvent) => Promise<void>
  actionLoading: string | null
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  showAddTeacher,
  setShowAddTeacher,
  newTeacherEmail,
  setNewTeacherEmail,
  newTeacherNome,
  setNewTeacherNome,
  newTeacherPassword,
  setNewTeacherPassword,
  handleAddTeacher,
  actionLoading
}) => {
  const [showPass, setShowPass] = useState(false);
  if (!showAddTeacher) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddTeacher(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Autorizar Novo Professor</h2>
        <form onSubmit={handleAddTeacher}>
          <div className="form-group">
            <label>Nome do Professor</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nome Completo"
              value={newTeacherNome}
              onChange={e => setNewTeacherNome(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>E-mail do Professor</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="professor@fatesa.edu"
              value={newTeacherEmail}
              onChange={e => setNewTeacherEmail(e.target.value)}
              required
            />
            <p className="field-hint">
              O e-mail será adicionado à lista de autorizados e a conta será criada imediatamente.
            </p>
          </div>
          <div className="form-group">
            <label>Senha para o Professor</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? "text" : "password"} 
                className="form-control" 
                placeholder="********"
                value={newTeacherPassword}
                onChange={e => setNewTeacherPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddTeacher(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-teacher'}>
              {actionLoading === 'add-teacher' ? <Loader2 className="spinner" /> : 'Autorizar E-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddCourseModalProps {
  showAddCourse: boolean
  setShowAddCourse: (val: boolean) => void
  actionLoading: string | null
  supabase: any
  fetchData: () => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  showAddCourse,
  setShowAddCourse,
  supabase,
  fetchData,
  showToast
}) => {
  if (!showAddCourse) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddCourse(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Criar Novo Curso</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const nome = (e.currentTarget.elements.namedItem('nome') as HTMLInputElement).value;
          const { error } = await supabase.from('cursos').insert({ nome });
          if (error) showToast(error.message, 'error');
          else {
            showToast('Curso criado!');
            setShowAddCourse(false);
            fetchData();
          }
        }}>
          <div className="form-group">
            <label>Nome do Curso</label>
            <input name="nome" type="text" className="form-control" required placeholder="Ex: Teologia Fundamental" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddCourse(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddBookModalProps {
  showAddBook: boolean
  setShowAddBook: (val: boolean) => void
  selectedCourse: any
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchBooks: (courseId: string) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  normalizeFileName: (name: string) => string
  books: any[]
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  showAddBook,
  setShowAddBook,
  selectedCourse,
  actionLoading,
  setActionLoading,
  supabase,
  fetchBooks,
  showToast,
  normalizeFileName,
  books
}) => {
  if (!showAddBook || !selectedCourse) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddBook(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Novo Módulo para {selectedCourse.nome}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const titulo = formData.get('titulo') as string;
          const ordem = parseInt(formData.get('ordem') as string);
          const ensino_tipo = formData.get('ensino_tipo') as string;
          const capaFile = formData.get('capa') as File | null;
          
          setActionLoading('add-book');
          try {
            let capa_url = null;

            if (capaFile && capaFile.size > 0) {
              const safeName = normalizeFileName(capaFile.name);
              const capaPath = `capas/${Date.now()}_${safeName}`;
              const { error: uploadError } = await supabase.storage.from('livros').upload(capaPath, capaFile, { cacheControl: 'max-age=31536000' });
              if (uploadError) throw uploadError;
              capa_url = supabase.storage.from('livros').getPublicUrl(capaPath).data.publicUrl;
            }

            const { error } = await supabase.from('livros').insert({ 
              curso_id: selectedCourse.id, 
              titulo, 
              ordem,
              ensino_tipo,
              capa_url
            });
            
            if (error) throw error;
            showToast('Módulo adicionado!');
            setShowAddBook(false);
            fetchBooks(selectedCourse.id);
          } catch (err: any) {
            showToast('Erro: ' + err.message, 'error');
          } finally {
            setActionLoading(null);
          }
        }}>
          <div className="form-group">
            <label>Título do Módulo</label>
            <input name="titulo" type="text" className="form-control" required placeholder="Ex: Módulo 1 - Introdução" />
          </div>

          <div className="form-group">
            <label>Modalidade de Ensino</label>
            <select name="ensino_tipo" className="form-control" required defaultValue="online">
              <option value="online">Online (Com Progressão)</option>
              <option value="presencial">Presencial (Lista de Conteúdos)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Ordem (Sequência)</label>
            <input name="ordem" type="number" className="form-control" defaultValue={books.length + 1} required />
          </div>
          <div className="form-group">
            <label>Capa do Módulo (Imagem Opcional)</label>
            <input name="capa" type="file" accept="image/*" className="form-control" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddBook(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-book'}>
              {actionLoading === 'add-book' ? <Loader2 className="spinner" /> : 'Criar Módulo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddLessonModalProps {
  showAddLesson: boolean
  setShowAddLesson: (val: boolean) => void
  selectedBook: any
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchLessons: (bookId: string) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  lessons: any[]
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({
  showAddLesson,
  setShowAddLesson,
  selectedBook,
  actionLoading,
  setActionLoading,
  supabase,
  fetchLessons,
  showToast,
  lessons
}) => {
  if (!showAddLesson || !selectedBook) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddLesson(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Nova Lição para {selectedBook.titulo}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Uma lição é um agrupamento de vídeos, atividades e materiais.</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const titulo = formData.get('titulo') as string;
          const ordem = parseInt(formData.get('ordem') as string);
          
          setActionLoading('add-lesson');
          const { error } = await supabase.from('aulas').insert({ 
            livro_id: selectedBook.id, 
            titulo, 
            tipo: 'licao',
            ordem: ordem,
            bloco_id: formData.get('bloco_id') ? parseInt(formData.get('bloco_id') as string) : null
          });
          
          if (error) showToast(error.message, 'error');
          else {
            showToast('Lição criada!');
            setShowAddLesson(false);
            fetchLessons(selectedBook.id);
          }
          setActionLoading(null);
        }}>
          <div className="form-group">
            <label>Título da Lição</label>
            <input name="titulo" type="text" className="form-control" required placeholder="Ex: Lição 01 - Anatomia Humana" />
          </div>
          <div className="form-group">
            <label>Ordem na Sequência</label>
            <input name="ordem" type="number" className="form-control" defaultValue={lessons.length + 1} required />
          </div>
          <div className="form-group">
            <label>Bloco ID (Opcional)</label>
            <input name="bloco_id" type="number" className="form-control" placeholder="Ex: 1" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddLesson(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-lesson'}>
              {actionLoading === 'add-lesson' ? <Loader2 className="spinner" /> : 'Criar Lição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddContentModalProps {
  showAddContent: boolean
  setShowAddContent: (val: boolean) => void
  selectedLesson: any
  addingLessonType: string
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchLessonItems: (lessonId: string) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  lessonItems: any[]
  addingBloco: number | null
  normalizeFileName: (name: string) => string
}

export const AddContentModal: React.FC<AddContentModalProps> = ({
  showAddContent,
  setShowAddContent,
  selectedLesson,
  addingLessonType,
  actionLoading,
  setActionLoading,
  supabase,
  fetchLessonItems,
  showToast,
  lessonItems,
  addingBloco,
  normalizeFileName
}) => {
  if (!showAddContent || !selectedLesson) return null;
  
  return (
    <div className="modal-overlay" onClick={() => setShowAddContent(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Novo Item ({addingLessonType === 'gravada' ? 'Vídeo' : addingLessonType === 'atividade' ? 'Atividade' : addingLessonType === 'prova' ? 'Prova' : 'Material'})</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const titulo = formData.get('titulo') as string;
          const video_url = formData.get('video_url') as string || null;
          const min_grade = formData.get('min_grade') ? parseFloat(formData.get('min_grade') as string) : 0;
          const ordem = parseInt(formData.get('ordem') as string);
          
          setActionLoading('add-content');
          
          try {
            const isFinalAssessment = (addingLessonType === 'prova' || (addingLessonType === 'atividade' && formData.get('is_bloco_final') === 'on'));

            if (addingLessonType === 'material') {
              const files = (e.currentTarget.querySelector('input[name="files"]') as HTMLInputElement)?.files;
              if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  const safeName = normalizeFileName(file.name);
                  const filePath = `materiais/${Date.now()}_${safeName}`;
                  const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file, { cacheControl: 'max-age=31536000' });
                  if (uploadError) throw uploadError;
                  const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
                  
                  // For multiple upload, we ignore complex quiz templates
                  const { error: insertError } = await supabase.from('aulas').insert({
                    livro_id: selectedLesson.livro_id,
                    parent_aula_id: selectedLesson.id,
                    titulo: files.length > 1 ? `${titulo} - ${file.name}` : titulo,
                    tipo: 'material',
                    arquivo_url: publicUrl,
                    ordem: ordem + i,
                    bloco_id: addingBloco
                  });
                  if (insertError) throw insertError;
                }
                showToast(`${files.length} materiais adicionados!`);
                setShowAddContent(false);
                fetchLessonItems(selectedLesson.id);
                return; // Stop here for material multiple
              }
            }

            const file = (e.currentTarget.querySelector('input[name="file"]') as HTMLInputElement)?.files?.[0];
            let arquivo_url = null;

            if (file && (addingLessonType === 'material' || addingLessonType === 'gravada' || addingLessonType === 'ao_vivo')) {
              const safeName = normalizeFileName(file.name);
              const filePath = `conteudo/${Date.now()}_${safeName}`;
              const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file, { cacheControl: 'max-age=31536000' });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
              arquivo_url = publicUrl;
            }

            const standardTemplate = [
              ...Array(10).fill(null).map((_, i) => ({ id: `tf-${Date.now()}-${i}`, type: 'true_false', text: '', isTrue: true })),
              ...Array(2).fill(null).map((_, i) => ({ id: `dis-${Date.now()}-${i}`, type: 'discursive', text: '' })),
              ...Array(2).fill(null).map((_, i) => ({ id: `mc-${Date.now()}-${i}`, type: 'multiple_choice', text: '', options: ['', '', '', ''], correct: 0 })),
              { 
                id: `mat-${Date.now()}`, 
                type: 'matching', 
                text: 'Relacione as colunas abaixo:', 
                matchingPairs: Array(6).fill(null).map(() => ({left: '', right: ''}))
              }
            ];

            if (addingLessonType === 'prova') {
              const examRows = [
                {
                  livro_id: selectedLesson.livro_id,
                  parent_aula_id: selectedLesson.id,
                  titulo: `${titulo}`,
                  tipo: 'prova',
                  video_url: null,
                  arquivo_url: null,
                  min_grade: min_grade || 7,
                  ordem: ordem,
                  bloco_id: addingBloco,
                  versao: 1,
                  is_bloco_final: true,
                  questionario: standardTemplate
                },
                {
                  livro_id: selectedLesson.livro_id,
                  parent_aula_id: selectedLesson.id,
                  titulo: `${titulo} - Recuperação`,
                  tipo: 'prova',
                  video_url: null,
                  arquivo_url: null,
                  min_grade: min_grade || 7,
                  ordem: ordem + 1,
                  bloco_id: addingBloco,
                  versao: 2,
                  is_bloco_final: true,
                  questionario: standardTemplate
                },
                {
                  livro_id: selectedLesson.livro_id,
                  parent_aula_id: selectedLesson.id,
                  titulo: `${titulo} - Recuperação 2`,
                  tipo: 'prova',
                  video_url: null,
                  arquivo_url: null,
                  min_grade: min_grade || 7,
                  ordem: ordem + 2,
                  bloco_id: addingBloco,
                  versao: 3,
                  is_bloco_final: true,
                  questionario: standardTemplate
                }
              ];

              const { error } = await supabase.from('aulas').insert(examRows);
              if (error) throw error;
            } else {
              const initialQuiz = (addingLessonType === 'atividade') ? standardTemplate : [];

              const { error } = await supabase.from('aulas').insert({ 
                livro_id: selectedLesson.livro_id,
                parent_aula_id: selectedLesson.id,
                titulo, 
                tipo: addingLessonType,
                video_url,
                arquivo_url,
                min_grade,
                ordem,
                bloco_id: addingBloco,
                versao: formData.get('versao') ? parseInt(formData.get('versao') as string) : 1,
                is_bloco_final: isFinalAssessment,
                questionario: initialQuiz
              });
              if (error) throw error;
            }
            
            showToast('Sucesso!');
            setShowAddContent(false);
            fetchLessonItems(selectedLesson.id);
          } catch (err: any) {
            showToast(err.message, 'error');
          } finally {
            setActionLoading(null);
          }
        }}>
          <div className="form-group">
            <label>Título</label>
            <input name="titulo" type="text" className="form-control" required />
          </div>

          {(addingLessonType === 'gravada' || addingLessonType === 'ao_vivo') && (
            <div className="form-group">
              <label>Vídeo URL</label>
              <input name="video_url" type="text" className="form-control" placeholder="YouTube/Vimeo link" />
            </div>
          )}
          
          {addingLessonType !== 'atividade' && addingLessonType !== 'prova' && (
            <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={16} /> {addingLessonType === 'material' ? 'Arquivo PDF' : 'Anexo (Opcional)'}
              </label>
              <input name={addingLessonType === 'material' ? "files" : "file"} type="file" className="form-control" accept=".pdf" multiple={addingLessonType === 'material'} required={addingLessonType === 'material'} />
            </div>
          )}

          {addingLessonType === 'material' ? (
            <div className="form-group" style={{ background: 'rgba(var(--primary-rgb), 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Upload size={18} color="var(--primary)" /> Selecionar Arquivos PDF (Múltiplos)
              </label>
              <input name="files" type="file" className="form-control" accept=".pdf" multiple required style={{ marginTop: '0.75rem' }} />
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  <strong>Atenção:</strong> Cada arquivo selecionado será criado como um item individual.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  O título acima será usado como prefixo para cada arquivo.
                </p>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Arquivo Complementar (Opcional)</label>
              <input name="file" type="file" className="form-control" accept=".pdf" />
            </div>
          )}

          {(addingLessonType === 'prova' || addingLessonType === 'atividade') && (
            <>
              {addingLessonType === 'prova' ? (
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Award color="#EAB308" />
                      <strong style={{ color: '#EAB308' }}>Avaliação Final (V1, V2 e V3 Inclusas)</strong>
                   </div>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                     Esta prova possui apenas 1 versão e as recuperações (V2 e V3) são tratadas automaticamente pelo sistema.
                   </p>
                   <div className="form-group">
                      <label>Nota Mínima para Aprovação (0-10)</label>
                      <input name="min_grade" type="number" step="0.5" className="form-control" defaultValue={7} min={0} max={10} required />
                   </div>
                   <input type="hidden" name="is_bloco_final" value="on" />
                </div>
              ) : (
                <>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                    <input name="is_bloco_final" type="checkbox" id="is_bloco_final_add" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="is_bloco_final_add" style={{ margin: 0, cursor: 'pointer' }}>Avaliação Final do Bloco (Liberação Automática)</label>
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label>Ordem</label>
            <input name="ordem" type="number" className="form-control" defaultValue={lessonItems.length + 1} required />
          </div>

          <div className="form-group">
            <label>Bloco ID (Opcional)</label>
            <input name="bloco_id" type="number" className="form-control" defaultValue={addingBloco || ''} placeholder="Ex: 1" />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddContent(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-content'}>
              {actionLoading === 'add-content' ? <Loader2 className="spinner" /> : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditItemModalProps {
  editingItem: { type: 'course' | 'book' | 'lesson' | 'content', data: any } | null
  setEditingItem: (val: any) => void
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchData: () => Promise<void>
  fetchBooks: (courseId: string) => Promise<void>
  fetchLessons: (bookId: string) => Promise<void>
  fetchLessonItems: (lessonId: string) => Promise<void>
  selectedCourse: any
  selectedBook: any
  selectedLesson: any
  showToast: (msg: string, type?: 'success' | 'error') => void
  lessons: any[]
  normalizeFileName?: (name: string) => string
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  editingItem,
  setEditingItem,
  actionLoading,
  setActionLoading,
  supabase,
  fetchData,
  fetchBooks,
  fetchLessons,
  fetchLessonItems,
  selectedCourse,
  selectedBook,
  selectedLesson,
  showToast,
  normalizeFileName
}) => {
  if (!editingItem) return null;
  return (
    <div className="modal-overlay" onClick={() => setEditingItem(null)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Editar {editingItem.type === 'course' ? 'Curso' : editingItem.type === 'book' ? 'Módulo' : editingItem.type === 'lesson' ? 'Lição' : 'Item de Conteúdo'}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const fileInput = e.currentTarget.querySelector('input[name="file"]') as HTMLInputElement;
          const table = editingItem.type === 'course' ? 'cursos' : editingItem.type === 'book' ? 'livros' : 'aulas';
          
          const updates: any = {};
          if (editingItem.type === 'course') {
            updates.nome = formData.get('nome') as string;
          } else {
            updates.titulo = formData.get('titulo') as string;
          }

          if (editingItem.type === 'book') {
            updates.ordem = parseInt(formData.get('ordem') as string);
            updates.ensino_tipo = formData.get('ensino_tipo') as string;
          }

          if (editingItem.type === 'lesson' || editingItem.type === 'content') {
            updates.ordem = parseInt(formData.get('ordem') as string);
            updates.bloco_id = formData.get('bloco_id') ? parseInt(formData.get('bloco_id') as string) : null;
            if (editingItem.type === 'content') {
              updates.video_url = formData.get('video_url') as string || null;
              if (editingItem.data.tipo === 'prova') {
                updates.min_grade = parseFloat(formData.get('min_grade') as string) || 7;
                updates.versao = parseInt(formData.get('versao') as string) || 1;
                updates.is_bloco_final = formData.get('is_bloco_final') === 'on';
              }
            }
          }

          setActionLoading('edit-item');
          try {
            if (editingItem.type === 'book') {
              const capaFile = formData.get('capa') as File | null;
              if (capaFile && capaFile.size > 0 && normalizeFileName) {
                const safeName = normalizeFileName(capaFile.name);
                const capaPath = `capas/${Date.now()}_${safeName}`;
                const { error: uploadError } = await supabase.storage.from('livros').upload(capaPath, capaFile, { cacheControl: 'max-age=31536000' });
                if (uploadError) throw uploadError;
                updates.capa_url = supabase.storage.from('livros').getPublicUrl(capaPath).data.publicUrl;
              }
            }

            const file = fileInput?.files?.[0];
            if (file) {
              const safeName = normalizeFileName ? normalizeFileName(file.name) : file.name;
              const filePath = `conteudo/${Date.now()}_${safeName}`;
              const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file, { cacheControl: 'max-age=31536000' });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
              updates.arquivo_url = publicUrl;
            }

            const { error } = await supabase.from(table).update(updates).eq('id', editingItem.data.id);
            
            if (error) throw error;
            showToast('Atualizado com sucesso!');
            setEditingItem(null);
            if (editingItem.type === 'course') fetchData();
            else if (editingItem.type === 'book') fetchBooks(selectedCourse.id);
            else if (editingItem.type === 'lesson') fetchLessons(selectedBook.id);
            else if (editingItem.type === 'content') fetchLessonItems(selectedLesson.id);
          } catch (err: any) {
            showToast(err.message, 'error');
          } finally {
            setActionLoading(null);
          }
        }}>
          <div className="form-group">
            <label>Título / Nome</label>
            <input name={editingItem.type === 'course' ? 'nome' : 'titulo'} type="text" className="form-control" defaultValue={editingItem.type === 'course' ? editingItem.data.nome : editingItem.data.titulo} required />
          </div>
          
          {editingItem.type === 'book' && (
            <div className="form-group">
              <label>Modalidade de Ensino</label>
              <select name="ensino_tipo" className="form-control" defaultValue={editingItem.data.ensino_tipo || 'online'}>
                <option value="online">Online (Com Progressão)</option>
                <option value="presencial">Presencial (Lista de Conteúdos)</option>
              </select>
            </div>
          )}

          {editingItem.type === 'book' && (
            <div className="form-group">
              <label>Capa do Módulo (Imagem)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {editingItem.data.capa_url && (
                  <img src={editingItem.data.capa_url} alt="Capa atual" style={{ width: '60px', height: '85px', objectFit: 'cover', borderRadius: '8px' }} />
                )}
                <input name="capa" type="file" accept="image/*" className="form-control" />
              </div>
            </div>
          )}

          {(editingItem.type === 'book' || editingItem.type === 'lesson' || editingItem.type === 'content') && (
            <div className="form-group">
              <label>Ordem / Sequência</label>
              <input name="ordem" type="number" className="form-control" defaultValue={editingItem.data.ordem || 1} required />
            </div>
          )}

          {(editingItem.type === 'lesson' || editingItem.type === 'content') && (
            <div className="form-group">
              <label>Bloco ID</label>
              <input name="bloco_id" type="number" className="form-control" defaultValue={editingItem.data.bloco_id || ''} placeholder="Ex: 1" />
            </div>
          )}

          {editingItem.type === 'content' && (
            <>
              {(editingItem.data.tipo === 'gravada' || editingItem.data.tipo === 'ao_vivo') && (
                <div className="form-group">
                  <label>Vídeo URL</label>
                  <input name="video_url" type="text" className="form-control" defaultValue={editingItem.data.video_url || ''} />
                </div>
              )}
              {(editingItem.data.tipo === 'prova' || editingItem.data.tipo === 'atividade') && (
                <>
                  {editingItem.data.tipo === 'prova' && (
                    <>
                      <div className="form-group">
                        <label>Versão da Avaliação</label>
                        <select name="versao" className="form-control" defaultValue={editingItem.data.versao || 1} required>
                          <option value={1}>Versão 1 (1ª Oportunidade)</option>
                          <option value={2}>Versão 2 (2ª Oportunidade)</option>
                          <option value={3}>Versão 3 (3ª Oportunidade)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Nota Mínima</label>
                        <input name="min_grade" type="number" step="0.5" className="form-control" defaultValue={editingItem.data.min_grade || 7} min={0} max={10} required />
                      </div>
                    </>
                  )}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                    <input name="is_bloco_final" type="checkbox" id="is_bloco_final_edit" defaultChecked={editingItem.data.is_bloco_final} style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="is_bloco_final_edit" style={{ margin: 0, cursor: 'pointer' }}>Avaliação Final do Bloco (Liberação Automática)</label>
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Arquivo Complementar (PDF)</label>
                <input name="file" type="file" className="form-control" accept=".pdf" />
                {editingItem.data.arquivo_url && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.5rem' }}>✓ Arquivo já vinculado</p>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditingItem(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'edit-item'}>
              {actionLoading === 'edit-item' ? <Loader2 className="spinner" /> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddAdminModalProps {
  showAddAdmin: boolean
  setShowAddAdmin: (val: boolean) => void
  actionLoading: string | null
  handleAddAdmin: (e: React.FormEvent) => Promise<void>
  availableNucleos: any[]
}

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  showAddAdmin,
  setShowAddAdmin,
  actionLoading,
  handleAddAdmin,
  availableNucleos
}) => {
  const [showPassword, setShowPassword] = useState(false);
  if (!showAddAdmin) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAddAdmin(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Adicionar Novo Usuário</h2>
        <form onSubmit={handleAddAdmin}>
          <div className="form-group">
            <label>Tipo de Usuário</label>
            <select name="tipo" className="form-control" required defaultValue="aluno">
              <option value="aluno">Aluno (Online/Presencial)</option>
              <option value="super_visitante">Super Visitante</option>
              <option value="ex_aluno">Formado</option>
              <option value="colaborador">Colaborador</option>
              <option value="professor">Professor</option>
              <option value="admin">Administrador</option>
              <option value="suporte">Suporte</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nome Completo</label>
            <input name="nome" type="text" className="form-control" required placeholder="João Silva" />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input name="email" type="email" className="form-control" required placeholder="admin@fatesa.edu" />
          </div>
          <div className="form-group">
            <label>Núcleo (Polo/Ponto)</label>
            <select name="nucleo_id" className="form-control">
              <option value="">Nenhum / Global</option>
              {availableNucleos.map(n => (
                <option key={n.id} value={n.id}>{n.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Senha</label>
            <div className="password-field" style={{ position: 'relative' }}>
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                required 
                placeholder="********"
                style={{ paddingRight: '3rem' }}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            O usuário será criado imediatamente e poderá acessar a plataforma com estas credenciais.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddAdmin(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-admin'}>
              {actionLoading === 'add-admin' ? <Loader2 className="spinner" /> : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
