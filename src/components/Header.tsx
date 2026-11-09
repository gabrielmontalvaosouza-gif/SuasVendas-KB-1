import React, { useState } from 'react';
import { Search, Download, BarChart3, Shield, User as UserIcon, Check, ChevronDown, Database, ExternalLink } from 'lucide-react';
import { User, UserRole } from '../types/kb';

interface HeaderProps {
  currentUser: User;
  onSelectUserRole: (role: UserRole) => void;
  onOpenCommandPalette: () => void;
  onOpenSyncModal: () => void;
  onOpenReportsModal: () => void;
  totalArticles: number;
  publishedArticles: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUserRole,
  onOpenCommandPalette,
  onOpenSyncModal,
  onOpenReportsModal,
  totalArticles,
  publishedArticles,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    ADMIN: { label: 'Administrador / Lead', color: 'bg-purple-900/60 text-purple-300 border-purple-700' },
    REVIEWER: { label: 'Revisor Técnico (Nível 2/3)', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
    AGENT: { label: 'Analista de Suporte', color: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  };

  return (
    <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 border-b border-slate-800 shrink-0 z-30 select-none shadow-md">
      {/* Brand & Ecosystem Alignment */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base tracking-tighter shadow-sm border border-blue-400/40">
            SV
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-2 text-white">
              SuasVendas{' '}
              <span className="bg-blue-600/30 text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider border border-blue-500/30">
                KB Interna
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>Atendimento Técnico & Suporte</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono">{publishedArticles}/{totalArticles} ativos</span>
            </div>
          </div>
        </div>

        {/* Link to help center */}
        <a
          href="https://ajuda.suasvendas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors ml-2 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/60"
          title="Ver Central de Ajuda Pública"
        >
          <ExternalLink className="w-3 h-3 text-blue-400" />
          <span>ajuda.suasvendas.com</span>
        </a>
      </div>

      {/* Global Command Palette Trigger (< 150ms instant search) */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-3 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 px-4 py-1.5 rounded-lg border border-slate-700 text-xs w-80 md:w-96 justify-between transition-all shadow-inner group hover:border-slate-600"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
          <span className="truncate text-slate-400 group-hover:text-slate-200">
            Buscar erro, código SEFAZ, ERP...
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="kbd-badge text-[9px] bg-slate-900 border-slate-700 text-slate-300">
            Ctrl
          </span>
          <span className="kbd-badge text-[9px] bg-slate-900 border-slate-700 text-slate-300">
            K
          </span>
        </div>
      </button>

      {/* Topbar Actions & SSO Identity */}
      <div className="flex items-center gap-2.5">
        {/* Reports / Analytics Button */}
        <button
          onClick={onOpenReportsModal}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium transition border border-slate-700/80 shadow-sm"
          title="Relatórios Gerenciais, Content Gaps e Métricas"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Relatórios</span>
        </button>

        {/* JSON Sync Engine Button */}
        <button
          onClick={onOpenSyncModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition shadow border border-blue-400/40"
          title="Exportar ou Importar Acervo em JSON Padronizado"
        >
          <Database className="w-3.5 h-3.5 text-blue-200" />
          <span>Sincronizar JSON</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {/* SSO User Dropdown with RBAC switch */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition border border-transparent hover:border-slate-700 text-left"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border border-blue-400/30 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="hidden xl:block">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                {currentUser.name}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                <span>role: {currentUser.role.toLowerCase()}</span>
              </div>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                  SSO: account.suasvendas.com
                </div>
                <div className="font-semibold text-slate-200 mt-0.5">{currentUser.email}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Sessão validada via Token JWT</div>
              </div>

              <div className="p-2">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold px-2 py-1">
                  Simular Perfil / RBAC
                </div>
                {(['ADMIN', 'REVIEWER', 'AGENT'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onSelectUserRole(role);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition ${
                      currentUser.role === role ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${roleLabels[role].color}`}>
                        {role}
                      </span>
                      <span className="text-[11px]">{roleLabels[role].label}</span>
                    </div>
                    {currentUser.role === role && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
