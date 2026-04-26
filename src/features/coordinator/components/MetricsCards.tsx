import React from 'react';
import { Users, CheckCircle2, AlertTriangle, TrendingUp, Award } from 'lucide-react';

interface MetricsProps {
  metrics: {
    totalStudents: number;
    presenceRate: number;
    evasionAlerts: number;
    approvalRate: number;
  };
}

const MetricsCards: React.FC<MetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Students */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:border-primary/50 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-primary/20 text-primary rounded-xl group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <span className="text-xs font-bold text-success flex items-center gap-1">
            <TrendingUp size={12} /> +2% este mês
          </span>
        </div>
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Alunos Ativos</h3>
        <p className="text-3xl font-black text-white mt-1">{metrics.totalStudents}</p>
      </div>

      {/* Academic Approval */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:border-success/50 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-success/20 text-success rounded-xl group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <span className="text-xs font-bold text-success">Métrica: 7.0</span>
        </div>
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Desempenho (Apr.)</h3>
        <p className="text-3xl font-black text-white mt-1">{metrics.approvalRate}%</p>
        <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-success rounded-full transition-all duration-1000" 
            style={{ width: `${metrics.approvalRate}%` }}
          ></div>
        </div>
      </div>

      {/* Presence Rate */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:border-primary/50 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <span className="text-xs font-bold text-amber-500">Meta: 85%</span>
        </div>
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Taxa de Presença</h3>
        <p className="text-3xl font-black text-white mt-1">{metrics.presenceRate}%</p>
        <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
            style={{ width: `${metrics.presenceRate}%` }}
          ></div>
        </div>
      </div>

      {/* Evasion Alerts */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:border-red-500/50 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-red-500/20 text-red-500 rounded-xl group-hover:shake transition-transform">
            <AlertTriangle size={24} />
          </div>
          <span className="text-xs font-bold text-red-400">Ação Necessária</span>
        </div>
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Alertas de Evasão</h3>
        <p className="text-3xl font-black text-white mt-1">{metrics.evasionAlerts}</p>
        <p className="text-xs text-red-400/70 mt-2 font-medium">Inativos há &gt;15 dias</p>
      </div>
    </div>
  );
};

export default MetricsCards;
