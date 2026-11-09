import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Copy,
  Check,
  Edit3,
  History,
  FileCode,
  Download,
  Lock,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  HelpCircle,
  Zap,
  Compass,
  AlertOctagon,
  Tag,
  Layers,
  Filter,
  Eye,
  BookOpen,
  Info,
  SlidersHorizontal,
  Folder as FolderIcon,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { Article, Category, Folder, UserRole } from '../../types/kb';
import { SystemModule, User as BugUser } from '../../types/bugs';
import { marked } from 'marked';
import { TaxonomySidebar } from '../TaxonomySidebar';

interface KnowledgeBaseViewProps {
  articles: Article[];
  modules: SystemModule[];
  categories: Category[];
  folders: Folder[];
  currentUser: BugUser;
  onOpenArticleEditor: (article?: Article | null) => void;
  onViewDiff: (article: Article) => void;
  onToggleFavorite: (articleId: string) => Promise<void> | void;
  onVoteHelpful: (articleId: string, isHelpful: boolean) => Promise<void> | void;
  onShowToast: (message: string) => void;
  initialSelectedArticleId?: string | null;
  onSelectArticleId?: (id: string | null) => void;
  isDarkTheme?: boolean;
  onOpenFoldersModal?: () => void;
  onDeleteArticle?: (articleId: string) => Promise<void> | void;
  onMoveArticleToFolder?: (articleId: string, targetFolderId: string | null) => Promise<void> | void;
}

// Accent-insensitive normalization helper
function normalizeStr(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Highlight matching words in text safely
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) {
    return <span>{text}</span>;
  }

  const tokens = normalizeStr(query)
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (tokens.length === 0) {
    return <span>{text}</span>;
  }

  // Build regex that matches any of the tokens case-insensitively
  const pattern = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) =>
        tokens.some((tok) => normalizeStr(part) === tok) ? (
          <mark key={i} className="bg-amber-200 text-slate-900 rounded-xs px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  articles,
  modules,
  categories,
  folders,
  currentUser,
  onOpenArticleEditor,
  onViewDiff,
  onToggleFavorite,
  onVoteHelpful,
  onShowToast,
  initialSelectedArticleId,
  onSelectArticleId,
  isDarkTheme = false,
  onOpenFoldersModal,
  onDeleteArticle,
  onMoveArticleToFolder,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('ALL');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL');
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'RECENT' | 'FAVORITES'>('ALL');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(initialSelectedArticleId || null);
  const [quickViewArticle, setQuickViewArticle] = useState<Article | null>(null);

  // Taxonomy sidebar, scroll auto-hide & filter popover state
  const [isTaxonomySidebarOpen, setIsTaxonomySidebarOpen] = useState(true);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Active view article
  const activeArticle = useMemo(() => {
    return articles.find((a) => a.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  // Collapsible accordion panels in reading view
  const [isWorkaroundExpanded, setIsWorkaroundExpanded] = useState(false);
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);
  const [isAdminMetaExpanded, setIsAdminMetaExpanded] = useState(false);

  // Quick reply copied feedback
  const [isQuickReplyCopied, setIsQuickReplyCopied] = useState(false);
  const [hasVotedHelpful, setHasVotedHelpful] = useState<'yes' | 'no' | null>(null);

  // Search input ref for Ctrl+K shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (selectedArticleId) {
          // If viewing article, return to list and focus search
          setSelectedArticleId(null);
          onSelectArticleId?.(null);
        }
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticleId, onSelectArticleId]);

  // Sync external initialSelectedArticleId if changed
  useEffect(() => {
    if (initialSelectedArticleId) {
      setSelectedArticleId(initialSelectedArticleId);
    }
  }, [initialSelectedArticleId]);

  // Reset feedback state when active article changes
  useEffect(() => {
    setIsQuickReplyCopied(false);
    setHasVotedHelpful(null);
    setIsWorkaroundExpanded(false);
    setIsAttachmentsExpanded(false);
    setIsAdminMetaExpanded(false);
  }, [selectedArticleId]);

  // Calculate article counts per module
  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((art) => {
      const modId = art.module_id || 'unassigned';
      counts[modId] = (counts[modId] || 0) + 1;
    });
    return counts;
  }, [articles]);

  const favoritesCount = useMemo(() => {
    return articles.filter((a) => a.is_favorite).length;
  }, [articles]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Active filter statistics & helpers
  const activeFiltersCount = (selectedModuleId !== 'ALL' ? 1 : 0) + (selectedFolderId !== 'ALL' ? 1 : 0);
  const activeModuleName = modules.find((m) => m.id === selectedModuleId)?.name;
  const activeFolderName =
    selectedFolderId === 'NONE'
      ? 'Sem Pasta'
      : folders.find((f) => f.id === selectedFolderId)?.name;

  // Filtered and searched articles
  const filteredArticles = useMemo(() => {
    let list = [...articles];

    // Filter by module
    if (selectedModuleId !== 'ALL') {
      list = list.filter((a) => a.module_id === selectedModuleId);
    }

    // Filter by custom folder
    if (selectedFolderId !== 'ALL') {
      if (selectedFolderId === 'NONE') {
        list = list.filter((a) => !a.folder_id);
      } else {
        list = list.filter((a) => a.folder_id === selectedFolderId);
      }
    }

    // Filter by tab (Favorites or Recent)
    if (activeTabFilter === 'FAVORITES') {
      list = list.filter((a) => a.is_favorite);
    }

    // Smart search: case-insensitive, accent-insensitive
    if (searchQuery.trim()) {
      const qNorm = normalizeStr(searchQuery);
      const queryTokens = qNorm.split(/\s+/).filter(Boolean);

      list = list.filter((art) => {
        const title = normalizeStr(art.title);
        const summary = normalizeStr(art.summary);
        const modName = normalizeStr(art.module_name || art.module || '');
        const keywords = (art.keywords || []).map(normalizeStr).join(' ');
        const tags = (art.tags || []).map(normalizeStr).join(' ');
        const symptom = normalizeStr(art.content?.symptom);
        const rootCause = normalizeStr(art.content?.root_cause);
        const steps = normalizeStr(art.content?.resolution_steps_markdown);
        const quickSnippet = normalizeStr(art.content?.quick_reply_snippet);

        const fullText = `${title} ${summary} ${modName} ${keywords} ${tags} ${symptom} ${rootCause} ${steps} ${quickSnippet}`;

        return queryTokens.every((token) => fullText.includes(token));
      });
    }

    // Sorting
    if (activeTabFilter === 'RECENT') {
      list.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
    } else {
      // Default: prioritize favorites, then by relevance/updated
      list.sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
    }

    return list;
  }, [articles, selectedModuleId, selectedFolderId, activeTabFilter, searchQuery]);

  // Actions
  const handleSelectArticle = (art: Article) => {
    setSelectedArticleId(art.id);
    onSelectArticleId?.(art.id);
  };

  const handleBackToList = () => {
    setSelectedArticleId(null);
    onSelectArticleId?.(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedModuleId('ALL');
    setSelectedFolderId('ALL');
    setActiveTabFilter('ALL');
  };

  const handleCopyQuickReply = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setIsQuickReplyCopied(true);
    onShowToast('Resposta rápida copiada para a área de transferência!');
    setTimeout(() => setIsQuickReplyCopied(false), 2500);
  };

  const handleVote = (isHelpful: boolean) => {
    if (!activeArticle) return;
    setHasVotedHelpful(isHelpful ? 'yes' : 'no');
    onVoteHelpful(activeArticle.id, isHelpful);
    onShowToast(isHelpful ? 'Obrigado! Feedback positivo registrado.' : 'Feedback registrado para melhoria do artigo.');
  };

  // Safe markdown render
  const renderedResolutionMarkdown = useMemo(() => {
    if (!activeArticle?.content?.resolution_steps_markdown) return '';
    try {
      return marked.parse(activeArticle.content.resolution_steps_markdown);
    } catch {
      return activeArticle.content.resolution_steps_markdown;
    }
  }, [activeArticle]);

  // Permissions check
  const canManageArticles =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'SUPERVISOR' ||
    currentUser.role === 'TECH' ||
    currentUser.permissions?.can_manage_modules;

  // Active module helper
  const getModuleForArticle = (art: Article) => {
    return modules.find((m) => m.id === art.module_id) || {
      id: 'default',
      name: art.module_name || art.module || 'Geral',
      color: '#3B82F6',
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      {/* ================= 1. TOP HEADER & SEARCH HUB ================= */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Stats */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                    <span>Base de Conhecimento</span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {articles.length} {articles.length === 1 ? 'artigo' : 'artigos'}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Soluções técnicas rápidas e procedimentos homologados para atendimento em tempo real
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setIsTaxonomySidebarOpen(!isTaxonomySidebarOpen)}
                className={`text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                  isTaxonomySidebarOpen
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isTaxonomySidebarOpen ? 'Ocultar Árvore de Pastas & Taxonomia' : 'Mostrar Árvore de Pastas & Taxonomia'}
              >
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">{isTaxonomySidebarOpen ? 'Ocultar Pastas' : 'Árvore de Pastas'}</span>
                <span className="sm:hidden">Pastas</span>
              </button>

              <button
                type="button"
                onClick={onOpenFoldersModal}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Gerenciar pastas personalizadas da Base de Conhecimento"
              >
                <FolderIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span>Gerenciar Pastas</span>
              </button>

              {canManageArticles && (
                <button
                  type="button"
                  onClick={() => onOpenArticleEditor(null)}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Artigo</span>
                </button>
              )}
            </div>
          </div>

          {/* Prominent Search Bar */}
          <div className="mt-4 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedArticleId && e.target.value.trim()) {
                    // Return to results view while typing
                    setSelectedArticleId(null);
                    onSelectArticleId?.(null);
                  }
                }}
                placeholder="Pesquisar por erro, rejeição SEFAZ, palavra-chave, módulo ou solução (ex: Rejeição 215, Bling, XML)..."
                className="w-full text-sm bg-slate-50/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-10 pr-24 py-2.5 outline-none focus:ring-3 focus:ring-blue-100 dark:focus:ring-blue-900/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs font-normal transition"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                    Ctrl+K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Filter Bar: Quick Tabs & Module/Folder Pills */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Left: Quick View Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTabFilter('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTabFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Todos</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTabFilter === 'ALL' ? 'bg-slate-700 dark:bg-slate-300 text-slate-200 dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {articles.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabFilter('RECENT')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTabFilter === 'RECENT'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mais Recentes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabFilter('FAVORITES')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTabFilter === 'FAVORITES'
                    ? 'bg-amber-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${activeTabFilter === 'FAVORITES' ? 'fill-white text-white' : 'text-amber-500'}`} />
                <span>Favoritos</span>
                {favoritesCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTabFilter === 'FAVORITES' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {favoritesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Right: Modern Filtros Popover Button & Clear Action */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={filterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                    activeFiltersCount > 0
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Filtrar artigos por módulo ou pasta"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Floating Filter Popover */}
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-40 text-slate-800 dark:text-slate-100 animate-fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-bold text-xs">Filtros de Artigos</h4>
                        {activeFiltersCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {activeFiltersCount} ativo(s)
                          </span>
                        )}
                      </div>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModuleId('ALL');
                            setSelectedFolderId('ALL');
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-500 font-semibold cursor-pointer"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>

                    {/* Section 1: Modules */}
                    <div className="mb-4">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>Filtrar por Módulo</span>
                      </label>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        <button
                          type="button"
                          onClick={() => setSelectedModuleId('ALL')}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedModuleId === 'ALL'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Todos os Módulos</span>
                          <span className="text-[10px] font-mono text-slate-400">{articles.length}</span>
                        </button>
                        {modules.map((mod) => {
                          const count = moduleCounts[mod.id] || 0;
                          const isSel = selectedModuleId === mod.id;
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => setSelectedModuleId(isSel ? 'ALL' : mod.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                isSel
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: mod.color || '#3B82F6' }} />
                                <span className="truncate">{mod.name}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Folders */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FolderIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Filtrar por Pasta</span>
                        </label>
                        {onOpenFoldersModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsFilterDropdownOpen(false);
                              onOpenFoldersModal();
                            }}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>Gerenciar Pastas</span>
                          </button>
                        )}
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId('ALL')}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedFolderId === 'ALL'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Todas as Pastas</span>
                          <span className="text-[10px] font-mono text-slate-400">{articles.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(selectedFolderId === 'NONE' ? 'ALL' : 'NONE')}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedFolderId === 'NONE'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-slate-500 dark:text-slate-400 italic">Sem Pasta (Raiz)</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {articles.filter((a) => !a.folder_id).length}
                          </span>
                        </button>
                        {folders.map((f) => {
                          const count = articles.filter((a) => a.folder_id === f.id).length;
                          const isSel = selectedFolderId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSelectedFolderId(isSel ? 'ALL' : f.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <FolderIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{f.name}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Popover Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setIsFilterDropdownOpen(false)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition"
                      >
                        Aplicar Filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {(searchQuery || selectedModuleId !== 'ALL' || selectedFolderId !== 'ALL' || activeTabFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Indicators (Clean summary chips when filters are in effect) */}
          {(activeFiltersCount > 0 || searchQuery) && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Filtros ativos:
              </span>
              {selectedModuleId !== 'ALL' && activeModuleName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <span>Módulo: <strong>{activeModuleName}</strong></span>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleId('ALL')}
                    className="hover:text-blue-900 dark:hover:text-white cursor-pointer"
                    title="Remover filtro de módulo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedFolderId !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>Pasta: <strong>{activeFolderName}</strong></span>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId('ALL')}
                    className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                    title="Remover filtro de pasta"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span>Busca: &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Limpar texto de busca"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold ml-auto cursor-pointer"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= 2. MAIN CONTENT BODY ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic & Collapsible Taxonomy Sidebar: Auto-collapses on scroll for full-width article reading */}
        <div
          className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
            isTaxonomySidebarOpen && !isScrolledDown
              ? 'w-80 opacity-100 max-w-xs'
              : 'w-0 opacity-0 max-w-0 pointer-events-none'
          }`}
        >
          <TaxonomySidebar
            categories={categories}
            folders={folders}
            articles={articles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={(id) => {
              const art = articles.find((a) => a.id === id);
              if (art) handleSelectArticle(art);
            }}
            onOpenCreateModal={() => onOpenArticleEditor(null)}
            userRole={(currentUser.role as any) || 'ADMIN'}
            selectedModule={selectedModuleId === 'ALL' ? null : modules.find((m) => m.id === selectedModuleId)?.name || null}
            onSelectModule={(modName) => {
              if (!modName) setSelectedModuleId('ALL');
              else {
                const found = modules.find((m) => m.name === modName);
                if (found) setSelectedModuleId(found.id);
              }
            }}
            selectedTag={null}
            onSelectTag={() => {}}
            onMoveArticleToFolder={onMoveArticleToFolder}
            onDeleteArticle={(id) => {
              const art = articles.find((a) => a.id === id);
              if (art) setArticleToDelete(art);
            }}
            canManageArticles={canManageArticles}
            isDarkTheme={isDarkTheme}
            onCloseSidebar={() => setIsTaxonomySidebarOpen(false)}
            onOpenFoldersModal={onOpenFoldersModal}
          />
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const st = e.currentTarget.scrollTop;
            if (st > 75 && !isScrolledDown) {
              setIsScrolledDown(true);
            } else if (st < 25 && isScrolledDown) {
              setIsScrolledDown(false);
            }
          }}
        >
          {/* VIEW 1: ARTICLE READING VIEW (If an article is selected) */}
          {activeArticle ? (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
              {/* Top Navigation Bar: Back & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="self-start inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Voltar à lista de soluções</span>
                  {searchQuery && (
                    <span className="text-slate-400 font-normal">
                      (busca: &ldquo;{searchQuery}&rdquo;)
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Favorite Star Button */}
                  <button
                    onClick={() => onToggleFavorite(activeArticle.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                      activeArticle.is_favorite
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={activeArticle.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        activeArticle.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                      }`}
                    />
                    <span>{activeArticle.is_favorite ? 'Favoritado' : 'Favoritar'}</span>
                  </button>

                  {/* Edit Article */}
                  {canManageArticles && (
                    <button
                      onClick={() => onOpenArticleEditor(activeArticle)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Editar Artigo</span>
                    </button>
                  )}

                  {/* Delete Article */}
                  {canManageArticles && onDeleteArticle && (
                    <button
                      type="button"
                      onClick={() => setArticleToDelete(activeArticle)}
                      className="bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Excluir este artigo da Base de Conhecimento"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Excluir</span>
                    </button>
                  )}

                  {/* Diff History */}
                  <button
                    onClick={() => onViewDiff(activeArticle)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Histórico de alterações e diff"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>v{activeArticle.version}</span>
                </button>
              </div>
            </div>

            {/* Essential Card: Title, Module & Quick Reply Snippet */}
            <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header: Module & Status Badge */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {(() => {
                    const mod = getModuleForArticle(activeArticle);
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: `${mod.color}15`,
                          color: mod.color,
                          border: `1px solid ${mod.color}35`,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: mod.color }}
                        />
                        <span>{mod.name}</span>
                      </span>
                    );
                  })()}

                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>

                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    Versão {activeArticle.version}.0
                  </span>

                  {activeArticle.is_confidential && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Restrito (Nível 3)</span>
                    </span>
                  )}
                </div>

                {/* Article Title */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    <HighlightedText text={activeArticle.title} query={searchQuery} />
                  </h2>
                  {activeArticle.summary && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      <HighlightedText text={activeArticle.summary} query={searchQuery} />
                    </p>
                  )}
                </div>

                {/* HIGHLIGHTED: Quick Reply Snippet (1-Click Copy for Customer Response) */}
                {activeArticle.content?.quick_reply_snippet && (
                  <div className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                          Resposta Pronta para o Cliente (Suporte Ágil)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyQuickReply(activeArticle.content.quick_reply_snippet)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
                          isQuickReplyCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isQuickReplyCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Resposta</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-100 leading-relaxed italic bg-white/70 dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/60">
                      &ldquo;{activeArticle.content.quick_reply_snippet}&rdquo;
                    </p>
                  </div>
                )}

                {/* Diagnostic Cards: Symptom & Root Cause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sintoma / Mensagem de Erro</span>
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeArticle.content?.symptom || 'Nenhum sintoma específico cadastrado.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span>Causa Raiz Identificada</span>
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeArticle.content?.root_cause || 'Causa raiz em análise técnica.'}
                    </p>
                  </div>
                </div>

                {/* Passo a Passo de Resolução (Markdown) */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Procedimento de Resolução Homologado</span>
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-blue-700 dark:prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-xl prose-strong:text-slate-900 dark:prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: renderedResolutionMarkdown }}
                  />
                </div>

                {/* Keywords Chips */}
                {activeArticle.keywords && activeArticle.keywords.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
                      <Tag className="w-3 h-3" />
                      <span>Palavras-chave:</span>
                    </span>
                    {activeArticle.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>

            {/* ================= 3. PROGRESSIVE DISCLOSURE COLLAPSIBLE ACCORDIONS ================= */}
            <div className="space-y-3">
              {/* Accordion 1: Workaround Técnico & Parâmetros ERP */}
              {(activeArticle.content?.workaround_notes || activeArticle.content?.erp_parameters) && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs transition">
                  <button
                    type="button"
                    onClick={() => setIsWorkaroundExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-200 dark:border-amber-800">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Workaround Técnico & Parâmetros de Integração
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Solução de contorno para analistas enquanto o patch definitivo é lançado
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">
                        {isWorkaroundExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                      </span>
                      {isWorkaroundExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isWorkaroundExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-amber-50/20 dark:bg-amber-950/20">
                      {activeArticle.content.workaround_notes && (
                        <div className="mt-3">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block mb-1">
                            Notas de Contorno:
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 leading-relaxed font-mono">
                            {activeArticle.content.workaround_notes}
                          </p>
                        </div>
                      )}

                      {activeArticle.content.erp_parameters && (
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Parâmetros ERP / Comandos:
                          </span>
                          <pre className="text-xs bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto font-mono">
                            {activeArticle.content.erp_parameters}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Accordion 2: Anexos e Documentos Técnicos */}
              {activeArticle.attachments && activeArticle.attachments.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs transition">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentsExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Anexos & Documentos Técnicos ({activeArticle.attachments.length})
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Exemplos de XML, payloads de API, logs de teste e modelos de planilha
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">
                        {isAttachmentsExpanded ? 'Ocultar arquivos' : 'Ver arquivos'}
                      </span>
                      {isAttachmentsExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isAttachmentsExpanded && (
                    <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      {activeArticle.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{att.file_name}</span>
                              <span className="text-slate-400 ml-2">
                                ({(att.file_size_bytes / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onShowToast(`Download iniciado: ${att.file_name}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Accordion 3: Metadados Administrativos & Auditoria */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs transition">
                <button
                  type="button"
                  onClick={() => setIsAdminMetaExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-700">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Informações Administrativas & Auditoria
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Autor, revisor, data de atualização, hash criptográfico e links públicos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {isAdminMetaExpanded ? 'Ocultar auditoria' : 'Ver detalhes'}
                    </span>
                    {isAdminMetaExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isAdminMetaExpanded && (
                  <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Autor Original</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{activeArticle.author_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Última Revisão</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {activeArticle.updated_by_name || activeArticle.author_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Data da Revisão</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {new Date(activeArticle.updated_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Acessos Registrados</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{activeArticle.views_count} visualizações</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Avaliação Útil</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          👍 {activeArticle.helpful_yes} úteis / 👎 {activeArticle.helpful_no}
                        </span>
                      </div>
                      {activeArticle.public_solution_url && (
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Espelho Público</span>
                          <a
                            href={activeArticle.public_solution_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">ajuda.suasvendas.com</span>
                          </a>
                        </div>
                      )}
                    </div>
                    {activeArticle.content_hash && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        <span>SHA-256: {activeArticle.content_hash}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Helpful Feedback Prompt */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 text-center shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                Este artigo resolveu a dúvida ou incidente do cliente?
              </span>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={hasVotedHelpful !== null}
                  onClick={() => handleVote(true)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                    hasVotedHelpful === 'yes'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sim, ajudou</span>
                </button>

                <button
                  disabled={hasVotedHelpful !== null}
                  onClick={() => handleVote(false)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                    hasVotedHelpful === 'no'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                  <span>Não ajudou</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: ARTICLES OVERVIEW LIST / GRID (CLEAN & FAST) */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Results bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </span>
                {selectedModuleId !== 'ALL' && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    no módulo{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {modules.find((m) => m.id === selectedModuleId)?.name}
                    </strong>
                  </span>
                )}
                {selectedFolderId !== 'ALL' && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    na pasta{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {folders.find((f) => f.id === selectedFolderId)?.name}
                    </strong>
                  </span>
                )}
                {searchQuery && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    para &ldquo;<strong className="text-slate-700 dark:text-slate-200">{searchQuery}</strong>&rdquo;
                  </span>
                )}
              </div>

              {filteredArticles.length > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Clique em um artigo para abrir o guia de atendimento
                </span>
              )}
            </div>

            {/* Articles List / Grid */}
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((art) => {
                  const mod = getModuleForArticle(art);
                  return (
                    <div
                      key={art.id}
                      onClick={() => handleSelectArticle(art)}
                      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between p-5 relative overflow-hidden"
                    >
                      {/* Left accent border by module color */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition group-hover:w-1.5"
                        style={{ backgroundColor: mod.color || '#3B82F6' }}
                      />

                      <div className="space-y-2.5">
                        {/* Top: Module Badge & Favorite Star */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${mod.color}15`,
                              color: mod.color,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: mod.color }}
                            />
                            <span>{mod.name}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            {canManageArticles && onDeleteArticle && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArticleToDelete(art);
                                }}
                                className="p-1 rounded text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Excluir este artigo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(art.id);
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={art.is_favorite ? 'Remover dos favoritos' : 'Favoritar artigo'}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  art.is_favorite
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-slate-300 group-hover:text-slate-400'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-2">
                          <HighlightedText text={art.title} query={searchQuery} />
                        </h3>

                        {/* Summary */}
                        {art.summary && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                            <HighlightedText text={art.summary} query={searchQuery} />
                          </p>
                        )}

                        {/* Keywords / Tags preview */}
                        {art.keywords && art.keywords.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {art.keywords.slice(0, 3).map((kw) => (
                              <span
                                key={kw}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 rounded font-medium"
                              >
                                #{kw}
                              </span>
                            ))}
                            {art.keywords.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{art.keywords.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Metadata & Ver Solução */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>{art.views_count}</span>
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(art.updated_at || art.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickViewArticle(art);
                            }}
                            className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs"
                            title="Visualização rápida das informações essenciais para suporte"
                          >
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Resumo Rápido</span>
                          </button>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition">
                            <span>Completo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Search State */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 text-slate-700 dark:text-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhum artigo encontrado</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Não encontramos resultados correspondentes aos filtros ou à pesquisa informada. Verifique os termos ou limpe os filtros para visualizar todos os artigos.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
                  >
                    Limpar Busca e Filtros
                  </button>
                  {canManageArticles && (
                    <button
                      type="button"
                      onClick={() => onOpenArticleEditor(null)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                    >
                      + Cadastrar Novo Artigo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    
      {/* ================= 4. QUICK VIEW MODAL (RESUMO RÁPIDO PARA SUPORTE) ================= */}
      {quickViewArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setQuickViewArticle(null)}>
          <div
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick View Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/20 rounded-md">
                      Visualização Rápida • Suporte
                    </span>
                    <span className="text-xs text-slate-300">
                      {quickViewArticle.module_name || quickViewArticle.module}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white leading-tight mt-0.5">
                    {quickViewArticle.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setQuickViewArticle(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick View Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Quick reply snippet */}
              {quickViewArticle.content?.quick_reply_snippet && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Resposta Pronta para Envio ao Cliente</span>
                    </span>
                    <button
                      onClick={() => handleCopyQuickReply(quickViewArticle.content.quick_reply_snippet)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-[11px] transition flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 leading-relaxed">
                    &ldquo;{quickViewArticle.content.quick_reply_snippet}&rdquo;
                  </p>
                </div>
              )}

              {/* Problem & Root Cause Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Situação / Problema Relatado</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {quickViewArticle.content?.symptom || quickViewArticle.summary || "Sem descrição de sintoma."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span>Causa Conhecida</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {quickViewArticle.content?.root_cause || "Causa padrão analisada pela engenharia."}
                  </p>
                </div>
              </div>

              {/* Caminho no sistema */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                    Caminho dos Menus no Sistema:
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                    {quickViewArticle.content?.menu_path || "Vendas > Pedidos / Faturamento > Ações"}
                  </span>
                </div>
              </div>

              {/* Observações e Cuidados */}
              {quickViewArticle.content?.observations && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                  <span className="font-bold block text-[11px] mb-1">
                    ⚠️ Observações Importantes:
                  </span>
                  <p className="leading-relaxed">
                    {quickViewArticle.content.observations}
                  </p>
                </div>
              )}

              {/* Encaminhamento Técnico */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                    Encaminhamento Técnico / Escalonamento:
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {quickViewArticle.content?.escalation_notes || "Resolvido diretamente no atendimento de 1º Nível."}
                  </span>
                </div>
                {quickViewArticle.is_confidential && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold rounded">
                    Requer Nível 3
                  </span>
                )}
              </div>
            </div>

            {/* Quick View Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setQuickViewArticle(null)}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 text-xs font-semibold transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectArticle(quickViewArticle);
                  setQuickViewArticle(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>Abrir Artigo Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. DELETE ARTICLE CONFIRMATION MODAL ================= */}
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
                  Esta ação removerá o artigo definitivamente da Base de Conhecimento.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                {articleToDelete.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Módulo: {articleToDelete.module_name || articleToDelete.module || 'Geral'} • Versão {articleToDelete.version}.0
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
              Tem certeza que deseja excluir permanentemente este artigo? Procedimentos, respostas prontas e soluções rápidas vinculadas não estarão mais disponíveis para a equipe de suporte.
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
                  if (articleToDelete) {
                    onDeleteArticle?.(articleToDelete.id);
                    if (selectedArticleId === articleToDelete.id) {
                      setSelectedArticleId(null);
                      onSelectArticleId?.(null);
                    }
                    setArticleToDelete(null);
                  }
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
  );
};
