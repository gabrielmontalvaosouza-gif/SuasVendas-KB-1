import React from 'react';
import {
  Copy,
  ExternalLink,
  Share2,
  AlertTriangle,
  ShieldCheck,
  Check,
  FileText,
  Link,
  Hash,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Article } from '../types/kb';

interface SupportSidebarProps {
  article: Article;
  relatedArticles: Article[];
  onSelectArticle: (id: string) => void;
  onOpenReportOutdated: () => void;
  onShowToast: (message: string) => void;
}

export const SupportSidebar: React.FC<SupportSidebarProps> = ({
  article,
  relatedArticles,
  onSelectArticle,
  onOpenReportOutdated,
  onShowToast,
}) => {
  const copySnippet = () => {
    if (!article.content.quick_reply_snippet) {
      onShowToast('Nenhum snippet cadastrado para este artigo.');
      return;
    }
    navigator.clipboard.writeText(article.content.quick_reply_snippet);
    onShowToast('Snippet copiado para a área de transferência!');
  };

  const copyPublicLink = () => {
    if (!article.public_solution_url) {
      onShowToast('Este artigo não possui URL pública vinculada.');
      return;
    }
    navigator.clipboard.writeText(article.public_solution_url);
    onShowToast('Link da central pública copiado!');
  };

  const copyInternalDeepLink = () => {
    const deepLink = `${window.location.origin}/#article=${article.id}`;
    navigator.clipboard.writeText(deepLink);
    onShowToast('Deep link interno copiado para o chat da equipe!');
  };

  const copyUUID = () => {
    navigator.clipboard.writeText(article.id);
    onShowToast('UUID copiado!');
  };

  const copyHash = () => {
    navigator.clipboard.writeText(article.content_hash);
    onShowToast('Hash SHA-256 copiado!');
  };

  return (
    <aside className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 select-none h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Ações de Atendimento
        </span>
        <button
          onClick={copyInternalDeepLink}
          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition"
          title="Copiar Deep Link Interno"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Quick-Copy Snippet (Resposta Pronta) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">
              Resposta Pronta (Chat / Ticket)
            </span>
            <button
              onClick={copySnippet}
              className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-md border border-blue-200 flex items-center gap-1 transition shadow-2xs"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar (1-clique)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 font-sans italic max-h-36 overflow-y-auto leading-relaxed select-text">
            {article.content.quick_reply_snippet || (
              <span className="text-slate-400">Nenhum snippet pronto cadastrado.</span>
            )}
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <span>Atalho rápido:</span>
            <span className="kbd-badge text-[9px]">Shift</span>
            <span>+</span>
            <span className="kbd-badge text-[9px]">Enter</span>
            <span>no Ctrl+K</span>
          </div>
        </div>

        {/* 2. Central de Ajuda Pública (Link para o cliente) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800">Central de Ajuda Pública</span>
            {article.public_solution_url && (
              <button
                onClick={copyPublicLink}
                className="text-[10px] text-blue-600 hover:underline font-medium"
              >
                Copiar link
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mb-2 leading-tight">
            Artigo espelhado no ajuda.suasvendas.com:
          </p>

          {article.public_solution_url ? (
            <a
              href={article.public_solution_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline truncate block flex items-center gap-1 font-medium bg-blue-50/50 p-2 rounded border border-blue-100"
            >
              <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
              <span className="truncate">{article.public_solution_url.replace('https://', '')}</span>
            </a>
          ) : (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100">
              Artigo exclusivo da base interna (sem link público).
            </div>
          )}
        </div>

        {/* 3. Auditoria & Integridade JSON */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Auditoria & Integridade</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="text-[11px] text-slate-400">UUID:</span>
            <button
              onClick={copyUUID}
              className="font-mono text-[10px] text-blue-600 hover:underline flex items-center gap-1"
              title="Clique para copiar UUID"
            >
              <span>{article.id.substring(0, 12)}...</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="text-[11px] text-slate-400">Hash SHA256:</span>
            <button
              onClick={copyHash}
              className="font-mono text-[10px] text-blue-600 hover:underline truncate max-w-[130px] flex items-center gap-1"
              title={article.content_hash}
            >
              <span className="truncate">{article.content_hash.substring(0, 10)}...</span>
              <Copy className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="text-[11px] text-slate-400">Versão:</span>
            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              v{article.version}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="text-[11px] text-slate-400">Última alteração:</span>
            <span className="font-mono text-[10px] text-slate-500">
              {new Date(article.updated_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* 4. Artigos Relacionados */}
        {relatedArticles.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-xs font-bold text-slate-800 block mb-2">
              Artigos Relacionados
            </span>
            <div className="space-y-1.5">
              {relatedArticles.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => onSelectArticle(rel.id)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 transition flex items-start gap-1.5 group"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                  <span className="truncate group-hover:text-blue-600 font-medium">
                    {rel.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Reportar Desatualização */}
        <button
          onClick={onOpenReportOutdated}
          className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs py-2 px-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Reportar Desatualização</span>
        </button>
      </div>
    </aside>
  );
};
