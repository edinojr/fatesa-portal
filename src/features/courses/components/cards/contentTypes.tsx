import React from 'react'
import {
  PlayCircle,
  ClipboardList,
  GraduationCap,
  FileText,
  Video,
  Radio,
  BookOpen,
  Compass,
} from 'lucide-react'

export type ContentRoot = 'panorama' | 'licoes' | 'exercicios' | 'avaliacoes' | 'videos'

export const ROOT_CONFIG: Record<
  ContentRoot,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  panorama: {
    label: 'Panorama',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.30)',
    icon: <Compass size={16} />,
  },
  licoes: {
    label: 'Lições',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.30)',
    icon: <FileText size={16} />,
  },
  exercicios: {
    label: 'Exercícios',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.30)',
    icon: <ClipboardList size={16} />,
  },
  avaliacoes: {
    label: 'Avaliações',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.10)',
    border: 'rgba(234, 179, 8, 0.30)',
    icon: <GraduationCap size={16} />,
  },
  videos: {
    label: 'Vídeos',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.30)',
    icon: <PlayCircle size={16} />,
  },
}

export const ROOT_ORDER: ContentRoot[] = ['licoes', 'exercicios', 'avaliacoes', 'videos']

export type TipoAula =
  | 'gravada'
  | 'ao_vivo'
  | 'video'
  | 'atividade'
  | 'exercicio'
  | 'prova'
  | 'avaliacao'
  | 'licao'
  | 'aula'
  | 'material'

export const TIPO_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; root: ContentRoot; icon: React.ReactNode }
> = {
  gravada:   { label: 'Vídeo Aula', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  root: 'videos',      icon: <PlayCircle size={18} /> },
  ao_vivo:   { label: 'Ao Vivo',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   root: 'videos',      icon: <Radio size={18} /> },
  video:     { label: 'Vídeo',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  root: 'videos',      icon: <Video size={18} /> },
  atividade: { label: 'Exercício',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',   root: 'exercicios',  icon: <ClipboardList size={18} /> },
  exercicio: { label: 'Exercício',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',   root: 'exercicios',  icon: <ClipboardList size={18} /> },
  prova:     { label: 'Prova',      color: '#eab308', bg: 'rgba(234,179,8,0.12)',    root: 'avaliacoes',  icon: <GraduationCap size={18} /> },
  avaliacao: { label: 'Avaliação',  color: '#eab308', bg: 'rgba(234,179,8,0.12)',    root: 'avaliacoes',  icon: <GraduationCap size={18} /> },
  licao:     { label: 'Lição',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   root: 'licoes',      icon: <FileText size={18} /> },
  aula:      { label: 'Aula',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   root: 'licoes',      icon: <BookOpen size={18} /> },
  material:  { label: 'Material',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   root: 'licoes',      icon: <FileText size={18} /> },
}

export const DEFAULT_TIPO = TIPO_CONFIG.aula

export function getTipoConfig(tipo: string) {
  return TIPO_CONFIG[tipo] || DEFAULT_TIPO
}

export function getRootForLesson(lesson: { tipo: string; is_bloco_final?: boolean }): ContentRoot {
  if (lesson.is_bloco_final) return 'avaliacoes'
  return getTipoConfig(lesson.tipo).root
}

export function groupByRoot<T extends { tipo: string; is_bloco_final?: boolean }>(items: T[]): Record<ContentRoot, T[]> {
  const grouped: Record<ContentRoot, T[]> = {
    panorama: [],
    licoes: [],
    exercicios: [],
    avaliacoes: [],
    videos: [],
  }
  for (const item of items) {
    grouped[getRootForLesson(item)].push(item)
  }
  return grouped
}

export const ROOT_ACTION_LABEL: Record<ContentRoot, (lesson: any) => string> = {
  panorama: () => 'Ver Panorama',
  licoes: (l) => (l.pdf_url || l.arquivo_url ? 'Ler Material' : 'Abrir Lição'),
  exercicios: () => 'Fazer Exercício',
  avaliacoes: () => 'Iniciar Avaliação',
  videos: () => 'Assistir Vídeo',
}
