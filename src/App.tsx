/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Kanban,
  BookOpen,
  Activity,
  Layers,
  Users,
  Bell,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  Database,
  ExternalLink,
  MessageSquare,
  AtSign,
  LogOut,
  Sun,
  Moon,
  Camera,
  User as UserIcon,
  Cpu,
} from 'lucide-react';

// Bug Tracking Types & Service
import {
  Bug,
  KanbanColumn,
  SystemModule,
  User as BugUser,
  UserRole as BugUserRole,
  BugNotification,
  SystemStats,
  BugPriority,
  ChatChannel,
  UserMention,
  AppMenuKey,
} from './types/bugs';
import { bugService } from './services/api';

// Bug Components
import { KanbanBoard } from './components/bugs/KanbanBoard';
import { BugDetailModal } from './components/bugs/BugDetailModal';
import { CreateBugModal } from './components/bugs/CreateBugModal';
import { ModulesManagementModal } from './components/bugs/ModulesManagementModal';
import { UsersManagementModal } from './components/bugs/UsersManagementModal';
import { ColumnsManagementModal } from './components/bugs/ColumnsManagementModal';
import { DashboardView } from './components/bugs/DashboardView';
import { NotificationsDropdown } from './components/bugs/NotificationsDropdown';
import { AlgorithmsView } from './components/bugs/AlgorithmsView';

// Auth & Chat Components
import { LoginScreen } from './components/auth/LoginScreen';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { GroupChatView } from './components/chat/GroupChatView';
import { MentionsView } from './components/chat/MentionsView';

// Existing Knowledge Base (KB) Components & Types
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_FOLDERS,
  INITIAL_ARTICLES,
  INITIAL_VERSION_HISTORY,
  INITIAL_SEARCH_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_OUTDATED_REPORTS,
} from './data/mockData';
import {
  User as KBUser,
  UserRole as KBUserRole,
  Category,
  Folder,
  Article,
  ArticleVersionSnapshot,
  SearchLog,
  AuditLog,
  OutdatedReport,
} from './types/kb';
import { TaxonomySidebar } from './components/TaxonomySidebar';
import { ArticleView } from './components/ArticleView';
import { ArticleEditor } from './components/ArticleEditor';
import { SupportSidebar } from './components/SupportSidebar';
import { KnowledgeBaseView } from './components/kb/KnowledgeBaseView';
import { FoldersManagementModal } from './components/kb/FoldersManagementModal';
import { CommandPalette } from './components/CommandPalette';
import { SyncModal } from './components/SyncModal';
import { ReportsModal } from './components/ReportsModal';
import { DiffModal } from './components/DiffModal';
import { OutdatedModal } from './components/OutdatedModal';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { calculateArticleContentHash, generateUUID } from './utils/crypto';

type ActivePlatformView = 'KANBAN' | 'KB' | 'DASHBOARD' | 'CHAT' | 'MENTIONS' | 'ALGORITHMS';

export default function App() {
  // Authentication session state & mandatory verification
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('suasvendas_auth_token');
  });

  const [currentBugUser, setCurrentBugUser] = useState<BugUser | null>(() => {
    const saved = localStorage.getItem('suasvendas_auth_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Mandatory server-side token validation on initial access
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('suasvendas_auth_token'));
  });

  const [activeView, setActiveView] = useState<ActivePlatformView>('KANBAN');

  // ================= BUGS & REALTIME STATE =================
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [systemModules, setSystemModules] = useState<SystemModule[]>([]);
  const [platformUsers, setPlatformUsers] = useState<BugUser[]>([]);
  const [notifications, setNotifications] = useState<BugNotification[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Chat & Mentions State
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [userMentions, setUserMentions] = useState<UserMention[]>([]);
  const [chatTargetMessageId, setChatTargetMessageId] = useState<string | null>(null);
  const [chatTargetChannelId, setChatTargetChannelId] = useState<string | null>(null);

  // Bug Modals
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [isCreateBugOpen, setIsCreateBugOpen] = useState(false);
  const [createBugDefaultCol, setCreateBugDefaultCol] = useState<string | undefined>();
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    const saved = localStorage.getItem("suasvendas_theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
  });

  // Section 15.2: Click-outside auto-close refs and mutual exclusivity
  const notificationsContainerRef = useRef<HTMLDivElement>(null);
  const userMenuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isNotificationsOpen &&
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        isUserMenuOpen &&
        userMenuContainerRef.current &&
        !userMenuContainerRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isNotificationsOpen, isUserMenuOpen]);

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) setIsUserMenuOpen(false);
      return next;
    });
  };

  const handleToggleUserMenu = () => {
    setIsUserMenuOpen((prev) => {
      const next = !prev;
      if (next) setIsNotificationsOpen(false);
      return next;
    });
  };

  // Section 13.3: Dynamic Menu Permissions & fallback
  const hasMenuAccess = (menuKey: AppMenuKey): boolean => {
    if (!currentBugUser) return false;
    if (currentBugUser.role === 'ADMIN') return true;
    if (!currentBugUser.allowed_menus || currentBugUser.allowed_menus.length === 0) {
      if (currentBugUser.role === 'COMMERCIAL') {
        return ['CHAT', 'KB', 'MENTIONS'].includes(menuKey);
      }
      return ['KANBAN', 'DASHBOARD', 'CHAT', 'MENTIONS', 'KB'].includes(menuKey);
    }
    return currentBugUser.allowed_menus.includes(menuKey);
  };

  useEffect(() => {
    if (!currentBugUser) return;
    const menuMap: Record<ActivePlatformView, AppMenuKey> = {
      KANBAN: 'KANBAN',
      DASHBOARD: 'DASHBOARD',
      CHAT: 'CHAT',
      MENTIONS: 'MENTIONS',
      KB: 'KB',
      ALGORITHMS: 'ALGORITHMS',
    };
    const currentKey = menuMap[activeView];
    if (currentKey && !hasMenuAccess(currentKey)) {
      const viewsInOrder: ActivePlatformView[] = ['KANBAN', 'DASHBOARD', 'CHAT', 'MENTIONS', 'KB', 'ALGORITHMS'];
      const firstAllowed = viewsInOrder.find((v) => hasMenuAccess(menuMap[v]));
      if (firstAllowed) {
        setActiveView(firstAllowed);
      }
    }
  }, [currentBugUser?.role, currentBugUser?.allowed_menus, activeView]);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("suasvendas_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("suasvendas_theme", "light");
    }
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      if (currentBugUser && authToken) {
        bugService.updateProfile({ theme_preference: next ? "dark" : "light" }, authToken).catch(() => {});
      }
      return next;
    });
  };

  // Kanban Filters
  const [filterModuleId, setFilterModuleId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // ================= KNOWLEDGE BASE (KB) STATE =================
  const KB_STORAGE_KEY = 'suasvendas_kb_state_v1';
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_folders`);
    return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_articles`);
    return saved ? JSON.parse(saved) : INITIAL_ARTICLES;
  });
  const [versionHistory, setVersionHistory] = useState<Record<string, ArticleVersionSnapshot[]>>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_history`);
    return saved ? JSON.parse(saved) : INITIAL_VERSION_HISTORY;
  });
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_search_logs`);
    return saved ? JSON.parse(saved) : INITIAL_SEARCH_LOGS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_audit_logs`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });
  const [outdatedReports, setOutdatedReports] = useState<OutdatedReport[]>(() => {
    const saved = localStorage.getItem(`${KB_STORAGE_KEY}_outdated_reports`);
    return saved ? JSON.parse(saved) : INITIAL_OUTDATED_REPORTS;
  });

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(() => INITIAL_ARTICLES[0]?.id || null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // KB Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isOutdatedModalOpen, setIsOutdatedModalOpen] = useState(false);
  const [isFoldersModalOpen, setIsFoldersModalOpen] = useState(false);

  // ================= INITIAL LOAD & WEBSOCKET SYNC =================

  // 1. Mandatory server-side token validation on initial access
  useEffect(() => {
    const savedToken = localStorage.getItem('suasvendas_auth_token');
    if (!savedToken) {
      setIsValidatingSession(false);
      setAuthToken(null);
      setCurrentBugUser(null);
      return;
    }

    bugService
      .getMe(savedToken)
      .then((res) => {
        setAuthToken(savedToken);
        setCurrentBugUser(res.user);
        localStorage.setItem('suasvendas_auth_user', JSON.stringify(res.user));
        // Refresh channels with participant access
        bugService.getChatChannels(savedToken, res.user.id).then(setChatChannels).catch(() => {});
      })
      .catch((err) => {
        console.warn('Sessão expirada ou inválida:', err);
        localStorage.removeItem('suasvendas_auth_token');
        localStorage.removeItem('suasvendas_auth_user');
        setAuthToken(null);
        setCurrentBugUser(null);
      })
      .finally(() => {
        setIsValidatingSession(false);
      });
  }, []);

  useEffect(() => {
    // 2. Initial bootstrap from server
    bugService
      .getBootstrap()
      .then((data) => {
        setPlatformUsers(data.users);
        setSystemModules(data.modules);
        setColumns(data.columns);
        setBugs(data.bugs);
        setNotifications(data.notifications);
        setSystemStats(data.stats);
        if (data.channels) setChatChannels(data.channels);

        // Bootstrap Knowledge Base articles
        if (data.articles && data.articles.length > 0) {
          const userFavs = new Set(
            (data.favorites || []).filter((f) => f.user_id === currentBugUser?.id).map((f) => f.article_id)
          );
          setArticles(
            data.articles.map((art) => ({
              ...art,
              is_favorite: userFavs.has(art.id),
            }))
          );
        }
        if (data.categories) setCategories(data.categories);
        if (data.folders) setFolders(data.folders);

        // Verify current active user if session exists
        if (authToken && currentBugUser) {
          const matchingUser = data.users.find((u) => u.id === currentBugUser.id || u.email.toLowerCase() === currentBugUser.email.toLowerCase());
          if (matchingUser) {
            setCurrentBugUser(matchingUser);
            localStorage.setItem('suasvendas_auth_user', JSON.stringify(matchingUser));
          }
          // Load user mentions
          bugService.getUserMentions(currentBugUser.id).then(setUserMentions).catch(console.error);
        }
      })
      .catch((err) => {
        console.error('Failed to bootstrap from server:', err);
      });

    // 3. Load channels if not already loaded
    bugService.getChatChannels(authToken || undefined, currentBugUser?.id).then(setChatChannels).catch(() => {});

    // 4. Real-time WebSocket subscription
    const unsubscribe = bugService.subscribe((event) => {
      const { type, payload } = event;

      if (type === 'WS_CONNECTED') {
        setIsWsConnected(true);
      } else if (type === 'WS_DISCONNECTED') {
        setIsWsConnected(false);
      } else if (type === 'BUG_CREATED') {
        setBugs((prev) => {
          if (prev.some((b) => b.id === payload.id)) return prev;
          return [payload, ...prev];
        });
        refreshStats();
      } else if (type === 'BUG_UPDATED') {
        setBugs((prev) => prev.map((b) => (b.id === payload.id ? payload : b)));
        setSelectedBug((prev) => (prev?.id === payload.id ? payload : prev));
        refreshStats();
      } else if (type === 'NOTIFICATION_CREATED') {
        setNotifications((prev) => [payload, ...prev]);
        showToast(`Alerta: ${payload.title}`);
      } else if (type === 'MODULE_CREATED') {
        setSystemModules((prev) => [...prev, payload]);
      } else if (type === 'MODULE_UPDATED') {
        setSystemModules((prev) => prev.map((m) => (m.id === payload.id ? payload : m)));
        // Cascade to articles
        setArticles((prev) =>
          prev.map((a) => (a.module_id === payload.id ? { ...a, module_name: payload.name, module: payload.name } : a))
        );
      } else if (type === 'MODULE_DELETED') {
        setSystemModules((prev) => prev.filter((m) => m.id !== payload.id));
        if (payload.target_module_id) {
          const targetMod = systemModules.find((m) => m.id === payload.target_module_id);
          if (targetMod) {
            setArticles((prev) =>
              prev.map((a) =>
                a.module_id === payload.id
                  ? { ...a, module_id: targetMod.id, module_name: targetMod.name, module: targetMod.name }
                  : a
              )
            );
          }
        }
      } else if (type === 'COLUMN_CREATED') {
        setColumns((prev) => [...prev, payload]);
      } else if (type === 'COLUMN_UPDATED') {
        setColumns((prev) => prev.map((c) => (c.id === payload.id ? payload : c)));
      } else if (type === 'COLUMNS_REORDERED') {
        setColumns(payload);
      } else if (type === 'COLUMN_DELETED') {
        setColumns((prev) => prev.filter((c) => c.id !== payload.id));
        refreshStats();
      } else if (type === 'USER_CREATED') {
        setPlatformUsers((prev) => [...prev, payload]);
      } else if (type === 'USER_DELETED') {
        setPlatformUsers((prev) => prev.filter((u) => u.id !== payload.id));
      } else if (type === 'USER_UPDATED') {
        setPlatformUsers((prev) => prev.map((u) => (u.id === payload.id ? payload : u)));
        if (currentBugUser?.id === payload.id) setCurrentBugUser(payload);
      } else if (type === 'NOTIFICATIONS_READ_ALL') {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } else if (type === 'MENTION_CREATED') {
        const mention: UserMention = payload;
        if (currentBugUser && mention.user_id === currentBugUser.id) {
          setUserMentions((prev) => [mention, ...prev]);
          showToast(`Você foi mencionado em #${mention.channel_name} por ${mention.sender_name}`);
        }
      } else if (type === 'MENTIONS_READ_ALL') {
        if (currentBugUser && payload.user_id === currentBugUser.id) {
          setUserMentions((prev) => prev.map((m) => ({ ...m, is_read: true })));
        }
      } else if (type === 'ARTICLE_CREATED') {
        setArticles((prev) => {
          if (prev.some((a) => a.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      } else if (type === 'ARTICLE_UPDATED') {
        setArticles((prev) => prev.map((a) => (a.id === payload.id ? { ...a, ...payload } : a)));
      } else if (type === 'ARTICLE_DELETED') {
        setArticles((prev) => prev.filter((a) => a.id !== payload.id));
      } else if (type === 'ARTICLE_FAVORITE_TOGGLED') {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === payload.article_id && currentBugUser?.id === payload.user_id
              ? { ...a, is_favorite: payload.is_favorite }
              : a
          )
        );
      } else if (type === 'BUG_DELETED') {
        setBugs((prev) => prev.filter((b) => b.id !== payload.id));
        setSelectedBug((prev) => (prev?.id === payload.id ? null : prev));
        refreshStats();
      } else if (type === 'KB_FOLDER_CREATED') {
        setFolders((prev) => {
          if (prev.some((f) => f.id === payload.id)) return prev;
          return [...prev, payload];
        });
      } else if (type === 'KB_FOLDER_UPDATED') {
        setFolders((prev) => prev.map((f) => (f.id === payload.id ? payload : f)));
      } else if (type === 'KB_FOLDER_DELETED') {
        setFolders((prev) => prev.filter((f) => f.id !== payload.id));
        if (payload.target_folder_id) {
          setArticles((prev) =>
            prev.map((a) => (a.folder_id === payload.id ? { ...a, folder_id: payload.target_folder_id } : a))
          );
        } else {
          setArticles((prev) =>
            prev.map((a) => (a.folder_id === payload.id ? { ...a, folder_id: '' } : a))
          );
        }
      } else if (type === 'CHANNEL_CREATED') {
        const newChan: ChatChannel = payload;
        // Verify current user is allowed to see the channel
        if (!newChan.is_private || (currentBugUser && newChan.participant_ids?.includes(currentBugUser.id))) {
          setChatChannels((prev) => {
            if (prev.some((c) => c.id === newChan.id)) return prev;
            return [...prev, newChan];
          });
          if (newChan.is_private && newChan.created_by !== currentBugUser?.id) {
            showToast(`Você foi adicionado à nova conversa: #${newChan.name}`);
          }
        }
      } else if (type === 'CHANNEL_DELETED') {
        const { id, name } = payload;
        setChatChannels((prev) => prev.filter((c) => c.id !== id));
        if (name) {
          showToast(`O canal #${name} foi excluído.`);
        }
      } else if (type === 'CHANNEL_UPDATED' || type === 'CHANNEL_PARTICIPANTS_UPDATED') {
        const updatedChan: ChatChannel = payload;
        setChatChannels((prev) =>
          prev.map((c) => (c.id === updatedChan.id ? { ...c, ...updatedChan } : c))
        );
      } else if (type === 'PROFILE_UPDATED') {
        const updatedUser = payload.user || payload;
        if (currentBugUser && (updatedUser.id === currentBugUser.id || updatedUser.email === currentBugUser.email)) {
          setCurrentBugUser(updatedUser);
          localStorage.setItem('suasvendas_auth_user', JSON.stringify(updatedUser));
        }
        setPlatformUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authToken, currentBugUser?.id]);

  const refreshStats = () => {
    bugService.getStats().then(setSystemStats).catch(console.error);
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save KB locally
  useEffect(() => {
    localStorage.setItem(`${KB_STORAGE_KEY}_categories`, JSON.stringify(categories));
    localStorage.setItem(`${KB_STORAGE_KEY}_folders`, JSON.stringify(folders));
    localStorage.setItem(`${KB_STORAGE_KEY}_articles`, JSON.stringify(articles));
    localStorage.setItem(`${KB_STORAGE_KEY}_history`, JSON.stringify(versionHistory));
    localStorage.setItem(`${KB_STORAGE_KEY}_search_logs`, JSON.stringify(searchLogs));
    localStorage.setItem(`${KB_STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs));
    localStorage.setItem(`${KB_STORAGE_KEY}_outdated_reports`, JSON.stringify(outdatedReports));
  }, [categories, folders, articles, versionHistory, searchLogs, auditLogs, outdatedReports]);

  // ================= BUG ACTIONS =================
  const handleCreateBug = async (data: any) => {
    try {
      const created = await bugService.createBug(data);
      setBugs((prev) => [created, ...prev]);
      showToast(`Bug ${created.code} registrado com sucesso!`);
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar bug.');
    }
  };

  const handleMoveBug = async (bugId: string, targetColumnId: string) => {
    if (!currentBugUser) return;
    // Optimistic local update
    const previousBugs = [...bugs];
    setBugs((prev) =>
      prev.map((b) => (b.id === bugId ? { ...b, column_id: targetColumnId } : b))
    );

    try {
      const updated = await bugService.moveBug(bugId, targetColumnId, {
        id: currentBugUser.id,
        name: currentBugUser.name,
        role: currentBugUser.role,
      });
      setBugs((prev) => prev.map((b) => (b.id === bugId ? updated : b)));
      refreshStats();
    } catch (err) {
      setBugs(previousBugs);
      showToast('Erro ao movimentar cartão.');
    }
  };

  const handleUpdateBug = async (bugId: string, data: Partial<Bug>) => {
    if (!currentBugUser) return;
    try {
      const updated = await bugService.updateBug(bugId, {
        ...data,
        user_id: currentBugUser.id,
        user_name: currentBugUser.name,
        user_role: currentBugUser.role,
      });
      setBugs((prev) => prev.map((b) => (b.id === bugId ? updated : b)));
      setSelectedBug(updated);
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar bug.');
    }
  };

  const handleResolveBug = async (bugId: string, solution: string, notes: string) => {
    if (!currentBugUser) return;
    try {
      const resolved = await bugService.resolveBug(bugId, solution, notes, {
        id: currentBugUser.id,
        name: currentBugUser.name,
        role: currentBugUser.role,
      });
      setBugs((prev) => prev.map((b) => (b.id === bugId ? resolved : b)));
      setSelectedBug(resolved);
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao resolver bug.');
    }
  };

  const handleCloseBug = async (bugId: string, closingNotes: string) => {
    if (!currentBugUser) return;
    try {
      const closed = await bugService.closeBug(bugId, closingNotes, {
        id: currentBugUser.id,
        name: currentBugUser.name,
        role: currentBugUser.role,
      });
      setBugs((prev) => prev.map((b) => (b.id === bugId ? closed : b)));
      setSelectedBug(closed);
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao encerrar bug.');
    }
  };

  const handleReopenBug = async (bugId: string, reason: string) => {
    if (!currentBugUser) return;
    try {
      const reopened = await bugService.reopenBug(bugId, reason, {
        id: currentBugUser.id,
        name: currentBugUser.name,
        role: currentBugUser.role,
      });
      setBugs((prev) => prev.map((b) => (b.id === bugId ? reopened : b)));
      setSelectedBug(reopened);
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao reabrir bug.');
    }
  };

  const handleAddComment = async (bugId: string, content: string) => {
    if (!currentBugUser) return;
    try {
      await bugService.addComment(bugId, content, {
        id: currentBugUser.id,
        name: currentBugUser.name,
        role: currentBugUser.role,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar comentário.');
    }
  };

  const handleAddAttachment = async (bugId: string, name: string, url: string, fileType: string) => {
    if (!currentBugUser) return;
    try {
      await bugService.addAttachment(bugId, name, url, fileType, currentBugUser.name);
    } catch (err: any) {
      alert(err.message || 'Erro ao anexar arquivo.');
    }
  };

  const handleDeleteBug = async (bugId: string) => {
    try {
      await bugService.deleteBug(bugId, authToken || undefined);
      setBugs((prev) => prev.filter((b) => b.id !== bugId));
      if (selectedBug?.id === bugId) {
        setSelectedBug(null);
      }
      showToast('Bug excluído definitivamente do sistema.');
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir bug.');
    }
  };

  // KB Folder Actions
  const handleCreateFolder = async (name: string) => {
    try {
      const created = await bugService.createFolder({ name });
      setFolders((prev) => {
        if (prev.some((f) => f.id === created.id)) return prev;
        return [...prev, created];
      });
      showToast(`Pasta "${created.name}" criada com sucesso!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar pasta');
      throw err;
    }
  };

  const handleUpdateFolder = async (id: string, name: string) => {
    try {
      const updated = await bugService.updateFolder(id, { name });
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
      showToast('Nome da pasta atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pasta');
      throw err;
    }
  };

  const handleDeleteFolder = async (id: string, targetFolderId?: string) => {
    try {
      await bugService.deleteFolder(id, targetFolderId);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (targetFolderId) {
        setArticles((prev) =>
          prev.map((a) => (a.folder_id === id ? { ...a, folder_id: targetFolderId } : a))
        );
      } else {
        setArticles((prev) =>
          prev.map((a) => (a.folder_id === id ? { ...a, folder_id: '' } : a))
        );
      }
      showToast('Pasta excluída com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir pasta');
      throw err;
    }
  };

  // Module actions
  const handleCreateModule = async (data: any) => {
    try {
      const created = await bugService.createModule(data);
      setSystemModules((prev) => [...prev, created]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateModule = async (id: string, data: any) => {
    try {
      const updated = await bugService.updateModule(id, data);
      setSystemModules((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteModule = async (id: string) => {
    try {
      await bugService.deleteModule(id);
      setSystemModules((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Column actions
  const handleCreateColumn = async (data: any) => {
    try {
      const created = await bugService.createColumn(data);
      setColumns((prev) => [...prev, created]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateColumn = async (id: string, data: any) => {
    try {
      const updated = await bugService.updateColumn(id, data);
      setColumns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteColumn = async (columnId: string, targetColId?: string) => {
    try {
      await bugService.deleteColumn(columnId, targetColId);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      if (targetColId) {
        setBugs((prev) =>
          prev.map((b) => (b.column_id === columnId ? { ...b, column_id: targetColId } : b))
        );
      }
      refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir coluna');
      throw err;
    }
  };

  const handleReorderColumns = async (orderedIds: string[]) => {
    try {
      const reordered = await bugService.reorderColumns(orderedIds);
      setColumns(reordered);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Auth actions
  const handleLoginSuccess = (user: BugUser, token: string) => {
    setAuthToken(token);
    setCurrentBugUser(user);
    showToast(`Bem-vindo, ${user.name}!`);
    bugService.getUserMentions(user.id).then(setUserMentions).catch(console.error);
    bugService.getChatChannels().then(setChatChannels).catch(console.error);
  };

  const handleLogout = async () => {
    if (authToken) {
      await bugService.logout(authToken);
    }
    localStorage.removeItem('suasvendas_auth_token');
    localStorage.removeItem('suasvendas_auth_user');
    setAuthToken(null);
    setCurrentBugUser(null);
    setIsUserMenuOpen(false);
    showToast('Sessão encerrada com sucesso.');
  };

  const handleOpenMessageInChat = (channelId: string, messageId: string) => {
    setChatTargetChannelId(channelId);
    setChatTargetMessageId(messageId);
    setActiveView('CHAT');
  };

  // User actions
  const handleCreateUser = async (data: any) => {
    try {
      const created = await bugService.createUser(data);
      setPlatformUsers((prev) => [...prev, created]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await bugService.deleteUser(id);
      setPlatformUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Usuário excluído com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário');
      throw err;
    }
  };

  const handleUpdateUser = async (id: string, data: any) => {
    try {
      const updated = await bugService.updateUser(id, data);
      setPlatformUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      if (currentBugUser?.id === id) setCurrentBugUser(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Notification action
  const handleSelectNotification = (notif: BugNotification) => {
    bugService.markNotificationRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setIsNotificationsOpen(false);

    // Jump directly to the bug
    const target = bugs.find((b) => b.id === notif.bug_id || b.code === notif.bug_code);
    if (target) {
      setActiveView('KANBAN');
      setSelectedBug(target);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    bugService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Filter shortcuts
  const handleFilterOverdue = () => {
    setActiveView('KANBAN');
    setFilterModuleId(null);
    setFilterPriority(null);
    setFilterAssigneeId(null);
    setFilterSearchQuery('');
    showToast('Exibindo todos os bugs em atraso');
  };

  const handleFilterCritical = () => {
    setActiveView('KANBAN');
    setFilterPriority('CRITICAL');
    setFilterModuleId(null);
    setFilterAssigneeId(null);
    setFilterSearchQuery('');
    showToast('Filtrando por bugs de prioridade Crítica');
  };

  const handleFilterModuleFromDashboard = (modId: string) => {
    setActiveView('KANBAN');
    setFilterModuleId(modId);
    showToast('Filtro de módulo aplicado');
  };

  const selectedArticle =
    articles.find((a) => a.id === selectedArticleId) || articles[0];
  const relatedArticles = articles
    .filter((a) => a.id !== selectedArticle?.id)
    .filter(
      (a) =>
        a.module === selectedArticle?.module ||
        a.tags.some((t) => selectedArticle?.tags.includes(t))
    )
    .slice(0, 4);


  // ================= KNOWLEDGE BASE ACTIONS =================
  const handleSaveArticle = async (articleData: Partial<Article>, changeReason: string) => {
    try {
      if (editingArticle) {
        const updated = await bugService.updateArticle(editingArticle.id, {
          ...articleData,
          updated_by_name: currentBugUser?.name,
        });
        setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        showToast('Artigo atualizado com sucesso!');
      } else {
        const created = await bugService.createArticle({
          ...articleData,
          author_name: currentBugUser?.name,
        });
        setArticles((prev) => [created, ...prev]);
        setSelectedArticleId(created.id);
        showToast('Novo artigo publicado com sucesso!');
      }
      setIsEditorOpen(false);
      setEditingArticle(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar artigo');
    }
  };

  const handleToggleFavorite = async (articleId: string) => {
    if (!currentBugUser) return;
    try {
      const res = await bugService.toggleArticleFavorite(articleId, currentBugUser.id);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, is_favorite: res.is_favorite } : a))
      );
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const handleVoteHelpful = async (articleId: string, isHelpful: boolean) => {
    try {
      const res = await bugService.voteArticle(articleId, isHelpful ? 'helpful_yes' : 'helpful_no');
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId
            ? {
                ...a,
                helpful_yes: res.helpful_yes,
                helpful_no: res.helpful_no,
              }
            : a
        )
      );
    } catch (err) {
      console.error('Failed to vote article', err);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      await bugService.deleteArticle(articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
      showToast('Artigo excluído com sucesso da Base de Conhecimento.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir artigo');
      throw err;
    }
  };

  const handleMoveArticleToFolder = async (articleId: string, targetFolderId: string | null) => {
    try {
      const folderIdVal = targetFolderId || '';
      // Optimistic local update
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, folder_id: folderIdVal } : a))
      );
      const updated = await bugService.updateArticle(articleId, {
        folder_id: folderIdVal,
      });
      setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      const targetFolder = folders.find((f) => f.id === targetFolderId);
      showToast(
        targetFolder
          ? `Artigo movido com sucesso para a pasta "${targetFolder.name}".`
          : 'Artigo movido para a raiz (Sem Pasta).'
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao mover artigo de pasta');
      bugService.getArticles().then(setArticles).catch(() => {});
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  const unreadMentionsCount = userMentions.filter((m) => !m.is_read).length;

  // Mandatory Server Verification Gate: never render protected views before backend validation
  if (isValidatingSession) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 select-none ${
        isDarkTheme ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'
      }`}>
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 animate-pulse shadow-xl shadow-blue-500/30">
          <Shield className="w-7 h-7" />
        </div>
        <div className="text-sm font-bold tracking-wide">Validando sessão segura...</div>
        <div className="text-xs text-slate-400 mt-1">Conectando à Central Técnica SuasVendas</div>
      </div>
    );
  }

  // Enforce Mandatory Login Screen if not authenticated
  if (!authToken || !currentBugUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} isDarkTheme={isDarkTheme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* ================= TOPBAR ================= */}
      <header className="h-14 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 select-none shadow-xs dark:shadow-md transition-colors">
        {/* Brand & Ecosystem */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base tracking-tighter shadow-sm border border-blue-400/40">
            SV
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-2 text-slate-950 dark:text-white">
              SuasVendas{' '}
              <span className="bg-blue-600/30 text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider border border-blue-500/30">
                Suporte & Engenharia
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              {/* WebSocket Live Status Badge */}
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className={isWsConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {isWsConnected ? 'Tempo Real Ativo' : 'Conectando WebSocket...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs transition-colors">
          {hasMenuAccess('KANBAN') && (
            <button
              onClick={() => setActiveView('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeView === 'KANBAN'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Quadro Kanban</span>
              <span className="text-[10px] font-mono bg-blue-900/60 text-blue-200 px-1.5 rounded">
                {bugs.length}
              </span>
            </button>
          )}

          {hasMenuAccess('DASHBOARD') && (
            <button
              onClick={() => setActiveView('DASHBOARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeView === 'DASHBOARD'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          {hasMenuAccess('CHAT') && (
            <button
              onClick={() => {
                setChatTargetMessageId(null);
                setActiveView('CHAT');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeView === 'CHAT'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Chat da Equipe</span>
            </button>
          )}

          {hasMenuAccess('MENTIONS') && (
            <button
              onClick={() => setActiveView('MENTIONS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer relative ${
                activeView === 'MENTIONS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <AtSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Minhas Menções</span>
              {unreadMentionsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {unreadMentionsCount}
                </span>
              )}
            </button>
          )}

          {hasMenuAccess('KB') && (
            <button
              onClick={() => setActiveView('KB')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeView === 'KB'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Base de Conhecimento (KB)</span>
            </button>
          )}

          {hasMenuAccess('ALGORITHMS') && (
            <button
              onClick={() => setActiveView('ALGORITHMS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeView === 'ALGORITHMS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
              title="Automações de SLA e Diagnóstico Fiscal SEFAZ"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Algoritmos & SLA</span>
            </button>
          )}

          {hasMenuAccess('MODULES') && (
            <button
              onClick={() => setIsModulesModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition cursor-pointer"
              title="Cadastrar e gerenciar módulos do sistema"
            >
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Módulos ({systemModules.length})</span>
            </button>
          )}

          {hasMenuAccess('COLUMNS') && (
            <button
              onClick={() => setIsColumnsModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition cursor-pointer"
              title="Personalizar etapas do Kanban"
            >
              <span>Colunas</span>
            </button>
          )}

          {hasMenuAccess('USERS') && (
            <button
              onClick={() => setIsUsersModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition cursor-pointer"
              title="Gerenciar usuários e permissões de acesso"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Usuários</span>
            </button>
          )}
        </div>

        {/* Right Topbar Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Create Bug Button (only for users with creation permission) */}
          {(currentBugUser.role === 'ADMIN' || currentBugUser.permissions?.can_create_bugs !== false) && (
            <button
              onClick={() => {
                setCreateBugDefaultCol(undefined);
                setIsCreateBugOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-sm border border-blue-400/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Bug</span>
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative" ref={notificationsContainerRef}>
            <button
              onClick={handleToggleNotifications}
              className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition border border-slate-200 dark:border-slate-700"
              title="Central de Notificações em Tempo Real"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px] flex items-center justify-center animate-bounce">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <NotificationsDropdown
              notifications={notifications}
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onSelectNotification={handleSelectNotification}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Theme Toggle & User Profile Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title={isDarkTheme ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
            >
              {isDarkTheme ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuContainerRef}>
              <button
                onClick={handleToggleUserMenu}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
                title="Meu Perfil e Configurações"
              >
                {currentBugUser.avatar_url ? (
                  <img
                    src={currentBugUser.avatar_url}
                    alt={currentBugUser.name}
                    className="w-7 h-7 rounded-lg object-cover border border-blue-500 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {currentBugUser.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                    {currentBugUser.name}
                  </div>
                  <div className="text-[10px] text-blue-400 font-medium">
                    {currentBugUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40">
                    <div className="font-bold text-sm text-slate-950 dark:text-white">{currentBugUser.name}</div>
                    <div className="text-xs text-slate-400 truncate">{currentBugUser.email}</div>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {currentBugUser.role}
                    </span>
                  </div>

                  <div className="p-1.5 space-y-0.5 text-xs">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition"
                    >
                      <UserIcon className="w-4 h-4 text-blue-400" />
                      <span>Meu Perfil Pessoal</span>
                    </button>

                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDarkTheme ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
                        <span>{isDarkTheme ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {isDarkTheme ? "Escuro" : "Claro"}
                      </span>
                    </button>

                    {currentBugUser.role === "ADMIN" && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsUsersModalOpen(true);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition"
                      >
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Gerenciar Usuários (Admin)</span>
                      </button>
                    )}
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2.5 transition text-xs font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT VIEWS ================= */}
      <main className="flex-1 flex overflow-hidden">
        {activeView === 'KANBAN' && (
          <KanbanBoard
            columns={columns}
            bugs={bugs}
            modules={systemModules}
            currentUser={currentBugUser}
            onMoveBug={handleMoveBug}
            onSelectBug={setSelectedBug}
            onOpenCreateBug={(colId) => {
              setCreateBugDefaultCol(colId);
              setIsCreateBugOpen(true);
            }}
            onOpenManageColumns={() => setIsColumnsModalOpen(true)}
            onDeleteBug={handleDeleteBug}
            onReopenBug={handleReopenBug}
            filterModuleId={filterModuleId}
            filterPriority={filterPriority}
            filterAssigneeId={filterAssigneeId}
            filterSearchQuery={filterSearchQuery}
          />
        )}

        {activeView === 'DASHBOARD' && systemStats && (
          <DashboardView
            stats={systemStats}
            bugs={bugs}
            modules={systemModules}
            onSelectBug={(b) => {
              setActiveView('KANBAN');
              setSelectedBug(b);
            }}
            onFilterModule={handleFilterModuleFromDashboard}
            onFilterOverdue={handleFilterOverdue}
            onFilterCritical={handleFilterCritical}
          />
        )}

        {activeView === 'CHAT' && (
          <GroupChatView
            currentUser={currentBugUser}
            allUsers={platformUsers}
            channels={chatChannels}
            targetMessageId={chatTargetMessageId}
            onClearTargetMessage={() => setChatTargetMessageId(null)}
            onShowToast={showToast}
            onChannelCreated={(newChan) => {
              setChatChannels((prev) => {
                if (prev.some((c) => c.id === newChan.id)) return prev;
                return [...prev, newChan];
              });
            }}
            onChannelDeleted={(delId) => {
              setChatChannels((prev) => prev.filter((c) => c.id !== delId));
            }}
            onChannelUpdated={(updated) => {
              setChatChannels((prev) =>
                prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              );
            }}
          />
        )}

        {activeView === 'MENTIONS' && (
          <MentionsView
            currentUser={currentBugUser}
            channels={chatChannels}
            onOpenMessageInChat={handleOpenMessageInChat}
            onShowToast={showToast}
          />
        )}

        {activeView === 'ALGORITHMS' && (
          <AlgorithmsView currentUser={currentBugUser} />
        )}

        {activeView === 'KB' && (
          <KnowledgeBaseView
            articles={articles}
            modules={systemModules}
            categories={categories}
            folders={folders}
            currentUser={currentBugUser}
            onOpenArticleEditor={(article) => {
              setEditingArticle(article || null);
              setIsEditorOpen(true);
            }}
            onViewDiff={(article) => {
              setSelectedArticleId(article.id);
              setIsDiffModalOpen(true);
            }}
            onToggleFavorite={handleToggleFavorite}
            onVoteHelpful={handleVoteHelpful}
            onShowToast={showToast}
            initialSelectedArticleId={selectedArticleId}
            onSelectArticleId={setSelectedArticleId}
            isDarkTheme={isDarkTheme}
            onOpenFoldersModal={() => setIsFoldersModalOpen(true)}
            onDeleteArticle={handleDeleteArticle}
            onMoveArticleToFolder={handleMoveArticleToFolder}
          />
        )}
      </main>

      {/* ================= MODALS & OVERLAYS ================= */}
      {/* Create Bug Modal */}
      <CreateBugModal
        isOpen={isCreateBugOpen}
        onClose={() => setIsCreateBugOpen(false)}
        modules={systemModules}
        currentUser={currentBugUser}
        defaultColumnId={createBugDefaultCol}
        onCreateBug={handleCreateBug}
      />

      {/* Bug Details Modal */}
      {selectedBug && (
        <ErrorBoundary fallbackTitle="Falha ao carregar detalhes do bug" onReset={() => setSelectedBug(null)}>
          <BugDetailModal
            bug={selectedBug}
            columns={columns}
            modules={systemModules}
            users={platformUsers}
            currentUser={currentBugUser}
            onClose={() => setSelectedBug(null)}
            onUpdateBug={handleUpdateBug}
            onResolveBug={handleResolveBug}
            onCloseBug={handleCloseBug}
            onReopenBug={handleReopenBug}
            onAddComment={handleAddComment}
            onAddAttachment={handleAddAttachment}
            onShowToast={showToast}
            onDeleteBug={handleDeleteBug}
          />
        </ErrorBoundary>
      )}

      {/* Modules Management Modal */}
      <ModulesManagementModal
        isOpen={isModulesModalOpen}
        onClose={() => setIsModulesModalOpen(false)}
        modules={systemModules}
        bugs={bugs}
        currentUser={currentBugUser}
        onCreateModule={handleCreateModule}
        onUpdateModule={handleUpdateModule}
        onDeleteModule={handleDeleteModule}
        onSelectBug={(b) => { setSelectedBug(b); setActiveView('KANBAN'); }}
        onShowToast={showToast}
      />

      {/* Columns Management Modal */}
      <ColumnsManagementModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        bugs={bugs}
        currentUser={currentBugUser}
        onCreateColumn={handleCreateColumn}
        onUpdateColumn={handleUpdateColumn}
        onDeleteColumn={handleDeleteColumn}
        onReorderColumns={handleReorderColumns}
        onShowToast={showToast}
      />

      {/* Users Management Modal (Admin) */}
      <UsersManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={platformUsers}
        currentUser={currentBugUser}
        onCreateUser={handleCreateUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onShowToast={showToast}
      />

      {/* Personal User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentBugUser}
        onUpdateCurrentUser={(updated) => {
          setCurrentBugUser(updated);
          localStorage.setItem('suasvendas_auth_user', JSON.stringify(updated));
          setPlatformUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        }}
        onShowToast={showToast}
        isDarkTheme={isDarkTheme}
      />

      {/* KB Article Editor Modal */}
      {isEditorOpen && (
        <ArticleEditor
          initialArticle={editingArticle}
          categories={categories}
          folders={folders}
          modules={systemModules}
          userRole={(currentBugUser.role as any) || 'ANALYST'}
          onSave={handleSaveArticle}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingArticle(null);
          }}
        />
      )}

      {/* KB Diff / Version History Modal */}
      {isDiffModalOpen && (
        <DiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          article={articles.find((a) => a.id === selectedArticleId) || articles[0]}
          snapshots={selectedArticleId ? (versionHistory[selectedArticleId] || []) : []}
        />
      )}

      {/* KB Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        articles={articles}
        userRole={(currentBugUser.role as any) || 'ANALYST'}
        onSelectArticle={(id) => {
          setSelectedArticleId(id);
          setActiveView('KB');
          setIsCommandPaletteOpen(false);
        }}
        onLogSearch={(q, cnt, lat) => {
          setSearchLogs((prev) => [
            {
              id: generateUUID(),
              query_text: q,
              results_count: cnt,
              latency_ms: lat,
              user_email: currentBugUser.email,
              searched_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }}
        onShowToast={showToast}
      />

      {/* KB Folders Management Modal */}
      <FoldersManagementModal
        isOpen={isFoldersModalOpen}
        onClose={() => setIsFoldersModalOpen(false)}
        folders={folders}
        articles={articles}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        onShowToast={showToast}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
