import React, { useState, useEffect } from 'react'
import { BookOpen, Edit, Trash2, ChevronRight, Plus, ClipboardList, Award, PlayCircle, Eye, FileText, Upload, Loader2, ChevronUp, ChevronDown, Layers, GripVertical, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { extractAnswerKey } from '../../../lib/answerKeyParser'
import GabaritoUpload from './GabaritoUpload'

interface ContentManagementProps {
  courses: any[]
  selectedCourse: any | null
  setSelectedCourse: (course: any | null) => void
  selectedBook: any | null
  setSelectedBook: (book: any | null) => void
  selectedLesson: any | null
  setSelectedLesson: (lesson: any | null) => void
  books: any[]
  lessons: any[]
  lessonItems: any[]
  userRole: string | null
  actionLoading: string | null
  fetchData: () => Promise<void>
  fetchBooks: (courseId: string) => Promise<void>
  fetchLessons: (bookId: string) => Promise<void>
  fetchLessonItems: (lessonId: string) => Promise<void>
  handleDelete: (table: 'cursos' | 'livros' | 'aulas', id: string) => void
  handleRemoveFile: (table: 'livros' | 'aulas', id: string, column: string) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => Promise<void>
  handleReorder: (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas') => Promise<void>
  handleMoveTo: (id: string, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas', targetBlocoId?: number | null) => Promise<void>
  setShowAddCourse: (val: boolean) => void
  setShowAddBook: (val: boolean) => void
  setShowAddLesson: (val: boolean) => void
  setShowAddContent: (val: boolean) => void
  setAddingLessonType: (val: string) => void
  setAddingBloco: (val: number | null) => void
  setEditingItem: (val: { type: 'course' | 'book' | 'lesson' | 'content', data: any } | null) => void
  setEditingLessonContent: (val: any) => void
  setLessonBlocks: (val: any[]) => void
  setLessonMaterials: (val: any[]) => void
  setEditingQuiz: (val: any) => void
  setQuizQuestions: (val: any[]) => void
  pendingExamMeta: { livroId: string; titulo: string; arquivoUrl: string; ordem: number } | null
  setPendingExamMeta: (val: { livroId: string; titulo: string; arquivoUrl: string; ordem: number } | null) => void
  uploading: string | null
  cleanupExcessExams?: () => Promise<void>
  handleBatchUpload: (files: FileList, parentId: string, livroId: string, blocoId: number | null, startOrder: number) => Promise<void>
}

const groupByBloco = (items: any[]): Map<number, any[]> => {
  const map = new Map<number, any[]>()
  for (const item of items) {
    const key = item.bloco_id ?? 0
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  map.forEach((arr) => arr.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
  return map
}

const tipoLabel = (tipo: string) => {
  switch (tipo) {
    case 'gravada': return 'Vídeo Aula'
    case 'ao_vivo': return 'Aula ao Vivo'
    case 'atividade': return 'Atividade'
    case 'exercicio': return 'Exercício de Fixação'
    case 'avaliacao': return 'Avaliação'
    case 'prova': return 'Prova Final'
    case 'material': return 'Lição/Material'
    default: return tipo
  }
}

const tipoIcon = (tipo: string, size = 20) => {
  switch (tipo) {
    case 'gravada': return <PlayCircle size={size} color="var(--primary)" />
    case 'ao_vivo': return <PlayCircle size={size} color="#38bdf8" />
    case 'atividade': return <ClipboardList size={size} color="var(--success)" />
    case 'exercicio': return <ClipboardList size={size} color="#10b981" />
    case 'avaliacao': return <Award size={size} color="#EAB308" />
    case 'prova': return <Award size={size} color="#EAB308" />
    default: return <FileText size={size} color="var(--text-muted)" />
  }
}

const ContentManagement: React.FC<ContentManagementProps> = (props) => {

  const navigate = useNavigate()

  const {
    courses,
    selectedCourse,
    setSelectedCourse,
    selectedBook,
    setSelectedBook,
    selectedLesson,
    setSelectedLesson,
    books,
    lessons,
    lessonItems,
    userRole,
    fetchBooks,
    fetchLessons,
    fetchLessonItems,
    handleDelete,
    handleRemoveFile,
    handleFileUpload,
    handleReorder,
    handleMoveTo,
    setShowAddCourse,
    setShowAddBook,
    setShowAddLesson,
    setShowAddContent,
    setAddingLessonType,
    setAddingBloco,
    setEditingItem,
    setEditingLessonContent,
    setLessonBlocks,
    setLessonMaterials,
    setEditingQuiz,
    setQuizQuestions,
    pendingExamMeta,
    setPendingExamMeta,
    uploading,
    cleanupExcessExams,
    handleBatchUpload
  } = props

  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reorderLoading, setReorderLoading] = useState<string | null>(null)
  const [batchUploadTarget, setBatchUploadTarget] = useState<{ blocoId: number | null, order: number } | null>(null);
  const [localUploading, setLocalUploading] = useState<string | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin' || userRole === 'suporte'
  const isProfessor = userRole === 'professor'
  const canEdit = isAdmin || isProfessor

  // Auto-select Teologia Básica course on load
  useEffect(() => {
    if (courses.length > 0 && !selectedCourse && !selectedBook && !selectedLesson) {
      const target = courses.find((c: any) =>
        c.nome?.toLowerCase().includes('teologia') ||
        c.nome?.toLowerCase().includes('básico') ||
        c.nome?.toLowerCase().includes('basico')
      ) || courses[0]
      setSelectedCourse(target)
      fetchBooks(target.id)
    }
  }, [courses, selectedCourse, selectedBook, selectedLesson, setSelectedCourse, fetchBooks])

  const normalizeFile = (name: string) => {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()
  }

  const handleBatchLessonUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLocalUploading('batch-lessons')

    const { data: existingLessons } = await supabase
      .from('aulas')
      .select('ordem')
      .eq('livro_id', bookId)
      .eq('tipo', 'licao')
      .order('ordem', { ascending: false })
      .limit(1)

    const startOrder = (existingLessons?.[0]?.ordem || 0) + 1
    let successCount = 0

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const titulo = file.name.replace(/\.(pdf|html?)$/i, '').trim()

        const safeName = normalizeFile(file.name)
        const filePath = `licoes/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

        const { error: insertError } = await supabase.from('aulas').insert({
          livro_id: bookId,
          titulo,
          tipo: 'licao',
          ordem: startOrder + i,
          arquivo_url: publicUrl
        })
        if (insertError) throw insertError
        successCount++
      }
      alert(`${successCount} lição(ões) criada(s) com sucesso!`)
      if (selectedCourse) fetchBooks(selectedCourse.id)
    } catch (err: any) {
      alert('Erro no upload de lições: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const handleBatchExerciseUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLocalUploading('batch-exercises')

    const { data: bookLessons } = await supabase
      .from('aulas')
      .select('id, titulo, ordem')
      .eq('livro_id', bookId)
      .eq('tipo', 'licao')
      .order('ordem')

    const { data: existingActivities } = await supabase
      .from('aulas')
      .select('ordem')
      .eq('livro_id', bookId)
      .eq('tipo', 'atividade')
      .order('ordem', { ascending: false })
      .limit(1)

    const startOrder = (existingActivities?.[0]?.ordem || 0) + 1
    let successCount = 0
    let linkedCount = 0
    let unlinkedCount = 0
    const details: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const titulo = file.name.replace(/\.(pdf|html?)$/i, '').trim()
        const fileNameLower = file.name.toLowerCase()
        let parentLessonId: string | null = null
        let detectedLabel = ''

        const lessonMatch =
          fileNameLower.match(/li[cç][aã]o[_\-\s]*(\d+)/i) ||
          fileNameLower.match(/licao[_\-]?(\d+)/i) ||
          fileNameLower.match(/lesson[_\-\s]*(\d+)/i) ||
          fileNameLower.match(/aula[_\-\s]*(\d+)/i) ||
          fileNameLower.match(/cap[ií]tulo[_\-\s]*(\d+)/i) ||
          fileNameLower.match(/exerc[íi]cio[_\-\s]+(?:da[_\-\s]+)?li[cç][aã]o[_\-\s]*(\d+)/i) ||
          fileNameLower.match(/(\d+)/i)

        if (lessonMatch && bookLessons && bookLessons.length > 0) {
          const lessonNum = parseInt(lessonMatch[1])
          const matchedLesson =
            bookLessons.find((l: any) => l.ordem === lessonNum) ||
            bookLessons.find((l: any) => {
              const titleMatch = l.titulo.match(/(\d+)/)
              return titleMatch && parseInt(titleMatch[1]) === lessonNum
            })

          if (matchedLesson) {
            parentLessonId = matchedLesson.id
            detectedLabel = `Lição ${matchedLesson.ordem} (${matchedLesson.titulo})`
            linkedCount++
          }
        }

        // Fallback: vincula por posição (exercício i+1 → Lição i+1)
        if (!parentLessonId && bookLessons && bookLessons.length > 0) {
          const fallbackLesson = bookLessons.find((l: any) => l.ordem === (i + 1))
          if (fallbackLesson) {
            parentLessonId = fallbackLesson.id
            detectedLabel = `Lição ${fallbackLesson.ordem} (vínculo por posição)`
            linkedCount++
          }
        }

        if (!parentLessonId) {
          unlinkedCount++
          detectedLabel = 'sem lição vinculada'
        }

        const safeName = normalizeFile(file.name)
        const filePath = `exercicios/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

        await supabase.from('aulas').insert({
          livro_id: bookId,
          parent_aula_id: parentLessonId,
          titulo,
          tipo: 'atividade',
          ordem: startOrder + i,
          arquivo_url: publicUrl
        })
        successCount++
        details.push(`• ${titulo} → ${detectedLabel}`)
      }

      const summary =
        `${successCount} exercício(s) processado(s):\n` +
        `🔗 ${linkedCount} vinculado(s) à lição | ⚠️ ${unlinkedCount} sem vínculo\n\n` +
        details.join('\n')
      alert(summary)
      if (selectedCourse) fetchBooks(selectedCourse.id)
    } catch (err: any) {
      alert('Erro no upload de exercícios: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const handleSplitExerciseHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalUploading('split-exercises')

    try {
      const text = await file.text()
      const fileNameBase = file.name.replace(/\.(pdf|html?)$/i, '').trim()

      const { data: bookLessons } = await supabase
        .from('aulas')
        .select('id, titulo, ordem')
        .eq('livro_id', bookId)
        .eq('tipo', 'licao')
        .order('ordem')

      const { data: existingActivities } = await supabase
        .from('aulas')
        .select('ordem')
        .eq('livro_id', bookId)
        .eq('tipo', 'atividade')
        .order('ordem', { ascending: false })
        .limit(1)

      const startOrder = (existingActivities?.[0]?.ordem || 0) + 1

      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      const body = doc.body
      if (!body) throw new Error('HTML inválido')

      const headerRegex = /li[cç][aã]o[_\-\s]*(\d+)|licao[_\-]?(\d+)|exerc[íi]cio[_\-\s]*(\d+)|aula[_\-\s]*(\d+)|lesson[_\-\s]*(\d+)|cap[íi]tulo[_\-\s]*(\d+)/i
      const fallbackNumberRegex = /(\d+)/

      type Section = { lessonNum: number; title: string; html: string }
      const sections: Section[] = []
      let current: Section | null = null
      let preSectionBuffer: string[] = []

      const topChildren = Array.from(body.children) as HTMLElement[]
      for (const node of topChildren) {
        const tag = node.tagName.toLowerCase()
        const text = (node.textContent || '').trim()

        if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(tag) && text) {
          const m =
            text.match(headerRegex) ||
            (text.length < 60 ? text.match(fallbackNumberRegex) : null)
          if (m) {
            const numStr = m[1] || m[2] || m[3] || m[4] || m[5] || m[6] || m[7]
            if (numStr) {
              const num = parseInt(numStr)
              if (!isNaN(num) && num >= 1 && num <= 99) {
                if (current) sections.push(current)
                current = { lessonNum: num, title: text, html: node.outerHTML }
                continue
              }
            }
          }
        }

        if (current) {
          current.html += '\n' + node.outerHTML
        } else {
          preSectionBuffer.push(node.outerHTML)
        }
      }
      if (current) sections.push(current)

      if (sections.length === 0) {
        const confirmFull = confirm(
          'Não encontrei cabeçalhos "Lição N" / "Exercício N" no HTML.\n\n' +
          'Deseja cadastrar o HTML INTEIRO como UM único exercício vinculado à Lição 1?'
        )
        if (confirmFull && bookLessons && bookLessons[0]) {
          const safeName = normalizeFile(file.name)
          const filePath = `exercicios/${Date.now()}_${safeName}`
          const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

          await supabase.from('aulas').insert({
            livro_id: bookId,
            parent_aula_id: bookLessons[0].id,
            titulo: `${fileNameBase} (completo)`,
            tipo: 'atividade',
            ordem: startOrder,
            arquivo_url: publicUrl
          })
          alert('1 exercício completo cadastrado vinculado à Lição 1.')
        } else {
          alert('Upload cancelado.')
        }
        return
      }

      const splitDir = `exercicios/${Date.now()}_${normalizeFile(fileNameBase)}`
      let linkedCount = 0
      let unlinkedCount = 0
      const details: string[] = []

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i]
        const matched = bookLessons?.find((l: any) => l.ordem === s.lessonNum) ||
          bookLessons?.find((l: any) => {
            const t = l.titulo.match(/(\d+)/)
            return t && parseInt(t[1]) === s.lessonNum
          })

        const htmlShell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${s.title}</title></head><body>${s.html}</body></html>`
        const blob = new Blob([htmlShell], { type: 'text/html' })
        const fakeFile = new File([blob], `Licao_${String(s.lessonNum).padStart(2, '0')}.html`, { type: 'text/html' })

        const safeName = normalizeFile(fakeFile.name)
        const filePath = `${splitDir}/${safeName}`
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, fakeFile)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

        await supabase.from('aulas').insert({
          livro_id: bookId,
          parent_aula_id: matched?.id || null,
          titulo: `Exercícios - Lição ${String(s.lessonNum).padStart(2, '0')}`,
          tipo: 'atividade',
          ordem: startOrder + i,
          arquivo_url: publicUrl
        })

        if (matched) {
          linkedCount++
          details.push(`✅ Lição ${s.lessonNum} → ${matched.titulo}`)
        } else {
          unlinkedCount++
          details.push(`⚠️ Lição ${s.lessonNum} → sem lição correspondente`)
        }
      }

      const summary =
        `✂️ HTML dividido em ${sections.length} parte(s):\n\n` +
        `🔗 ${linkedCount} vinculado(s) à lição | ⚠️ ${unlinkedCount} sem vínculo\n\n` +
        details.join('\n')
      alert(summary)
      if (selectedCourse) fetchBooks(selectedCourse.id)
    } catch (err: any) {
      alert('Erro ao dividir HTML de exercícios: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  // Upload de Avaliação via HTML — parseia, abre editor, admin define gabarito, depois salva
  const handleExamHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLocalUploading('exam-html')

    try {
      // Processar apenas o primeiro arquivo (fluxo editável)
      const file = files[0]
      const text = await file.text()
      const fileNameBase = file.name.replace(/\.(pdf|html?)$/i, '').trim()

      // Buscar última ordem entre todas as aulas do módulo
      const { data: existingItems } = await supabase
        .from('aulas')
        .select('ordem')
        .eq('livro_id', bookId)
        .order('ordem', { ascending: false })
        .limit(1)

      let currentOrder = (existingItems?.[0]?.ordem || 0) + 1

      // Upload do arquivo para storage
      const safeName = normalizeFile(file.name)
      const filePath = `avaliacoes/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

      // Extrair gabarito do HTML (se existir)
      const { cleanedHtml, answerKey } = extractAnswerKey(text)

      // Template de provas: 10 V/F + 4 MC + 6 pares
      const examTemplate = [
        ...Array(10).fill(null).map((_, i) => {
          const ak = answerKey.find(a => a.questionIndex === i && a.questionType === 'true_false')
          return {
            id: `tf-${Date.now()}-${i}`,
            type: 'true_false' as const,
            text: '',
            isTrue: ak ? ak.correctAnswer : true,
            points: 0.5
          }
        }),
        ...Array(4).fill(null).map((_, i) => {
          const ak = answerKey.find(a => a.questionIndex === (10 + i) && a.questionType === 'multiple_choice')
          return {
            id: `mc-${Date.now()}-${i}`,
            type: 'multiple_choice' as const,
            text: '',
            options: ['', '', '', ''],
            correct: ak ? ak.correctAnswer : 0,
            points: 0.5
          }
        }),
        {
          id: `mat-${Date.now()}`,
          type: 'matching' as const,
          text: 'Relacione as colunas abaixo:',
          matchingPairs: Array(6).fill(null).map(() => ({ left: '', right: '' })),
          points: 0.5
        }
      ]

      // Abrir o editor de questões com as perguntas parseadas
      const tempExam = {
        id: `_new_${Date.now()}`,
        titulo: fileNameBase || 'Nova Avaliação',
        livro_id: bookId,
        tipo: 'prova',
        min_grade: 7,
        ordem: currentOrder,
        versao: 1,
        is_bloco_final: false,
        arquivo_url: publicUrl,
        _isNew: true
      }

      setQuizQuestions(examTemplate)
      setPendingExamMeta({
        livroId: bookId,
        titulo: fileNameBase || 'Nova Avaliação',
        arquivoUrl: publicUrl,
        ordem: currentOrder
      })
      setEditingQuiz(tempExam)
    } catch (err: any) {
      alert('Erro ao processar HTML de avaliação: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const handleMultiUploadToLesson = async (e: React.ChangeEvent<HTMLInputElement>, lessonId: string, livroId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLocalUploading('multi-' + lessonId)

    const { data: existingItems } = await supabase
      .from('aulas')
      .select('ordem')
      .eq('parent_aula_id', lessonId)
      .order('ordem', { ascending: false })
      .limit(1)

    const startOrder = (existingItems?.[0]?.ordem || 0) + 1
    let successCount = 0

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const safeName = normalizeFile(file.name)
        const filePath = `materiais/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

        await supabase.from('aulas').insert({
          livro_id: livroId,
          parent_aula_id: lessonId,
          titulo: file.name.replace(/\.(pdf|html?)$/i, ''),
          tipo: 'material',
          arquivo_url: publicUrl,
          ordem: startOrder + i
        })
        successCount++
      }
      alert(`${successCount} material(is) adicionado(s) à lição!`)
      fetchLessons(livroId)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const handleSmartLessonUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLocalUploading('smart-lessons')

    let successCount = 0
    let panoramaCount = 0
    let lessonCount = 0

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileNameLower = file.name.toLowerCase()
        let ordem: number

        if (fileNameLower.match(/panorama|prologo|pr[oó]logo|vis[ãa]o\s*geral|visao\s*geral|intro|introdu[çc][ãa]o/i)) {
          ordem = 0
          panoramaCount++
        } else {
          const numberMatch = fileNameLower.match(/(?:li[çc][ãa]o|aula|licao|lesson|chap|cap[ií]tulo)\s*[\-_]?\s*(\d+)/i) ||
                             fileNameLower.match(/(\d+)/)
          if (numberMatch) {
            ordem = parseInt(numberMatch[1])
            lessonCount++
          } else {
            const { data: maxOrder } = await supabase
              .from('aulas')
              .select('ordem')
              .eq('livro_id', bookId)
              .eq('tipo', 'licao')
              .order('ordem', { ascending: false })
              .limit(1)
            ordem = (maxOrder?.[0]?.ordem || 0) + 1
            lessonCount++
          }
        }

        const titulo = ordem === 0 ? 'Panorama' : `Lição ${ordem}`

        const safeName = normalizeFile(file.name)
        const filePath = `licoes/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

        const { data: existingLesson } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', bookId)
          .eq('tipo', 'licao')
          .eq('ordem', ordem)
          .maybeSingle()

        if (existingLesson) {
          await supabase.from('aulas').update({
            titulo,
            arquivo_url: publicUrl
          }).eq('id', existingLesson.id)
        } else {
          await supabase.from('aulas').insert({
            livro_id: bookId,
            titulo,
            tipo: 'licao',
            ordem,
            arquivo_url: publicUrl
          })
        }
        successCount++
      }

      const summary = panoramaCount > 0 && lessonCount > 0
        ? `${successCount} processada(s): ${panoramaCount} panorama(s) e ${lessonCount} lição(ões).`
        : panoramaCount > 0
          ? `${panoramaCount} panorama(s) posicionado(s) no prólogo.`
          : `${lessonCount} lição(ões) ordenada(s) nos carrosséis.`

      alert(summary)
      if (selectedBook) fetchLessons(selectedBook.id)
    } catch (err: any) {
      alert('Erro no upload de lições: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalUploading('video-' + bookId)

    try {
      const safeName = normalizeFile(file.name)
      const filePath = `videos/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath)

      const { data: maxOrder } = await supabase
        .from('aulas')
        .select('ordem')
        .eq('livro_id', bookId)
        .in('tipo', ['gravada', 'ao_vivo'])
        .order('ordem', { ascending: false })
        .limit(1)

      const newOrder = (maxOrder?.[0]?.ordem || 0) + 1

      await supabase.from('aulas').insert({
        livro_id: bookId,
        titulo: file.name.replace(/\.(mp4|webm|ogg)$/i, ''),
        tipo: 'gravada',
        video_url: publicUrl,
        arquivo_url: publicUrl,
        ordem: newOrder
      })

      alert('Vídeo aula enviado com sucesso!')
      if (selectedCourse) fetchBooks(selectedCourse.id)
    } catch (err: any) {
      alert('Erro no upload de vídeo: ' + err.message)
    } finally {
      e.target.value = ''
      setLocalUploading(null)
    }
  }

  const nextBloco = lessonItems.length > 0
    ? Math.max(...lessonItems.map(i => i.bloco_id ?? 0)) + 1
    : 1

  const handleAddToBloco = (tipo: string, bloco: number) => {
    setAddingLessonType(tipo)
    setAddingBloco(bloco)
    setShowAddContent(true)
  }

  const doReorder = async (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas') => {
    setReorderLoading(id + direction)
    await handleReorder(id, direction, items, fetchFn, table)
    setReorderLoading(null)
  }

  const triggerBatchUpload = (blocoId: number | null, order: number) => {
    setBatchUploadTarget({ blocoId, order });
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  // HTML5 Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Optional: cursor feedback
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement
    ghost.style.opacity = '0.5'
  }

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }

  const onDrop = async (e: React.DragEvent, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas', targetBlocoId?: number | null) => {
    e.preventDefault()
    setDragOverId(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id === targetId && targetBlocoId === undefined) return
    
    setReorderLoading(id + 'drag')
    await handleMoveTo(id, targetId, items, fetchFn, table, targetBlocoId)
    setReorderLoading(null)
    setDraggedId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <input 
        type="file" 
        multiple 
        accept=".pdf,.html" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && batchUploadTarget && selectedLesson && selectedBook) {
            handleBatchUpload(files, selectedLesson.id, selectedBook.id, batchUploadTarget.blocoId, batchUploadTarget.order);
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedCourse && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => { setSelectedCourse(null); setSelectedBook(null); setSelectedLesson(null); }}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Cursos
            </button>
          )}
          {selectedBook && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => { setSelectedBook(null); setSelectedLesson(null); }}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Livros
            </button>
          )}
          {selectedLesson && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => setSelectedLesson(null)}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Lições
            </button>
          )}
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {!selectedCourse ? 'Todos os Cursos' :
             !selectedBook ? `Livros de ${selectedCourse.nome}` :
             !selectedLesson ? `Lições de ${selectedBook.titulo}` :
             `Conteúdo de ${selectedLesson.titulo}`}
          </h3>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!selectedCourse ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {cleanupExcessExams && (
                  <button className="btn btn-maintenance" style={{ width: 'auto', gap: '0.4rem' }}
                    onClick={cleanupExcessExams}
                    title="Limpar versões duplicadas de provas em todo o sistema">
                    <Trash2 size={16} /> Corrigir Sistema
                  </button>
                )}
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddCourse(true)}>
                  <Plus size={20} /> Novo Curso
                </button>
              </div>
            ) : !selectedBook ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBook(true)}>
                <Plus size={20} /> Novo Livro
              </button>
            ) : !selectedLesson ? (
              <label className="btn btn-primary" style={{ width: 'auto', cursor: 'pointer', gap: '0.4rem' }}
                title="Upload de lições (identifica automaticamente panorama e número)">
                {localUploading === 'smart-lessons' ? <Loader2 size={18} className="spinner" /> : <Upload size={18} />}
                Upload de Lições
                <input type="file" hidden accept=".pdf,.html" multiple onChange={(e) => handleSmartLessonUpload(e, selectedBook.id)} />
              </label>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ width: 'auto', gap: '0.4rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  onClick={() => { setAddingBloco(null); setAddingLessonType('material'); setShowAddContent(true); }}
                  title="Upload de Múltiplos Arquivos">
                  <Upload size={16} /> Upload Múltiplo
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', gap: '0.4rem' }}
                  onClick={() => { setAddingBloco(nextBloco); setAddingLessonType('material'); setShowAddContent(true); }}
                  title="Adicionar novo bloco">
                  <Layers size={16} /> Novo Bloco #{nextBloco}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Courses ── */}
      {!selectedCourse ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{course.nome}</h3>
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'course', data: course })}><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('cursos', course.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BookOpen size={18} color="var(--primary)" /> <strong>{course.livros?.[0]?.count || 0} Livros</strong>
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Gerenciar Conteúdo</button>
            </div>
          ))}
        </div>

      /* ── Books ── */
      ) : !selectedBook ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {books.map(book => {
            const isExpanded = expandedBookId === book.id
            return (
            <div 
              key={book.id} 
              draggable={isAdmin}
              onDragStart={(e) => onDragStart(e, book.id)}
              onDragOver={(e) => onDragOver(e, book.id)}
              onDrop={(e) => onDrop(e, book.id, books, () => fetchBooks(selectedCourse.id), 'livros')}
              className="course-card" 
              style={{ 
                padding: '2rem', 
                background: dragOverId === book.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--glass)', 
                border: dragOverId === book.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)', 
                borderRadius: '20px',
                opacity: draggedId === book.id ? 0.4 : 1,
                transition: 'all 0.2s ease' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                   {isAdmin && (
                     <div style={{ cursor: 'grab', color: 'var(--text-muted)', opacity: 0.5, display: 'flex', alignItems: 'center' }} title="Arraste para reordenar">
                       <GripVertical size={18} />
                     </div>
                   )}
                   {book.capa_url ? (
                    <img src={book.capa_url} alt="Capa" style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                      onClick={() => isAdmin && setEditingItem({ type: 'book', data: book })} title={isAdmin ? 'Clique para editar capa' : 'Capa do módulo'} />
                  ) : (
                    <div style={{ width: '50px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isAdmin ? 'pointer' : 'default', border: '1px dashed var(--glass-border)' }}
                      onClick={() => isAdmin && setEditingItem({ type: 'book', data: book })} title={isAdmin ? 'Clique para adicionar capa' : 'Sem capa'}>
                      <BookOpen size={20} color="var(--primary)" />
                    </div>
                  )}
                  <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{book.titulo}</h4>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} 
                      disabled={books.findIndex(b => b.id === book.id) === 0}
                      onClick={() => doReorder(book.id, 'up', books, () => fetchBooks(selectedCourse.id), 'livros')}>
                      {reorderLoading === book.id + 'up' ? <Loader2 size={14} className="spinner" /> : <ChevronUp size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} 
                      disabled={books.findIndex(b => b.id === book.id) === books.length - 1}
                      onClick={() => doReorder(book.id, 'down', books, () => fetchBooks(selectedCourse.id), 'livros')}>
                      {reorderLoading === book.id + 'down' ? <Loader2 size={14} className="spinner" /> : <ChevronDown size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'book', data: book })}><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('livros', book.id)}><Trash2 size={16} /></button>
                  </div>
                )}
                {isProfessor && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }}
                    onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                    title={isExpanded ? 'Fechar upload' : 'Abrir área de upload'}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Ordem: {book.ordem} • {book.aulas?.[0]?.count || 0} Lições
              </p>

              {/* Área de upload inline - aparece quando o card é aberto */}
              {(isAdmin || isExpanded) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {isAdmin ? 'Inserção de Conteúdo' : 'Inserção de Vídeos e Exercícios'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isAdmin && (
                      <label className="btn btn-outline" style={{ width: 'auto', cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        title="Selecionar múltiplos PDFs/HTML para criar lições">
                        {uploading === 'batch-lessons' || localUploading === 'batch-lessons' ? <Loader2 size={14} className="spinner" /> : <Upload size={14} />} Lições (Multi)
                        <input type="file" hidden accept=".pdf,.html" multiple onChange={(e) => handleBatchLessonUpload(e, book.id)} />
                      </label>
                    )}
                    <label className="btn btn-outline" style={{ width: 'auto', cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}
                      title="Detecta automaticamente a qual lição o exercício pertence (ex: 'Lição 04' → Lição 4)">
                      {uploading === 'batch-exercises' || localUploading === 'batch-exercises' ? <Loader2 size={14} className="spinner" /> : <ClipboardList size={14} />} Exercícios Inteligentes
                      <input type="file" hidden accept=".pdf,.html" multiple onChange={(e) => handleBatchExerciseUpload(e, book.id)} />
                    </label>
                    {isAdmin && (
                      <label className="btn btn-outline" style={{ width: 'auto', cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#EAB308' }}
                        title="Envia múltiplos HTMLs com avaliações e divide automaticamente. Cada parte vira uma prova vinculada à lição.">
                        {localUploading === 'exam-html' ? <Loader2 size={14} className="spinner" /> : <Award size={14} />} HTML → Avaliações
                        <input type="file" hidden accept=".html,.htm" multiple onChange={(e) => handleExamHtmlUpload(e, book.id)} />
                      </label>
                    )}
                    {isAdmin && (
                      <GabaritoUpload
                        selectedBook={book}
                        fetchLessons={fetchLessons}
                        showToast={(msg: string) => alert(msg)}
                      />
                    )}
                    {isProfessor && (
                      <label className="btn btn-outline" style={{ width: 'auto', cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}
                        title="Upload de vídeo aula para este módulo">
                        {localUploading === 'video-' + book.id ? <Loader2 size={14} className="spinner" /> : <PlayCircle size={14} />} Vídeo Aula
                        <input type="file" hidden accept="video/mp4,video/webm,video/ogg" onChange={(e) => handleVideoUpload(e, book.id)} />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, minWidth: '120px' }} onClick={() => { setSelectedBook(book); fetchLessons(book.id); }}>
                  {isAdmin ? 'Gerenciar Lições' : isProfessor ? 'Ver Conteúdo' : 'Acessar Conteúdo'}
                </button>
                {isAdmin && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
                    onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                    title={isExpanded ? 'Fechar upload' : 'Abrir área de upload'}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
            </div>
            )
          })}
          {books.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhum livro cadastrado para este curso.</p>}
        </div>

      /* ── GRID 4 COLUNAS - AULAS DO MÓDULO ── */
      ) : !selectedLesson ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header do módulo */}
          <div style={{ padding: '1.5rem 2rem', background: 'rgba(168,85,247,0.08)', borderRadius: '20px', borderLeft: '5px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', margin: 0, fontWeight: 800, fontSize: '1.3rem' }}>{selectedBook?.titulo}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                <Clock size={14} /> {lessons.length} aulas neste módulo
              </span>
            </div>
          </div>

          {/* Grid 4 colunas */}
          {(() => {
            const isVideoType = (t: string) => t === 'gravada' || t === 'ao_vivo' || t === 'video' || t === 'aula_video'
            const sortedAulas = [...lessons].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const panorama = sortedAulas.find((a: any) => a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama')

            const licoes = sortedAulas
              .filter((a: any) => {
                if (a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'avaliacao' || a.tipo === 'prova' || a.is_bloco_final) return false
                if (isVideoType(a.tipo)) return false
                if (a.video_url || a.url_video) return false
                if (a.ordem === 0) return false
                if (a.titulo?.trim()?.toLowerCase() === 'panorama') return false
                return true
              })
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const exercicios = sortedAulas
              .filter((a: any) => (a.tipo === 'atividade' || a.tipo === 'exercicio') && a.tipo !== 'prova' && !a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const videos = sortedAulas
              .filter((a: any) => isVideoType(a.tipo) || !!a.video_url || !!a.url_video)
              .filter((a: any) => a.tipo !== 'atividade' && a.tipo !== 'exercicio' && a.tipo !== 'avaliacao' && a.tipo !== 'prova' && !a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const avaliacoes = sortedAulas
              .filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const avaliacoesGrid = Array.from({ length: 11 }, (_, i) => {
              const pos = i - 8
              return pos >= 0 && pos < avaliacoes.length ? avaliacoes[pos] : null
            })

            const gridData = {
              lessons: [panorama, ...licoes].slice(0, 11),
              exercises: [null, ...exercicios].slice(0, 11),
              avaliacoes: avaliacoesGrid,
              videos: [null, ...videos].slice(0, 11),
            }

            const maxRows = Math.max(gridData.lessons.length, gridData.exercises.length, gridData.avaliacoes.length, gridData.videos.length, 11)

            const hasAnyContent = gridData.lessons.some(l => l !== null) || gridData.exercises.some(e => e !== null) || gridData.avaliacoes.some(a => a !== null) || gridData.videos.some(v => v !== null)

            if (!hasAnyContent) {
              return (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                  <Layers size={40} color="var(--primary)" style={{ marginBottom: '1rem', margin: '0 auto', display: 'block', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum conteúdo adicionado. Crie o primeiro bloco.</p>
                  <button className="btn btn-primary" style={{ width: 'auto' }}
                    onClick={() => { setAddingBloco(1); setAddingLessonType('material'); setShowAddContent(true); }}>
                    <Plus size={18} /> Criar Bloco 1
                  </button>
                </div>
              )
            }

            const renderGridItem = (item: any, label: string) => {
              if (!item) return <div style={{ height: '90px' }} />

              const isAvaliacao = item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final
              const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade'

              let borderColor = 'var(--glass-border)'
              if (isAvaliacao) borderColor = '#eab308'
              else if (isExercicio) borderColor = '#10b981'

              return (
                <div
                  key={item.id}
                  draggable={canEdit}
                  onDragStart={(e) => onDragStart(e, item.id)}
                  onDragOver={(e) => onDragOver(e, item.id)}
                  onDrop={(e) => onDrop(e, item.id, lessons, () => fetchLessons(selectedBook.id), 'aulas')}
                  style={{
                    padding: '1.1rem',
                    background: dragOverId === item.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--glass)',
                    border: `1px solid ${borderColor}`,
                    borderLeft: `5px solid ${borderColor}`,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    transition: 'all 0.2s',
                    marginBottom: '0.5rem',
                    height: '90px',
                    overflow: 'hidden',
                    position: 'relative',
                    opacity: draggedId === item.id ? 0.4 : 1,
                  }}
                  onClick={() => navigate(`/lesson/${item.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = dragOverId === item.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--glass)' }}
                >
                  {/* Botões admin */}
                  {canEdit && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '0.25rem' }}
                    >
                      <button
                        className="btn btn-outline"
                        style={{ width: 'auto', padding: '0.2rem 0.4rem', background: 'rgba(0,0,0,0.4)', color: 'var(--error)', fontSize: '0.6rem' }}
                        onClick={() => handleDelete('aulas', item.id)}
                        title="Excluir"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isAvaliacao ? '#eab308' : isExercicio ? '#10b981' : 'var(--primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titulo}
                    </div>
                  </div>
                  <Eye size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              )
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>

                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {renderGridItem(gridData.lessons[rowIndex], rowIndex === 0 ? 'Panorama' : `Lição ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.exercises[rowIndex], rowIndex === 0 ? '' : `Exercício ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.videos[rowIndex], rowIndex === 0 ? '' : `Vídeo ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.avaliacoes[rowIndex], rowIndex === 8 ? 'Avaliação' : rowIndex === 9 ? 'Recuperação' : rowIndex === 10 ? '2ª Recuperação' : '')}
                  </React.Fragment>
                ))}
              </div>
            )
          })()}
        </div>

      /* ── Lesson Items grouped by Bloco ── */
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {lessonItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
              <Layers size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum conteúdo adicionado. Crie o primeiro bloco.</p>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={() => { setAddingBloco(1); setAddingLessonType('material'); setShowAddContent(true); }}>
                <Plus size={18} /> Criar Bloco 1
              </button>
            </div>
          ) : (
            <>
              {(() => {
              const grouped = groupByBloco(lessonItems)
              const sortedBlocoKeys = Array.from(grouped.keys()).sort((a, b) => a - b)

              return sortedBlocoKeys.map(blocoKey => {
                const items = grouped.get(blocoKey)!
                const hasVideo = items.some(i => i.tipo === 'gravada' || i.tipo === 'ao_vivo')
                const lessonsCount = items.filter(i => i.tipo === 'material' || (!['gravada','ao_vivo','atividade','prova'].includes(i.tipo))).length
                const exercisesCount = items.filter(i => i.tipo === 'atividade' || i.tipo === 'prova').length
                const videosCount = items.filter(i => i.tipo === 'gravada' || i.tipo === 'ao_vivo').length

                return (
                  <div key={blocoKey} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px', overflow: 'hidden' }}>
                    {/* Block Header */}
                    <div 
                      onDragOver={(e) => onDragOver(e, 'bloco-' + blocoKey)}
                      onDrop={(e) => onDrop(e, null, lessonItems, () => fetchLessonItems(selectedLesson.id), 'aulas', blocoKey)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem 1.5rem', 
                        background: blocoKey === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(var(--primary-rgb), 0.08)', 
                        borderBottom: '1px solid var(--glass-border)',
                        borderTop: dragOverId === 'bloco-' + blocoKey ? '2px solid var(--primary)' : 'none'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Layers size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {blocoKey === 0 ? 'Sem Bloco Atribuído' : `Bloco ${blocoKey}`}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                          {lessonsCount} lição(ões) · {exercisesCount} exercício(s) · {videosCount} vídeo(s)
                        </span>
                      </div>
                      {canEdit && blocoKey !== 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                            onClick={() => handleAddToBloco('material', blocoKey)} title="Adicionar lição/material a este bloco">
                            <Plus size={14} /> Lição
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--success)' }}
                            onClick={() => handleAddToBloco('atividade', blocoKey)} title="Adicionar exercício a este bloco">
                            <Plus size={14} /> Exercício
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--primary)' }}
                            onClick={() => handleAddToBloco('gravada', blocoKey)} title="Adicionar vídeo-aula a este bloco">
                            <Plus size={14} /> Vídeo
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: '#EAB308', borderColor: 'rgba(234, 179, 8, 0.3)' }}
                            onClick={() => handleAddToBloco('prova', blocoKey)} title="Adicionar Prova Final a este bloco">
                            <Award size={14} /> Prova Final
                          </button>
                          <button className="btn btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }}
                            onClick={() => triggerBatchUpload(blocoKey, items.length + 1)} title="Upload de vários PDFs de uma vez">
                            {uploading === 'batch' ? <Loader2 size={14} className="spinner" /> : <Upload size={14} />} 
                            <span style={{ marginLeft: '4px' }}>Upload Lote</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {items.filter(i => !i.is_bloco_final).map((item, idx) => (
                        <div 
                          key={item.id} 
                          draggable={canEdit}
                          onDragStart={(e) => onDragStart(e, item.id)}
                          onDragOver={(e) => onDragOver(e, item.id)}
                          onDrop={(e) => onDrop(e, item.id, lessonItems, () => fetchLessonItems(selectedLesson.id), 'aulas')}
                          className={item.tipo === 'prova' || item.is_bloco_final ? 'prova-final-item' : ''}
                          style={{
                            padding: '1rem 1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            transition: 'all 0.2s ease',
                            borderTop: dragOverId === item.id ? '2px solid var(--primary)' : 'none',
                            opacity: draggedId === item.id ? 0.4 : 1,
                            background: item.tipo === 'gravada' || item.tipo === 'ao_vivo'
                              ? 'rgba(var(--primary-rgb), 0.04)'
                              : item.tipo === 'atividade' || item.tipo === 'prova'
                              ? 'rgba(16,185,129,0.03)'
                              : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {canEdit && (
                              <div style={{ cursor: 'grab', color: 'var(--text-muted)', opacity: 0.5, display: 'flex', alignItems: 'center' }} title="Clique e arraste para reordenar">
                                <GripVertical size={20} />
                              </div>
                            )}

                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {tipoIcon(item.tipo, 18)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{item.titulo}</h4>
                                {item.is_bloco_final && (
                                  <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#EAB308', color: '#000', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                                    Avaliação Final
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tipoLabel(item.tipo)}</span>
                                {item.tipo === 'gravada' && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🔓 Auto-liberado ao concluir o bloco
                                  </span>
                                )}
                                {(item.tipo === 'atividade' || item.tipo === 'prova') && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🔐 Liberado pelo professor
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {(item.tipo !== 'atividade' && item.tipo !== 'prova') && (
                              <label className="btn btn-outline" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.4rem 0.7rem', cursor: 'pointer' }}>
                                {uploading === item.id ? <Loader2 size={12} className="spinner" /> : <Upload size={12} />} {item.arquivo_url ? 'Alterar PDF' : 'Enviar PDF'}
                                <input type="file" hidden accept=".pdf,.html" onChange={(e) => handleFileUpload(e, 'aulas', item.id, 'arquivo_url')} />
                              </label>
                            )}

                            {(item.tipo === 'gravada' || item.tipo === 'ao_vivo' || item.tipo === 'licao') && (
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }}
                                onClick={() => { setEditingLessonContent(item); setLessonBlocks(Array.isArray(item.conteudo) ? item.conteudo : []); setLessonMaterials(Array.isArray(item.materiais) ? item.materiais : []); }}
                                title="Editar Conteúdo">
                                <FileText size={14} />
                              </button>
                            )}

                            {(item.tipo === 'prova' || item.tipo === 'atividade') && (
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }}
                                onClick={() => { setEditingQuiz(item); setQuizQuestions(item.questionario || []); }}
                                title="Editar Questões">
                                <ClipboardList size={14} />
                              </button>
                            )}

                            <Link to={`/lesson/${item.id}`} className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', textDecoration: 'none', color: 'inherit', display: 'flex' }} title="Visualizar">
                              <Eye size={14} />
                            </Link>

                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }} onClick={() => setEditingItem({ type: 'content', data: item })} title="Editar"><Edit size={14} /></button>
                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', color: 'var(--error)' }} onClick={() => handleDelete('aulas', item.id)} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Block legend */}
                    {blocoKey !== 0 && (
                      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: lessonsCount >= 2 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {lessonsCount >= 2 ? '✓' : '○'} {lessonsCount}/2 lições
                        </span>
                        <span style={{ fontSize: '0.7rem', color: exercisesCount >= 2 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {exercisesCount >= 2 ? '✓' : '○'} {exercisesCount}/2 exercícios
                        </span>
                        <span style={{ fontSize: '0.7rem', color: hasVideo ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {hasVideo ? '✓' : '○'} {videosCount}/1 vídeo-aula
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
              })()}

              {/* Dedicated Final Assessment Section at the bottom */}
              {canEdit && (
                <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(234, 179, 8, 0.05)', border: '2px dashed #EAB308', borderRadius: '24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Award size={40} color="#EAB308" />
                    <div>
                      <h3 style={{ margin: 0, color: '#EAB308', fontSize: '1.25rem', fontWeight: 800 }}>AVALIAÇÃO FINAL DO MÓDULO</h3>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Esta prova será exibida ao aluno somente após a conclusão de todos os blocos acima.
                      </p>
                    </div>
                    
                    {lessonItems.filter(i => i.is_bloco_final).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                        {lessonItems.filter(i => i.is_bloco_final)
                          .sort((a,b) => (a.versao || 0) - (b.versao || 0))
                          .map(item => (
                          <div key={item.id} className="prova-final-item" style={{ width: '100%', background: 'var(--glass)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                              <div style={{ width: '40px', height: '40px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Award size={20} color="#EAB308" />
                              </div>
                              <div>
                                <strong style={{ display: 'block' }}>{item.titulo}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nota Mínima: {item.min_grade || 7}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} 
                                onClick={() => { setEditingQuiz(item); setQuizQuestions(item.questionario || []); }}
                                title="Questões"><ClipboardList size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} 
                                onClick={() => setEditingItem({ type: 'content', data: item })}
                                title="Editar"><Edit size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} 
                                onClick={() => handleDelete('aulas', item.id)}
                                title="Excluir"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button className="btn btn-primary" style={{ width: 'auto', background: '#EAB308', color: '#000', marginTop: '1rem' }}
                        onClick={() => { setAddingBloco(nextBloco); setAddingLessonType('prova'); setShowAddContent(true); }}>
                        <Plus size={20} /> Criar Prova Final
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ContentManagement
