import { useState, useCallback, useMemo } from 'react';
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
  
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  
  const [editingItem, setEditingItem] = useState<{ type: 'course' | 'book' | 'lesson' | 'content', data: any } | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [addingLessonType, setAddingLessonType] = useState<string>('gravada');
  const [addingBloco, setAddingBloco] = useState<number | null>(null);
  const [editingLessonContent, setEditingLessonContent] = useState<any | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<any[]>([]);
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([]);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'content', id: string, table?: string, column?: string, title: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [nucleosAutoOpenAdd, setNucleosAutoOpenAdd] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return useMemo(() => ({
    searchTerm, setSearchTerm,
    showAddTeacher, setShowAddTeacher,
    showAddAdmin, setShowAddAdmin,
    showAddCourse, setShowAddCourse,
    showAddBook, setShowAddBook,
    showAddLesson, setShowAddLesson,
    showAddContent, setShowAddContent,
    showRoleSwitcher, setShowRoleSwitcher,
    isMobileMenuOpen, setIsMobileMenuOpen,
    selectedCourse, setSelectedCourse,
    selectedBook, setSelectedBook,
    selectedLesson, setSelectedLesson,
    editingItem, setEditingItem,
    editingQuiz, setEditingQuiz,
    quizQuestions, setQuizQuestions,
    addingLessonType, setAddingLessonType,
    addingBloco, setAddingBloco,
    editingLessonContent, setEditingLessonContent,
    lessonBlocks, setLessonBlocks,
    lessonMaterials, setLessonMaterials,
    toast, showToast,
    confirmDelete, setConfirmDelete,
    uploading, setUploading,
    nucleosAutoOpenAdd, setNucleosAutoOpenAdd
  }), [
    searchTerm, showAddTeacher, showAddAdmin, showAddCourse, showAddBook, 
    showAddLesson, showAddContent, showRoleSwitcher, isMobileMenuOpen, 
    selectedCourse, selectedBook, selectedLesson, editingItem, editingQuiz, 
    quizQuestions, addingLessonType, addingBloco, editingLessonContent, 
    lessonBlocks, lessonMaterials, toast, showToast, confirmDelete, 
    uploading, nucleosAutoOpenAdd
  ]);
};
