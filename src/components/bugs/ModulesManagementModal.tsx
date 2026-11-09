import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Palette,
  ExternalLink,
  Save,
  ArrowUpDown,
} from 'lucide-react';
import { SystemModule, Bug, User } from '../../types/bugs';

interface ModulesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: SystemModule[];
  bugs: Bug[];
  currentUser: User;
  onCreateModule: (data: { name: string; description: string; color: string; icon: string }) => void;
  onUpdateModule: (id: string, data: Partial<SystemModule>) => void;
  onDeleteModule: (id: string) => void;
  onSelectBug: (bug: Bug) => void;
  onShowToast: (message: string) => void;
}

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#E11D48', // Rose
  '#4F46E5', // Indigo
  '#059669', // Teal
  '#64748B', // Slate
];

const PRESET_ICONS = [
  'Receipt',
  'ShoppingCart',
  'RefreshCw',
  'Store',
  'Smartphone',
  'Banknote',
  'Shield',
  'Database',
  'Cpu',
  'Layers',
];

export const ModulesManagementModal: React.FC<ModulesManagementModalProps> = ({
  isOpen,
  onClose,
  modules,
  bugs,
  currentUser,
  onCreateModule,
  onUpdateModule,
  onDeleteModule,
  onSelectBug,
  onShowToast,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);

  if (!isOpen) return null;

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || modules[0];
  const linkedBugs = bugs.filter((b) => b.module_id === selectedModule?.id);

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIcon(PRESET_ICONS[0]);
  };

  const handleStartEdit = (mod: SystemModule) => {
    setSelectedModuleId(mod.id);
    setName(mod.name);
    setDescription(mod.description);
    setColor(mod.color);
    setIcon(mod.icon);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('O nome do módulo é obrigatório.');
      return;
    }

    if (isCreating) {
      onCreateModule({ name: name.trim(), description: description.trim(), color, icon });
      setIsCreating(false);
      onShowToast('Novo módulo do sistema cadastrado!');
    } else if (isEditing && selectedModule) {
      onUpdateModule(selectedModule.id, { name: name.trim(), description: description.trim(), color, icon });
      setIsEditing(false);
      onShowToast('Módulo atualizado com sucesso!');
    }
  };

  const handleToggleArchive = (mod: SystemModule) => {
    onUpdateModule(mod.id, { is_archived: !mod.is_archived });
    onShowToast(mod.is_archived ? `Módulo "${mod.name}" desarquivado!` : `Módulo "${mod.name}" arquivado!`);
  };

  const handleDelete = (mod: SystemModule) => {
    const bugCount = bugs.filter((b) => b.module_id === mod.id).length;
    if (bugCount > 0) {
      alert(
        `Ação bloqueada por proteção de dados: O módulo "${mod.name}" possui ${bugCount} bug(s) vinculados. Você deve arquivar o módulo em vez de excluí-lo.`
      );
      return;
    }

    if (confirm(`Tem certeza que deseja excluir permanentemente o módulo "${mod.name}"?`)) {
      onDeleteModule(mod.id);
      onShowToast('Módulo excluído com sucesso.');
      if (modules.length > 1) {
        setSelectedModuleId(modules.find((m) => m.id !== mod.id)?.id || '');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">Cadastro & Personalização dos Módulos</h3>
              <p className="text-[11px] text-slate-400">
                Gerencie módulos dinâmicos, cores de identificação, arquivamento e rastreie bugs vinculados
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row text-xs">
          {/* Left Column: Modules List */}
          <div className="w-full md:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px]">
                Módulos do Sistema ({modules.length})
              </span>
              <button
                onClick={handleStartCreate}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Novo</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {modules.map((mod) => {
                const count = bugs.filter((b) => b.module_id === mod.id).length;
                const isSelected = selectedModuleId === mod.id;

                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer border transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-500 shadow-xs ring-1 ring-blue-300 dark:ring-blue-700'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'
                    } ${mod.is_archived ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: mod.color }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{mod.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {count} bug(s) {mod.is_archived && '• Arquivado'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(mod);
                        }}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded"
                        title="Editar módulo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Editor OR Module Overview & Linked Bugs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-slate-900">
            {isCreating || isEditing ? (
              <form onSubmit={handleSaveSubmit} className="space-y-4 animate-fade-in max-w-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isCreating ? 'Cadastrar Novo Módulo' : `Editar Módulo: ${selectedModule?.name}`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Nome do Módulo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Contratos & Assinaturas, Vendas Externas..."
                    className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Descrição Funcional</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva as responsabilidades desse módulo do ERP..."
                    className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-colors"
                  />
                </div>

                {/* Color Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-500" />
                    <span>Cor de Identificação no Kanban</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                          color === c ? 'scale-110 ring-2 ring-slate-800 dark:ring-white ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Módulo</span>
                  </button>
                </div>
              </form>
            ) : selectedModule ? (
              <div className="space-y-5 animate-fade-in">
                {/* Module Details Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-xl shadow-xs shrink-0 flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedModule.color }}
                    >
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedModule.name}</span>
                        {selectedModule.is_archived && (
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded uppercase font-mono font-bold">
                            Arquivado
                          </span>
                        )}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {selectedModule.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartEdit(selectedModule)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleArchive(selectedModule)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      title={selectedModule.is_archived ? 'Reativar módulo' : 'Arquivar módulo'}
                    >
                      {selectedModule.is_archived ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Desarquivar</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Arquivar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(selectedModule)}
                      className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      title="Excluir módulo (somente permitido sem bugs associados)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

                {/* Linked Bugs Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Bugs Vinculados a este Módulo ({linkedBugs.length})
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Clique para abrir detalhes</span>
                  </div>

                  {linkedBugs.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                      Nenhum bug registrado no módulo &ldquo;{selectedModule.name}&rdquo;.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
                      {linkedBugs.map((bug) => (
                        <div
                          key={bug.id}
                          onClick={() => {
                            onSelectBug(bug);
                            onClose();
                          }}
                          className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700/60 transition cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                              {bug.code}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{bug.title}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[10px]">
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-medium">
                              {bug.priority}
                            </span>
                            <span className="text-slate-400 dark:text-slate-400 font-mono">
                              {new Date(bug.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
