import React from 'react'
import { Eye, Users, UserCheck, TrendingUp, History, Globe } from 'lucide-react'

interface AnalyticsDashboardProps {
  data: any
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Processando dados de acesso...</div>

  const stats = [
    { 
      label: 'Total de Visualizações', 
      value: data.totalViews, 
      icon: <Eye size={24} />, 
      color: 'var(--primary)',
      desc: 'Soma de todas as páginas acessadas'
    },
    { 
      label: 'Sessões Únicas', 
      value: data.uniqueSessions, 
      icon: <Globe size={24} />, 
      color: '#3b82f6',
      desc: 'Visitantes e Usuários únicos totais'
    },
    { 
      label: 'Usuários Ativos (Hoje)', 
      value: data.dau, 
      icon: <UserCheck size={24} />, 
      color: 'var(--success)',
      desc: 'Alunos registrados que acessaram hoje'
    },
    { 
      label: 'Rotatividade (7 Dias)', 
      value: data.activeLast7, 
      icon: <TrendingUp size={24} />, 
      color: '#f59e0b',
      desc: 'Sessões ativas na última semana'
    }
  ]

  return (
    <div className="analytics-dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, i) => (
          <div key={i} className="data-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ color: stat.color, background: `${stat.color}15`, padding: '10px', borderRadius: '12px' }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{stat.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Users size={20} /> Distribuição de Acessos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                 <span>Usuários Registrados</span>
                 <span style={{ fontWeight: 700 }}>{((data.registeredViews / data.totalViews) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--primary)', width: `${(data.registeredViews / data.totalViews) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                 <span>Visitantes (Não logados)</span>
                 <span style={{ fontWeight: 700 }}>{((data.visitorViews / data.totalViews) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3b82f6', width: `${(data.visitorViews / data.totalViews) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <History size={20} /> Últimos Acessos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.logs.slice(0, 5).map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem', 
                    background: log.user_type === 'registrado' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: log.user_type === 'registrado' ? 'var(--primary)' : '#3b82f6'
                  }}>
                    {log.user_type.toUpperCase()}
                  </span>
                  <span style={{ opacity: 0.8 }}>{log.path}</span>
                </div>
                <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
