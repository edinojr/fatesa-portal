export interface Lesson {
  id: string
  titulo: string
  tipo: 'gravada' | 'ao_vivo' | 'atividade' | 'prova' | 'licao' | 'video' | 'aula'
  concluida?: boolean
  arquivo_url?: string
  pdf_url?: string
  lockedByProfessor?: boolean
  parent_aula_id?: string
  parent_id?: string
  ordem?: number
  is_bloco_final?: boolean
  isHidden?: boolean
  versao?: number
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
  nivel?: 'basico' | 'medio'
  livros: Book[]
}

export interface Documento {
  id: string
  tipo: 'rg' | 'cnh' | 'residencia' | 'exame' | 'certidao' | 'outro'
  url: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  feedback?: string
  created_at: string
}

export interface Pagamento {
  id: string
  valor: number
  status: 'aberto' | 'pago' | 'atrasado' | 'rejeitado' | 'aprovado'
  data_vencimento: string
  comprovante_url?: string
  feedback?: string
  descricao?: string
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
