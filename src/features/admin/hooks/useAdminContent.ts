import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminContent = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonItems, setLessonItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('cursos').select('*, livros(count)');
      if (data) setCourses(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchBooks = useCallback(async (courseId: string) => {
    if (!courseId) return;
    const { data } = await supabase.from('livros').select('*, aulas(count)').eq('curso_id', courseId).order('ordem');
    if (data) setBooks(data);
  }, []);

  const fetchLessons = useCallback(async (bookId: string) => {
    if (!bookId) return;
    const { data } = await supabase.from('aulas').select('*, children:aulas(count)').eq('livro_id', bookId).eq('tipo', 'licao').order('ordem');
    if (data) setLessons(data);
  }, []);

  const fetchLessonItems = useCallback(async (lessonId: string) => {
    if (!lessonId) return;
    const { data } = await supabase.from('aulas').select('*').eq('parent_aula_id', lessonId).order('ordem');
    if (data) setLessonItems(data);
  }, []);

  const handleReorder = useCallback(async (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas') => {
    const idx = items.findIndex(i => i.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const current = items[idx];
    const swap = items[swapIdx];

    try {
      await Promise.all([
        supabase.from(table).update({ ordem: swap.ordem }).eq('id', current.id),
        supabase.from(table).update({ ordem: current.ordem }).eq('id', swap.id)
      ]);
      fetchFn();
    } catch (err: any) {
      showToast('Erro ao reordenar: ' + err.message, 'error');
    }
  }, [showToast]);

  const handleMoveTo = useCallback(async (id: string, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas', targetBlocoId?: number | null) => {
    if (id === targetId) return;
    const newItems = [...items];
    const dragIdx = newItems.findIndex(i => i.id === id);
    if (dragIdx === -1) return;

    const [draggedItem] = newItems.splice(dragIdx, 1);
    if (targetBlocoId !== undefined) {
      draggedItem.bloco_id = targetBlocoId;
      newItems.push(draggedItem);
    } else if (targetId) {
      const targetIdx = newItems.findIndex(i => i.id === targetId);
      if (targetIdx !== -1) {
        const targetItem = newItems[targetIdx];
        newItems.splice(targetIdx, 0, draggedItem);
        draggedItem.bloco_id = targetItem.bloco_id;
      } else {
        newItems.push(draggedItem);
      }
    }

    const updates = newItems.map((item, index) => {
      const payload = { ...item };
      delete (payload as any).children;
      delete (payload as any).count;
      delete (payload as any).professores;
      delete (payload as any).nucleos;
      return { ...payload, ordem: index + 1, bloco_id: item.bloco_id };
    });

    try {
      setActionLoading('reorder-all');
      await Promise.all(updates.map(update => {
        const { id: itemId, ...payload } = update;
        return supabase.from(table).update(payload).eq('id', itemId);
      }));
      fetchFn();
    } catch (err: any) {
      showToast('Erro ao mover: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  return useMemo(() => ({
    courses,
    books,
    lessons,
    lessonItems,
    loading,
    actionLoading,
    fetchCourses,
    fetchBooks,
    fetchLessons,
    fetchLessonItems,
    handleReorder,
    handleMoveTo
  }), [
    courses,
    books,
    lessons,
    lessonItems,
    loading,
    actionLoading,
    fetchCourses,
    fetchBooks,
    fetchLessons,
    fetchLessonItems,
    handleReorder,
    handleMoveTo
  ]);
};
