import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Search,
  ChevronLeft
} from 'lucide-react'

const Matricula = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    curso_opcao: 'Básico em Teologia',
    modalidade: 'online' as 'online' | 'presencial',
    nucleo: ''
  })

  const navigate = useNavigate()

  // Via CEP Integration
  const handleCEPBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '')
    if (cep.length !== 8) return

    setLoading(true)
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await resp.json()
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf
        }))
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const fullAddress = `${formData.endereco}, ${formData.numero} ${formData.complemento} - ${formData.bairro}, ${formData.cidade}/${formData.uf} (CEP: ${formData.cep})`
      
      const { error: dbError } = await supabase
        .from('solicitacoes_matricula')
        .insert([{
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          telefone: formData.telefone,
          endereco: fullAddress,
          curso_opcao: formData.curso_opcao,
          modalidade: formData.modalidade
        }])

      if (dbError) throw dbError
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao processar matrícula. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="success-pulse" style={{ margin: '0 auto 2rem' }}>
            <CheckCircle2 size={72} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Solicitação Enviada!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '3rem' }}>
            Recebemos seus dados, <b>{formData.nome.split(' ')[0]}</b>. No prazo de até 24h entraremos em contato via WhatsApp para finalizar sua matrícula e liberar seu acesso ao portal.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => navigate('/')} className="btn btn-primary" style={{ height: '3.5rem' }}>Voltar ao Início</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container" style={{ padding: '4rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '700px', padding: '4rem' }}>
        <div className="auth-header" style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <GraduationCap size={80} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem' }}>Sua Matrícula</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Preencha seus dados para iniciar sua jornada na FATESA.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Dados Pessoais */}
          <section>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserPlus size={20} color="var(--primary)" /> Dados Pessoais
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Nome Completo</label>
                <input type="text" name="nome" className="form-control" placeholder="Como no seu RG" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>CPF</label>
                <input type="text" name="cpf" className="form-control" placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>WhatsApp / Telefone</label>
                <input type="tel" name="telefone" className="form-control" placeholder="(00) 00000-0000" value={formData.telefone} onChange={handleInputChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>E-mail</label>
                <input type="email" name="email" className="form-control" placeholder="exemplo@gmail.com" value={formData.email} onChange={handleInputChange} required />
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={20} color="var(--primary)" /> Endereço
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>CEP</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" name="cep" className="form-control" placeholder="00000-000" value={formData.cep} onChange={handleInputChange} onBlur={handleCEPBlur} required />
                  <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 4' }}>
                <label>Rua / Logradouro</label>
                <input type="text" name="endereco" className="form-control" placeholder="Ex: Av. Brasil" value={formData.endereco} onChange={handleInputChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Número</label>
                <input type="text" name="numero" className="form-control" placeholder="123" value={formData.numero} onChange={handleInputChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 4' }}>
                <label>Complemento</label>
                <input type="text" name="complemento" className="form-control" placeholder="Apto, Bloco, etc." value={formData.complemento} onChange={handleInputChange} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Bairro</label>
                <input type="text" name="bairro" className="form-control" value={formData.bairro} onChange={handleInputChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Cidade / UF</label>
                <input type="text" className="form-control" value={`${formData.cidade} - ${formData.uf}`} disabled />
              </div>
            </div>
          </section>

          {/* Curso e Modalidade */}
          <section>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CreditCard size={20} color="var(--primary)" /> Escolha do Curso
            </h3>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Curso de Interesse</label>
                <select name="curso_opcao" className="form-control" value={formData.curso_opcao} onChange={handleInputChange}>
                  <option>Básico em Teologia</option>
                  <option>Médio em Teologia</option>
                  <option>Bacharel em Teologia</option>
                  <option>Pós-Graduação</option>
                </select>
              </div>

              <div className="form-group">
                <label>Modalidade</label>
                <div className="select-group">
                  <label className="select-option">
                    <input type="radio" name="modalidade" checked={formData.modalidade === 'presencial'} onChange={() => setFormData(prev => ({ ...prev, modalidade: 'presencial' }))} />
                    <div className="box">Presencial</div>
                  </label>
                  <label className="select-option">
                    <input type="radio" name="modalidade" checked={formData.modalidade === 'online'} onChange={() => setFormData(prev => ({ ...prev, modalidade: 'online', nucleo: '' }))} />
                    <div className="box">On-line</div>
                  </label>
                </div>

                {formData.modalidade === 'presencial' && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Escolha o Núcleo</label>
                      <select name="nucleo" className="form-control" value={formData.nucleo} onChange={handleInputChange} required>
                        <option value="">Selecione um núcleo...</option>
                        <option value="Vila Luzita">Núcleo Vila Luzita (Sto André)</option>
                      </select>
                    </div>

                    {formData.nucleo === 'Vila Luzita' && (
                      <div style={{ padding: '1.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                        <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Detalhes do Núcleo:</p>
                        <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <li>📍 <b>Endereço:</b> Av. Dom Pedro I, 3145 - Vila Pires, Sto André</li>
                          <li>👨‍🏫 <b>Professor:</b> Pr Ademar</li>
                          <li>⏰ <b>Aulas:</b> Segunda-Feira, das 19:30 às 22:00</li>
                        </ul>
                      </div>
                    )}

                    <div style={{ padding: '1.5rem', background: 'rgba(255, 171, 0, 0.1)', border: '1px solid rgba(255, 171, 0, 0.2)', borderRadius: '16px', display: 'flex', gap: '1rem' }}>
                      <AlertTriangle size={24} color="#ffab00" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '0.9rem', color: '#ffab00', fontWeight: 600 }}>
                        IMPORTANTE: A modalidade presencial requer deslocamento até o núcleo. Verifique se você possui disponibilidade para as aulas físicas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '4rem', fontSize: '1.1rem' }}>
              {loading ? <Loader2 className="spinner" /> : <><UserPlus size={22} /> Solicitar Matrícula</>}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Ao solicitar, você concorda com nossos <Link to="#">Termos e Privacidade</Link>.
            </p>
          </div>
        </form>

        <div className="auth-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2.5rem', marginTop: '4rem' }}>
          Já é aluno? <Link to="/signup" style={{ fontWeight: 700, color: 'var(--primary)' }}>Ative seu acesso aqui <ArrowRight size={16} style={{ verticalAlign: 'middle' }} /></Link>
        </div>
      </div>
    </div>
  )
}

export default Matricula
