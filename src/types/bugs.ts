export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'SUPPORT' | 'TECH' | 'COMMERCIAL' | 'CUSTOM';

export type AppMenuKey =
  | 'DASHBOARD'
  | 'KANBAN'
  | 'KB'
  | 'CHAT'
  | 'MENTIONS'
  | 'ALGORITHMS'
  | 'MODULES'
  | 'COLUMNS'
  | 'USERS'
  | 'SETTINGS';

export interface UserPermissions {
  can_view_dashboard: boolean;
  can_view_bugs: boolean;
  can_create_bugs: boolean;
  can_edit_bugs: boolean;
  can_delete_bug: boolean;
  can_resolve_bug: boolean;
  can_close_bug: boolean;
  can_assign_lead: boolean;
  can_edit_due_date: boolean;
  can_change_priority: boolean;
  can_view_kb: boolean;
  can_create_articles: boolean;
  can_edit_articles: boolean;
  can_delete_articles: boolean;
  can_use_chat: boolean;
  can_create_channels: boolean;
  can_delete_channels: boolean;
  can_view_algorithms: boolean;
  can_edit_algorithms: boolean;
  can_manage_modules: boolean;
  can_manage_columns: boolean;
  can_manage_users: boolean;
  can_manage_smtp: boolean;
  can_add_comment: boolean;
}

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  is_system?: boolean;
  allowed_menus: AppMenuKey[];
  permissions: UserPermissions;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_name: string;
  from_email: string;
  is_configured: boolean;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string; // 'Comercial' | 'Suporte' | 'Técnico' | 'Financeiro' | 'Diretoria' | etc.
  profile_id?: string;
  avatar_url?: string;
  theme_preference?: 'light' | 'dark';
  is_blocked: boolean;
  is_active: boolean;
  allowed_menus?: AppMenuKey[];
  permissions: UserPermissions;
  created_at: string;
  last_login_at?: string;
}

export interface SystemModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  order_index: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_index: number;
  is_system?: boolean;
  is_resolved_stage?: boolean;
  is_closed_stage?: boolean;
  is_archived?: boolean;
}

export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BugAttachment {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  url: string;
  preview_url?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface BugComment {
  id: string;
  bug_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  content: string;
  created_at: string;
}

export interface BugHistoryEntry {
  id: string;
  bug_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  field_changed: string;
  old_value: string;
  new_value: string;
  description: string;
  created_at: string;
}

export interface Bug {
  id: string;
  code: string; // e.g. "SV-1042"
  title: string;
  description: string;
  module_id: string;
  module_name: string;
  column_id: string;
  priority: BugPriority;
  reporter_id: string;
  reporter_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  estimated_due_date: string | null; // ISO string
  effective_resolution_date: string | null; // ISO string
  solution_applied: string | null;
  technical_notes: string | null;
  attachments: BugAttachment[];
  comments: BugComment[];
  history: BugHistoryEntry[];
  created_at: string;
  updated_at: string;
  is_reopened: boolean;
}

export type NotificationType =
  | 'NEW_BUG'
  | 'ASSIGNED'
  | 'PRIORITY_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMMENT'
  | 'MENTION';

export interface BugNotification {
  id: string;
  recipient_user_id: string | 'ALL';
  type: NotificationType;
  title: string;
  message: string;
  bug_id: string;
  bug_code: string;
  is_read: boolean;
  created_at: string;
}

export interface SystemStats {
  total_bugs: number;
  open_bugs: number;
  in_progress_bugs: number;
  critical_bugs: number;
  overdue_bugs: number;
  resolved_bugs: number;
  closed_bugs: number;
  avg_resolution_hours: number;
  bugs_by_module: { module_name: string; count: number; color: string }[];
  bugs_by_priority: { priority: BugPriority; count: number }[];
  bugs_by_status: { column_name: string; count: number; color: string }[];
  recent_activity: BugHistoryEntry[];
}

// Chat & Mentions Types
export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  order_index: number;
  is_private?: boolean;
  participant_ids?: string[];
  created_by?: string;
  created_at?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  mentions: string[]; // array of user IDs
  attachments?: ChatAttachment[];
  created_at: string;
}

export interface UserMention {
  id: string;
  user_id: string; // The mentioned user
  message_id: string;
  channel_id: string;
  channel_name: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  attachments?: ChatAttachment[];
  is_read: boolean;
  created_at: string;
}
