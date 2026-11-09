import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  Check,
  Search,
  Sliders,
  Archive,
  RefreshCw,
  Building,
  Mail,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Bug, KanbanColumn, SystemModule, User, UserRole } from '../../types/bugs';
import { BugCard } from './BugCard';

interface KanbanBoardProps {
  columns: KanbanColumn[];
  bugs: Bug[];
  modules: SystemModule[];
  currentUser: User;
  onMoveBug: (bugId: string, targetColumnId: string) => void;
  onSelectBug: (bug: Bug) => void;
  onOpenCreateBug: (defaultColumnId?: string) => void;
  onOpenManageColumns?: () => void;
  onDeleteBug?: (bugId: string) => void;
  onReopenBug?: (bugId: string, reason: string) => void;
  // Filters
  filterModuleId: string | null;
  filterPriority: string | null;
  filterAssigneeId: string | null;
  filterSearchQuery: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  bugs,
  modules,
  currentUser,
  onMoveBug,
  onSelectBug,
  onOpenCreateBug,
  onOpenManageColumns,
  onDeleteBug,
  onReopenBug,
  filterModuleId,
  filterPriority,
  filterAssigneeId,
  filterSearchQuery,
}) => {
  const [draggedBugId, setDraggedBugId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');

  // Deletion modal state
  const [bugToDelete, setBugToDelete] = useState<Bug | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reopen modal state
  const [bugToReopen, setBugToReopen] = useState<Bug | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const canDeleteBug = currentUser.role === 'ADMIN' || !!currentUser.permissions?.can_delete_bug;
  const canReopenBug = currentUser.role === 'ADMIN' || !!currentUser.permissions?.can_resolve_bug || !!currentUser.permissions?.can_close_bug;

  // Identify closed columns
  const closedColumnIds = new Set(
    columns
      .filter((c) => c.is_closed_stage || c.id === 'col-encerrado' || c.name.toLowerCase().includes('encerrad'))
      .map((c) => c.id)
  );

  const activeColumns = columns.filter((c) => !closedColumnIds.has(c.id));

  // Global filtered bugs based on filters
  const filteredBugs = bugs.filter((b) => {
    if (filterModuleId && b.module_id !== filterModuleId) return false;
    if (filterPriority && b.priority !== filterPriority) return false;
    if (filterAssigneeId && b.assignee_id !== filterAssigneeId) return false;
    if (filterSearchQuery) {
      const q = filterSearchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchCode = b.code.toLowerCase().includes(q);
      const matchDesc = b.description.toLowerCase().includes(q);
      const matchModule = (b.module_name || '').toLowerCase().includes(q);
      const matchCustomer = (b.customer_name || '').toLowerCase().includes(q);
      const matchCustomerEmail = (b.customer_email || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDesc && !matchModule && !matchCustomer && !matchCustomerEmail) {
        return false;
      }
    }
    return true;
  });

  // Separate active vs closed bugs
  const activeBugs = filteredBugs.filter((b) => !closedColumnIds.has(b.column_id));
  const closedBugs = filteredBugs.filter((b) => closedColumnIds.has(b.column_id));

  const handleDragStart = (e: React.DragEvent, bugId: string) => {
    e.dataTransfer.setData('text/plain', bugId);
    setDraggedBugId(bugId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const bugId = e.dataTransfer.getData('text/plain') || draggedBugId;
    if (bugId) {
      onMoveBug(bugId, targetColumnId);
    }
    setDraggedBugId(null);
  };

  const handleConfirmDelete = async () => {
    if (!bugToDelete || !onDeleteBug) return;
    setIsDeleting(true);
    try {
      await onDeleteBug(bugToDelete.id);
      setBugToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir bug');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugToReopen || !onReopenBug) return;
    setIsReopening(true);
    try {
      await onReopenBug(bugToReopen.id, reopenReason.trim() || 'Chamado reaberto pelo histórico');
      setBugToReopen(null);
      setReopenReason('');
      setBoardTab('ACTIVE');
    } catch (err: any) {
      alert(err.message || 'Erro ao reabrir bug');
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/90 dark:bg-slate-950 transition-colors">
      {/* Top Switcher: Active Board vs Closed History */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs border border-transparent dark:border-slate-700/60">
            <button
              onClick={() => setBoardTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                boardTab === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Quadro de Bugs Ativos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                boardTab === 'ACTIVE' ? 'bg-blue-800/80 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {activeBugs.length}
              </span>
            </button>

            <button
              onClick={() => setBoardTab('CLOSED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                boardTab === 'CLOSED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Histórico de Encerrados</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                boardTab === 'CLOSED' ? 'bg-emerald-800/80 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {closedBugs.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            {boardTab === 'ACTIVE'
              ? 'Bugs em andamento no pipeline técnico'
              : 'Chamados finalizados e homologados (preservados para consulta e reabertura)'}
          </span>
        </div>

        {boardTab === 'ACTIVE' && (
          <button
            onClick={() => onOpenCreateBug(activeColumns[0]?.id)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Bug</span>
          </button>
        )}
      </div>

      {/* Main Board View vs Closed History View */}
      {boardTab === 'ACTIVE' ? (
        <div className="flex-1 overflow-x-auto p-4 flex gap-3.5 items-start h-full select-none">
          {activeColumns.map((column) => {
            const columnBugs = activeBugs.filter((b) => b.column_id === column.id);
            const isDragOver = dragOverColumnId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`w-72 shrink-0 flex flex-col max-h-full rounded-2xl border transition-all duration-150 ${
                  isDragOver
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700 shadow-md'
                    : 'bg-slate-200/60 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-300/70 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: column.color || '#3B82F6' }}
                    />
                    <h3 className="font-bold text-xs text-slate-950 dark:text-white truncate" title={column.name}>
                      {column.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs">
                      {columnBugs.length}
                    </span>
                  </div>

                  {/* Quick action button inside column */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenCreateBug(column.id)}
                      className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition"
                      title="Registrar novo bug nesta coluna"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cards container */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2.5 min-h-[160px]">
                  {columnBugs.length === 0 ? (
                    <div
                      className={`h-28 border border-dashed rounded-xl flex items-center justify-center text-center p-3 text-[11px] transition ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-100/50 text-blue-700 font-bold'
                          : 'border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isDragOver ? 'Soltar aqui para mover' : 'Nenhum bug nesta etapa'}
                    </div>
                  ) : (
                    columnBugs.map((bug) => (
                      <div key={bug.id} className="relative group/card">
                        <BugCard
                          bug={bug}
                          columns={columns}
                          modules={modules}
                          onClick={() => onSelectBug(bug)}
                          onDragStart={handleDragStart}
                        />
                        {canDeleteBug && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBugToDelete(bug);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-rose-600 shadow-xs border border-slate-200 dark:border-slate-700 opacity-0 group-hover/card:opacity-100 transition-opacity"
                            title="Excluir este bug"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* HISTÓRICO DE BUGS ENCERRADOS VIEW */
        <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Histórico Geral de Chamados e Bugs Encerrados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estes chamados foram concluídos e não ocupam espaço nas colunas ativas. Dados, anexos e comentários estão 100% preservados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {closedBugs.length} chamado{closedBugs.length !== 1 ? 's' : ''} encerrado{closedBugs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {closedBugs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
                Nenhum bug encerrado com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2">
                {closedBugs.map((bug) => {
                  const mod = modules.find((m) => m.id === bug.module_id);

                  return (
                    <div
                      key={bug.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 p-3 rounded-xl transition"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                          {bug.code}
                        </span>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => onSelectBug(bug)}
                              className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                              {bug.title}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: `${mod?.color || '#2563EB'}18`,
                                borderColor: `${mod?.color || '#2563EB'}40`,
                                color: mod?.color || '#2563EB',
                              }}
                            >
                              {mod?.name || bug.module_name}
                            </span>
                          </div>

                          {/* Customer & Info */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            {bug.customer_name && (
                              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <Building className="w-3.5 h-3.5 text-blue-500" />
                                <span>{bug.customer_name}</span>
                                {bug.customer_email && (
                                  <span className="text-[10px] text-slate-400">({bug.customer_email})</span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Encerrado em:{' '}
                                {new Date(bug.updated_at || bug.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                            </span>
                            {bug.assignee_name && (
                              <span>Responsável: <b>{bug.assignee_name}</b></span>
                            )}
                          </div>

                          {/* Solution snippet */}
                          {bug.solution_applied && (
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 line-clamp-1 italic">
                              <b>Solução:</b> {bug.solution_applied}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onSelectBug(bug)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalhes</span>
                        </button>

                        {canReopenBug && (
                          <button
                            onClick={() => {
                              setBugToReopen(bug);
                              setReopenReason('');
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                            title="Reabrir este chamado e colocá-lo novamente no fluxo de atendimento"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir Bug</span>
                          </button>
                        )}

                        {canDeleteBug && (
                          <button
                            onClick={() => setBugToDelete(bug)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Excluir este bug"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {bugToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setBugToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950 dark:text-white">
                  Confirmar Exclusão do Bug
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta operação removerá o registro do sistema.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">
                  {bugToDelete.code}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {bugToDelete.title}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Módulo: {bugToDelete.module_name}
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
              Tem certeza que deseja excluir este bug? Esta ação não pode ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBugToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar e Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REOPEN BUG MODAL ================= */}
      {bugToReopen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setBugToReopen(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-5 space-y-4 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950 dark:text-white">
                  Reabrir Chamado / Bug
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {bugToReopen.code} - {bugToReopen.title}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Motivo da Reabertura:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Explique por que o chamado está sendo reaberto (ex: cliente relatou reincidência do erro ao faturar)..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBugToReopen(null)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isReopening || !reopenReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isReopening ? 'Reabrindo...' : 'Confirmar Reabertura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
