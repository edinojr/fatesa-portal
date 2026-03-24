import React from 'react'
import { GraduationCap, ShieldCheck, Loader2, Trash2, UserPlus, Edit2 } from 'lucide-react'
import Badge from '../ui/Badge'
import LoadingSpinner from '../ui/LoadingSpinner'

interface UserManagementProps {
  users: any[]
  searchTerm: string
  userRole: string | null
  actionLoading: string | null
  handleTypeChange: (userId: string, newType: string) => Promise<void>
  handleApproveAccess: (userId: string) => Promise<void>
  handleToggleBlock: (userId: string, currentStatus: boolean) => Promise<void>
  handleToggleGratuidade: (userId: string, currentStatus: boolean) => Promise<void>
  handleUpdateUserNucleo: (userId: string, nucleoId: string) => Promise<void>
  handleUpdateUserName: (userId: string, newName: string) => Promise<void>
  handleDeleteUser: (userId: string) => Promise<void>
  setShowAddAdmin: (val: boolean) => void
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  searchTerm,
  userRole,
  actionLoading,
  handleTypeChange,
  handleApproveAccess,
  handleToggleBlock,
  handleToggleGratuidade,
  handleUpdateUserNucleo,
  handleUpdateUserName,
  handleDeleteUser,
  setShowAddAdmin
}) => {
  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedUsers = filteredUsers.reduce((acc: any, user: any) => {
    const nucName = user.nucleos?.nome || 'Sem Núcleo Definido';
    if (!acc[nucName]) acc[nucName] = [];
    acc[nucName].push(user);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddAdmin(true)}
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} /> Adicionar Usuário
        </button>
      </div>
      {Object.entries(groupedUsers)
        .sort(([nA], [nB]) => nA.localeCompare(nB))
        .map(([nucleoName, nucleoUsers]: [string, any]) => (
          <div key={nucleoName} className="data-card" style={{ padding: '0', background: 'transparent', border: 'none' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              marginBottom: '1rem',
              padding: '1rem 1.5rem',
              background: 'rgba(156, 39, 176, 0.1)',
              borderRadius: '12px',
              borderLeft: '4px solid var(--primary)'
            }}>
              <GraduationCap size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {nucleoName} 
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({nucleoUsers.length} alunos)
                </span>
              </h3>
            </div>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome / Email</th>
                  <th>Tipo</th>
                  <th>Status Acesso</th>
                  <th>Financeiro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {nucleoUsers
                  .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                  .map((user: any) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, marginRight: '0.5rem' }}>{user.nome}</div>
                          <button 
                            className="btn-icon" 
                            style={{ padding: '2px', opacity: 0.5 }}
                            onClick={() => {
                              const newName = prompt('Novo nome para o usuário:', user.nome);
                              if (newName && newName !== user.nome) handleUpdateUserName(user.id, newName);
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
                          style={{ width: '150px' }} 
                          value={user.tipo} 
                          onChange={(e) => handleTypeChange(user.id, e.target.value)}
                        >
                          <option value="presencial">Presencial</option>
                          <option value="online">Online</option>
                          <option value="professor">Professor</option>
                          <option value="admin">Admin</option>
                          <option value="suporte">Suporte</option>
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
                        {user.bolsista ? (
                          <Badge variant="success">100% Bolsista</Badge>
                        ) : (
                          <Badge variant="muted">Pagante (R$ 70)</Badge>
                        )}
                        <button 
                          className="btn btn-outline" 
                          style={{ marginTop: '0.5rem', width: '100%', padding: '0.2rem 0', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
                          onClick={() => handleToggleGratuidade(user.id, !!user.bolsista)}
                        >
                          {user.bolsista ? 'Revogar Bolsa' : 'Dar Gratuidade'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                          <button 
                            className="btn" 
                            style={{ 
                              width: 'auto', 
                              background: 'rgba(255, 77, 77, 0.1)', 
                              color: 'var(--error)',
                              padding: '0.4rem'
                            }}
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            title="Excluir Usuário"
                          >
                            {actionLoading === user.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
};

export default UserManagement;
