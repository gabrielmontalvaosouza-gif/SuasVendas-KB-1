import React, { useState } from 'react';
import {
  BarChart3,
  Search,
  Clock,
  Award,
  Download,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Article, SearchLog, AuditLog, OutdatedReport } from '../types/kb';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  searchLogs: SearchLog[];
  auditLogs: AuditLog[];
  outdatedReports: OutdatedReport[];
  onShowToast: (message: string) => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  articles,
  searchLogs,
  auditLogs,
  outdatedReports,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'content_gaps' | 'most_viewed' | 'outdated' | 'authors' | 'audit'>(
    'content_gaps'
  );

  if (!isOpen) return null;

  // 1. Content Gaps: queries where results_count === 0
  const contentGaps = searchLogs.filter((log) => log.results_count === 0);

  // 2. Most Viewed Articles
  const mostViewed = [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 8);

  // 3. Outdated Articles (> 30 days old)
  const now = new Date().getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const outdatedArticles = articles.filter(
    (a) => now - new Date(a.updated_at).getTime() > thirtyDaysMs
  );

  // 4. Author Ranking
  const authorMap: Record<string, { count: number; totalViews: number }> = {};
  articles.forEach((a) => {
    const author = a.author_name || 'Desconhecido';
    if (!authorMap[author]) {
      authorMap[author] = { count: 0, totalViews: 0 };
    }
    authorMap[author].count += 1;
    authorMap[author].totalViews += a.views_count;
  });

  const authorRanking = Object.entries(authorMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  // Export report to CSV
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'content_gaps') {
      csvContent += 'Termo Buscado,Contagem de Resultados,Data da Busca,Analista\n';
      contentGaps.forEach((g) => {
        csvContent += `"${g.query_text}",${g.results_count},"${g.searched_at}","${g.user_email}"\n`;
      });
    } else if (activeTab === 'most_viewed') {
      csvContent += 'Titulo,Modulo,Visualizacoes,Util Sim,Util Nao,Versao\n';
      mostViewed.forEach((a) => {
        csvContent += `"${a.title}","${a.module}",${a.views_count},${a.helpful_yes},${a.helpful_no},${a.version}\n`;
      });
    } else {
      csvContent += 'Artigo,Data Atualizacao,Autor,Status\n';
      articles.forEach((a) => {
        csvContent += `"${a.title}","${a.updated_at}","${a.author_name}","${a.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_kb_suasvendas_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Relatório exportado em formato CSV!');
  };

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
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                Painel Gerencial & Inteligência da Base (RF05)
              </h3>
              <p className="text-[11px] text-slate-400">
                Content Gaps, métricas de eficiência de atendimento e auditoria de governança
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

        {/* Tab Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('content_gaps')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'content_gaps'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Content Gaps ({contentGaps.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('most_viewed')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'most_viewed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Mais Acessados</span>
            </button>

            <button
              onClick={() => setActiveTab('outdated')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'outdated'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Desatualizados ({outdatedArticles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('authors')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'authors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Ranking de Analistas</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="mb-2 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content_gaps' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                <strong>O que são Content Gaps?</strong> Termos pesquisados pelos analistas durante o atendimento em tempo real que retornaram <strong>0 resultados</strong>. Esta lista prioriza os novos artigos técnicos a serem redigidos.
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Termo Buscado</th>
                      <th className="p-3">Analista Solicitante</th>
                      <th className="p-3">Latência de Busca</th>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contentGaps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Nenhum gap de conteúdo registrado.
                        </td>
                      </tr>
                    ) : (
                      contentGaps.map((gap) => (
                        <tr key={gap.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold font-mono text-rose-700">
                            "{gap.query_text}"
                          </td>
                          <td className="p-3 text-slate-600">{gap.user_email}</td>
                          <td className="p-3 font-mono text-slate-500">{gap.latency_ms}ms</td>
                          <td className="p-3 text-slate-500">
                            {new Date(gap.searched_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                              Criar Procedimento
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'most_viewed' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Artigo Técnico</th>
                      <th className="p-3">Módulo</th>
                      <th className="p-3">Visualizações</th>
                      <th className="p-3">Taxa de Resolução (Helpful)</th>
                      <th className="p-3">Versão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mostViewed.map((art) => {
                      const totalVotes = art.helpful_yes + art.helpful_no;
                      const satisfaction = totalVotes > 0 ? ((art.helpful_yes / totalVotes) * 100).toFixed(0) : 100;

                      return (
                        <tr key={art.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{art.title}</td>
                          <td className="p-3 text-slate-500">{art.module}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">{art.views_count}</td>
                          <td className="p-3">
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {satisfaction}% ({art.helpful_yes} úteis)
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">v{art.version}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'outdated' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
                Artigos sem revisão há mais de 30 dias ou reportados como desatualizados pela equipe técnica.
              </div>

              {outdatedReports.length > 0 && (
                <div className="border border-amber-300 rounded-xl p-4 bg-amber-50/50 space-y-2">
                  <div className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Alertas Reportados por Analistas:</span>
                  </div>
                  {outdatedReports.map((rep) => (
                    <div key={rep.id} className="text-xs bg-white p-3 rounded-lg border border-amber-200">
                      <div className="font-bold text-slate-800">{rep.article_title}</div>
                      <div className="text-slate-600 mt-1 italic">"{rep.reason}"</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Reportado por {rep.reported_by} • Versão afetada: {rep.erp_version_affected || 'Geral'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Artigo</th>
                      <th className="p-3">Última Revisão</th>
                      <th className="p-3">Autor</th>
                      <th className="p-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outdatedArticles.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{art.title}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(art.updated_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 text-slate-600">{art.author_name}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                            Revisar Procedimento
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'authors' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Analista / Colaborador</th>
                      <th className="p-3">Artigos Publicados</th>
                      <th className="p-3">Total de Leituras Ajudadas</th>
                      <th className="p-3">Medalha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {authorRanking.map((auth, idx) => (
                      <tr key={auth.name} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{auth.name}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{auth.count}</td>
                        <td className="p-3 font-mono text-slate-600">{auth.totalViews}</td>
                        <td className="p-3">
                          {idx === 0 ? (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 w-max">
                              <Award className="w-3 h-3 text-amber-600" /> Top Contribuidor
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Colaborador Ativo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Operação (Ação)</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Detalhes</th>
                      <th className="p-3">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-mono font-bold text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{log.user_email}</td>
                        <td className="p-3 text-slate-600">{log.details}</td>
                        <td className="p-3 font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
