import React, { useState } from 'react';
import { KanbanColumn, User, Bug } from '../../types/bugs';
import {
  X,
  Plus,
  Edit2,
  Check,
  Palette,
  ArrowUp,
  ArrowDown,
  Trash2,
  Archive,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ColumnsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
  bugs: Bug[];
  currentUser: User;
  onCreateColumn: (data: { name: string; color: string; is_resolved_stage?: boolean; is_closed_stage?: boolean }) => void;
  onUpdateColumn: (id: string, data: Partial<KanbanColumn>) => void;
  onDeleteColumn: (id: string, targetColumnId?: string) => Promise<void>;
  onReorderColumns: (orderedIds: string[]) => void;
  onShowToast: (message: string) => void;
}

const COLUMN_COLORS = [
  '#64748B', // Slate
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#059669', // Dark Emerald
  '#E11D48', // Rose
];

export const ColumnsManagementModal: React.FC<ColumnsManagementModalProps> = ({
  isOpen,
  onClose,
  columns,
  bugs,
  currentUser,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onShowToast,
}) => {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsResolved, setEditIsResolved] = useState(false);
  const [editIsClosed, setEditIsClosed] = useState(false);

  // New column form state
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(COLUMN_COLORS[0]);
  const [newIsResolved, setNewIsResolved] = useState(false);
  const [newIsClosed, setNewIsClosed] = useState(false);

  // Deletion / Migration Modal State
  const [columnPendingDelete, setColumnPendingDelete] = useState<KanbanColumn | null>(null);
  const [targetMigrationColId, setTargetMigrationColId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (col: KanbanColumn) => {
    setEditingColumnId(col.id);
    setEditName(col.name);
    setEditColor(col.color);
    setEditIsResolved(!!col.is_resolved_stage);
    setEditIsClosed(!!col.is_closed_stage);
  };

  const handleSaveEdit = (colId: string) => {
    if (!editName.trim()) return;
    onUpdateColumn(colId, {
      name: editName.trim(),
      color: editColor,
      is_resolved_stage: editIsResolved,
      is_closed_stage: editIsClosed,
    });
    setEditingColumnId(null);
    onShowToast('Coluna atualizada com sucesso!');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onCreateColumn({
      name: newColName.trim(),
      color: newColColor,
      is_resolved_stage: newIsResolved,
      is_closed_stage: newIsClosed,
    });
    setNewColName('');
    setNewIsResolved(false);
    setNewIsClosed(false);
    onShowToast('Nova etapa do Kanban criada!');
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const newCols = [...columns];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCols.length) return;

    const temp = newCols[index];
    newCols[index] = newCols[targetIdx];
    newCols[targetIdx] = temp;

    onReorderColumns(newCols.map((c) => c.id));
  };

  const handleRequestDelete = (col: KanbanColumn) => {
    const bugsInCol = bugs.filter((b) => b.column_id === col.id);
    setColumnPendingDelete(col);

    // Default target migration column to first other column
    const otherCols = columns.filter((c) => c.id !== col.id);
    if (otherCols.length > 0) {
      setTargetMigrationColId(otherCols[0].id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!columnPendingDelete) return;

    const bugsInCol = bugs.filter((b) => b.column_id === columnPendingDelete.id);
    if (bugsInCol.length > 0 && !targetMigrationColId) {
      alert('Selecione uma coluna para onde os bugs serão transferidos.');
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteColumn(
        columnPendingDelete.id,
        bugsInCol.length > 0 ? targetMigrationColId : undefined
      );
      setColumnPendingDelete(null);
      onShowToast(`Coluna excluída e ${bugsInCol.length} bug(s) migrado(s) com sucesso.`);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir coluna.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] text-xs text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm text-white">Personalização das Colunas do Kanban</h3>
            <p className="text-[11px] text-slate-400">
              Reorganize, renomeie, personalize cores ou exclua etapas com migração segura de bugs
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Create new column form */}
          <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-3">
            <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">Adicionar Nova Coluna / Etapa</span>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Nome da etapa (ex: Em validação pelo cliente)..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="flex-1 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Stage flags & colors */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mr-1">Cor:</span>
                {COLUMN_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewColColor(c)}
                    className={`w-5 h-5 rounded-md cursor-pointer transition ${
                      newColColor === c ? 'ring-2 ring-blue-600 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newIsResolved}
                    onChange={(e) => {
                      setNewIsResolved(e.target.checked);
                      if (e.target.checked) setNewIsClosed(false);
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>Etapa de Resolução</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newIsClosed}
                    onChange={(e) => {
                      setNewIsClosed(e.target.checked);
                      if (e.target.checked) setNewIsResolved(false);
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>Etapa de Encerramento</span>
                </label>
              </div>
            </div>
          </form>

          {/* List of current columns */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Etapas Ativas ({columns.length}):</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Total de bugs: {bugs.length}</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {columns.map((col, idx) => {
                const bugCount = bugs.filter((b) => b.column_id === col.id).length;
                const isEditing = editingColumnId === col.id;

                return (
                  <div key={col.id} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.color }}
                      />

                      {isEditing ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-blue-500 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            {COLUMN_COLORS.map((c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={`w-4 h-4 rounded-xs ${editColor === c ? 'ring-2 ring-blue-600' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-950 dark:text-white truncate text-xs tracking-tight">{col.name}</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border border-slate-200 dark:border-slate-700">
                              {bugCount} bug{bugCount !== 1 ? 's' : ''}
                            </span>
                            {col.is_resolved_stage && (
                              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                Resolvido
                              </span>
                            )}
                            {col.is_closed_stage && (
                              <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                Encerrado
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveEdit(col.id)}
                          className="bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-500 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Salvar alterações"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(col)}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Editar nome e cor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Reorder buttons */}
                      <button
                        disabled={idx === 0}
                        onClick={() => moveOrder(idx, 'up')}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
                        title="Mover para a esquerda"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx === columns.length - 1}
                        onClick={() => moveOrder(idx, 'down')}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
                        title="Mover para a direita"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete column button (with migration protection) */}
                      {columns.length > 1 && (
                        <button
                          onClick={() => handleRequestDelete(col)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Excluir coluna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Migration / Deletion Protection Modal */}
      {columnPendingDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                Confirmar Exclusão da Coluna: &quot;{columnPendingDelete.name}&quot;
              </h4>
            </div>

            {(() => {
              const bugCount = bugs.filter((b) => b.column_id === columnPendingDelete.id).length;
              const remainingCols = columns.filter((c) => c.id !== columnPendingDelete.id);

              return (
                <div className="space-y-4">
                  {bugCount > 0 ? (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        Proteção de Dados do Kanban
                      </div>
                      Esta coluna contém <b>{bugCount} bug(s)</b> associado(s). Para evitar que registros fiquem órfãos ou sejam perdidos, selecione para qual coluna todos os bugs existentes serão transferidos automaticamente:
                    </div>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-300">
                      Esta coluna não possui bugs associados no momento e pode ser removida com segurança.
                    </p>
                  )}

                  {bugCount > 0 && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Coluna de Destino para os Bugs:
                      </label>
                      <select
                        value={targetMigrationColId}
                        onChange={(e) => setTargetMigrationColId(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-medium text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        {remainingCols.map((c) => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            Mover para: {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Cada bug receberá uma entrada em seu histórico informando a movimentação decorrente da exclusão da coluna.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setColumnPendingDelete(null)}
                      className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                    >
                      {isDeleting ? 'Processando migração...' : 'Confirmar e Migrar'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
