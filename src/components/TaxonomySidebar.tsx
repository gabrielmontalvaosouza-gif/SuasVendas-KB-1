import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Lock,
  Tag,
  Filter,
  Layers,
  GripVertical,
  Trash2,
  FolderPlus,
  X,
  MoveRight,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Category, Folder, Article, UserRole } from '../types/kb';

interface TaxonomySidebarProps {
  categories: Category[];
  folders: Folder[];
  articles: Article[];
  selectedArticleId: string | null;
  onSelectArticle: (id: string) => void;
  onOpenCreateModal: () => void;
  userRole: UserRole;
  selectedModule: string | null;
  onSelectModule: (module: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onMoveArticleToFolder?: (articleId: string, targetFolderId: string | null) => void;
  onDeleteArticle?: (articleId: string) => void;
  canManageArticles?: boolean;
  isDarkTheme?: boolean;
  onCloseSidebar?: () => void;
  onOpenFoldersModal?: () => void;
}

export const TaxonomySidebar: React.FC<TaxonomySidebarProps> = ({
  categories = [],
  folders = [],
  articles = [],
  selectedArticleId,
  onSelectArticle,
  onOpenCreateModal,
  userRole,
  selectedModule,
  onSelectModule,
  selectedTag,
  onSelectTag,
  onMoveArticleToFolder,
  onDeleteArticle,
  canManageArticles = true,
  isDarkTheme = false,
  onCloseSidebar,
  onOpenFoldersModal,
}) => {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'cat-faturamento': true,
    'cat-pedidos': true,
    'cat-integracoes': true,
    'cat-catalogo-b2b': true,
    'cat-mobile': true,
    'custom-folders': true,
    'unassigned-folder': true,
  });

  // Folders accordion open state
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedArticleId, setDraggedArticleId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null); // folder id or 'NONE' for root

  // Delete article confirmation state
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const modules = ['Faturamento e NF-e', 'Pedidos', 'Integrações', 'Portal B2B', 'App Mobile'];

  // Filter articles by module and tag if selected
  const isArticleVisible = (article: Article) => {
    if (article.is_confidential && userRole === 'AGENT') {
      return false;
    }
    if (selectedModule && article.module !== selectedModule && article.module_name !== selectedModule) {
      return false;
    }
    if (selectedTag && !(article.tags || []).includes(selectedTag)) {
      return false;
    }
    return true;
  };

  const visibleArticlesCount = articles.filter(isArticleVisible).length;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, articleId: string) => {
    e.dataTransfer.setData('text/plain', articleId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedArticleId(articleId);
  };

  const handleDragEnd = () => {
    setDraggedArticleId(null);
    setDragOverFolderId(null);
  };

  const handleDragOverFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== targetFolderId) {
      setDragOverFolderId(targetFolderId);
    }
  };

  const handleDragLeaveFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    if (dragOverFolderId === targetFolderId) {
      setDragOverFolderId(null);
    }
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const articleId = e.dataTransfer.getData('text/plain') || draggedArticleId;
    if (articleId && onMoveArticleToFolder) {
      onMoveArticleToFolder(articleId, targetFolderId);
      // Auto expand folder that received article
      if (targetFolderId) {
        setOpenFolders((prev) => ({ ...prev, [targetFolderId]: true }));
      }
    }
    setDraggedArticleId(null);
    setDragOverFolderId(null);
  };

  // Grouping folders
  const categorizedFolderIds = new Set<string>();
  categories.forEach((cat) => {
    folders.filter((f) => f.category_id === cat.id).forEach((f) => categorizedFolderIds.add(f.id));
  });

  const customFolders = folders.filter((f) => !categorizedFolderIds.has(f.id));
  const unassignedArticles = articles.filter((a) => !a.folder_id && isArticleVisible(a));

  return (
    <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none h-full transition-colors z-20">
      {/* Header section with count and actions */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Pastas & Taxonomia</span>
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Arraste artigos para reorganizar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenFoldersModal && (
            <button
              type="button"
              onClick={onOpenFoldersModal}
              className="p-1 rounded-md text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Gerenciar Pastas"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}
          {onCloseSidebar && (
            <button
              type="button"
              onClick={onCloseSidebar}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition md:hidden"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
            {visibleArticlesCount}
          </span>
        </div>
      </div>

      {/* Module Quick Filter Buttons */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-1.5 px-1">
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtrar por Módulo
          </span>
          {selectedModule && (
            <button
              onClick={() => onSelectModule(null)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-semibold cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onSelectModule(null)}
            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
              selectedModule === null
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos
          </button>
          {modules.map((mod) => (
            <button
              key={mod}
              onClick={() => onSelectModule(selectedModule === mod ? null : mod)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition truncate max-w-[140px] cursor-pointer ${
                selectedModule === mod
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={mod}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Dragging Notice / Helper Banner */}
      {draggedArticleId && (
        <div className="bg-indigo-50 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800 p-2 text-center text-xs text-indigo-700 dark:text-indigo-300 font-medium animate-pulse shrink-0 flex items-center justify-center gap-1.5">
          <MoveRight className="w-3.5 h-3.5" />
          <span>Solte sobre a pasta de destino</span>
        </div>
      )}

      {/* Hierarchical Tree (Categories -> Folders -> Articles) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
        {/* Categories Loop */}
        {categories.map((cat) => {
          const catFolders = folders.filter((f) => f.category_id === cat.id);
          const isOpen = openCategories[cat.id] ?? true;

          const catArticlesCount = articles.filter(
            (a) => catFolders.some((f) => f.id === a.folder_id) && isArticleVisible(a)
          ).length;

          if (selectedModule && catArticlesCount === 0) {
            return null;
          }

          return (
            <div
              key={cat.id}
              className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 overflow-hidden transition-colors"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {cat.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700">
                  {catArticlesCount}
                </span>
              </button>

              {/* Folders list inside category */}
              {isOpen && (
                <div className="px-2 pb-2 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/60">
                  {catFolders.map((folder) => {
                    const folderArticles = articles.filter(
                      (a) => a.folder_id === folder.id && isArticleVisible(a)
                    );
                    const isDragOver = dragOverFolderId === folder.id;
                    const isFolderOpen = openFolders[folder.id] ?? true;

                    return (
                      <div
                        key={folder.id}
                        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                        onDragLeave={(e) => handleDragLeaveFolder(e, folder.id)}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        className={`rounded-lg transition-all border ${
                          isDragOver
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/50 scale-[1.01] shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        {/* Folder Row */}
                        <div
                          onClick={() => toggleFolder(folder.id)}
                          className="flex items-center justify-between p-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer rounded-t-lg transition text-left"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isFolderOpen ? (
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            {folder.visibility_level === 'CONFIDENTIAL' ? (
                              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : isFolderOpen ? (
                              <FolderOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            ) : (
                              <FolderIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {folder.name}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                              isDragOver
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isDragOver ? 'Solte aqui' : folderArticles.length}
                          </span>
                        </div>

                        {/* Articles in Folder */}
                        {isFolderOpen && (
                          <div className="px-1.5 pb-1.5 pt-0.5 space-y-1">
                            {folderArticles.length === 0 ? (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 italic p-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded">
                                {isDragOver ? 'Solte o artigo aqui' : 'Pasta vazia. Arraste artigos para cá'}
                              </div>
                            ) : (
                              folderArticles.map((art) => {
                                const isSelected = selectedArticleId === art.id;
                                const isDraggingThis = draggedArticleId === art.id;

                                return (
                                  <div
                                    key={art.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, art.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => onSelectArticle(art.id)}
                                    className={`group/art relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs transition cursor-grab active:cursor-grabbing border ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-700 font-semibold shadow-xs'
                                        : 'bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                    } ${isDraggingThis ? 'opacity-40 border-dashed border-blue-500' : ''}`}
                                    title="Clique para abrir ou arraste para mover de pasta"
                                  >
                                    <div className="flex items-center gap-1.5 truncate min-w-0">
                                      <GripVertical
                                        className={`w-3 h-3 shrink-0 cursor-grab ${
                                          isSelected
                                            ? 'text-blue-200'
                                            : 'text-slate-300 dark:text-slate-600 group-hover/art:text-slate-500'
                                        }`}
                                      />
                                      <FileText
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isSelected ? 'text-white' : 'text-blue-500/70 dark:text-blue-400'
                                        }`}
                                      />
                                      <span className="truncate leading-tight">{art.title}</span>
                                    </div>

                                    {/* Action items on hover: delete */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {canManageArticles && onDeleteArticle && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setArticleToDelete(art);
                                          }}
                                          className={`p-1 rounded opacity-0 group-hover/art:opacity-100 transition hover:bg-rose-500/20 ${
                                            isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                                          }`}
                                          title="Excluir este artigo"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      <span
                                        className={`text-[9px] font-mono ${
                                          isSelected ? 'text-blue-100' : 'text-slate-400'
                                        }`}
                                      >
                                        v{art.version}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Custom / Uncategorized Folders Section */}
        {customFolders.length > 0 && (
          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 overflow-hidden transition-colors">
            <button
              type="button"
              onClick={() => toggleCategory('custom-folders')}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                {openCategories['custom-folders'] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <FolderIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Pastas Personalizadas
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenFoldersModal && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFoldersModal();
                    }}
                    className="p-1 rounded text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                    title="Gerenciar Pastas Personalizadas"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[10px] text-slate-400 font-mono shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700">
                  {customFolders.length}
                </span>
              </div>
            </button>

            {openCategories['custom-folders'] && (
              <div className="px-2 pb-2 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/60">
                {customFolders.map((folder) => {
                  const folderArticles = articles.filter(
                    (a) => a.folder_id === folder.id && isArticleVisible(a)
                  );
                  const isDragOver = dragOverFolderId === folder.id;
                  const isFolderOpen = openFolders[folder.id] ?? true;

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                      onDragLeave={(e) => handleDragLeaveFolder(e, folder.id)}
                      onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      className={`rounded-lg transition-all border ${
                        isDragOver
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/50 scale-[1.01] shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center justify-between p-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer rounded-t-lg transition text-left"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isFolderOpen ? (
                            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                          <FolderIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {folder.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            isDragOver
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isDragOver ? 'Solte aqui' : folderArticles.length}
                        </span>
                      </div>

                      {isFolderOpen && (
                        <div className="px-1.5 pb-1.5 pt-0.5 space-y-1">
                          {folderArticles.length === 0 ? (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic p-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded">
                              {isDragOver ? 'Solte o artigo aqui' : 'Pasta vazia. Arraste artigos para cá'}
                            </div>
                          ) : (
                            folderArticles.map((art) => {
                              const isSelected = selectedArticleId === art.id;
                              const isDraggingThis = draggedArticleId === art.id;

                              return (
                                <div
                                  key={art.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, art.id)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => onSelectArticle(art.id)}
                                  className={`group/art relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs transition cursor-grab active:cursor-grabbing border ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-700 font-semibold shadow-xs'
                                      : 'bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  } ${isDraggingThis ? 'opacity-40 border-dashed border-blue-500' : ''}`}
                                  title="Clique para abrir ou arraste para mover de pasta"
                                >
                                  <div className="flex items-center gap-1.5 truncate min-w-0">
                                    <GripVertical
                                      className={`w-3 h-3 shrink-0 cursor-grab ${
                                        isSelected
                                          ? 'text-blue-200'
                                          : 'text-slate-300 dark:text-slate-600 group-hover/art:text-slate-500'
                                      }`}
                                    />
                                    <FileText
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isSelected ? 'text-white' : 'text-blue-500/70 dark:text-blue-400'
                                      }`}
                                    />
                                    <span className="truncate leading-tight">{art.title}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {canManageArticles && onDeleteArticle && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setArticleToDelete(art);
                                        }}
                                        className={`p-1 rounded opacity-0 group-hover/art:opacity-100 transition hover:bg-rose-500/20 ${
                                          isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                                        }`}
                                        title="Excluir este artigo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <span
                                      className={`text-[9px] font-mono ${
                                        isSelected ? 'text-blue-100' : 'text-slate-400'
                                      }`}
                                    >
                                      v{art.version}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Unassigned / Root Articles (Drop zone for removing from folders) */}
        <div
          onDragOver={(e) => handleDragOverFolder(e, 'NONE')}
          onDragLeave={(e) => handleDragLeaveFolder(e, 'NONE')}
          onDrop={(e) => handleDropOnFolder(e, null)}
          className={`rounded-xl transition-all border ${
            dragOverFolderId === 'NONE'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/50 scale-[1.01] shadow-sm'
              : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => toggleCategory('unassigned-folder')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition text-left cursor-pointer rounded-t-xl"
          >
            <div className="flex items-center gap-1.5 truncate">
              {openCategories['unassigned-folder'] ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                Artigos sem Pasta (Raiz)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                dragOverFolderId === 'NONE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {dragOverFolderId === 'NONE' ? 'Soltar na Raiz' : unassignedArticles.length}
            </span>
          </button>

          {openCategories['unassigned-folder'] && (
            <div className="p-2 pt-0.5 space-y-1">
              {unassignedArticles.length === 0 ? (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 italic p-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded">
                  {dragOverFolderId === 'NONE' ? 'Solte aqui para remover da pasta' : 'Nenhum artigo na raiz'}
                </div>
              ) : (
                unassignedArticles.map((art) => {
                  const isSelected = selectedArticleId === art.id;
                  const isDraggingThis = draggedArticleId === art.id;

                  return (
                    <div
                      key={art.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, art.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectArticle(art.id)}
                      className={`group/art relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs transition cursor-grab active:cursor-grabbing border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      } ${isDraggingThis ? 'opacity-40 border-dashed border-blue-500' : ''}`}
                      title="Clique para abrir ou arraste para uma pasta"
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <GripVertical
                          className={`w-3 h-3 shrink-0 cursor-grab ${
                            isSelected
                              ? 'text-blue-200'
                              : 'text-slate-300 dark:text-slate-600 group-hover/art:text-slate-500'
                          }`}
                        />
                        <FileText
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate leading-tight">{art.title}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canManageArticles && onDeleteArticle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setArticleToDelete(art);
                            }}
                            className={`p-1 rounded opacity-0 group-hover/art:opacity-100 transition hover:bg-rose-500/20 ${
                              isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                            }`}
                            title="Excluir este artigo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <span
                          className={`text-[9px] font-mono ${
                            isSelected ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          v{art.version}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action: Create Technical Article */}
      {canManageArticles && (
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            onClick={onOpenCreateModal}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Artigo Técnico</span>
          </button>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Article */}
      {articleToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setArticleToDelete(null)}
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
                  Confirmar Exclusão de Artigo
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação removerá o artigo da Base de Conhecimento.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {articleToDelete.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Módulo: {articleToDelete.module_name || articleToDelete.module || 'Geral'} • Versão {articleToDelete.version}.0
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
              Tem certeza que deseja excluir permanentemente este artigo? Procedimentos e respostas rápidas vinculados não estarão mais disponíveis para o suporte.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteArticle?.(articleToDelete.id);
                  setArticleToDelete(null);
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
    </aside>
  );
};
