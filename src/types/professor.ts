export interface Submission {
  // Dados Básicos da Submissão
  id?: string;
  submission_id: string; // ID vindo da view
  respostas: any;
  nota: number | null;
  comentario_professor: string | null;
  status: 'pendente' | 'corrigida';
  created_at?: string;
  submitted_at: string;
  last_updated?: string;
  tentativas: number;
  primeira_correcao_at?: string;
  
  // Informações da Aula (Flattened)
  lesson_id?: string;
  lesson_title: string;
  lesson_type?: string;
  questionario?: any[];
  is_bloco_final?: boolean;
  
  // Informações do Livro
  book_id?: string;
  book_title?: string;
  aula_id?: string;
  
  // Informações do Aluno (Flattened)
  student_id: string;
  student_name: string;
  student_email: string;
  student_graduation_year?: string;
  aluno_id?: string;
  
  // Informações do Núcleo (Flattened)
  nucleus_id: string;
  nucleus_name: string;

  // Legado para compatibilidade se necessário
  aulas?: {
    id: string;
    titulo: string;
    questionario: any[];
    tipo?: string;
    is_bloco_final?: boolean;
  };
  users?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface Student {
  id: string
  nome: string
  email: string
  tipo?: string
  nucleo_id?: string
  status_nucleo?: string
  nucleos?: {
    id: string
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
