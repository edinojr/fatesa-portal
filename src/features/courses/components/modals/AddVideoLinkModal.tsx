import React, { useState, useEffect } from 'react'
import { X, Video, Loader2, Plus, Save } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { handleSupabaseError } from '../../../../lib/authUtils'

interface AddVideoLinkModalProps {
  open: boolean
  book: any | null
  onClose: () => void
  onInserted?: () => void
  showToast?: (msg: string, type?: 'success' | 'error') => void
  video?: any | null
}

const isValidVideoUrl = (url: string) => /^https?:\/\/.+/i.test(url.trim())

/**
 * Inserção/edição de videoaula por LINK (YouTube/Vimeo).
 * Usado no gerenciamento de conteúdos do admin e do professor:
 * o docente informa o nome da aula (ex: "Aula 1 e 2") e o link do vídeo.
 * Quando `video` é informado, o modal entra em modo edição e atualiza
 * o título/link de uma videoaula existente.
 */
const AddVideoLinkModal: React.FC<AddVideoLinkModalProps> = ({ open, book, video, onClose, onInserted, showToast }) => {
  const isEdit = !!video
  const [titulo, setTitulo] = useState(video?.titulo || '')
  const [link, setLink] = useState(video?.video_url || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitulo(video?.titulo || '')
      setLink(video?.video_url || '')
      setSaving(false)
    }
  }, [open, video])

  if (!open || (!book && !video)) return null

  const reset = () => {
    setTitulo('')
    setLink('')
    setSaving(false)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !link.trim()) return
    if (!isValidVideoUrl(link)) {
      showToast?.('Informe um link válido (começando com http/https).', 'error')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('aulas').update({
          titulo: titulo.trim(),
          video_url: link.trim()
        }).eq('id', video.id)
        if (error) throw error
        showToast?.('Videoaula atualizada com sucesso!')
      } else {
        const { data: maxOrder } = await supabase
          .from('aulas')
          .select('ordem')
          .eq('livro_id', book.id)
          .in('tipo', ['gravada', 'ao_vivo', 'video'])
          .order('ordem', { ascending: false })
          .limit(1)

        const newOrder = (maxOrder?.[0]?.ordem || 0) + 1

        const { error } = await supabase.from('aulas').insert({
          livro_id: book.id,
          titulo: titulo.trim(),
          tipo: 'gravada',
          video_url: link.trim(),
          ordem: newOrder,
          questionario: []
        })
        if (error) throw error
        showToast?.('Videoaula adicionada com sucesso!')
      }

      reset()
      onClose()
      onInserted?.()
    } catch (err: any) {
      const handled = await handleSupabaseError(err)
      if (!handled) showToast?.(isEdit ? 'Erro ao editar vídeo: ' : 'Erro ao adicionar vídeo: ' + (err?.message || 'verifique as permissões'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Video size={24} color="var(--primary)" /> {isEdit ? 'Editar Vídeo' : 'Adicionar Vídeo'}
          </h2>
          <button className="btn-icon" onClick={handleClose}><X size={20} /></button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0 }}>
          {isEdit
            ? <>Edite o nome da aula e/ou o link do vídeo (YouTube/Vimeo).</>
            : <>Módulo: <strong>{book.titulo}</strong> — insira o nome da aula e o link do vídeo (YouTube/Vimeo).</>}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome da Aula</label>
            <input
              type="text"
              className="form-control"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Aula 1 e 2"
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Link do Vídeo</label>
            <input
              type="text"
              className="form-control"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              disabled={saving}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={handleClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saving ? <Loader2 size={18} className="spinner" /> : isEdit ? <Save size={18} /> : <Plus size={18} />} {isEdit ? 'Salvar Vídeo' : 'Adicionar Vídeo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddVideoLinkModal
