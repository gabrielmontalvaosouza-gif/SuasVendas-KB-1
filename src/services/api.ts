import {
  User,
  SystemModule,
  KanbanColumn,
  Bug,
  BugNotification,
  SystemStats,
  BugPriority,
  AccessProfile,
  SmtpConfig,
  ChatChannel,
} from '../types/bugs';
import {
  Article,
  Category,
  Folder,
} from '../types/kb';

type WebSocketEventListener = (event: { type: string; payload: any }) => void;

class RealtimeBugService {
  private ws: WebSocket | null = null;
  private listeners: Set<WebSocketEventListener> = new Set();
  private isConnecting = false;
  private reconnectTimer: any = null;

  constructor() {
    this.connectWebSocket();
  }

  public connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.notifyListeners({ type: 'WS_CONNECTED', payload: { status: 'connected' } });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.notifyListeners({ type: 'WS_DISCONNECTED', payload: { status: 'disconnected' } });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, 3000);
  }

  public subscribe(listener: WebSocketEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(data: { type: string; payload: any }) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    }
  }

  // REST API Methods
  public async getBootstrap(): Promise<{
    users: User[];
    modules: SystemModule[];
    columns: KanbanColumn[];
    bugs: Bug[];
    notifications: BugNotification[];
    stats: SystemStats;
    channels?: import('../types/bugs').ChatChannel[];
    articles?: Article[];
    categories?: Category[];
    folders?: Folder[];
    favorites?: { user_id: string; article_id: string }[];
  }> {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) throw new Error('Falha ao carregar dados do servidor');
    return res.json();
  }

  public async getStats(): Promise<SystemStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Falha ao carregar indicadores');
    return res.json();
  }

  // Bugs
  public async createBug(data: {
    title: string;
    description: string;
    module_id: string;
    priority: BugPriority;
    reporter_id: string;
    reporter_name: string;
    estimated_due_date?: string | null;
    attachments?: any[];
  }): Promise<Bug> {
    const res = await fetch('/api/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao registrar bug');
    }
    return res.json();
  }

  public async moveBug(
    id: string,
    target_column_id: string,
    user: { id: string; name: string; role: string }
  ): Promise<Bug> {
    const res = await fetch(`/api/bugs/${id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_column_id,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      }),
    });
    if (!res.ok) throw new Error('Falha ao mover cartão');
    return res.json();
  }

  public async updateBug(
    id: string,
    data: Partial<Bug> & { user_id: string; user_name: string; user_role: string }
  ): Promise<Bug> {
    const res = await fetch(`/api/bugs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar bug');
    return res.json();
  }

  public async resolveBug(
    id: string,
    solution_applied: string,
    technical_notes: string,
    user: { id: string; name: string; role: string }
  ): Promise<Bug> {
    const res = await fetch(`/api/bugs/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solution_applied,
        technical_notes,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao marcar como resolvido');
    }
    return res.json();
  }

  public async closeBug(
    id: string,
    closing_notes: string,
    user: { id: string; name: string; role: string }
  ): Promise<Bug> {
    const res = await fetch(`/api/bugs/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closing_notes,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      }),
    });
    if (!res.ok) throw new Error('Falha ao encerrar bug');
    return res.json();
  }

  public async reopenBug(
    id: string,
    reason: string,
    user: { id: string; name: string; role: string }
  ): Promise<Bug> {
    const res = await fetch(`/api/bugs/${id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      }),
    });
    if (!res.ok) throw new Error('Falha ao reabrir bug');
    return res.json();
  }

  public async addComment(
    bugId: string,
    content: string,
    user: { id: string; name: string; role: string }
  ) {
    const res = await fetch(`/api/bugs/${bugId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      }),
    });
    if (!res.ok) throw new Error('Falha ao enviar comentário');
    return res.json();
  }

  public async addAttachment(
    bugId: string,
    name: string,
    url: string,
    file_type: string,
    user_name: string
  ) {
    const res = await fetch(`/api/bugs/${bugId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        url,
        file_type,
        size_bytes: 180000,
        user_name,
      }),
    });
    if (!res.ok) throw new Error('Falha ao anexar arquivo');
    return res.json();
  }

  // Modules
  public async createModule(data: { name: string; description: string; color: string; icon: string }): Promise<SystemModule> {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar módulo');
    }
    return res.json();
  }

  public async updateModule(id: string, data: Partial<SystemModule>): Promise<SystemModule> {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar módulo');
    return res.json();
  }

  public async deleteModule(id: string): Promise<void> {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir módulo');
    }
  }

  // Columns
  public async createColumn(data: { name: string; color: string; is_resolved_stage?: boolean; is_closed_stage?: boolean }): Promise<KanbanColumn> {
    const res = await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar coluna');
    return res.json();
  }

  public async updateColumn(id: string, data: Partial<KanbanColumn>): Promise<KanbanColumn> {
    const res = await fetch(`/api/columns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar coluna');
    return res.json();
  }

  public async deleteColumn(id: string, target_column_id?: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/columns/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_column_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir coluna');
    }
    return res.json();
  }

  public async reorderColumns(ordered_ids: string[]): Promise<KanbanColumn[]> {
    const res = await fetch('/api/columns-reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids }),
    });
    if (!res.ok) throw new Error('Falha ao reordenar colunas');
    return res.json();
  }

  // Users
  public async createUser(data: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao cadastrar usuário');
    }
    return res.json();
  }

  public async updateUser(id: string, data: Partial<User> & { new_password?: string }): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar usuário');
    }
    return res.json();
  }

  // Notifications
  public async markNotificationRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  public async markAllNotificationsRead() {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
  }

  // ================= AUTHENTICATION =================
  public async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao autenticar.');
    }
    return res.json();
  }

  public async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sessão inválida.');
    }
    return res.json();
  }

  public async logout(token?: string): Promise<void> {
    if (!token) return;
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  // 3-Step Secure Password Recovery
  public async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    dev_code?: string;
    expires_in_minutes: number;
  }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao solicitar código de recuperação.');
    }
    return res.json();
  }

  public async verifyPasswordResetCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; ticket: string; message: string }> {
    const res = await fetch('/api/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Código de verificação inválido ou expirado.');
    }
    return res.json();
  }

  public async resetPasswordWithTicket(
    email: string,
    ticket: string,
    new_password: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ticket, new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao redefinir senha.');
    }
    return res.json();
  }

  // Legacy fallback if needed
  public async resetPassword(email: string, new_password?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao redefinir senha.');
    }
    return res.json();
  }

  // ================= CHAT & MENTIONS =================
  public async getChatChannels(token?: string, userId?: string): Promise<import('../types/bugs').ChatChannel[]> {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const headers: Record<string, string> = {};
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;
    
    let url = '/api/chat/channels';
    if (userId) url += `?user_id=${encodeURIComponent(userId)}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Falha ao carregar canais do chat');
    return res.json();
  }

  public async createChatChannel(
    data: { name: string; description?: string; participant_ids: string[]; created_by?: string },
    token?: string
  ): Promise<import('../types/bugs').ChatChannel> {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;

    const res = await fetch('/api/chat/channels', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar nova conversa.');
    }
    return res.json();
  }

  public async getChatMessages(channel_id?: string, token?: string, userId?: string) {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const headers: Record<string, string> = {};
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;

    const params = new URLSearchParams();
    if (channel_id) params.append('channel_id', channel_id);
    if (userId) params.append('user_id', userId);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/chat/messages${queryStr}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao carregar mensagens');
    }
    return res.json();
  }

  public async sendChatMessage(data: {
    channel_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    attachments?: any[];
    mentions?: string[];
  }) {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao enviar mensagem');
    }
    return res.json();
  }

  public async getUserMentions(user_id: string, unread_only = false) {
    const res = await fetch(`/api/chat/mentions?user_id=${encodeURIComponent(user_id)}&unread_only=${unread_only}`);
    if (!res.ok) throw new Error('Falha ao carregar menções');
    return res.json();
  }

  public async markMentionRead(id: string) {
    const res = await fetch(`/api/chat/mentions/${id}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Falha ao marcar menção como lida');
    return res.json();
  }

  public async markAllMentionsRead(user_id: string) {
    const res = await fetch('/api/chat/mentions/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
    if (!res.ok) throw new Error('Falha ao marcar todas como lidas');
    return res.json();
  }

  // ================= KNOWLEDGE BASE ARTICLES =================
  public async getArticles(params?: {
    q?: string;
    module_id?: string;
    favorites_only?: boolean;
    user_id?: string;
    sort?: 'recent' | 'views' | 'helpful';
  }): Promise<Article[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.module_id) query.set('module_id', params.module_id);
    if (params?.favorites_only) query.set('favorites_only', 'true');
    if (params?.user_id) query.set('user_id', params.user_id);
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const url = queryString ? `/api/articles?${queryString}` : '/api/articles';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar artigos');
    return res.json();
  }

  public async getArticleById(id: string, user_id?: string, increment_view = false): Promise<Article> {
    const query = new URLSearchParams();
    if (user_id) query.set('user_id', user_id);
    if (increment_view) query.set('increment_view', 'true');

    const queryString = query.toString();
    const url = queryString ? `/api/articles/${id}?${queryString}` : `/api/articles/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao obter artigo');
    return res.json();
  }

  public async createArticle(article: Partial<Article>): Promise<Article> {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar artigo');
    }
    return res.json();
  }

  public async updateArticle(id: string, article: Partial<Article>): Promise<Article> {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar artigo');
    }
    return res.json();
  }

  public async deleteArticle(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir artigo');
    }
    return res.json();
  }

  public async toggleArticleFavorite(
    id: string,
    user_id: string
  ): Promise<{ success: boolean; article_id: string; is_favorite: boolean }> {
    const res = await fetch(`/api/articles/${id}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
    if (!res.ok) throw new Error('Falha ao alternar favorito');
    return res.json();
  }

  public async voteArticle(
    id: string,
    type: 'helpful_yes' | 'helpful_no'
  ): Promise<{ success: boolean; helpful_yes: number; helpful_no: number }> {
    const res = await fetch(`/api/articles/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('Falha ao registrar voto');
    return res.json();
  }

  public async incrementArticleView(id: string): Promise<{ success: boolean; views_count: number }> {
    const res = await fetch(`/api/articles/${id}/view`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao registrar visualização');
    return res.json();
  }

  public async updateProfile(data: {
    name?: string;
    avatar_url?: string;
    theme_preference?: "light" | "dark";
    current_password?: string;
    new_password?: string;
  }, token?: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao atualizar perfil.");
    }
    return res.json();
  }

  // ================= BUGS DELETION =================
  public async deleteBug(id: string, token?: string): Promise<{ success: boolean; message: string }> {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const res = await fetch(`/api/bugs/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
      },
      body: JSON.stringify({ token: effectiveToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao excluir bug.');
    }
    return res.json();
  }

  // ================= KB FOLDERS API =================
  public async getFolders(): Promise<Folder[]> {
    const res = await fetch('/api/kb/folders');
    if (!res.ok) throw new Error('Falha ao carregar pastas');
    return res.json();
  }

  public async createFolder(data: { name: string; category_id?: string; visibility_level?: string }): Promise<Folder> {
    const res = await fetch('/api/kb/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar pasta');
    }
    return res.json();
  }

  public async updateFolder(id: string, data: { name?: string; category_id?: string; visibility_level?: string }): Promise<Folder> {
    const res = await fetch(`/api/kb/folders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar pasta');
    }
    return res.json();
  }

  public async deleteFolder(id: string, targetFolderId?: string): Promise<{ success: boolean; message: string; affected_articles: number }> {
    const res = await fetch(`/api/kb/folders/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_folder_id: targetFolderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir pasta');
    }
    return res.json();
  }

  public async deleteUser(id: string): Promise<{ success: boolean; id: string; message: string }> {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao excluir usuário.");
    }
    return res.json();
  }

  // ================= 12.4 & 15.1 CHAT MANAGEMENT API =================
  public async deleteChatChannel(id: string, token?: string): Promise<{ success: boolean; message: string }> {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const headers: Record<string, string> = {};
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;

    const res = await fetch(`/api/chat/channels/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir conversa.');
    }
    return res.json();
  }

  public async updateChatChannelParticipants(
    id: string,
    participantIds: string[],
    token?: string
  ): Promise<{ success: boolean; channel: ChatChannel; message: string }> {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('suasvendas_auth_token') || undefined : undefined);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;

    const res = await fetch(`/api/chat/channels/${id}/participants`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ participant_ids: participantIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar participantes da conversa.');
    }
    return res.json();
  }

  // ================= 12.5 PASSWORD RECOVERY 1-CLICK VERIFICATION =================
  public async verifyResetToken(email: string, token: string): Promise<{ success: boolean; message: string; ticket: string }> {
    const res = await fetch(`/api/auth/verify-reset-token?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Link de recuperação expirado ou inválido.');
    }
    return res.json();
  }

  // ================= 12.5 & 13 SMTP CONFIG & TEST =================
  public async getSmtpConfig(): Promise<SmtpConfig & { pass_masked?: string }> {
    const res = await fetch('/api/admin/smtp');
    if (!res.ok) throw new Error('Falha ao carregar configurações de e-mail.');
    return res.json();
  }

  public async updateSmtpConfig(config: Partial<SmtpConfig>): Promise<{ success: boolean; message: string; config: SmtpConfig }> {
    const res = await fetch('/api/admin/smtp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar configurações de SMTP.');
    }
    return res.json();
  }

  public async testSmtp(toEmail: string, testConfig?: Partial<SmtpConfig>): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/smtp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: toEmail, ...(testConfig || {}) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro no envio do e-mail de teste.');
    }
    return res.json();
  }

  // ================= 13. ACCESS PROFILES MANAGEMENT =================
  public async getAccessProfiles(): Promise<AccessProfile[]> {
    const res = await fetch('/api/admin/profiles');
    if (!res.ok) throw new Error('Falha ao carregar perfis de acesso.');
    return res.json();
  }

  public async createAccessProfile(data: Partial<AccessProfile>): Promise<AccessProfile> {
    const res = await fetch('/api/admin/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar perfil de acesso.');
    }
    return res.json();
  }

  public async updateAccessProfile(id: string, data: Partial<AccessProfile>): Promise<AccessProfile> {
    const res = await fetch(`/api/admin/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar perfil de acesso.');
    }
    return res.json();
  }

  public async deleteAccessProfile(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir perfil de acesso.');
    }
    return res.json();
  }
}

export const bugService = new RealtimeBugService();

