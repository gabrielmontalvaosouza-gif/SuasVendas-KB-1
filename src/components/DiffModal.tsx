import React, { useState } from 'react';
import { History, X, ArrowLeft, ArrowRight, GitCommit, FileText, Check } from 'lucide-react';
import { Article, ArticleVersionSnapshot } from '../types/kb';
import { computeLineDiff } from '../utils/diff';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  snapshots: ArticleVersionSnapshot[];
  onRestoreVersion?: (snapshot: ArticleVersionSnapshot) => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  article,
  snapshots,
  onRestoreVersion,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    snapshots[snapshots.length - 1]?.id || ''
  );

  if (!isOpen) return null;

  const currentSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];

  const originalText = currentSnapshot?.content_snapshot.resolution_steps_markdown || '';
  const currentText = article.content.resolution_steps_markdown || '';

  const diffLines = computeLineDiff(originalText, currentText);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                Histórico Editorial & Comparador de Diffs
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoria de alterações por versão para: {article.title}
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

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Snapshots timeline list */}
          <div className="w-full md:w-64 border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto space-y-2 shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Versões Anteriores:
            </span>

            {snapshots.length === 0 ? (
              <div className="text-xs text-slate-400 italic p-2">
                Nenhum snapshot anterior registrado. Esta é a versão inicial v{article.version}.
              </div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = snap.id === currentSnapshot?.id;
                return (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold font-mono">v{snap.version_number}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {new Date(snap.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] font-medium truncate ${
                        isSelected ? 'text-blue-100' : 'text-slate-600'
                      }`}
                    >
                      {snap.changed_by}
                    </div>
                    <div
                      className={`text-[10px] italic mt-1 line-clamp-2 ${
                        isSelected ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      "{snap.change_reason}"
                    </div>
                  </button>
                );
              })
            )}

            {/* Current Active Badge */}
            <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <div className="font-bold font-mono">v{article.version} (Atual)</div>
              <div className="text-[10px] text-emerald-700">Versão ativa em produção</div>
            </div>
          </div>

          {/* Right: Visual Diff Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  Comparando: Versão anterior (v{currentSnapshot?.version_number || 1}) x Versão Atual (v{article.version})
                </span>
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">
                  - Removido
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                  + Adicionado
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5 bg-slate-950 text-slate-200">
              {diffLines.map((line, idx) => {
                if (line.type === 'remove') {
                  return (
                    <div
                      key={idx}
                      className="bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded flex items-start gap-2 border-l-2 border-rose-500"
                    >
                      <span className="text-rose-500 select-none">-</span>
                      <span className="whitespace-pre-wrap">{line.text}</span>
                    </div>
                  );
                }
                if (line.type === 'add') {
                  return (
                    <div
                      key={idx}
                      className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded flex items-start gap-2 border-l-2 border-emerald-500"
                    >
                      <span className="text-emerald-500 select-none">+</span>
                      <span className="whitespace-pre-wrap">{line.text}</span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="text-slate-400 px-2 py-0.5 flex items-start gap-2">
                    <span className="text-slate-600 select-none"> </span>
                    <span className="whitespace-pre-wrap">{line.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
