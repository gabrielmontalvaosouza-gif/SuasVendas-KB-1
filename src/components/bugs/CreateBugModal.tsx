import React, { useState } from 'react';
import { Plus, X, AlertTriangle, Paperclip, Check, Building, Mail, Calendar, HelpCircle } from 'lucide-react';
import { BugPriority, SystemModule, User } from '../../types/bugs';

interface CreateBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: SystemModule[];
  currentUser: User;
  defaultColumnId?: string;
  onCreateBug: (bugData: {
    title: string;
    description: string;
    module_id: string;
    priority: BugPriority;
    reporter_id: string;
    reporter_name: string;
    customer_name?: string | null;
    customer_email?: string | null;
    estimated_due_date?: string | null;
    attachments?: any[];
  }) => void;
}

export const CreateBugModal: React.FC<CreateBugModalProps> = ({
  isOpen,
  onClose,
  modules = [],
  currentUser,
  onCreateBug,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState(modules[0]?.id || '');
  const [priority, setPriority] = useState<BugPriority>('MEDIUM');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !moduleId) {
      alert('Por favor preencha o título, descrição e módulo do sistema.');
      return;
    }

    const attachments = attachmentUrl.trim()
      ? [
          {
            id: `att-${Date.now()}`,
            name: 'print_evidencia_bug.png',
            file_type: 'image/png',
            size_bytes: 250000,
            url: attachmentUrl.trim(),
            uploaded_by: currentUser.name,
            uploaded_at: new Date().toISOString(),
          },
        ]
      : [];

    onCreateBug({
      title: title.trim(),
      description: description.trim(),
      module_id: moduleId,
      priority,
      reporter_id: currentUser.id,
      reporter_name: currentUser.name,
      customer_name: customerName.trim() || null,
      customer_email: customerEmail.trim() || null,
      estimated_due_date: estimatedDueDate ? new Date(`${estimatedDueDate}T18:00:00Z`).toISOString() : null,
      attachments,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Registrar Novo Bug / Problema Técnico</h3>
              <p className="text-[11px] text-slate-400">Notifica imediatamente a equipe técnica e supervisores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Título do Problema *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Rejeição 215 SEFAZ ao emitir nota fiscal com caractere &"
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-colors"
            />
          </div>

          {/* Module & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Módulo do Sistema *</label>
              <select
                required
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
              >
                {modules
                  .filter((m) => !m.is_archived)
                  .map((m) => (
                    <option key={m.id} value={m.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold transition-colors"
              >
                <option value="CRITICAL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  Crítica (Interrupção de faturamento/vendas)
                </option>
                <option value="HIGH" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  Alta (Impacta operação comercial)
                </option>
                <option value="MEDIUM" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  Média (Existe contorno temporário)
                </option>
                <option value="LOW" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  Baixa (Pequena melhoria visual)
                </option>
              </select>
            </div>
          </div>

          {/* Dados do Cliente que relatou */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 transition-colors">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-500" />
              <span>Dados do Cliente / Solicitante (Contato)</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full pl-8 pr-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
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
                    className="w-full pl-8 pr-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Descrição Detalhada do Bug & Como Reproduzir *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva passo a passo o que o usuário fez, o erro que apareceu e os dados de exemplo (número do pedido, CNPJ, tela)..."
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:border-blue-600 leading-relaxed font-sans bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
            />
          </div>

          {/* Prazo estimado opcional e print de evidência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Prazo Estimado de Resolução (opcional)
              </label>
              <input
                type="date"
                value={estimatedDueDate}
                onChange={(e) => setEstimatedDueDate(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span>URL do Print / Evidência (opcional)</span>
              </label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Bug no Kanban</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
