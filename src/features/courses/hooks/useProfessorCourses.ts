import { useState, useCallback } from 'react'
import { ProfessorCourse } from '../../../types/professor'

export const useProfessorCourses = () => {
  const [courses, setCourses] = useState<ProfessorCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [lessons, setLessons] = useState<any[]>([])

  const setSortedCourses = useCallback((data: ProfessorCourse[]) => {
    const sorted = [...data].sort((a, b) => 
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    )
    setCourses(sorted)
  }, [])

  const fetchBooks = useCallback(async (courseId: string) => {
    const course = courses.find((c: any) => c.id === courseId)
    if (course) {
      const sortedBooks = [...(course.livros || [])].sort((a: any, b: any) => {
        if (a.ordem !== b.ordem) return (a.ordem || 0) - (b.ordem || 0)
        return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { sensitivity: 'base' })
      })
      setBooks(sortedBooks)
    }
  }, [courses]);

  const selectBookAndShowLessons = useCallback((book: any) => {
    setSelectedBook(book)
    const sortedLessons = [...(book.aulas || [])].sort((a: any, b: any) => 
      (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' })
    )
    setLessons(sortedLessons)
  }, []);

  return {
    courses,
    setCourses: setSortedCourses,
    selectedCourse,
    setSelectedCourse,
    books,
    setBooks,
    selectedBook,
    setSelectedBook,
    lessons,
    setLessons,
    fetchBooks,
    selectBookAndShowLessons
  }
}
