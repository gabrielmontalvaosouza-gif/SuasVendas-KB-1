import React, { useState } from 'react';
import { AlertTriangle, X, Send } from 'lucide-react';
import { Article, User } from '../types/kb';

interface OutdatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  currentUser: User;
  onSubmitReport: (reason: string, erpVersion: string) => void;
}

export const OutdatedModal: React.FC<OutdatedModalProps> = ({
  isOpen,
  onClose,
  article,
  currentUser,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState('');
  const [erpVersion, setErpVersion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Por favor descreva o que mudou ou está desatualizado.');
      return;
    }
    onSubmitReport(reason, erpVersion);
    setReason('');
    setErpVersion('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <h3 className="font-bold text-sm">Reportar Desatualização Técnica</h3>
          </div>
          <button onClick={onClose} className="text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Artigo Selecionado:</span>
            <div className="font-bold text-slate-800 text-sm">{article.title}</div>
            <div className="text-[11px] font-mono text-slate-500">v{article.version} • {article.module}</div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Versão do ERP / Módulo Afetado (opcional)
            </label>
            <input
              type="text"
              value={erpVersion}
              onChange={(e) => setErpVersion(e.target.value)}
              placeholder="ex: Release 2026.10, Tiny ERP v3.8, SEFAZ NT 2024.002"
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-amber-600"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              O que mudou na tela ou no procedimento? *
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva a alteração para que os revisores de Nível 2/3 atualizem o artigo técnico..."
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-amber-600 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Alerta aos Revisores</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
