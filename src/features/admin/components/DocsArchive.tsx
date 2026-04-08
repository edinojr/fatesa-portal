import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Search, 
  MapPin, 
  Users, 
  History, 
  FileText, 
  GraduationCap,
  Eye,
  Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Badge from '../../../components/ui/Badge';

interface DocsArchiveProps {
  allNucleos: any[];
}

const DocsArchive: React.FC<DocsArchiveProps> = ({ allNucleos }) => {
  const [selectedNucleo, setSelectedNucleo] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'ativos' | 'alumni'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedNucleo, viewType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (viewType === 'ativos') {
        let query = supabase
          .from('users')
          .select('id, nome, email, tipo, nucleo_id, nucleos(nome), documentos(count)')
          .or('tipo.not.in.(admin,suporte,professor,colaborador),email.eq.edi.ben.jr@gmail.com')
          .order('nome');
        
        if (selectedNucleo) {
          query = query.eq('nucleo_id', selectedNucleo);
        }

        const { data: usersData } = await query;
        // Filtro de segurança no JS com exceção para o administrador-aluno
        const filteredUsers = (usersData || []).filter(u => {
          const isStaff = ['admin', 'suporte', 'professor', 'colaborador'].includes(u.tipo?.toLowerCase());
          const isSpecialAdmin = u.email === 'edi.ben.jr@gmail.com';
          return !isStaff || isSpecialAdmin;
        });
        setData(filteredUsers);
      } else {
        let query = supabase
          .from('registros_alumni')
          .select('*')
          .order('nome');
        
        if (selectedNucleo) {
          const nName = allNucleos.find(n => n.id === selectedNucleo)?.nome;
          if (nName) query = query.eq('nucleo', nName);
        }

        const { data: alumniData } = await query;
        setData(alumniData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="docs-archive-container" style={{ display: 'flex', gap: '2rem', height: '100%', minHeight: '600px' }}>
      
      {/* Sidebar de Núcleos */}
      <aside style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--primary)" /> Pólos / Núcleos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button 
              className={`nav-btn-premium ${!selectedNucleo ? 'active' : ''}`}
              onClick={() => setSelectedNucleo(null)}
              style={{ justifyContent: 'flex-start', width: '100%', border: !selectedNucleo ? '1px solid var(--primary)' : '1px solid transparent' }}
            >
              <Users size={16} /> Todos os Polos
            </button>
            {allNucleos.map(n => (
              <button 
                key={n.id}
                className={`nav-btn-premium ${selectedNucleo === n.id ? 'active' : ''}`}
                onClick={() => setSelectedNucleo(n.id)}
                style={{ justifyContent: 'flex-start', width: '100%', border: selectedNucleo === n.id ? '1px solid var(--primary)' : '1px solid transparent' }}
              >
                <Folder size={16} /> {n.nome}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            < GraduationCap size={16} style={{ marginBottom: '0.25rem' }} /> <br />
            Selecione um polo para gerenciar os documentos dos alunos e ex-alunos vinculados.
          </p>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Filtros e Busca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', background: 'var(--glass)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <button 
              className={`nav-btn-premium ${viewType === 'ativos' ? 'active' : ''}`}
              onClick={() => setViewType('ativos')}
              style={{ border: 'none', background: viewType === 'ativos' ? 'var(--primary)' : 'transparent' }}
            >
              <Users size={16} /> Em Andamento
            </button>
            <button 
              className={`nav-btn-premium ${viewType === 'alumni' ? 'active' : ''}`}
              onClick={() => setViewType('alumni')}
              style={{ border: 'none', background: viewType === 'alumni' ? 'var(--primary)' : 'transparent' }}
            >
              <History size={16} /> Alumni / Formados
            </button>
          </div>

          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={18} />
            <input 
              type="text" 
              className="form-control" 
              placeholder={`Buscar ${viewType === 'ativos' ? 'aluno' : 'formado'}...`}
              style={{ paddingLeft: '3rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Listagem */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome / Registro</th>
                <th>Polo</th>
                <th style={{ textAlign: 'center' }}>Documentação</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 className="spinner" size={32} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado para estes filtros.
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.nome}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.email}</div>
                    </td>
                    <td>
                      <Badge variant="muted">
                        {viewType === 'ativos' ? (item.nucleos?.nome || 'Sem Polo') : item.nucleo}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {viewType === 'ativos' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} opacity={0.5} />
                          <span style={{ fontWeight: 600 }}>{item.documentos?.[0]?.count || 0} anexos</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                          <History size={16} opacity={0.5} />
                          <span style={{ fontWeight: 600 }}>Dossiê Histórico</span>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                        onClick={() => {
                          // Aqui poderíamos abrir um modal de visualização de arquivos
                          alert('Função de visualização do Arquivo em desenvolvimento para este registro.');
                        }}
                      >
                        <Eye size={16} /> Abrir Pasta
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default DocsArchive;
