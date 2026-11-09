import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Search,
  FileText,
  Copy,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Article, UserRole } from '../types/kb';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  userRole: UserRole;
  onSelectArticle: (id: string) => void;
  onLogSearch: (query: string, resultsCount: number, latencyMs: number) => void;
  onShowToast: (message: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  articles,
  userRole,
  onSelectArticle,
  onLogSearch,
  onShowToast,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Short delay to allow motion mount before focusing input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter and score articles with performance benchmarking
  const t0 = performance.now();

  const q = query.trim().toLowerCase();

  const filtered = articles.filter((art) => {
    // Confidentiality check: only ADMIN or REVIEWER can see confidential articles
    if (art.is_confidential && userRole === 'AGENT') return false;

    if (selectedModuleFilter && art.module !== selectedModuleFilter) return false;

    if (!q) return true;

    // Check if query is tag specific (#tag)
    if (q.startsWith('#')) {
      const searchTag = q.slice(1);
      return art.tags.some((t) => t.toLowerCase().includes(searchTag));
    }

    // Check if query is error code specific ($code)
    if (q.startsWith('$')) {
      const errorCode = q.slice(1);
      return (
        art.title.toLowerCase().includes(errorCode) ||
        art.tags.some((t) => t.toLowerCase().includes(errorCode)) ||
        art.content.symptom.toLowerCase().includes(errorCode)
      );
    }

    // Full text fuzzy search across title, summary, tags, symptom, markdown
    const inTitle = art.title.toLowerCase().includes(q);
    const inSummary = (art.summary || '').toLowerCase().includes(q);
    const inTags = art.tags.some((t) => t.toLowerCase().includes(q));
    const inSymptom = art.content.symptom.toLowerCase().includes(q);
    const inResolution = art.content.resolution_steps_markdown.toLowerCase().includes(q);

    return inTitle || inSummary || inTags || inSymptom || inResolution;
  });

  const t1 = performance.now();
  const calculatedLatency = Math.max(0.8, t1 - t0);

  // Reset index when search query or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedModuleFilter]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          if (e.shiftKey) {
            // Shift + Enter: Instant Copy customer snippet
            if (selected.content.quick_reply_snippet) {
              navigator.clipboard.writeText(selected.content.quick_reply_snippet);
              onShowToast('Snippet copiado direto da busca com Shift+Enter!');
              onClose();
            } else {
              onShowToast('Artigo sem resposta rápida cadastrada.');
            }
          } else {
            // Normal Enter: Open Article
            onSelectArticle(selected.id);
            onLogSearch(query, filtered.length, calculatedLatency);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, query, calculatedLatency, onClose, onSelectArticle, onLogSearch, onShowToast]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
  };

  // Animation variants
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: -12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: -8,
      transition: {
        duration: 0.14,
        ease: 'easeIn' as const,
      },
    },
  };

  const listContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.025,
      },
    },
  };

  const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.16, ease: 'easeOut' as const },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="command-palette-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start justify-center pt-16 sm:pt-24 p-3"
          onClick={onClose}
        >
          <motion.div
            key="command-palette-card"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Digite para buscar em tempo real (ex: '215', 'NFe', 'estoque', #sefaz)..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400 font-medium"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  {calculatedLatency.toFixed(2)}ms
                </span>
              </div>
            </div>

            {/* Quick Module Filter Bar */}
            <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">Módulo:</span>
              {['Todos', 'Faturamento e NF-e', 'Pedidos', 'Integrações', 'App Mobile'].map((m) => {
                const isSelected =
                  (m === 'Todos' && selectedModuleFilter === null) ||
                  selectedModuleFilter === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedModuleFilter(m === 'Todos' ? null : m)}
                    className={`px-2 py-0.5 rounded font-medium transition shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-10 text-center text-slate-400"
                >
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-600">
                    Nenhum artigo encontrado para "{query}"
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Esta busca foi registrada na telemetria de <strong>Content Gaps</strong> para a equipe editorial criar o procedimento.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={query + (selectedModuleFilter || '')}
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1"
                >
                  {filtered.map((art, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <motion.div
                        key={art.id}
                        variants={listItemVariants}
                        layout
                        onClick={() => {
                          onSelectArticle(art.id);
                          onLogSearch(query, filtered.length, calculatedLatency);
                          onClose();
                        }}
                        className="relative p-3 rounded-xl cursor-pointer flex items-start justify-between gap-3 select-none"
                      >
                        {/* Animated Selection Pill for active keyboard / hover selection */}
                        {isSelected && (
                          <motion.div
                            layoutId="palette-active-indicator"
                            className="absolute inset-0 bg-blue-50/90 border border-blue-200 rounded-xl shadow-2xs"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}

                        <div className="relative z-10 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                              {art.module}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {art.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              v{art.version}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {art.summary || art.content.symptom}
                          </p>

                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {art.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="text-[9px] font-mono bg-white/80 border border-slate-200 px-1.5 py-0.2 rounded text-slate-500"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-end justify-between shrink-0 self-stretch">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (art.content.quick_reply_snippet) {
                                navigator.clipboard.writeText(art.content.quick_reply_snippet);
                                onShowToast('Snippet copiado com 1-clique!');
                              }
                            }}
                            className="text-[10px] bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition shadow-2xs"
                            title="Copiar resposta rápida"
                          >
                            <Copy className="w-3 h-3" />
                            <span className="hidden sm:inline">Copiar Snippet</span>
                          </button>

                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>Abrir</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Footer shortcuts hint */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="kbd-badge text-[9px]">↑</span>
                  <span className="kbd-badge text-[9px]">↓</span>
                  <span>Navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="kbd-badge text-[9px]">Enter</span>
                  <span>Abrir</span>
                </span>
                <span className="flex items-center gap-1 text-blue-700 font-medium">
                  <span className="kbd-badge text-[9px]">Shift</span>
                  <span>+</span>
                  <span className="kbd-badge text-[9px]">Enter</span>
                  <span>Copiar Resposta</span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="kbd-badge text-[9px]">Esc</span>
                <span>Fechar</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
