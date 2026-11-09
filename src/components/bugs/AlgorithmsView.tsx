/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  ShieldAlert,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Sliders,
  SlidersHorizontal,
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Server,
  Lock,
} from 'lucide-react';
import { User } from '../../types/bugs';

interface AlgorithmsViewProps {
  currentUser: User;
}

interface SefazRule {
  id: string;
  code: string;
  name: string;
  description: string;
  suggestedAction: string;
  autoPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  enabled: boolean;
  triggerCount: number;
}

interface SlaRule {
  id: string;
  priority: string;
  maxResponseHours: number;
  maxResolutionHours: number;
  escalateToLead: boolean;
  enabled: boolean;
}

const INITIAL_SEFAZ_RULES: SefazRule[] = [
  {
    id: 'rule-sefaz-539',
    code: 'REJ-539',
    name: 'Rejeição 539: Duplicidade de NF-e com diferença na Chave de Acesso',
    description: 'Detecta conflito de numeração de NF-e e sugere reconsulta automática no portal SEFAZ estadual.',
    suggestedAction: 'Consultar chave no portal SEFAZ e sincronizar status no banco de pedidos.',
    autoPriority: 'HIGH',
    enabled: true,
    triggerCount: 42,
  },
  {
    id: 'rule-sefaz-704',
    code: 'REJ-704',
    name: 'Rejeição 704: NFC-e com Data-Hora de emissão atrasada',
    description: 'Detecta dessincronia no relógio do terminal emissor ou fuso horário incorreto da UF emitente.',
    suggestedAction: 'Ajustar horário do servidor NTP e reenviar lote após 2 minutos.',
    autoPriority: 'MEDIUM',
    enabled: true,
    triggerCount: 18,
  },
  {
    id: 'rule-sefaz-999',
    code: 'REJ-999',
    name: 'Rejeição 999: Erro não catalogado / Indisponibilidade SEFAZ',
    description: 'Ativa contingência SCAN/SVC-AN automaticamente quando a SEFAZ de origem estiver fora do ar.',
    suggestedAction: 'Alternar emissão para modo contingência off-line e notificar cliente.',
    autoPriority: 'CRITICAL',
    enabled: true,
    triggerCount: 89,
  },
  {
    id: 'rule-sefaz-215',
    code: 'REJ-215',
    name: 'Rejeição 215: Falha de Schema XML',
    description: 'Identifica caracteres especiais ou tags obrigatórias ausentes no layout 4.00 da NF-e.',
    suggestedAction: 'Sanitizar caracteres não-ASCII e revalidar schema XML antes de reenviar.',
    autoPriority: 'HIGH',
    enabled: true,
    triggerCount: 31,
  },
];

const INITIAL_SLA_RULES: SlaRule[] = [
  {
    id: 'sla-critical',
    priority: 'Crítico (Bloqueio total / Faturamento parado)',
    maxResponseHours: 0.5,
    maxResolutionHours: 4,
    escalateToLead: true,
    enabled: true,
  },
  {
    id: 'sla-high',
    priority: 'Alto (Impacto severo com contorno)',
    maxResponseHours: 1.5,
    maxResolutionHours: 12,
    escalateToLead: true,
    enabled: true,
  },
  {
    id: 'sla-medium',
    priority: 'Médio (Comportamento inesperado pontual)',
    maxResponseHours: 4,
    maxResolutionHours: 24,
    escalateToLead: false,
    enabled: true,
  },
  {
    id: 'sla-low',
    priority: 'Baixo (Ajuste visual / Dúvida operacional)',
    maxResponseHours: 8,
    maxResolutionHours: 72,
    escalateToLead: false,
    enabled: true,
  },
];

export const AlgorithmsView: React.FC<AlgorithmsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'SEFAZ' | 'SLA' | 'ROUTING' | 'SIMULATOR'>('SEFAZ');
  const [sefazRules, setSefazRules] = useState<SefazRule[]>(INITIAL_SEFAZ_RULES);
  const [slaRules, setSlaRules] = useState<SlaRule[]>(INITIAL_SLA_RULES);
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);
  const [sefazAutoTriageEnabled, setSefazAutoTriageEnabled] = useState(true);

  // Simulator state
  const [simErrorText, setSimErrorText] = useState('Rejeição: Falha de Schema XML no envio do lote 3489 (tag cEAN inválida)');
  const [simResult, setSimResult] = useState<any>(null);

  const canEdit = currentUser.role === 'ADMIN' || currentUser.permissions?.can_edit_algorithms;

  const handleToggleSefazRule = (ruleId: string) => {
    if (!canEdit) return;
    setSefazRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleRunSimulation = () => {
    const textLower = simErrorText.toLowerCase();
    let matchedRule: SefazRule | null = null;

    if (textLower.includes('539') || textLower.includes('duplicidade')) {
      matchedRule = sefazRules.find((r) => r.id === 'rule-sefaz-539') || null;
    } else if (textLower.includes('704') || textLower.includes('data-hora') || textLower.includes('horário')) {
      matchedRule = sefazRules.find((r) => r.id === 'rule-sefaz-704') || null;
    } else if (textLower.includes('999') || textLower.includes('indisponibilidade') || textLower.includes('contingência')) {
      matchedRule = sefazRules.find((r) => r.id === 'rule-sefaz-999') || null;
    } else if (textLower.includes('215') || textLower.includes('schema') || textLower.includes('tag')) {
      matchedRule = sefazRules.find((r) => r.id === 'rule-sefaz-215') || null;
    }

    setSimResult({
      processedAt: new Date().toLocaleTimeString('pt-BR'),
      matched: !!matchedRule,
      rule: matchedRule,
      assignedPriority: matchedRule ? matchedRule.autoPriority : 'MEDIUM',
      routingModule: 'Fiscal / NF-e / MDF-e',
      suggestedFix: matchedRule ? matchedRule.suggestedAction : 'Realizar triagem manual pelo time de suporte fiscal.',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Motor de Automação & Algoritmos de Suporte
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Triagem algorítmica de erros SEFAZ, controle de SLA, cálculo de prazos e distribuição de chamados técnicos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Motor Ativo em Produção
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('SEFAZ')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SEFAZ'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Regras Fiscais & SEFAZ ({sefazRules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SLA')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SLA'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Políticas de SLA ({slaRules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ROUTING')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ROUTING'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-500" />
            <span>Distribuição de Carga</span>
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 text-emerald-500" />
            <span>Simulador de Triagem</span>
          </button>
        </div>

        {/* Tab 1: SEFAZ */}
        {activeTab === 'SEFAZ' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  O módulo fiscal intercepta códigos de rejeição da SEFAZ nos bugs e mensagens de chat técnico,
                  atribuindo automaticamente a prioridade adequada e sugerindo a resolução padrão.
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => setSefazAutoTriageEnabled(!sefazAutoTriageEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    sefazAutoTriageEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {sefazAutoTriageEnabled ? 'Auto-triagem Ativada' : 'Auto-triagem Pausada'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sefazRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {rule.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rule.autoPriority === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : rule.autoPriority === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          }`}
                        >
                          Prioridade {rule.autoPriority}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{rule.name}</h3>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleSefazRule(rule.id)}
                        disabled={!canEdit}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">{rule.description}</p>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Ação Recomendada pelo Algoritmo:
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {rule.suggestedAction}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Disparado {rule.triggerCount} vezes este mês</span>
                    <span className={rule.enabled ? 'text-emerald-500 font-medium' : 'text-slate-400'}>
                      {rule.enabled ? 'Regra Ativa' : 'Desativada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: SLA */}
        {activeTab === 'SLA' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriz de Prazos de SLA (Service Level Agreement)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prazos máximos configurados para primeiro atendimento e solução definitiva de chamados.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Tempo 1º Contato</th>
                    <th className="p-3">Tempo Máximo Solução</th>
                    <th className="p-3">Escalação Automática</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {slaRules.map((sla) => (
                    <tr key={sla.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold">{sla.priority}</td>
                      <td className="p-3 font-mono">{sla.maxResponseHours} horas</td>
                      <td className="p-3 font-mono">{sla.maxResolutionHours} horas</td>
                      <td className="p-3">
                        {sla.escalateToLead ? (
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Notifica Líder Técnico
                          </span>
                        ) : (
                          <span className="text-slate-400">Fluxo Normal</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                          Vigente
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Routing */}
        {activeTab === 'ROUTING' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Distribuição Balanceada de Carga (Load Balancing Técnico)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Determina o algoritmo responsável por atribuir novos bugs aos desenvolvedores e analistas de suporte.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => canEdit && setRoundRobinEnabled(true)}
                className={`p-5 rounded-2xl border cursor-pointer transition ${
                  roundRobinEnabled
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-blue-500" />
                    Round-Robin Ponderado
                  </span>
                  {roundRobinEnabled && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Distribui os chamados de forma circular entre os membros disponíveis, equilibrando o número total de bugs em aberto por desenvolvedor.
                </p>
              </div>

              <div
                onClick={() => canEdit && setRoundRobinEnabled(false)}
                className={`p-5 rounded-2xl border cursor-pointer transition ${
                  !roundRobinEnabled
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-purple-500" />
                    Especialização por Módulo
                  </span>
                  {!roundRobinEnabled && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Direciona bugs automaticamente para o especialista responsável pelo módulo (ex: Fiscal para Desenvolvedor Fiscal, Mobile para time Android/iOS).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Simulator */}
        {activeTab === 'SIMULATOR' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Simulador de Triagem & Diagnóstico Automatizado
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cole o log de erro, mensagem ou retorno de API da SEFAZ para visualizar a classificação em tempo real do motor de IA & regras.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto do Erro / Log de Entrada:
              </label>
              <textarea
                value={simErrorText}
                onChange={(e) => setSimErrorText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Rejeição 539: Duplicidade de NF-e..."
              />
              <button
                onClick={handleRunSimulation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Processar Simulação</span>
              </button>
            </div>

            {simResult && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Resultado da Análise ({simResult.processedAt})
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      simResult.matched ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {simResult.matched ? 'Regra Reconhecida' : 'Triagem Genérica'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Prioridade Calculada</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {simResult.assignedPriority}
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Módulo Sugerido</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {simResult.routingModule}
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Código Identificado</div>
                    <div className="text-sm font-mono font-bold text-amber-500 mt-0.5">
                      {simResult.rule ? simResult.rule.code : 'SEM CÓDIGO'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Plano de Ação Automatizado
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {simResult.suggestedFix}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
