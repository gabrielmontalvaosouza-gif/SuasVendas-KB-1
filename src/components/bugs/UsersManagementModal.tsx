/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  X,
  Check,
  UserCheck,
  Save,
  AlertTriangle,
  Mail,
  Sliders,
  Layers,
  Key,
  RotateCw,
  Send,
  Building,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import {
  User,
  UserRole,
  UserPermissions,
  AccessProfile,
  SmtpConfig,
  AppMenuKey,
} from '../../types/bugs';
import { bugService } from '../../services/api';

const MASTER_ADMIN_EMAILS = [
  'gabrielsouza@suasvendas.com',
  'manoelvilelaneto@gmail.com',
];

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onCreateUser: (userData: any) => void;
  onUpdateUser: (id: string, userData: any) => void;
  onDeleteUser?: (id: string) => Promise<void> | void;
  onShowToast: (message: string) => void;
}

const ALL_MENUS: { key: AppMenuKey; label: string; desc: string }[] = [
  { key: 'KANBAN', label: 'Quadro Kanban', desc: 'Gestão visual de cards de bugs' },
  { key: 'DASHBOARD', label: 'Dashboard', desc: 'Métricas, SLA e gráficos do sistema' },
  { key: 'CHAT', label: 'Chat da Equipe', desc: 'Canais públicos e conversas privadas' },
  { key: 'MENTIONS', label: 'Minhas Menções', desc: 'Notificações @menções do chat' },
  { key: 'KB', label: 'Base de Conhecimento (KB)', desc: 'Artigos, pastas e documentação' },
  { key: 'ALGORITHMS', label: 'Algoritmos & SLA', desc: 'Motor SEFAZ, regras e triagem técnica' },
  { key: 'MODULES', label: 'Módulos', desc: 'Cadastro de módulos e subsistemas' },
  { key: 'COLUMNS', label: 'Colunas', desc: 'Configuração de etapas do Kanban' },
  { key: 'USERS', label: 'Usuários & Permissões', desc: 'Administração de acessos e SMTP' },
];

const PERMISSION_DEFINITIONS: { key: keyof UserPermissions; label: string; category: string }[] = [
  { key: 'can_view_dashboard', label: 'Visualizar Dashboard Executivo', category: 'Geral' },
  { key: 'can_view_bugs', label: 'Visualizar Quadro Kanban de Bugs', category: 'Bugs' },
  { key: 'can_create_bugs', label: 'Registrar Novos Bugs', category: 'Bugs' },
  { key: 'can_edit_bugs', label: 'Editar Informações de Bugs', category: 'Bugs' },
  { key: 'can_delete_bug', label: 'Excluir Bugs Definitivamente', category: 'Bugs' },
  { key: 'can_resolve_bug', label: 'Resolver / Solucionar Bugs', category: 'Bugs' },
  { key: 'can_close_bug', label: 'Encerrar / Validar Bugs', category: 'Bugs' },
  { key: 'can_assign_lead', label: 'Atribuir Responsável Técnico', category: 'Bugs' },
  { key: 'can_edit_due_date', label: 'Alterar Prazo / Data Prevista', category: 'Bugs' },
  { key: 'can_change_priority', label: 'Alterar Prioridade de Chamados', category: 'Bugs' },
  { key: 'can_add_comment', label: 'Adicionar Comentários e Anexos', category: 'Bugs' },
  { key: 'can_view_kb', label: 'Acessar Base de Conhecimento', category: 'KB' },
  { key: 'can_create_articles', label: 'Criar Artigos na KB', category: 'KB' },
  { key: 'can_edit_articles', label: 'Editar Artigos Existentes', category: 'KB' },
  { key: 'can_delete_articles', label: 'Excluir Artigos da KB', category: 'KB' },
  { key: 'can_use_chat', label: 'Acessar Chat da Equipe', category: 'Chat' },
  { key: 'can_create_channels', label: 'Criar Novos Canais de Chat', category: 'Chat' },
  { key: 'can_delete_channels', label: 'Excluir Canais de Chat', category: 'Chat' },
  { key: 'can_view_algorithms', label: 'Visualizar Motor de Algoritmos & SLA', category: 'Técnico' },
  { key: 'can_edit_algorithms', label: 'Editar Regras Fiscais & SLA', category: 'Técnico' },
  { key: 'can_manage_modules', label: 'Gerenciar Módulos do Sistema', category: 'Configuração' },
  { key: 'can_manage_columns', label: 'Gerenciar Colunas do Kanban', category: 'Configuração' },
  { key: 'can_manage_users', label: 'Gerenciar Usuários e Perfis', category: 'Configuração' },
  { key: 'can_manage_smtp', label: 'Gerenciar Servidor de E-mail (SMTP)', category: 'Configuração' },
];

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'PROFILES' | 'MATRIX' | 'SMTP'>('USERS');

  // Users tab state
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [userSearch, setUserSearch] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('SUPPORT');
  const [department, setDepartment] = useState('Suporte');
  const [profileId, setProfileId] = useState<string>('profile-support');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [allowedMenus, setAllowedMenus] = useState<AppMenuKey[]>([
    'KANBAN',
    'DASHBOARD',
    'CHAT',
    'MENTIONS',
    'KB',
  ]);
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_view_dashboard: true,
    can_view_bugs: true,
    can_create_bugs: true,
    can_edit_bugs: true,
    can_delete_bug: false,
    can_resolve_bug: true,
    can_close_bug: false,
    can_assign_lead: false,
    can_edit_due_date: false,
    can_change_priority: false,
    can_view_kb: true,
    can_create_articles: true,
    can_edit_articles: true,
    can_delete_articles: false,
    can_use_chat: true,
    can_create_channels: true,
    can_delete_channels: false,
    can_view_algorithms: false,
    can_edit_algorithms: false,
    can_manage_modules: false,
    can_manage_columns: false,
    can_manage_users: false,
    can_manage_smtp: false,
    can_add_comment: true,
  });

  // Profiles tab state
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('profile-admin');

  // SMTP tab state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from_name: 'Suporte SuasVendas',
    from_email: '',
    is_configured: false,
  });
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState(currentUser.email);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load profiles and SMTP config
  useEffect(() => {
    if (isOpen) {
      setIsLoadingProfiles(true);
      bugService
        .getAccessProfiles()
        .then((data) => {
          setProfiles(data);
          if (data.length > 0 && !selectedProfileId) {
            setSelectedProfileId(data[0].id);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingProfiles(false));

      setIsLoadingSmtp(true);
      bugService
        .getSmtpConfig()
        .then((data) => setSmtpConfig(data))
        .catch(console.error)
        .finally(() => setIsLoadingSmtp(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];
  const isMasterAdmin = (u?: User | null) => {
    if (!u) return false;
    return MASTER_ADMIN_EMAILS.includes(u.email.toLowerCase());
  };

  const handleStartCreateUser = () => {
    setIsCreatingUser(true);
    setIsEditingUser(false);
    setName('');
    setEmail('');
    setRole('SUPPORT');
    setDepartment('Suporte');
    setProfileId('profile-support');
    setPassword('');
    setIsActive(true);
    setAllowedMenus(['KANBAN', 'DASHBOARD', 'CHAT', 'MENTIONS', 'KB']);
    setPermissions({
      can_view_dashboard: true,
      can_view_bugs: true,
      can_create_bugs: true,
      can_edit_bugs: true,
      can_delete_bug: false,
      can_resolve_bug: true,
      can_close_bug: false,
      can_assign_lead: false,
      can_edit_due_date: false,
      can_change_priority: false,
      can_view_kb: true,
      can_create_articles: true,
      can_edit_articles: true,
      can_delete_articles: false,
      can_use_chat: true,
      can_create_channels: true,
      can_delete_channels: false,
      can_view_algorithms: false,
      can_edit_algorithms: false,
      can_manage_modules: false,
      can_manage_columns: false,
      can_manage_users: false,
      can_manage_smtp: false,
      can_add_comment: true,
    });
  };

  const handleStartEditUser = (user: User) => {
    setIsEditingUser(true);
    setIsCreatingUser(false);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartment(user.department || (user.role === 'COMMERCIAL' ? 'Comercial' : 'Suporte'));
    setProfileId(user.profile_id || `profile-${user.role.toLowerCase()}`);
    setPassword('');
    setIsActive(user.is_active !== false);
    setAllowedMenus(user.allowed_menus || ['KANBAN', 'DASHBOARD', 'CHAT', 'MENTIONS', 'KB']);
    setPermissions({
      can_view_dashboard: !!user.permissions?.can_view_dashboard,
      can_view_bugs: !!user.permissions?.can_view_bugs,
      can_create_bugs: !!user.permissions?.can_create_bugs,
      can_edit_bugs: !!user.permissions?.can_edit_bugs,
      can_delete_bug: !!user.permissions?.can_delete_bug,
      can_resolve_bug: !!user.permissions?.can_resolve_bug,
      can_close_bug: !!user.permissions?.can_close_bug,
      can_assign_lead: !!user.permissions?.can_assign_lead,
      can_edit_due_date: !!user.permissions?.can_edit_due_date,
      can_change_priority: !!user.permissions?.can_change_priority,
      can_view_kb: !!user.permissions?.can_view_kb,
      can_create_articles: !!user.permissions?.can_create_articles,
      can_edit_articles: !!user.permissions?.can_edit_articles,
      can_delete_articles: !!user.permissions?.can_delete_articles,
      can_use_chat: user.permissions?.can_use_chat !== false,
      can_create_channels: user.permissions?.can_create_channels !== false,
      can_delete_channels: !!user.permissions?.can_delete_channels,
      can_view_algorithms: !!user.permissions?.can_view_algorithms,
      can_edit_algorithms: !!user.permissions?.can_edit_algorithms,
      can_manage_modules: !!user.permissions?.can_manage_modules,
      can_manage_columns: !!user.permissions?.can_manage_columns,
      can_manage_users: !!user.permissions?.can_manage_users,
      can_manage_smtp: !!user.permissions?.can_manage_smtp,
      can_add_comment: user.permissions?.can_add_comment !== false,
    });
  };

  const handleProfileSelectChange = (profId: string) => {
    setProfileId(profId);
    const targetProfile = profiles.find((p) => p.id === profId);
    if (targetProfile) {
      setRole(targetProfile.role);
      setAllowedMenus([...targetProfile.allowed_menus]);
      setPermissions({ ...targetProfile.permissions });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Nome e e-mail são obrigatórios.');
      return;
    }

    if (isCreatingUser) {
      if (!password || password.length < 6) {
        alert('A senha inicial do usuário deve conter no mínimo 6 caracteres.');
        return;
      }
      onCreateUser({
        name,
        email,
        role,
        department,
        profile_id: profileId,
        password,
        is_active: isActive,
        allowed_menus: allowedMenus,
        permissions,
      });
      setIsCreatingUser(false);
      onShowToast(`Usuário ${name} cadastrado com sucesso!`);
    } else if (isEditingUser && selectedUser) {
      // Guard master admin
      const isMaster = isMasterAdmin(selectedUser);
      const finalRole = isMaster ? 'ADMIN' : role;
      const finalActive = isMaster ? true : isActive;

      onUpdateUser(selectedUser.id, {
        name,
        email,
        role: finalRole,
        department,
        profile_id: profileId,
        ...(password ? { password } : {}),
        is_active: finalActive,
        allowed_menus: allowedMenus,
        permissions,
      });
      setIsEditingUser(false);
      onShowToast(`Dados de ${name} atualizados com sucesso!`);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    if (isMasterAdmin(user)) {
      alert('Administradores Master não podem ser desativados.');
      return;
    }
    const nextActive = !user.is_active;
    await onUpdateUser(user.id, { is_active: nextActive });
    onShowToast(`Usuário ${user.name} agora está ${nextActive ? 'ATIVO' : 'INATIVO'}.`);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (isMasterAdmin(userToDelete)) {
      alert('Administradores Master não podem ser excluídos.');
      setUserToDelete(null);
      return;
    }

    try {
      setIsDeleting(true);
      if (onDeleteUser) {
        await onDeleteUser(userToDelete.id);
      }
      setUserToDelete(null);
      if (selectedUserId === userToDelete.id) {
        setSelectedUserId(users.find((u) => u.id !== userToDelete.id)?.id || '');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSmtp(true);
      const updated = await bugService.updateSmtpConfig(smtpConfig);
      setSmtpConfig(updated.config);
      onShowToast('Configurações de SMTP salvas com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar SMTP');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestRecipient) {
      alert('Informe um e-mail de destino para o teste.');
      return;
    }
    try {
      setIsTestingSmtp(true);
      setSmtpTestResult(null);
      const res = await bugService.testSmtp(smtpTestRecipient);
      setSmtpTestResult(res);
      if (res.success) {
        onShowToast('E-mail de teste disparado com sucesso!');
      }
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Falha na conexão SMTP.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                Gestão de Usuários, Permissões & Infraestrutura
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold">
                  Painel de Controle SuasVendas
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie contas de colaboradores, matriz de acesso RBAC, perfis por departamento e servidor SMTP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 gap-4 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'USERS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Colaboradores & Acessos ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PROFILES')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'PROFILES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-500" />
            <span>Perfis de Acesso ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'MATRIX'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span>Matriz de Menus & Permissões</span>
          </button>

          <button
            onClick={() => setActiveTab('SMTP')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SMTP'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-amber-500" />
            <span>Servidor de E-mail (SMTP)</span>
            {smtpConfig.is_configured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* TAB 1: USERS */}
          {activeTab === 'USERS' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Users List */}
              <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, e-mail..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleStartCreateUser}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Colaborador</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredUsers.map((u) => {
                    const isSelected = u.id === selectedUserId && !isCreatingUser;
                    const isMaster = isMasterAdmin(u);
                    const userActive = u.is_active !== false;

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setIsCreatingUser(false);
                          setIsEditingUser(false);
                        }}
                        className={`p-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              {u.name}
                              {isMaster && (
                                <span title="Admin Master" className="inline-flex">
                                  <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-500/10 text-purple-500'
                                : u.role === 'COMMERCIAL'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                          <span
                            className={`text-[9px] font-bold flex items-center gap-1 ${
                              userActive ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                userActive ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {userActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: User Details / Edit / Create */}
              <div className="flex-1 overflow-y-auto p-6">
                {isCreatingUser || isEditingUser ? (
                  <form onSubmit={handleSaveUser} className="max-w-2xl space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {isCreatingUser ? 'Cadastrar Novo Colaborador' : `Editar Acesso de ${name}`}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Configure credenciais, perfil de acesso e permissões individuais.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingUser(false);
                          setIsEditingUser(false);
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Ana Silva"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300">E-mail Corporativo *</label>
                        <input
                          type="email"
                          required
                          disabled={!isCreatingUser && isMasterAdmin(selectedUser)}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ana@suasvendas.com"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Departamento / Setor</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="Suporte">Suporte Técnico</option>
                          <option value="Comercial">Equipe Comercial</option>
                          <option value="Técnico">Engenharia / Desenvolvimento</option>
                          <option value="Financeiro">Financeiro / Administrativo</option>
                          <option value="Diretoria">Diretoria / Gestão</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Perfil de Acesso Pré-definido</label>
                        <select
                          value={profileId}
                          onChange={(e) => handleProfileSelectChange(e.target.value)}
                          disabled={!isCreatingUser && isMasterAdmin(selectedUser)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                        >
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          {isCreatingUser ? 'Senha Inicial *' : 'Nova Senha (deixe em branco para manter a atual)'}
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={isCreatingUser ? 'Mínimo 6 caracteres' : '••••••••'}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Menus Checkboxes */}
                    <div className="space-y-2 pt-2">
                      <label className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Menus Visíveis & Permitidos
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ALL_MENUS.map((menu) => {
                          const isChecked = allowedMenus.includes(menu.key);
                          return (
                            <label
                              key={menu.key}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition ${
                                isChecked
                                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAllowedMenus((prev) => [...prev, menu.key]);
                                  } else {
                                    setAllowedMenus((prev) => prev.filter((k) => k !== menu.key));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-medium">{menu.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingUser(false);
                          setIsEditingUser(false);
                        }}
                        className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Colaborador</span>
                      </button>
                    </div>
                  </form>
                ) : selectedUser ? (
                  <div className="space-y-6 max-w-2xl">
                    {/* User profile card */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                          {selectedUser.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {selectedUser.name}
                            </h3>
                            {isMasterAdmin(selectedUser) && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                <Shield className="w-3 h-3" />
                                Master Admin (Protegido)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{selectedUser.email}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              Perfil: {selectedUser.role}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Setor: {selectedUser.department || 'Geral'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEditUser(selectedUser)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Editar</span>
                        </button>

                        {!isMasterAdmin(selectedUser) && (
                          <>
                            <button
                              onClick={() => handleToggleUserActive(selectedUser)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                                selectedUser.is_active !== false
                                  ? 'border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                  : 'border-emerald-300 dark:border-emerald-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {selectedUser.is_active !== false ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Desativar</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Ativar</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setUserToDelete(selectedUser)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                              title="Excluir Colaborador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Menus granted */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Menus Liberados na Interface
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_MENUS.map((menu) => {
                          const has =
                            selectedUser.role === 'ADMIN' ||
                            selectedUser.allowed_menus?.includes(menu.key);
                          return (
                            <div
                              key={menu.key}
                              className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                                has
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                              }`}
                            >
                              <span className="font-semibold">{menu.label}</span>
                              {has ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Users className="w-12 h-12 mb-2 text-slate-300 dark:text-slate-700" />
                    <span>Selecione um usuário para visualizar detalhes ou cadastre um novo.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILES */}
          {activeTab === 'PROFILES' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Perfis de Acesso Padronizados (RBAC)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina pacotes de acesso para associar rapidamente a novos membros da equipe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {prof.role}
                      </span>
                      {prof.is_system && (
                        <span className="text-[10px] text-slate-400 font-mono">Sistema</span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{prof.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{prof.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        Menus Autorizados:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {prof.allowed_menus.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MATRIX */}
          {activeTab === 'MATRIX' && (
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Matriz de Permissões Operacionais
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização de privilégios granulares divididos por perfil e operação no sistema.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Operação / Ação Granular</th>
                      <th className="p-3 text-center">ADMIN</th>
                      <th className="p-3 text-center">SUPERVISOR</th>
                      <th className="p-3 text-center">SUPPORT</th>
                      <th className="p-3 text-center">TECH</th>
                      <th className="p-3 text-center">COMMERCIAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {PERMISSION_DEFINITIONS.map((def) => {
                      const adminProf = profiles.find((p) => p.role === 'ADMIN');
                      const supProf = profiles.find((p) => p.role === 'SUPERVISOR');
                      const suppProf = profiles.find((p) => p.role === 'SUPPORT');
                      const techProf = profiles.find((p) => p.role === 'TECH');
                      const commProf = profiles.find((p) => p.role === 'COMMERCIAL');

                      return (
                        <tr key={def.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {def.label}
                            <span className="block text-[10px] text-slate-400 font-mono">{def.key}</span>
                          </td>
                          <td className="p-3 text-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          </td>
                          <td className="p-3 text-center">
                            {supProf?.permissions[def.key] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {suppProf?.permissions[def.key] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {techProf?.permissions[def.key] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {commProf?.permissions[def.key] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SMTP */}
          {activeTab === 'SMTP' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Servidor de Envio de E-mails (Nodemailer SMTP)
                    {smtpConfig.is_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Configurado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Aguardando Credenciais
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Utilizado para envio de tokens de recuperação de senha, convites e notificações para clientes e colaboradores.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSmtp} className="max-w-2xl space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Host SMTP *</label>
                    <input
                      type="text"
                      required
                      placeholder="smtp.gmail.com ou mail.suasvendas.com"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Porta SMTP *</label>
                    <input
                      type="number"
                      required
                      placeholder="587 ou 465"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Usuário / E-mail de Autenticação *</label>
                    <input
                      type="text"
                      required
                      placeholder="notificacoes@suasvendas.com"
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Senha do Servidor SMTP *</label>
                    <input
                      type="password"
                      placeholder="Senha do aplicativo ou do e-mail"
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Nome do Remetente</label>
                    <input
                      type="text"
                      placeholder="Suporte SuasVendas"
                      value={smtpConfig.from_name}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">E-mail Remetente (From)</label>
                    <input
                      type="email"
                      placeholder="no-reply@suasvendas.com"
                      value={smtpConfig.from_email}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpConfig.secure}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Conexão Segura SSL/TLS (Normalmente habilitada na porta 465)
                    </span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSmtp ? 'Salvando...' : 'Salvar Configurações SMTP'}</span>
                  </button>
                </div>
              </form>

              {/* Test SMTP Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-w-2xl space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-indigo-500" />
                  Testar Envio de E-mail em Tempo Real
                </h4>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Digite o e-mail de teste"
                    value={smtpTestRecipient}
                    onChange={(e) => setSmtpTestRecipient(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingSmtp ? 'Testando...' : 'Enviar Teste'}</span>
                  </button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      smtpTestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {smtpTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{smtpTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUserToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-950 dark:text-white">Excluir Colaborador?</h4>
                <p className="text-xs text-slate-500">Revogação definitiva de acesso ao sistema</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-rose-50/80 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
              Tem certeza que deseja excluir o acesso de <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              <br /><br />
              • O token de login e sessões ativas serão cancelados imediatamente.<br />
              • Os chamados e comentários registrados por este usuário serão preservados.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
