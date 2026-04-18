import { useState } from 'react';
import { QuizQuestion } from '../../../types/admin';

export const useAdminUIState = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<{ type: 'course' | 'book' | 'lesson' | 'content', data: any } | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [addingLessonType, setAddingLessonType] = useState<string>('gravada');
  const [addingBloco, setAddingBloco] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'content', id: string, table?: string, column?: string, title: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  return {
    searchTerm, setSearchTerm,
    showAddTeacher, setShowAddTeacher,
    showAddAdmin, setShowAddAdmin,
    showAddCourse, setShowAddCourse,
    showAddBook, setShowAddBook,
    showAddLesson, setShowAddLesson,
    showAddContent, setShowAddContent,
    showRoleSwitcher, setShowRoleSwitcher,
    isMobileMenuOpen, setIsMobileMenuOpen,
    editingItem, setEditingItem,
    editingQuiz, setEditingQuiz,
    quizQuestions, setQuizQuestions,
    addingLessonType, setAddingLessonType,
    addingBloco, setAddingBloco,
    toast, showToast,
    confirmDelete, setConfirmDelete
  };
};
