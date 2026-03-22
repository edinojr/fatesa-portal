export interface Lesson {
  id: string
  titulo: string
  tipo: 'gravada' | 'ao_vivo' | 'atividade' | 'prova'
  concluida?: boolean
}

export interface Book {
  id: string
  titulo: string
  aulas: Lesson[]
  progresso: number
  capa_url?: string
  pdf_url?: string
  epub_url?: string
  isReleased?: boolean
  isCurrent?: boolean
  ordem?: number
}

export interface Course {
  id: string
  nome: string
  livros: Book[]
}

export interface Documento {
  id: string
  tipo: 'rg' | 'cnh' | 'residencia' | 'exame' | 'outro'
  url: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  feedback?: string
}

export interface Pagamento {
  id: string
  valor: number
  status: 'aberto' | 'pago' | 'atrasado'
  data_vencimento: string
  comprovante_url?: string
  feedback?: string
}

export interface UserProfile {
  id: string
  nome: string
  email: string
  tipo: string
  acesso_definitivo?: boolean
  data_expiracao_temp?: string
  bolsista?: boolean
  nucleo_id?: string
  status_nucleo?: string
  nucleos?: { nome: string }
}
