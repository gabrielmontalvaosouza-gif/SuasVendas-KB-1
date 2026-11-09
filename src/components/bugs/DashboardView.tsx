import React from 'react';
import {
  BarChart3,
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  TrendingUp,
  History,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { SystemStats, Bug, SystemModule } from '../../types/bugs';

interface DashboardViewProps {
  stats: SystemStats;
  bugs: Bug[];
  modules: SystemModule[];
  onSelectBug: (bug: Bug) => void;
  onFilterModule: (moduleId: string) => void;
  onFilterOverdue: () => void;
  onFilterCritical: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  bugs,
  modules,
  onSelectBug,
  onFilterModule,
  onFilterOverdue,
  onFilterCritical,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none transition-colors">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Dashboard & Painel de Indicadores de Bugs</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Métricas consolidadas em tempo real sobre a saúde técnica, prazos e resolução dos módulos do sistema
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xs transition-colors">
          <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block tracking-wider">Total Registrado</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.total_bugs}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Acervo histórico</span>
        </div>

        {/* Em Aberto */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xs transition-colors">
          <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block tracking-wider">Novos / Análise</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{stats.open_bugs}</div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1 block font-medium">Aguardando triagem</span>
        </div>

        {/* Em Andamento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xs transition-colors">
          <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block tracking-wider">Em Andamento</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">{stats.in_progress_bugs}</div>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1 block font-medium">Em dev / testes</span>
        </div>

        {/* Críticos */}
        <div
          onClick={onFilterCritical}
          className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl shadow-2xs cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider">Bugs Críticos</span>
            <Flame className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">{stats.critical_bugs}</div>
          <span className="text-[10px] text-rose-500 dark:text-rose-400/90 font-medium mt-1 block">Parada ou fiscal</span>
        </div>

        {/* Atrasados */}
        <div
          onClick={onFilterOverdue}
          className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 p-4 rounded-xl shadow-2xs cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">Atrasados</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{stats.overdue_bugs}</div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium mt-1 block">Fora do prazo</span>
        </div>

        {/* Resolvidos */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 p-4 rounded-xl shadow-2xs transition-colors">
          <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block tracking-wider">Resolvidos</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats.resolved_bugs + stats.closed_bugs}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 font-medium mt-1 block">
            {stats.resolved_bugs} aguardando encerramento
          </span>
        </div>
      </div>

      {/* Row 2: Distribution by Module & Resolution Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Module Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Incidência de Bugs por Módulo do Sistema</span>
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-400">Total: {stats.total_bugs} problemas</span>
          </div>

          <div className="space-y-3">
            {stats.bugs_by_module.map((mod) => {
              const percentage =
                stats.total_bugs > 0 ? Math.round((mod.count / stats.total_bugs) * 100) : 0;

              return (
                <div key={mod.module_name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: mod.color }} />
                      <span>{mod.module_name}</span>
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {mod.count} bugs ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: mod.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Average Resolution Time & Status Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-colors">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Tempo Médio de Resolução</span>
            </h3>

            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center space-y-1">
              <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                {stats.avg_resolution_hours} horas
              </div>
              <p className="text-[11px] text-indigo-950 dark:text-indigo-200 font-medium">
                Da abertura pelo suporte até a entrega da correção técnica
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Distribuição por Prioridade:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {stats.bugs_by_priority.map((p) => (
                <div key={p.priority} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{p.priority}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3 transition-colors">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span>Atividade Recente em Tempo Real (Audit Trail)</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
          {stats.recent_activity.slice(0, 8).map((act) => (
            <div key={act.id} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">{act.user_name}</span>
                <span className="text-slate-500 dark:text-slate-400 truncate">{act.description}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 shrink-0">
                {new Date(act.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
