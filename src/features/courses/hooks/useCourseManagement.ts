import { useState, useCallback } from 'react';
import { courseService } from '../../../services/courseService';

export const useCourseManagement = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonItems, setLessonItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courseService.getCourses();
      setCourses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBooks = useCallback(async (courseId: string) => {
    if (!courseId) return;
    try {
      const data = await courseService.getBooksByCourse(courseId);
      setBooks(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLessons = useCallback(async (bookId: string) => {
    if (!bookId) return;
    setActionLoading('fetch-lessons');
    try {
      const data = await courseService.getLessonsByBook(bookId);
      setLessons(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const fetchLessonItems = useCallback(async (lessonId: string) => {
    if (!lessonId) return;
    setActionLoading('fetch-lesson-items');
    try {
      const data = await courseService.getLessonItems(lessonId);
      setLessonItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const deleteItem = async (table: 'cursos' | 'livros' | 'aulas', id: string) => {
    try {
      await courseService.deleteItem(table, id);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const moveItem = async (table: 'livros' | 'aulas', updates: any[]) => {
    setActionLoading('reorder-all');
    try {
      await courseService.updateItemsOrder(table, updates);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return {
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
    deleteItem,
    moveItem
  };
};
