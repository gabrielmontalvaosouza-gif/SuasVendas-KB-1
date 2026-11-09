import React, { useState } from 'react';
import {
  Edit3,
  History,
  ThumbsUp,
  ThumbsDown,
  Eye,
  FileCode,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Article, Category, Folder, UserRole } from '../types/kb';
import { marked } from 'marked';

interface ArticleViewProps {
  article: Article;
  categories: Category[];
  folders: Folder[];
  userRole: UserRole;
  onEdit: () => void;
  onViewDiff: () => void;
  onVoteHelpful: (isHelpful: boolean) => void;
  onTagClick: (tag: string) => void;
  onShowToast: (message: string) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  categories,
  folders,
  userRole,
  onEdit,
  onViewDiff,
  onVoteHelpful,
  onTagClick,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'solution' | 'workaround' | 'attachments'>('solution');
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const folder = folders.find((f) => f.id === article.folder_id);
  const category = folder ? categories.find((c) => c.id === folder.category_id) : null;

  // Render markdown safely
  const renderedMarkdown = marked.parse(article.content.resolution_steps_markdown || '');

  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    PUBLISHED: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'Homologado', label: 'PUBLISHED' },
    IN_REVIEW: { bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'Em Revisão', label: 'IN_REVIEW' },
    DRAFT: { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Rascunho', label: 'DRAFT' },
    ARCHIVED: { bg: 'bg-rose-100 text-rose-800 border-rose-200', text: 'Obsoleto', label: 'ARCHIVED' },
  };

  const currentStatus = statusStyles[article.status] || statusStyles.PUBLISHED;

  return (
    <main className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden h-full transition-colors">
      {/* Header bar of the active article */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            {/* Breadcrumb & Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider border ${currentStatus.bg}`}
              >
                {currentStatus.label}
              </span>

              <span className="text-xs text-slate-300 dark:text-slate-600">•</span>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <span>{category?.name || 'Geral'}</span>
                <span>/</span>
                <span>{folder?.name || 'Soluções'}</span>
              </span>

              <span className="text-xs text-slate-300 dark:text-slate-600">•</span>

              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                v{article.version}
              </span>

              {article.is_confidential && (
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                  Nível 3 (Engenharia)
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              {article.title}
            </h1>

            {/* Summary */}
            {article.summary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-normal">
                {article.summary}
              </p>
            )}

            {/* Meta info: Author, date, views */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 mt-2.5">
              <span>Autor: <strong className="text-slate-600 dark:text-slate-200 font-medium">{article.author_name}</strong></span>
              {article.updated_by_name && (
                <span>Atualizado por: <strong className="text-slate-600 dark:text-slate-200 font-medium">{article.updated_by_name}</strong></span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(article.updated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Eye className="w-3 h-3 text-slate-400" />
                {article.views_count} acessos
              </span>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onViewDiff}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Comparar histórico de versões e diffs"
            >
              <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Histórico & Diffs</span>
            </button>

            <button
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Artigo</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('solution')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'solution'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Diagnóstico & Solução</span>
          </button>

          {(article.content.workaround_notes || article.content.erp_parameters) && (
            <button
              onClick={() => setActiveTab('workaround')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'workaround'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Workaround & ERP (Nível 3)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('attachments')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'attachments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Anexos & Documentos ({article.attachments?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'solution' && (
          <>
            {/* CARD: Diagnóstico Rápido (TL;DR) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sintoma */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold tracking-wider text-blue-900 dark:text-blue-300 uppercase flex items-center gap-1.5 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300"></span>
                  Sintoma Reportado
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {article.content.symptom || 'Nenhum sintoma específico cadastrado.'}
                </p>
              </div>

              {/* Causa Raiz */}
              <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold tracking-wider text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-300"></span>
                  Causa Raiz Identificada
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {article.content.root_cause || 'Causa raiz sob investigação.'}
                </p>
              </div>
            </div>

            {/* Technical Resolution (Rich Markdown) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
              <h2 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Passo a Passo Técnico para Solução</span>
              </h2>

              <div
                className="prose prose-sm max-w-none text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-blue-700 dark:prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-xl prose-strong:text-slate-900 dark:prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: renderedMarkdown as string }}
              />
            </div>
          </>
        )}

        {activeTab === 'workaround' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Workaround Conhecido & Notas de Engenharia (Nível 3)</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {article.content.workaround_notes || 'Nenhuma nota restrita para este artigo.'}
              </p>
            </div>

            {article.content.erp_parameters && (
              <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                    Parâmetros ERP & Comandos Internos
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(article.content.erp_parameters || '');
                      onShowToast('Parâmetros copiados!');
                    }}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="font-mono text-xs bg-black/40 p-3 rounded-lg overflow-x-auto text-emerald-400 border border-slate-800">
                  {article.content.erp_parameters}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3">
              Anexos e Documentos de Homologação
            </h2>

            {(!article.attachments || article.attachments.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <FileCode className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nenhum anexo vinculado a este artigo.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Você pode fazer upload de XMLs de rejeição ou planilhas de importação ao editar o artigo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {article.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/90 transition flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        {att.mime_type.includes('xml') ? (
                          <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : att.mime_type.includes('sheet') || att.file_name.endsWith('.xlsx') ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate font-mono">
                            {att.file_name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {(att.file_size_bytes / 1024).toFixed(1)} KB • {att.mime_type}
                          </div>
                        </div>
                      </div>
                    </div>

                    {att.sample_content && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setPreviewAttachmentId(previewAttachmentId === att.id ? null : att.id)
                          }
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {previewAttachmentId === att.id ? 'Ocultar pré-visualização' : 'Pré-visualizar XML'}
                        </button>
                        {previewAttachmentId === att.id && (
                          <pre className="mt-2 text-[10px] bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-h-48 font-mono border border-slate-800">
                            {att.sample_content}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          onShowToast(`Download iniciado: ${att.file_name}`);
                        }}
                        className="text-[11px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span>Baixar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Tags:</span>
          {article.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-md transition cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Helpful Rating / Feedback for Quality Governance */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Este artigo ajudou a solucionar o chamado do cliente?
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVoteHelpful(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-2xs cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sim ({article.helpful_yes})</span>
            </button>
            <button
              onClick={() => onVoteHelpful(false)}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-2xs cursor-pointer"
            >
              <ThumbsDown className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Não ({article.helpful_no})</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
