import React from 'react';
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Building,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Bug, KanbanColumn, SystemModule } from '../../types/bugs';

interface BugCardProps {
  bug: Bug;
  columns: KanbanColumn[];
  modules: SystemModule[];
  onClick: () => void;
  onDragStart: (e: React.DragEvent, bugId: string) => void;
}

export const BugCard: React.FC<BugCardProps> = ({
  bug,
  columns,
  modules,
  onClick,
  onDragStart,
}) => {
  const mod = modules.find((m) => m.id === bug.module_id);

  // Check if overdue
  const now = new Date().getTime();
  const isOverdue =
    bug.estimated_due_date &&
    new Date(bug.estimated_due_date).getTime() < now &&
    !bug.effective_resolution_date;

  // Check if due soon (within 24 hours)
  const isDueSoon =
    bug.estimated_due_date &&
    !isOverdue &&
    !bug.effective_resolution_date &&
    new Date(bug.estimated_due_date).getTime() - now < 24 * 60 * 60 * 1000;

  const priorityConfig = {
    CRITICAL: {
      label: 'Crítica',
      bg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800',
      badge: 'bg-rose-600 text-white',
      icon: Flame,
    },
    HIGH: {
      label: 'Alta',
      bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800',
      badge: 'bg-amber-500 text-white',
      icon: AlertTriangle,
    },
    MEDIUM: {
      label: 'Média',
      bg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800',
      badge: 'bg-blue-500 text-white',
      icon: null,
    },
    LOW: {
      label: 'Baixa',
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
      badge: 'bg-slate-400 text-white',
      icon: null,
    },
  }[bug.priority] || {
    label: bug.priority,
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-500 text-white',
    icon: null,
  };

  const PriorityIcon = priorityConfig.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, bug.id)}
      onClick={onClick}
      className={`group bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none relative space-y-2.5 ${
        isOverdue
          ? 'border-rose-400 dark:border-rose-600 ring-1 ring-rose-300 dark:ring-rose-800 hover:border-rose-500'
          : isDueSoon
          ? 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-300 dark:ring-amber-800 hover:border-amber-500'
          : 'border-slate-300 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400'
      }`}
    >
      {/* Top row: Code + Module tag + Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs font-black text-slate-950 dark:text-slate-100 tracking-tight shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            {bug.code}
          </span>
          <span
            className="text-[10px] font-bold truncate px-2 py-0.5 rounded-md border"
            style={{
              backgroundColor: `${mod?.color || '#2563EB'}18`,
              borderColor: `${mod?.color || '#2563EB'}40`,
              color: mod?.color || '#2563EB',
            }}
            title={mod?.name || bug.module_name}
          >
            {mod?.name || bug.module_name}
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 shrink-0 ${priorityConfig.bg} border`}
        >
          {PriorityIcon && <PriorityIcon className="w-3 h-3 shrink-0" />}
          <span>{priorityConfig.label}</span>
        </span>
      </div>

      {/* Title - Bold, Crystal Clear Contrast */}
      <h4 className="text-xs font-bold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
        {bug.title}
      </h4>

      {/* Customer Name info */}
      {bug.customer_name && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-950 dark:text-blue-200 bg-blue-50/90 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/60 truncate">
          <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="truncate">
            Cliente: <strong className="font-bold text-blue-950 dark:text-white">{bug.customer_name}</strong>
          </span>
        </div>
      )}

      {/* Reopened Indicator or Resolution notice */}
      {bug.is_reopened && (
        <div className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 px-2 py-1 rounded-md font-bold border border-rose-300 dark:border-rose-800 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Chamado Reaberto</span>
        </div>
      )}

      {bug.solution_applied && (
        <div className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 line-clamp-2 italic">
          <span className="font-bold not-italic text-emerald-800 dark:text-emerald-300">Solução:</span> {bug.solution_applied}
        </div>
      )}

      {/* Bottom Meta: Assignee + Due Date + Counts */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px]">
        {/* Assignee / Responsible */}
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-black text-[9px] text-slate-800 dark:text-slate-100 shrink-0">
            {bug.assignee_name ? (
              bug.assignee_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
            ) : (
              <UserIcon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            )}
          </div>
          <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
            {bug.assignee_name || 'Não atribuído'}
          </span>
        </div>

        {/* Status / Deadline */}
        <div className="flex items-center gap-2 shrink-0">
          {bug.estimated_due_date && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold ${
                isOverdue
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                  : isDueSoon
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
              title={`Prazo: ${new Date(bug.estimated_due_date).toLocaleDateString('pt-BR')}`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {isOverdue
                  ? 'Atrasado'
                  : isDueSoon
                  ? 'Vence hoje'
                  : new Date(bug.estimated_due_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
              </span>
            </div>
          )}

          {/* Counts */}
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
            {bug.comments?.length > 0 && (
              <span className="flex items-center gap-0.5" title={`${bug.comments.length} comentários`}>
                <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>{bug.comments.length}</span>
              </span>
            )}
            {bug.attachments?.length > 0 && (
              <span className="flex items-center gap-0.5" title={`${bug.attachments.length} anexos`}>
                <Paperclip className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{bug.attachments.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
