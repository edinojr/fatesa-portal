import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  User, 
  Clock, 
  ChevronLeft, 
  Plus, 
  X, 
  Loader2,
  AlertCircle,
  Hash
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface ForumPanelProps {
  userProfile: any
}

interface Topic {
  id: string
  titulo: string
  categoria: string
  user_id: string
  created_at: string
  author?: {
    nome: string
    tipo: string
  }
}

interface Message {
  id: string
  topic_id: string
  user_id: string
  conteudo: string
  image_url: string | null
  created_at: string
  author?: {
    nome: string
    tipo: string
  }
}

const ForumPanel: React.FC<ForumPanelProps> = ({ userProfile }) => {
  const [topics, setTopics] = useState<Topic[]>([])
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // New Topic Form
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicCategory, setNewTopicCategory] = useState('geral')
  
  // New Message Form
  const [newMessageContent, setNewMessageContent] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    if (activeTopic) {
      fetchMessages(activeTopic.id)
    }
  }, [activeTopic])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTopics = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('forum_topics')
        .select('*, author:users(nome, tipo)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTopics(data || [])
    } catch (err) {
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_mensagens')
        .select('*, author:users(nome, tipo)')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopicTitle.trim()) return
    
    setActionLoading('create-topic')
    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .insert({
          titulo: newTopicTitle,
          categoria: newTopicCategory,
          user_id: userProfile.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      setNewTopicTitle('')
      setShowNewTopic(false)
      fetchTopics()
      if (data) setActiveTopic(data)
    } catch (err: any) {
      alert('Erro ao criar tópico: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1MB Limit
    if (file.size > 1024 * 1024) {
      alert('A imagem deve ter no máximo 1MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessageContent.trim() && !selectedImage) return
    if (!activeTopic) return

    setActionLoading('send-message')
    try {
      let imageUrl = null
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `messages/${userProfile.id}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('forum')
          .upload(filePath, selectedImage)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('forum')
          .getPublicUrl(filePath)
        
        imageUrl = publicUrl
      }

      const { error } = await supabase
        .from('forum_mensagens')
        .insert({
          topic_id: activeTopic.id,
          user_id: userProfile.id,
          conteudo: newMessageContent,
          image_url: imageUrl
        })
      
      if (error) throw error
      
      setNewMessageContent('')
      setSelectedImage(null)
      setImagePreview(null)
      fetchMessages(activeTopic.id)
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Deseja excluir esta mensagem?')) return
    
    try {
      const { error } = await supabase
        .from('forum_mensagens')
        .delete()
        .eq('id', messageId)
      
      if (error) throw error
      if (activeTopic) fetchMessages(activeTopic.id)
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const canManage = (authorId: string) => {
    return authorId === userProfile.id || ['admin', 'professor', 'suporte'].includes(userProfile.tipo)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="spinner" /> Carregando fórum...</div>

  return (
    <div className="forum-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '600px' }}>
      {!activeTopic ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare size={24} color="var(--primary)" /> Fórum de Discussão
            </h2>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowNewTopic(true)}>
              <Plus size={20} /> Novo Tópico
            </button>
          </div>

          {showNewTopic && (
            <div className="admin-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Criar Novo Tópico</h3>
                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setShowNewTopic(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Título do Tópico</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Sobre o que você quer falar?"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select 
                    className="form-control"
                    value={newTopicCategory}
                    onChange={(e) => setNewTopicCategory(e.target.value)}
                  >
                    <option value="geral">Geral</option>
                    <option value="duvida">Dúvidas Acadêmicas</option>
                    <option value="sugestao">Sugestões</option>
                    <option value="biblia">Estudo Bíblico</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={!!actionLoading}>
                  {actionLoading === 'create-topic' ? <Loader2 className="spinner" /> : 'Criar Tópico'}
                </button>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {topics.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                Nenhum tópico criado ainda. Seja o primeiro!
              </div>
            ) : (
              topics.map(topic => (
                <div 
                  key={topic.id} 
                  className="course-card" 
                  style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                  onClick={() => setActiveTopic(topic)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                      #{topic.categoria}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {new Date(topic.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', lineHeight: '1.4' }}>{topic.titulo}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} className="text-primary" />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{topic.author?.nome || 'Usuário'}</span>
                    {topic.author?.tipo !== 'online' && (
                      <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--primary)', color: '#000', fontWeight: 900 }}>
                        {topic.author?.tipo.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 250px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setActiveTopic(null)}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>#{activeTopic.categoria}</span>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{activeTopic.titulo}</h2>
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '24px', 
            border: '1px solid var(--glass-border)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {messages.map((msg, index) => (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: msg.user_id === userProfile.id ? 'row-reverse' : 'row',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={20} />
                </div>
                <div style={{ 
                  maxWidth: '70%', 
                  background: msg.user_id === userProfile.id ? 'rgba(var(--primary-rgb), 0.15)' : 'var(--glass)',
                  padding: '1.25rem',
                  borderRadius: '20px',
                  border: msg.user_id === userProfile.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                  borderTopRightRadius: msg.user_id === userProfile.id ? '4px' : '20px',
                  borderTopLeftRadius: msg.user_id === userProfile.id ? '20px' : '4px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{msg.author?.nome || 'Usuário'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.conteudo}</p>
                  {msg.image_url && (
                    <div style={{ marginTop: '1rem' }}>
                      <img 
                        src={msg.image_url} 
                        alt="Content" 
                        style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                        onClick={() => window.open(msg.image_url!, '_blank')}
                      />
                    </div>
                  )}
                  {canManage(msg.user_id) && (
                    <button 
                      style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem 0 0', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.6 }}
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 size={12} /> Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ 
            background: 'var(--bg-card)', 
            padding: '1rem 1.5rem', 
            borderRadius: '24px', 
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {imagePreview && (
              <div style={{ position: 'relative', width: 'fit-content' }}>
                <img src={imagePreview} alt="Preview" style={{ height: '80px', borderRadius: '8px', border: '1px solid var(--primary)' }} />
                <button 
                  type="button" 
                  style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*" 
                onChange={handleImageSelect}
              />
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ width: '45px', height: '45px', padding: 0 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={20} />
              </button>
              <textarea 
                className="form-control" 
                rows={1}
                placeholder="Escreva sua mensagem..."
                style={{ flex: 1, minHeight: '45px', maxHeight: '150px', resize: 'none', padding: '0.75rem 1rem' }}
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e as any)
                  }
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '45px', height: '45px', padding: 0 }}
                disabled={!!actionLoading}
              >
                {actionLoading === 'send-message' ? <Loader2 className="spinner" /> : <Send size={20} />}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mantenha as postagens respeitosas. Imagens max 1MB.</p>
          </form>
        </div>
      )}

      <style>{`
        .forum-container {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default ForumPanel
