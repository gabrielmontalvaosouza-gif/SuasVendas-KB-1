import React, { useState } from 'react';
import {
  X,
  Folder as FolderIcon,
  FolderPlus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Folder, Article } from '../../types/kb';

interface FoldersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  articles: Article[];
  onCreateFolder: (name: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string, targetFolderId?: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const FoldersManagementModal: React.FC<FoldersManagementModalProps> = ({
  isOpen,
  onClose,
  folders,
  articles,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onShowToast,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Editing state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Deleting confirmation state
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [reassignTargetFolderId, setReassignTargetFolderId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      onShowToast('Pasta criada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar pasta');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveEdit = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    setIsUpdating(true);
    try {
      await onUpdateFolder(folderId, editingFolderName.trim());
      setEditingFolderId(null);
      onShowToast('Nome da pasta atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pasta');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteFolder(folderToDelete.id, reassignTargetFolderId || undefined);
      onShowToast(`Pasta "${folderToDelete.name}" excluída.`);
      setFolderToDelete(null);
      setReassignTargetFolderId('');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir pasta');
    } finally {
      setIsDeleting(false);
    }
  };

  const articlesInFolderToDelete = folderToDelete
    ? articles.filter((a) => a.folder_id === folderToDelete.id)
    : [];

  const otherFolders = folderToDelete
    ? folders.filter((f) => f.id !== folderToDelete.id)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <FolderIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white leading-tight">
                Gerenciar Pastas da Base de Conhecimento
              </h3>
              <p className="text-xs text-slate-300">
                Organize, crie, renomeie e gerencie as pastas onde os artigos são categorizados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Create New Folder Form */}
          <form
            onSubmit={handleCreate}
            className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
          >
            <div className="relative flex-1">
              <FolderPlus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nome da nova pasta (ex: Suporte Fiscal, Integrações ERP...)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || !newFolderName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Adicionando...' : 'Criar Pasta'}</span>
            </button>
          </form>

          {/* Folders List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Pastas Cadastradas ({folders.length})</span>
              <span className="text-[11px] font-normal lowercase">organização de artigos</span>
            </h4>

            {folders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                Nenhuma pasta cadastrada no momento. Crie a primeira pasta acima.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                {folders.map((folder) => {
                  const articleCount = articles.filter((a) => a.folder_id === folder.id).length;
                  const isEditingThis = editingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* Left: Icon & Name */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/50">
                          <FolderIcon className="w-4 h-4" />
                        </div>

                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              autoFocus
                              className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-800 border border-blue-500 rounded-md text-slate-900 dark:text-white flex-1 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveEdit(folder.id)}
                              disabled={isUpdating || !editingFolderName.trim()}
                              className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                              title="Salvar alterações"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingFolderId(null)}
                              className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                              title="Cancelar edição"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {folder.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>{articleCount} artigo{articleCount !== 1 ? 's' : ''} associado{articleCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Action Buttons */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(folder)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Renomear pasta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setFolderToDelete(folder);
                              setReassignTargetFolderId(otherFolders[0]?.id || '');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Excluir pasta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* ================= SAFE DELETE CONFIRMATION MODAL ================= */}
      {folderToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setFolderToDelete(null)}
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
                  Confirmar Exclusão de Pasta
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pasta: <span className="font-bold text-slate-800 dark:text-slate-200">{folderToDelete.name}</span>
                </p>
              </div>
            </div>

            {articlesInFolderToDelete.length > 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Esta pasta contém <b>{articlesInFolderToDelete.length} artigo(s)</b> associado(s).
                  </span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Para proteger os dados e não apagar nenhum artigo ou anexo, selecione o que deseja fazer:
                </p>

                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">
                    Mover artigos para outra pasta:
                  </label>
                  <select
                    value={reassignTargetFolderId}
                    onChange={(e) => setReassignTargetFolderId(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="">Manter artigos sem pasta (Geral)</option>
                    {otherFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Esta pasta não possui nenhum artigo vinculado. Tem certeza que deseja excluí-la definitivamente?
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
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
    </div>
  );
};
