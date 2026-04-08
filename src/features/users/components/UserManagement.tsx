import React from 'react'
import { GraduationCap, Users, ShieldCheck, Loader2, Trash2, UserPlus, Edit2, BookOpen, RotateCcw, CreditCard, LayoutGrid, MapPin } from 'lucide-react'
import Badge from '../../../components/ui/Badge'

interface UserManagementProps {
  users: any[]
  allNucleos: any[]
  searchTerm: string,
  actionLoading: string | null
  handleTypeChange: (userId: string, newType: string) => Promise<void>
  handleApproveAccess: (userId: string) => Promise<void>
  handleToggleBlock: (userId: string, currentStatus: boolean) => Promise<void>
  handleToggleGratuidade: (userId: string, currentStatus: boolean) => Promise<void>
  handleUpdateUserNucleo: (userId: string, nucleoId: string) => Promise<void>
  handleUpdateUserName: (userId: string, newName: string) => Promise<void>
  handleDeleteUser: (userId: string) => Promise<void>
  handleResetActivities: (userId: string) => Promise<void>
  handleManualPayment: (userId: string) => Promise<void>
  setShowAddAdmin: (val: boolean) => void
  onAddNucleo?: () => void
  pendingActivityByNucleo?: Record<string, { students: number; payments: number }>
  handleDeleteNucleo?: (nucleoId: string) => Promise<void>
}

const STAFF_TYPES = ['professor', 'admin', 'suporte']

const UserRow = ({ user, allNucleos, actionLoading, handleTypeChange, handleApproveAccess, handleToggleBlock, handleToggleGratuidade, handleUpdateUserNucleo, handleUpdateUserName, handleDeleteUser, handleResetActivities, handleManualPayment }: any) => {
  const isProf = STAFF_TYPES.includes(user.tipo)
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, marginRight: '0.5rem' }}>{user.nome}</div>
          {user.hasPendingPayment && (
            <span title="Comprovante pendente de validação" style={{ display: 'flex', alignItems: 'center', marginRight: '0.4rem' }}>
              <CreditCard size={14} color="var(--primary)" style={{ animation: 'pulse 2s infinite' }} />
            </span>
          )}
          <button
            className="btn-icon"
            style={{ padding: '2px', opacity: 0.5 }}
            onClick={() => {
              const newName = prompt('Novo nome para o usuário:', user.nome)
              if (newName && newName !== user.nome) handleUpdateUserName(user.id, newName)
            }}
            title="Editar Nome"
          >
            <Edit2 size={14} />
          </button>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
      </td>
      <td>
        <select
          className="form-control"
          style={{ width: '130px', fontSize: '0.85rem', padding: '0.5rem' }}
          value={user.tipo}
          onChange={(e) => handleTypeChange(user.id, e.target.value)}
        >
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
          <option value="super_visitante">Super Visitante</option>
          <option value="ex_aluno">Ex-Aluno</option>
          <option value="colaborador">Colaborador</option>
          <option value="professor">Professor</option>
          <option value="admin">Admin</option>
          <option value="suporte">Suporte</option>
        </select>
      </td>
      <td>
        <select
          className="form-control"
          style={{ width: '180px', fontSize: '0.85rem', padding: '0.5rem' }}
          value={user.nucleo_id || ''}
          onChange={(e) => {
            const nId = e.target.value;
            const nName = allNucleos.find((n: any) => n.id === nId)?.nome || 'Sem Núcleo';
            if (window.confirm(`Deseja realmente trocar o núcleo deste aluno para "${nName}"?`)) {
              handleUpdateUserNucleo(user.id, nId);
            }
          }}
        >
          <option value="">Sem Núcleo</option>
          {allNucleos.map((n: any) => (
            <option key={n.id} value={n.id}>{n.nome}</option>
          ))}
        </select>
      </td>
      <td>
        {user.acesso_definitivo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <ShieldCheck size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Definitivo</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="error">Temporário</Badge>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              onClick={() => handleApproveAccess(user.id)}
              disabled={actionLoading === user.id}
            >
              {actionLoading === user.id ? <Loader2 className="spinner" size={12} /> : 'Aprovar'}
            </button>
          </div>
        )}
      </td>
      <td>
        {isProf ? (
          <Badge variant="success">Isento</Badge>
        ) : user.bolsista ? (
          <>
            <Badge variant="success">100% Bolsista</Badge>
            <button
              className="btn btn-outline"
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.2rem 0', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
              onClick={() => handleToggleGratuidade(user.id, true)}
            >
              Revogar Bolsa
            </button>
          </>
        ) : (
          <>
            <Badge variant="muted">Pagante (R$ 70)</Badge>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ width: '100%', padding: '0.2rem 0', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => handleToggleGratuidade(user.id, false)}
              >
                Dar Gratuidade
              </button>
              <button
                className="btn"
                style={{ width: '100%', padding: '0.4rem 0', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                onClick={() => handleManualPayment(user.id)}
                disabled={actionLoading === user.id}
              >
                {actionLoading === user.id ? <Loader2 className="spinner" size={12} /> : 'Registrar Pagamento'}
              </button>
            </div>
          </>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isProf && (
            <button
              className="btn"
              style={{
                width: 'auto',
                background: user.bloqueado ? 'var(--success)' : 'rgba(255, 77, 77, 0.1)',
                color: user.bloqueado ? '#fff' : 'var(--error)',
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem'
              }}
              onClick={() => handleToggleBlock(user.id, !!user.bloqueado)}
              disabled={actionLoading === user.id}
            >
              {user.bloqueado ? 'Ativar' : 'Bloquear'}
            </button>
          )}
          {!isProf && (
            <button
              className="btn"
              style={{ width: 'auto', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.4rem' }}
              onClick={() => handleResetActivities(user.id)}
              disabled={actionLoading === user.id}
              title="Resetar Atividades e Progresso"
            >
              {actionLoading === user.id ? <Loader2 className="spinner" size={16} /> : <RotateCcw size={16} />}
            </button>
          )}
          <button
            className="btn"
            style={{ width: 'auto', background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error)', padding: '0.4rem' }}
            onClick={() => handleDeleteUser(user.id)}
            disabled={actionLoading === user.id}
            title="Excluir Usuário"
          >
            {actionLoading === user.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

interface SubTableProps {
  title: string
  icon: React.ReactNode
  color: string
  users: any[]
  allNucleos: any[]
  actionLoading: string | null
  handlers: any
}

const SubTable: React.FC<SubTableProps> = ({ title, icon, color, users, allNucleos, actionLoading, handlers }) => {
  if (users.length === 0) return null
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
        {icon}
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{title}</h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({users.length})</span>
      </div>
      <div className="admin-table-scrollbar" style={{ 
        width: '100%', 
        overflowX: 'auto', 
        marginBottom: '1.5rem',
        paddingBottom: '1rem'
      }}>
        <table className="admin-table" style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th>Nome / Email</th>
              <th>Tipo</th>
              <th>Polo / Núcleo</th>
              <th>Status Acesso</th>
              <th>Financeiro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...users].sort((a, b) => a.nome.localeCompare(b.nome)).map((user: any) => (
              <UserRow
                key={user.id}
                user={user}
                allNucleos={allNucleos}
                actionLoading={actionLoading}
                {...handlers}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const UserManagement: React.FC<UserManagementProps> = ({
  users, allNucleos, searchTerm, actionLoading,
  handleTypeChange, handleApproveAccess, handleToggleBlock,
  handleToggleGratuidade, handleUpdateUserNucleo, handleUpdateUserName,
  handleDeleteUser, handleResetActivities, handleManualPayment, setShowAddAdmin, onAddNucleo,
  pendingActivityByNucleo = {},
  handleDeleteNucleo
}) => {
    const [selectedNucleoFilter, setSelectedNucleoFilter] = React.useState<string | null>(null)
  
    const filteredUsers = users.filter(u => {
      const matchSearch = u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchNucleo = !selectedNucleoFilter || u.nucleo_id === selectedNucleoFilter
      return matchSearch && matchNucleo
    })
  
    const groupedByNucleo = filteredUsers.reduce((acc: any, user: any) => {
      const nucName = user.nucleos?.nome || 'Sem Núcleo Definido'
      if (!acc[nucName]) acc[nucName] = { professors: [], students: [] }
      if (STAFF_TYPES.includes(user.tipo)) {
        acc[nucName].professors.push(user)
      } else {
        acc[nucName].students.push(user)
      }
      return acc
    }, {})
  
    const handlers = {
      handleTypeChange, handleApproveAccess, handleToggleBlock,
      handleToggleGratuidade, handleUpdateUserNucleo, handleUpdateUserName, handleDeleteUser, handleResetActivities, handleManualPayment
    }

    // Sort Nucleos Alphabetically
    const sortedNucleos = [...allNucleos].sort((a, b) => a.nome.localeCompare(b.nome))
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            {selectedNucleoFilter && (
              <button 
                className="btn-icon" 
                onClick={() => setSelectedNucleoFilter(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass)', borderRadius: '12px', padding: '0.6rem 1.2rem', color: 'var(--primary)', fontWeight: 700 }}
              >
                <LayoutGrid size={18} /> Ver todos os Polos
              </button>
            )}
            {!selectedNucleoFilter && (
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, opacity: 0.8 }}>Escolha um Polo para gerenciar</h2>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-outline"
              onClick={onAddNucleo}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass)' }}
            >
              <GraduationCap size={18} /> Adicionar Núcleo
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddAdmin(true)}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserPlus size={18} /> Adicionar Usuário
            </button>
          </div>
        </div>

        {/* Global Search Results override OR Polo Selection Grid */}
        {(!selectedNucleoFilter && !searchTerm) ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '1.5rem',
            padding: '0.5rem'
          }}>
            {sortedNucleos.map(nucleo => {
              const activity = pendingActivityByNucleo[nucleo.id] || { students: 0, payments: 0 }
              const hasActivity = activity.students > 0 || activity.payments > 0
              
              const nucleoStudentsCount = users.filter(u => u.nucleo_id === nucleo.id).length

              return (
                <div 
                  key={nucleo.id}
                  className="card hover-glow"
                  onClick={() => setSelectedNucleoFilter(nucleo.id)}
                  style={{ 
                    cursor: 'pointer',
                    padding: '1.5rem',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    border: hasActivity ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--glass-border)',
                    background: hasActivity ? 'rgba(var(--primary-rgb), 0.02)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ 
                      background: hasActivity ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                      color: hasActivity ? '#fff' : 'var(--text-muted)',
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MapPin size={24} />
                    </div>

                    {hasActivity && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {activity.students > 0 && (
                          <div title={`${activity.students} Novos Alunos`} style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', fontWeight: 800 }}>
                            {activity.students} NOVO
                          </div>
                        )}
                        {activity.payments > 0 && (
                          <div title="Pagamento Pendente" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', fontWeight: 800 }}>
                            <CreditCard size={12} />
                          </div>
                        )}
                      </div>
                    )}

                    {handleDeleteNucleo && (
                      <button 
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNucleo(nucleo.id);
                        }}
                        style={{ 
                          padding: '8px', 
                          color: 'var(--error)', 
                          background: 'rgba(255, 77, 77, 0.1)', 
                          borderRadius: '8px',
                          opacity: 0.6,
                          transition: 'opacity 0.2s'
                        }}
                        title="Excluir Núcleo"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{nucleo.nome}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={14} /> {nucleoStudentsCount} Alunos cadastrados
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Gerenciar <LayoutGrid size={14} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Detailed List View (Filtrada por Polo ou Busca Global) */
          <div>
            {searchTerm && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                <span style={{ fontWeight: 700 }}>Busca Global ativa por "{searchTerm}":</span> {filteredUsers.length} resultados encontrados.
              </div>
            )}

            {Object.entries(groupedByNucleo)
              .sort(([nA], [nB]) => nA.localeCompare(nB))
              .map(([nucleoName, groups]: [string, any]) => (
                <div key={nucleoName}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    marginBottom: '1.5rem', padding: '1rem 1.5rem',
                    background: 'rgba(156, 39, 176, 0.1)',
                    borderRadius: '12px', borderLeft: '4px solid var(--primary)'
                  }}>
                    <GraduationCap size={22} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      {nucleoName}
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.75rem' }}>
                        {groups.professors.length} prof. · {groups.students.length} alunos
                      </span>
                    </h3>
                  </div>

                  <SubTable
                    title="Equipe / Docentes"
                    icon={<BookOpen size={16} color="var(--primary)" />}
                    color="var(--primary)"
                    users={groups.professors}
                    allNucleos={allNucleos}
                    actionLoading={actionLoading}
                    handlers={handlers}
                  />

                  <SubTable
                    title="Alunos"
                    icon={<Users size={16} color="var(--text-muted)" />}
                    color="var(--text-muted)"
                    users={groups.students}
                    allNucleos={allNucleos}
                    actionLoading={actionLoading}
                    handlers={handlers}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    )
}

export default UserManagement
