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
    const allLessons = [...(book.aulas || [])]
    
    const v1 = allLessons.find((l: any) => /V1/i.test(l.titulo || ''))
    const v2 = allLessons.find((l: any) => /V2/i.test(l.titulo || ''))
    const v3 = allLessons.find((l: any) => /V3/i.test(l.titulo || ''))
    
    const others = allLessons
      .filter((l: any) => !(/V1/i.test(l.titulo || '') || /V2/i.test(l.titulo || '') || /V3/i.test(l.titulo || '')))
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0) || (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true }))

    if (v1) others.splice(21, 0, v1)
    if (v2) others.splice(22, 0, v2)
    if (v3) others.splice(23, 0, v3)
    
    setLessons(others)
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
