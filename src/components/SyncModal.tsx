import React, { useState } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldCheck,
  X,
  FileCode,
  Layers,
  Database,
  Sliders,
} from 'lucide-react';
import {
  Category,
  Folder,
  Article,
  DryRunItem,
  DryRunStatus,
  SyncEnvelope,
  User,
} from '../types/kb';
import { calculateSHA256 } from '../utils/crypto';
import { computeLineDiff } from '../utils/diff';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  folders: Folder[];
  articles: Article[];
  currentUser: User;
  onCommitImport: (
    updatedCategories: Category[],
    updatedFolders: Folder[],
    updatedArticles: Article[],
    auditMessage: string
  ) => void;
  onShowToast: (message: string) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  categories,
  folders,
  articles,
  currentUser,
  onCommitImport,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportScope, setExportScope] = useState<'FULL' | string>('FULL');
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [dryRunReport, setDryRunReport] = useState<DryRunItem[] | null>(null);
  const [incomingPayload, setIncomingPayload] = useState<SyncEnvelope | null>(null);
  const [conflictResolutionMap, setConflictResolutionMap] = useState<
    Record<string, 'KEEP_LOCAL' | 'OVERWRITE_INCOMING'>
  >({});
  const [activeDiffConflict, setActiveDiffConflict] = useState<DryRunItem | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');

  if (!isOpen) return null;

  // Handle Export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      let filteredCategories = categories;
      let filteredFolders = folders;
      let filteredArticles = articles;

      if (exportScope !== 'FULL') {
        filteredCategories = categories.filter((c) => c.id === exportScope);
        const folderIds = folders
          .filter((f) => f.category_id === exportScope)
          .map((f) => f.id);
        filteredFolders = folders.filter((f) => folderIds.includes(f.id));
        filteredArticles = articles.filter((a) => folderIds.includes(a.folder_id));
      }

      const payloadData = {
        categories: filteredCategories,
        folders: filteredFolders,
        articles: filteredArticles,
      };

      const rawJson = JSON.stringify(payloadData);
      const checksum = await calculateSHA256(rawJson);

      const envelope: SyncEnvelope = {
        $schema: 'https://interno.suasvendas.com/schemas/kb-sync-v1.json',
        metadata: {
          schema_version: '1.0.0',
          exported_at: new Date().toISOString(),
          exported_by: {
            uuid: currentUser.id,
            email: currentUser.email,
          },
          source_instance: 'prod-suasvendas-kb-main',
          export_scope: exportScope === 'FULL' ? 'FULL' : 'CATEGORY',
          total_records: {
            categories: filteredCategories.length,
            folders: filteredFolders.length,
            articles: filteredArticles.length,
            tags: Array.from(new Set(filteredArticles.flatMap((a) => a.tags))).length,
          },
          payload_checksum_sha256: checksum,
        },
        data: payloadData,
      };

      const blob = new Blob([JSON.stringify(envelope, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `suasvendas-kb-sync-${exportScope.toLowerCase()}-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast('Envelope de sincronização JSON gerado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar JSON.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Input and Dry-Run Analysis
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const envelope: SyncEnvelope = JSON.parse(text);

        if (!envelope.data || !Array.isArray(envelope.data.articles)) {
          alert('Arquivo JSON inválido. Estrutura não segue o schema kb-sync-v1.');
          return;
        }

        setIncomingPayload(envelope);

        // Run Dry-Run classification
        const report: DryRunItem[] = [];
        const initialConflictMap: Record<string, 'KEEP_LOCAL' | 'OVERWRITE_INCOMING'> = {};

        for (const incoming of envelope.data.articles) {
          const local = articles.find((a) => a.id === incoming.id);

          if (!local) {
            report.push({
              incomingArticle: incoming,
              status: 'NEW',
              suggestedAction: 'Inserir novo artigo',
            });
            continue;
          }

          if (local.content_hash === incoming.content_hash) {
            report.push({
              incomingArticle: incoming,
              localArticle: local,
              status: 'UNCHANGED',
              suggestedAction: 'Ignorar (idêntico)',
            });
            continue;
          }

          const localTime = new Date(local.updated_at).getTime();
          const incomingTime = new Date(incoming.updated_at).getTime();

          if (incomingTime > localTime && incoming.version > local.version) {
            report.push({
              incomingArticle: incoming,
              localArticle: local,
              status: 'FAST_FORWARD',
              suggestedAction: `Atualização limpa (v${local.version} -> v${incoming.version})`,
              diffSummary: {
                localVersion: local.version,
                incomingVersion: incoming.version,
                localUpdatedAt: local.updated_at,
                incomingUpdatedAt: incoming.updated_at,
              },
            });
          } else {
            // CONFLICT!
            report.push({
              incomingArticle: incoming,
              localArticle: local,
              status: 'CONFLICT',
              suggestedAction: 'Divergência detectada (requer decisão)',
              diffSummary: {
                localVersion: local.version,
                incomingVersion: incoming.version,
                localUpdatedAt: local.updated_at,
                incomingUpdatedAt: incoming.updated_at,
              },
            });
            initialConflictMap[incoming.id] = 'KEEP_LOCAL';
          }
        }

        setDryRunReport(report);
        setConflictResolutionMap(initialConflictMap);
      } catch (err: any) {
        alert('Erro ao processar JSON: ' + err.message);
      }
    };

    reader.readAsText(file);
  };

  // Commit Import
  const handleCommit = () => {
    if (!dryRunReport || !incomingPayload) return;

    const newCategories = [...categories];
    const newFolders = [...folders];
    const newArticles = [...articles];

    // Merge categories
    incomingPayload.data.categories?.forEach((incCat) => {
      const idx = newCategories.findIndex((c) => c.id === incCat.id);
      if (idx === -1) {
        newCategories.push(incCat);
      } else {
        newCategories[idx] = incCat;
      }
    });

    // Merge folders
    incomingPayload.data.folders?.forEach((incFld) => {
      const idx = newFolders.findIndex((f) => f.id === incFld.id);
      if (idx === -1) {
        newFolders.push(incFld);
      } else {
        newFolders[idx] = incFld;
      }
    });

    // Merge articles based on Dry-Run & Conflict choices
    let insertedCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;

    dryRunReport.forEach((item) => {
      const { status, incomingArticle, localArticle } = item;

      if (status === 'NEW') {
        newArticles.push(incomingArticle);
        insertedCount++;
      } else if (status === 'FAST_FORWARD') {
        const idx = newArticles.findIndex((a) => a.id === incomingArticle.id);
        if (idx >= 0) {
          newArticles[idx] = incomingArticle;
          updatedCount++;
        }
      } else if (status === 'CONFLICT') {
        const choice = conflictResolutionMap[incomingArticle.id] || 'KEEP_LOCAL';
        if (choice === 'OVERWRITE_INCOMING') {
          const idx = newArticles.findIndex((a) => a.id === incomingArticle.id);
          if (idx >= 0) {
            newArticles[idx] = incomingArticle;
            updatedCount++;
          }
        } else {
          ignoredCount++;
        }
      } else if (status === 'UNCHANGED') {
        ignoredCount++;
      }
    });

    const auditMessage = `Importação JSON (${importFileName}): ${insertedCount} novos, ${updatedCount} atualizados, ${ignoredCount} inalterados/mantidos.`;
    onCommitImport(newCategories, newFolders, newArticles, auditMessage);
    onShowToast('Sincronização aplicada com sucesso na base de conhecimento!');
    onClose();
  };

  const statusBadge = (status: DryRunStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">NEW</span>;
      case 'FAST_FORWARD':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">FAST-FORWARD</span>;
      case 'UNCHANGED':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">UNCHANGED</span>;
      case 'CONFLICT':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded">CONFLICT</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                Motor de Sincronização & Portabilidade JSON
              </h3>
              <p className="text-[11px] text-slate-400">
                Envelope Padronizado (Schema v1.0.0) com hash SHA-256 e máquina de estados para resolução de conflitos
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Acervo (.json)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar & Dry-Run</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  Escopo de Exportação
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Selecione se deseja exportar todo o acervo ou apenas uma categoria taxonômica específica.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  <label
                    className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                      exportScope === 'FULL'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={exportScope === 'FULL'}
                      onChange={() => setExportScope('FULL')}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-bold">Acervo Completo (FULL)</div>
                      <div className="text-[10px] text-slate-500">
                        Todas as {categories.length} categorias, {folders.length} pastas e {articles.length} artigos.
                      </div>
                    </div>
                  </label>

                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                        exportScope === cat.id
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={exportScope === cat.id}
                        onChange={() => setExportScope(cat.id)}
                        className="text-blue-600"
                      />
                      <div className="truncate">
                        <div className="font-bold truncate">{cat.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {articles.filter((a) => {
                            const f = folders.find((fld) => fld.id === a.folder_id);
                            return f?.category_id === cat.id;
                          }).length} artigos
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? 'Calculando Hash...' : 'Baixar Envelope JSON'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Formato: kb-sync-v1.json (SHA-256)
                  </span>
                </div>
              </div>

              {/* Sample Schema preview */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono border border-slate-800">
                <div className="text-slate-400 uppercase text-[10px] font-bold mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Estrutura Padronizada do Envelope:</span>
                </div>
                <pre className="text-emerald-400 overflow-x-auto leading-relaxed">
{`{
  "$schema": "https://interno.suasvendas.com/schemas/kb-sync-v1.json",
  "metadata": {
    "schema_version": "1.0.0",
    "source_instance": "prod-suasvendas-kb-main",
    "export_scope": "${exportScope}",
    "payload_checksum_sha256": "8f43...aa4"
  },
  "data": { "categories": [...], "folders": [...], "articles": [...] }
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-100/50 transition">
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800 mb-1">
                  Selecione o arquivo de sincronização (.json)
                </h4>
                <p className="text-[11px] text-slate-500 mb-3 max-w-md mx-auto">
                  O sistema executará um <strong>Dry-Run</strong> (simulação prévia) para detectar artigos novos, inalterados, atualizações limpas e divergências.
                </p>

                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              {/* Dry-Run Report Table */}
              {dryRunReport && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Resultado da Simulação (Dry-Run):
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {dryRunReport.length} artigos analisados
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {dryRunReport.filter((r) => r.status === 'NEW').length} NEW
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {dryRunReport.filter((r) => r.status === 'FAST_FORWARD').length} FAST-FORWARD
                      </span>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                        {dryRunReport.filter((r) => r.status === 'UNCHANGED').length} UNCHANGED
                      </span>
                      <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {dryRunReport.filter((r) => r.status === 'CONFLICT').length} CONFLICT
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5">Classificação</th>
                          <th className="p-2.5">Título do Artigo</th>
                          <th className="p-2.5">Versões</th>
                          <th className="p-2.5">Resolução / Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dryRunReport.map((item) => (
                          <tr key={item.incomingArticle.id} className="hover:bg-slate-50">
                            <td className="p-2.5 shrink-0">{statusBadge(item.status)}</td>
                            <td className="p-2.5 font-medium text-slate-800 max-w-xs truncate">
                              {item.incomingArticle.title}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">
                              {item.localArticle ? `v${item.localArticle.version} vs v${item.incomingArticle.version}` : `v${item.incomingArticle.version}`}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              {item.status === 'CONFLICT' ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={conflictResolutionMap[item.incomingArticle.id] || 'KEEP_LOCAL'}
                                    onChange={(e) =>
                                      setConflictResolutionMap({
                                        ...conflictResolutionMap,
                                        [item.incomingArticle.id]: e.target.value as any,
                                      })
                                    }
                                    className="border border-rose-300 rounded p-1 text-[11px] bg-rose-50/50 text-rose-900 font-medium"
                                  >
                                    <option value="KEEP_LOCAL">Manter Local</option>
                                    <option value="OVERWRITE_INCOMING">Sobrescrever com JSON</option>
                                  </select>
                                  <button
                                    onClick={() => setActiveDiffConflict(item)}
                                    className="text-blue-600 hover:underline font-semibold text-[10px]"
                                  >
                                    Ver Diff
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600">{item.suggestedAction}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Conflict Diff Inspection Modal/Drawer */}
                  {activeDiffConflict && (
                    <div className="bg-slate-900 text-slate-200 rounded-xl p-4 border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>
                            Comparação Lado a Lado (Diff): {activeDiffConflict.incomingArticle.title}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveDiffConflict(null)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          Fechar Diff
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <div className="text-slate-400 font-bold mb-1">
                            Versão Local (v{activeDiffConflict.localArticle?.version}):
                          </div>
                          <pre className="text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                            {activeDiffConflict.localArticle?.content.resolution_steps_markdown}
                          </pre>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <div className="text-blue-400 font-bold mb-1">
                            Versão JSON Importada (v{activeDiffConflict.incomingArticle.version}):
                          </div>
                          <pre className="text-emerald-400 overflow-x-auto max-h-40 whitespace-pre-wrap">
                            {activeDiffConflict.incomingArticle.content.resolution_steps_markdown}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Commit Action */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setDryRunReport(null)}
                      className="border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs px-3 py-1.5 rounded-lg font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCommit}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg font-semibold transition shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar e Aplicar Sincronização (Commit)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
