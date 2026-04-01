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
    tipo?: string
    is_bloco_final?: boolean
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

export interface AttendanceRecord {
  id?: string
  aluno_id: string
  professor_id: string
  nucleo_id: string
  data: string
  status: 'P' | 'F'
  compartilhado: boolean
  aluno?: {
    nome: string
    email: string
  }
}

export interface Nucleo {
  id: string
  nome: string
}
