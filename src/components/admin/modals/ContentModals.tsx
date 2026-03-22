import React, { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

interface AddTeacherModalProps {
  showAddTeacher: boolean
  setShowAddTeacher: (val: boolean) => void
  newTeacherEmail: string
  setNewTeacherEmail: (val: string) => void
  handleAddTeacher: (e: React.FormEvent) => Promise<void>
  actionLoading: string | null
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  showAddTeacher,
  setShowAddTeacher,
  newTeacherEmail,
  setNewTeacherEmail,
  handleAddTeacher,
  actionLoading
}) => {
  if (!showAddTeacher) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddTeacher(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Autorizar Novo Professor</h2>
        <form onSubmit={handleAddTeacher}>
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
              O e-mail será adicionado à lista de autorizados. O professor deve realizar o cadastro via "Ativar Acesso" na página de login.
            </p>
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
  actionLoading,
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
            <button type="submit" className="btn btn-primary">Criar Curso</button>
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
        <h2 style={{ marginBottom: '1.5rem' }}>Novo Livro para {selectedCourse.nome}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const titulo = formData.get('titulo') as string;
          const ordem = parseInt(formData.get('ordem') as string);
          const capaFile = formData.get('capa') as File | null;
          const pdfFile = formData.get('pdf') as File | null;
          
          setActionLoading('add-book');
          try {
            let capa_url = null;
            let pdf_url = null;

            if (capaFile && capaFile.size > 0) {
              const safeName = normalizeFileName(capaFile.name);
              const capaPath = `capas/${Date.now()}_${safeName}`;
              const { error: uploadError } = await supabase.storage.from('livros').upload(capaPath, capaFile);
              if (uploadError) throw uploadError;
              capa_url = supabase.storage.from('livros').getPublicUrl(capaPath).data.publicUrl;
            }

            if (pdfFile && pdfFile.size > 0) {
              const safeName = normalizeFileName(pdfFile.name);
              const pdfPath = `pdfs/${Date.now()}_${safeName}`;
              const { error: uploadError } = await supabase.storage.from('livros').upload(pdfPath, pdfFile);
              if (uploadError) throw uploadError;
              pdf_url = supabase.storage.from('livros').getPublicUrl(pdfPath).data.publicUrl;
            }

            const { error } = await supabase.from('livros').insert({ 
              curso_id: selectedCourse.id, 
              titulo, 
              ordem,
              capa_url,
              pdf_url
            });
            
            if (error) throw error;
            showToast('Livro adicionado!');
            setShowAddBook(false);
            fetchBooks(selectedCourse.id);
          } catch (err: any) {
            showToast('Erro: ' + err.message, 'error');
          } finally {
            setActionLoading(null);
          }
        }}>
          <div className="form-group">
            <label>Título do Livro</label>
            <input name="titulo" type="text" className="form-control" required />
          </div>
          <div className="form-group">
            <label>Ordem (Sequência)</label>
            <input name="ordem" type="number" className="form-control" defaultValue={books.length + 1} required />
          </div>
          <div className="form-group">
            <label>Capa do Livro (Imagem)</label>
            <input name="capa" type="file" accept="image/*" className="form-control" />
          </div>
          <div className="form-group">
            <label>Arquivo do Livro (PDF ou EPUB)</label>
            <input name="pdf" type="file" accept=".pdf,.epub" className="form-control" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddBook(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-book'}>
              {actionLoading === 'add-book' ? <Loader2 className="spinner" /> : 'Criar Livro'}
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
  addingLessonType: string
  setAddingLessonType: (val: string) => void
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchLessons: (bookId: string) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({
  showAddLesson,
  setShowAddLesson,
  selectedBook,
  addingLessonType,
  setAddingLessonType,
  actionLoading,
  setActionLoading,
  supabase,
  fetchLessons,
  showToast
}) => {
  if (!showAddLesson || !selectedBook) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowAddLesson(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem' }}>Nova {addingLessonType === 'prova' ? 'Prova' : addingLessonType === 'atividade' ? 'Atividade' : 'Aula'} para {selectedBook.titulo}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const titulo = formData.get('titulo') as string;
          const video_url = (addingLessonType === 'gravada' || addingLessonType === 'ao_vivo') ? formData.get('video_url') as string : null;
          const tipo = addingLessonType;
          
          setActionLoading('add-lesson');
          const { error } = await supabase.from('aulas').insert({ 
            livro_id: selectedBook.id, 
            titulo, 
            video_url, 
            tipo 
          });
          
          if (error) showToast(error.message, 'error');
          else {
            showToast(addingLessonType === 'prova' ? 'Prova adicionada!' : addingLessonType === 'atividade' ? 'Atividade adicionada!' : 'Aula adicionada!');
            setShowAddLesson(false);
            fetchLessons(selectedBook.id);
          }
          setActionLoading(null);
        }}>
          <div className="form-group">
            <label>Título {addingLessonType === 'prova' ? 'da Prova' : addingLessonType === 'atividade' ? 'da Atividade' : 'da Aula'}</label>
            <input name="titulo" type="text" className="form-control" required />
          </div>
          {(addingLessonType === 'gravada' || addingLessonType === 'ao_vivo') && (
            <>
              <div className="form-group">
                <label>Vídeo URL (YouTube/Vimeo)</label>
                <input name="video_url" type="text" className="form-control" placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Tipo de Mídia</label>
                <select name="tipo" className="form-control" value={addingLessonType} onChange={(e) => setAddingLessonType(e.target.value)} required>
                  <option value="gravada">Vídeo Aula (Gravada)</option>
                  <option value="ao_vivo">Aula ao Vivo</option>
                </select>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddLesson(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-lesson'}>
              {actionLoading === 'add-lesson' ? <Loader2 className="spinner" /> : 'Criar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditItemModalProps {
  editingItem: { type: 'course' | 'book' | 'lesson', data: any } | null
  setEditingItem: (val: any) => void
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  fetchData: () => Promise<void>
  fetchBooks: (courseId: string) => Promise<void>
  fetchLessons: (bookId: string) => Promise<void>
  selectedCourse: any
  selectedBook: any
  showToast: (msg: string, type?: 'success' | 'error') => void
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
  selectedCourse,
  selectedBook,
  showToast
}) => {
  if (!editingItem) return null;
  return (
    <div className="modal-overlay" onClick={() => setEditingItem(null)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Editar {editingItem.type === 'course' ? 'Curso' : editingItem.type === 'book' ? 'Livro' : 'Aula'}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const table = editingItem.type === 'course' ? 'cursos' : editingItem.type === 'book' ? 'livros' : 'aulas';
          
          const updates: any = {};
          formData.forEach((val, key) => {
            if (key === 'ordem') updates[key] = parseInt(val as string);
            else updates[key] = val;
          });

          setActionLoading('edit-item');
          const { error } = await supabase.from(table).update(updates).eq('id', editingItem.data.id);
          
          if (error) showToast(error.message, 'error');
          else {
            showToast('Atualizado com sucesso!');
            setEditingItem(null);
            if (editingItem.type === 'course') fetchData();
            else if (editingItem.type === 'book') fetchBooks(selectedCourse.id);
            else if (editingItem.type === 'lesson') fetchLessons(selectedBook.id);
          }
          setActionLoading(null);
        }}>
          <div className="form-group">
            <label>Título / Nome</label>
            <input name={editingItem.type === 'course' ? 'nome' : 'titulo'} type="text" className="form-control" defaultValue={editingItem.type === 'course' ? editingItem.data.nome : editingItem.data.titulo} required />
          </div>
          
          {(editingItem.type === 'book' || editingItem.type === 'lesson') && (
            <div className="form-group">
              <label>Ordem / Sequência</label>
              <input name="ordem" type="number" className="form-control" defaultValue={editingItem.data.ordem || 1} />
            </div>
          )}

          {editingItem.type === 'lesson' && (
            <>
            <div className="form-group">
              <label>Vídeo URL (YouTube/Vimeo)</label>
              <input name="video_url" type="text" className="form-control" defaultValue={editingItem.data.video_url || ''} />
            </div>
            <div className="form-group">
              <label>Descrição da Aula</label>
              <textarea name="descricao" className="form-control" rows={3} defaultValue={editingItem.data.descricao || ''}></textarea>
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
