export interface Submission {
  id: string
  respostas: any
  nota: number | null
  comentario_professor: string | null
  bloqueio_final: boolean
  status: 'pendente' | 'corrigida'
  created_at: string
  tentativas: number
  primeira_correcao_at?: string
  aulas: {
    id: string
    titulo: string
    questionario: any[]
  }
  users: {
    id: string
    nome: string
    email: string
  }
}

export interface Student {
  id: string
  nome: string
  email: string
  status_nucleo?: string
  nucleos?: {
    nome: string
  }
}

export interface ProfessorCourse {
  id: string
  nome: string
  livros: any[]
}
