import React, { useState } from 'react';
import {
  X,
  Clock,
  User as UserIcon,
  Shield,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquare,
  Paperclip,
  History,
  Send,
  Calendar,
  Save,
  RotateCcw,
  Check,
  FileText,
  ExternalLink,
  Flame,
  Download,
  Plus,
  Trash2,
  Building,
  Mail,
} from 'lucide-react';
import {
  Bug,
  BugPriority,
  KanbanColumn,
  SystemModule,
  User,
  UserRole,
} from '../../types/bugs';

interface BugDetailModalProps {
  bug: Bug;
  columns: KanbanColumn[];
  modules: SystemModule[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateBug: (bugId: string, data: Partial<Bug>) => void;
  onResolveBug: (bugId: string, solution: string, notes: string) => void;
  onCloseBug: (bugId: string, closingNotes: string) => void;
  onReopenBug: (bugId: string, reason: string) => void;
  onAddComment: (bugId: string, content: string) => void;
  onAddAttachment: (bugId: string, name: string, url: string, fileType: string) => void;
  onShowToast: (message: string) => void;
  onDeleteBug?: (bugId: string) => void;
}

export const BugDetailModal: React.FC<BugDetailModalProps> = ({
  bug,
  columns = [],
  modules = [],
  users = [],
  currentUser,
  onClose,
  onUpdateBug,
  onResolveBug,
  onCloseBug,
  onReopenBug,
  onAddComment,
  onAddAttachment,
  onShowToast,
  onDeleteBug,
}) => {
  if (!bug) return null;

  // Safe user fallback to prevent crashes if currentUser is undefined
  const safeUser: User = currentUser || {
    id: 'guest',
    name: 'Usuário',
    email: '',
    role: 'ANALYST',
    permissions: {},
  };

  const [activeTab, setActiveTab] = useState<'details' | 'solution' | 'attachments' | 'history'>('details');

  // Form states initialized safely
  const [title, setTitle] = useState(bug.title || '');
  const [description, setDescription] = useState(bug.description || '');
  const [moduleId, setModuleId] = useState(bug.module_id || '');
  const [priority, setPriority] = useState<BugPriority>(bug.priority || 'MEDIUM');
  const [columnId, setColumnId] = useState(bug.column_id || '');
  const [assigneeId, setAssigneeId] = useState(bug.assignee_id || '');
  const [supervisorId, setSupervisorId] = useState(bug.supervisor_id || '');
  const [estimatedDueDate, setEstimatedDueDate] = useState(() => {
    try {
      return bug.estimated_due_date ? String(bug.estimated_due_date).slice(0, 10) : '';
    } catch {
      return '';
    }
  });
  const [technicalNotes, setTechnicalNotes] = useState(bug.technical_notes || '');
  const [customerName, setCustomerName] = useState(bug.customer_name || '');
  const [customerEmail, setCustomerEmail] = useState(bug.customer_email || '');

  // Sub-actions modal state
  const [isResolving, setIsResolving] = useState(false);
  const [solutionInput, setSolutionInput] = useState(bug.solution_applied || '');
  const [isClosing, setIsClosing] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [isReopening, setIsReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');

  // Attachment input
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Safe lookups with fallbacks
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeModules = Array.isArray(modules) ? modules : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const currentColumn = safeColumns.find((c) => c && c.id === (columnId || bug.column_id));
  const currentModule = safeModules.find((m) => m && m.id === (moduleId || bug.module_id));

  // Date helper with defensive parsing
  const safeFormatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  };

  const safeFormatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('pt-BR');
    } catch {
      return '—';
    }
  };

  // Check if overdue safely
  const now = Date.now();
  const isOverdue = Boolean(
    bug.estimated_due_date &&
    !isNaN(new Date(bug.estimated_due_date).getTime()) &&
    new Date(bug.estimated_due_date).getTime() < now &&
    !bug.effective_resolution_date
  );

  const handleSaveGeneral = () => {
    onUpdateBug(bug.id, {
      title: title.trim(),
      description: description.trim(),
      module_id: moduleId,
      priority,
      column_id: columnId,
      assignee_id: assigneeId || null,
      supervisor_id: supervisorId || null,
      estimated_due_date: estimatedDueDate ? new Date(`${estimatedDueDate}T18:00:00Z`).toISOString() : null,
      customer_name: customerName.trim() || null,
      customer_email: customerEmail.trim() || null,
      technical_notes: technicalNotes,
    });
    onShowToast('Informações do bug atualizadas com sucesso!');
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionInput.trim()) {
      alert('Por favor informe a descrição da solução aplicada.');
      return;
    }
    onResolveBug(bug.id, solutionInput, technicalNotes);
    setIsResolving(false);
    onShowToast('Bug marcado como RESOLVIDO! Notificação enviada ao suporte.');
  };

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    onCloseBug(bug.id, closingNotes);
    setIsClosing(false);
    onShowToast('Bug confirmado e ENCERRADO em definitivo.');
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      alert('Por favor informe o motivo da reabertura.');
      return;
    }
    onReopenBug(bug.id, reopenReason);
    setIsReopening(false);
    onShowToast('Bug REABERTO e movido para análise.');
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(bug.id, newComment);
    setNewComment('');
    onShowToast('Comentário registrado!');
  };

  const handleAddAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
    onAddAttachment(bug.id, attachmentName.trim(), attachmentUrl.trim(), 'image/png');
    setAttachmentName('');
    setAttachmentUrl('');
    setIsAddingAttachment(false);
    onShowToast('Anexo adicionado ao bug!');
  };

  const safeComments = bug.comments || [];
  const safeAttachments = bug.attachments || [];
  const safeHistory = bug.history || [];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black bg-blue-600 px-2.5 py-1 rounded-md tracking-wider text-white border border-blue-400/40 shadow-xs">
              {bug.code || 'BUG'}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentColumn?.color || '#3B82F6' }}
                />
                <span className="font-bold text-sm tracking-tight text-slate-100">
                  {currentColumn?.name || 'Novo bug'}
                </span>
                {isOverdue && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Prazo Vencido
                  </span>
                )}
                {bug.effective_resolution_date && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Resolvido
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Registrado por: <strong className="text-slate-200">{bug.reporter_name || 'Usuário'}</strong></span>
                <span>•</span>
                <span>Aberto em: {safeFormatDate(bug.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(safeUser?.role === 'ADMIN' || safeUser?.permissions?.can_delete_bug) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold transition flex items-center gap-1 border border-rose-500/30 cursor-pointer"
                title="Excluir este bug"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow Action Bar */}
        <div className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Resolve Button (Tech / Supervisor) */}
            {!bug.effective_resolution_date && (
              <button
                onClick={() => setIsResolving(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar como Resolvido</span>
              </button>
            )}

            {/* Close Button (Support / Admin confirms resolution) */}
            {bug.effective_resolution_date && bug.column_id !== 'col-encerrado' && (
              <button
                onClick={() => setIsClosing(true)}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Confirmar e Encerrar Chamado</span>
              </button>
            )}

            {/* Reopen Button */}
            {(bug.effective_resolution_date || bug.column_id === 'col-encerrado') && (
              <button
                onClick={() => setIsReopening(true)}
                className="bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Bug</span>
              </button>
            )}
          </div>

          {/* Save Button for meta changes */}
          <button
            onClick={handleSaveGeneral}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer ml-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>
        </div>

        {/* Action Dialog: Resolve Bug */}
        {isResolving && (
          <form onSubmit={handleConfirmResolve} className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 p-4 space-y-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between text-emerald-950 dark:text-emerald-200 font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Finalizar Resolução Técnica do Problema
              </span>
              <button type="button" onClick={() => setIsResolving(false)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900">&times;</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">
                Descrição da Solução Aplicada (O que foi corrigido?) *
              </label>
              <textarea
                required
                rows={2}
                value={solutionInput}
                onChange={(e) => setSolutionInput(e.target.value)}
                placeholder="ex: Ajustada a query de lote e implantado deploy em produção v2.8.4..."
                className="w-full text-xs p-2.5 border border-emerald-300 dark:border-emerald-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResolving(false)}
                className="text-xs px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-1.5 rounded font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
              >
                Confirmar Resolução
              </button>
            </div>
          </form>
        )}

        {/* Action Dialog: Close Bug */}
        {isClosing && (
          <form onSubmit={handleConfirmClose} className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-4 space-y-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold text-xs">
              <span>Confirmação de Encerramento pelo Suporte Técnico</span>
              <button type="button" onClick={() => setIsClosing(false)} className="text-slate-500 hover:text-slate-700">&times;</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Observações de Encerramento / Feedback do Cliente (Opcional)
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="ex: Cliente testou em homologação e confirmou que o erro sumiu."
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsClosing(false)} className="text-xs px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                Cancelar
              </button>
              <button type="submit" className="text-xs px-4 py-1.5 rounded font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
                Confirmar Encerramento Definitivo
              </button>
            </div>
          </form>
        )}

        {/* Action Dialog: Reopen Bug */}
        {isReopening && (
          <form onSubmit={handleConfirmReopen} className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 p-4 space-y-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between text-rose-950 dark:text-rose-200 font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Reabrir Chamado para Nova Análise Técnica
              </span>
              <button type="button" onClick={() => setIsReopening(false)} className="text-rose-700 dark:text-rose-400">&times;</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-900 dark:text-rose-300 block">
                Motivo da Reabertura (Por que a solução não funcionou?) *
              </label>
              <textarea
                required
                rows={2}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="ex: O problema voltou a ocorrer para pedidos faturados em contingência..."
                className="w-full text-xs p-2 border border-rose-300 dark:border-rose-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsReopening(false)} className="text-xs px-3 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit" className="text-xs px-4 py-1.5 rounded font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer">
                Reabrir Problema
              </button>
            </div>
          </form>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-5 pt-2 gap-2 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Dados & Atribuição</span>
          </button>
          <button
            onClick={() => setActiveTab('solution')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'solution'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Solução & Notas Técnicas</span>
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Anexos ({safeAttachments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico ({safeHistory.length})</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Título do Problema
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Grid: Module, Priority, Column, Assignee, Supervisor, Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Module */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Módulo Afetado</label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {safeModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.is_archived ? '(Arquivado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as BugPriority)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="CRITICAL">Crítica (Parada Geral / Fiscal)</option>
                    <option value="HIGH">Alta (Impacta Vendas)</option>
                    <option value="MEDIUM">Média (Operacional com Workaround)</option>
                    <option value="LOW">Baixa (Pequeno Ajuste / Cosmético)</option>
                  </select>
                </div>

                {/* Status / Column */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Etapa no Kanban</label>
                  <select
                    value={columnId}
                    onChange={(e) => setColumnId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {safeColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee (Responsável Técnico) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Responsável pela Resolução</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Não atribuído</option>
                    {safeUsers
                      .filter((u) => u && (u.role === 'TECH' || u.role === 'SUPERVISOR' || u.role === 'ADMIN'))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Supervisor */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Supervisor de Acompanhamento</label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Não definido</option>
                    {safeUsers
                      .filter((u) => u && (u.role === 'SUPERVISOR' || u.role === 'ADMIN'))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block flex items-center justify-between">
                    <span>Prazo Estimado</span>
                    {isOverdue && <span className="text-rose-600 dark:text-rose-400 font-bold uppercase text-[10px]">Atrasado!</span>}
                  </label>
                  <input
                    type="date"
                    value={estimatedDueDate}
                    onChange={(e) => setEstimatedDueDate(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Informações do Cliente Solicitante */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                  <span>Dados do Cliente / Solicitante (Contato)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nome do Cliente / Razão Social
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="ex: Distribuidora Sul Ltda ou João Silva"
                        className="w-full pl-8 pr-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      E-mail de Contato do Cliente
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="contato@cliente.com.br"
                        className="w-full pl-8 pr-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Descrição Detalhada do Problema
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:border-blue-600 leading-relaxed font-sans bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Comments Thread Section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Comentários & Alinhamento Interno ({safeComments.length})</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {safeComments.length === 0 ? (
                    <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-dashed border-slate-200 dark:border-slate-800">
                      Nenhum comentário registrado ainda. Envie uma mensagem abaixo.
                    </div>
                  ) : (
                    safeComments.map((c) => (
                      <div key={c.id} className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{c.user_name || 'Usuário'}</span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-600">
                              {c.user_role || 'SUPORTE'}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {safeFormatDateTime(c.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar nota ou atualização técnica sobre o bug..."
                    className="flex-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'solution' && (
            <div className="space-y-4 text-xs">
              {/* Solution applied */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 font-bold">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Solução Aplicada (Visível para o Suporte e Cliente)
                  </span>
                  {bug.effective_resolution_date && (
                    <span className="text-[11px] font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300">
                      Resolvido em {safeFormatDate(bug.effective_resolution_date)}
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={solutionInput}
                  onChange={(e) => setSolutionInput(e.target.value)}
                  placeholder="Descreva detalhadamente a solução que foi implementada..."
                  className="w-full text-xs p-2.5 border border-emerald-300 dark:border-emerald-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Technical notes */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Observações Técnicas de Engenharia
                </span>
                <textarea
                  rows={3}
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Branches git, scripts de banco de dados, variáveis de ambiente ou parâmetros..."
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">Evidências, Prints e Documentos</span>
                <button
                  onClick={() => setIsAddingAttachment(!isAddingAttachment)}
                  className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Anexo</span>
                </button>
              </div>

              {isAddingAttachment && (
                <form onSubmit={handleAddAttachmentSubmit} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nome do arquivo (ex: print_erro_sefaz.png)"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    <input
                      type="url"
                      required
                      placeholder="URL do arquivo / print"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsAddingAttachment(false)} className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Cancelar
                    </button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer">
                      Salvar Anexo
                    </button>
                  </div>
                </form>
              )}

              {safeAttachments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Paperclip className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  <p>Nenhum anexo registrado neste bug.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {safeAttachments.map((att) => (
                    <div key={att.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.name}</div>
                          <div className="text-[10px] text-slate-400">Por {att.uploaded_by || 'Usuário'}</div>
                        </div>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 shrink-0 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Trilha de Auditoria & Rastreabilidade de Alterações
              </span>

              {safeHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <History className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  <p>Nenhum histórico de alterações registrado até o momento.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-2xs">
                  {safeHistory.map((h) => (
                    <div key={h.id} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {h.user_name || 'Sistema'}{' '}
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              ({h.user_role || 'SYSTEM'})
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {safeFormatDateTime(h.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{h.description}</p>
                        {h.old_value && h.new_value && (
                          <div className="text-[10px] font-mono text-slate-400 mt-1">
                            De: <span className="text-rose-600 dark:text-rose-400">{h.old_value}</span> ➔ Para:{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">{h.new_value}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-950 dark:text-white">
                    Confirmar Exclusão de Bug
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Esta operação removerá o registro do sistema.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">
                    {bug.code}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {bug.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Módulo: {bug.module_name || currentModule?.name || 'Geral'}
                </div>
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                Tem certeza que deseja excluir definitivamente este bug? Esta ação não pode ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBug?.(bug.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar e Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
