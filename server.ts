import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import {
  User,
  UserRole,
  UserPermissions,
  AccessProfile,
  SmtpConfig,
  AppMenuKey,
  SystemModule,
  KanbanColumn,
  Bug,
  BugNotification,
  BugHistoryEntry,
  BugComment,
  SystemStats,
  ChatMessage,
  ChatChannel,
  UserMention,
} from './src/types/bugs';
import {
  Category,
  Folder,
  Article,
} from './src/types/kb';
import {
  INITIAL_CATEGORIES,
  INITIAL_FOLDERS,
  INITIAL_ARTICLES,
} from './src/data/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Master Admin protected accounts
export const MASTER_ADMIN_EMAILS = [
  'gabrielsouza@suasvendas.com',
  'manoelvilelaneto@gmail.com',
  'carlos.admin@suasvendas.com',
];

// Ensure database file directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// User representation stored on server (with password hash and salt)
export interface ServerUser extends User {
  password_hash: string;
  password_salt: string;
}

export interface DatabaseSchema {
  users: ServerUser[];
  modules: SystemModule[];
  columns: KanbanColumn[];
  bugs: Bug[];
  notifications: BugNotification[];
  channels: ChatChannel[];
  messages: ChatMessage[];
  mentions: UserMention[];
  articles: Article[];
  categories: Category[];
  folders: Folder[];
  favorites: { user_id: string; article_id: string }[];
  smtp_config: SmtpConfig;
  access_profiles: AccessProfile[];
}

// Security & Password hashing functions
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = hashPassword(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

// In-memory active auth tokens mapping: token -> userId
const activeSessions = new Map<string, { userId: string; createdAt: number }>();

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function getUserIdFromToken(token?: string): string | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  // Session valid for 30 days
  if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return null;
  }
  return session.userId;
}

function invalidateUserSessions(userId: string): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
    }
  }
}

// Default Granular Permission Profiles
export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  can_view_dashboard: true,
  can_view_bugs: true,
  can_create_bugs: true,
  can_edit_bugs: true,
  can_delete_bug: true,
  can_resolve_bug: true,
  can_close_bug: true,
  can_assign_lead: true,
  can_edit_due_date: true,
  can_change_priority: true,
  can_view_kb: true,
  can_create_articles: true,
  can_edit_articles: true,
  can_delete_articles: true,
  can_use_chat: true,
  can_create_channels: true,
  can_delete_channels: true,
  can_view_algorithms: true,
  can_edit_algorithms: true,
  can_manage_modules: true,
  can_manage_columns: true,
  can_manage_users: true,
  can_manage_smtp: true,
  can_add_comment: true,
};

export const DEFAULT_SUPERVISOR_PERMISSIONS: UserPermissions = {
  can_view_dashboard: true,
  can_view_bugs: true,
  can_create_bugs: true,
  can_edit_bugs: true,
  can_delete_bug: false,
  can_resolve_bug: true,
  can_close_bug: true,
  can_assign_lead: true,
  can_edit_due_date: true,
  can_change_priority: true,
  can_view_kb: true,
  can_create_articles: true,
  can_edit_articles: true,
  can_delete_articles: false,
  can_use_chat: true,
  can_create_channels: true,
  can_delete_channels: false,
  can_view_algorithms: true,
  can_edit_algorithms: true,
  can_manage_modules: false,
  can_manage_columns: true,
  can_manage_users: false,
  can_manage_smtp: false,
  can_add_comment: true,
};

export const DEFAULT_SUPPORT_PERMISSIONS: UserPermissions = {
  can_view_dashboard: true,
  can_view_bugs: true,
  can_create_bugs: true,
  can_edit_bugs: true,
  can_delete_bug: false,
  can_resolve_bug: false,
  can_close_bug: true,
  can_assign_lead: false,
  can_edit_due_date: false,
  can_change_priority: false,
  can_view_kb: true,
  can_create_articles: true,
  can_edit_articles: false,
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
};

export const DEFAULT_TECH_PERMISSIONS: UserPermissions = {
  can_view_dashboard: false,
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
  can_view_algorithms: true,
  can_edit_algorithms: true,
  can_manage_modules: false,
  can_manage_columns: false,
  can_manage_users: false,
  can_manage_smtp: false,
  can_add_comment: true,
};

export const DEFAULT_COMMERCIAL_PERMISSIONS: UserPermissions = {
  can_view_dashboard: false,
  can_view_bugs: false,
  can_create_bugs: false,
  can_edit_bugs: false,
  can_delete_bug: false,
  can_resolve_bug: false,
  can_close_bug: false,
  can_assign_lead: false,
  can_edit_due_date: false,
  can_change_priority: false,
  can_view_kb: true,
  can_create_articles: false,
  can_edit_articles: false,
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
};

export const DEFAULT_ACCESS_PROFILES: AccessProfile[] = [
  {
    id: 'prof-admin',
    name: 'Administrador Principal',
    description: 'Acesso total e irrestrito a todos os módulos, menus, configurações e usuários.',
    role: 'ADMIN',
    is_system: true,
    allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
    permissions: DEFAULT_ADMIN_PERMISSIONS,
  },
  {
    id: 'prof-supervisor',
    name: 'Supervisor de Suporte',
    description: 'Gestão de filas, colunas, atribuição de chamados, prazos, prioridades e algoritmos.',
    role: 'SUPERVISOR',
    is_system: true,
    allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'COLUMNS'],
    permissions: DEFAULT_SUPERVISOR_PERMISSIONS,
  },
  {
    id: 'prof-support',
    name: 'Suporte Técnico',
    description: 'Atendimento diário, abertura de bugs no Kanban, consulta e cadastro na Base de Conhecimento e Chat.',
    role: 'SUPPORT',
    is_system: true,
    allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS'],
    permissions: DEFAULT_SUPPORT_PERMISSIONS,
  },
  {
    id: 'prof-tech',
    name: 'Equipe Técnica & Dev',
    description: 'Análise técnica, resolução de bugs no Kanban, configuração de algoritmos automatizados e Base de Conhecimento.',
    role: 'TECH',
    is_system: true,
    allowed_menus: ['KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS'],
    permissions: DEFAULT_TECH_PERMISSIONS,
  },
  {
    id: 'prof-commercial',
    name: 'Equipe Comercial',
    description: 'Comunicação direta via Chat e consulta à Base de Conhecimento. Acesso bloqueado para algoritmos e configurações técnicas.',
    role: 'COMMERCIAL',
    is_system: true,
    allowed_menus: ['KB', 'CHAT', 'MENTIONS'],
    permissions: DEFAULT_COMMERCIAL_PERMISSIONS,
  },
];

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from_name: 'Suporte SuasVendas',
  from_email: process.env.SMTP_FROM || 'suporte@suasvendas.com',
  is_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  updated_at: new Date().toISOString(),
};

// Send real recovery email using Nodemailer
export async function sendRecoveryEmail(
  smtp: SmtpConfig,
  toEmail: string,
  toName: string,
  code: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!smtp.host || !smtp.user || !smtp.pass) {
    return { success: false, error: 'Servidor SMTP não configurado com credenciais válidas.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0 0 6px 0; font-size: 22px; font-weight: 700;">SuasVendas</h2>
          <span style="color: #64748b; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Sistema Interno de Suporte & Gestão</span>
        </div>
        <p style="font-size: 15px; margin-top: 0; line-height: 1.6;">Olá, <strong>${toName}</strong>!</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Você solicitou a recuperação da sua senha de acesso. Utilize o código de 6 dígitos abaixo no sistema ou clique diretamente no botão para redefinir:
        </p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Código de Verificação</span>
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8; display: block; font-family: monospace;">${code}</span>
          <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 6px;">Válido por 15 minutos</span>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Redefinir Senha em 1 Clique
          </a>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin-top: 24px;">
          Se você não fez essa solicitação, pode ignorar este e-mail com segurança. Sua senha permanecerá inalterada.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          SuasVendas — Força de Vendas e Gestão Comercial B2B
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${smtp.from_name || 'Suporte SuasVendas'}" <${smtp.from_email || smtp.user}>`,
      to: toEmail,
      subject: `[SuasVendas] Código de Recuperação de Senha: ${code}`,
      text: `Olá ${toName}, seu código para recuperação de senha é: ${code}. Link direto: ${resetUrl}`,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    console.error('[SMTP ERROR]', err);
    return { success: false, error: err?.message || 'Falha no envio de e-mail SMTP.' };
  }
}

// In-memory store for 3-step password recovery
interface PasswordResetRequest {
  email: string;
  codeHash: string;
  expiresAt: number; // 15 minutes
  attempts: number; // max 5 attempts
  ticket?: string;
  ticketExpiresAt?: number; // 15 minutes
}
const passwordResetStore = new Map<string, PasswordResetRequest>();

// Seed default data if database doesn't exist
function getInitialDatabase(): DatabaseSchema {
  // Required Admin password: 281007Gg!
  const adminSalt1 = generateSalt();
  const adminHash1 = hashPassword('281007Gg!', adminSalt1);

  const adminSalt2 = generateSalt();
  const adminHash2 = hashPassword('281007Gg!', adminSalt2);

  const adminSalt3 = generateSalt();
  const adminHash3 = hashPassword('281007Gg!', adminSalt3);

  const defaultTeamSalt = generateSalt();
  const defaultTeamHash = hashPassword('SuasVendas123!', defaultTeamSalt);

  const initialUsers: ServerUser[] = [
    {
      id: 'usr-admin-gabriel',
      name: 'Gabriel Souza (Admin Principal)',
      email: 'gabrielsouza@suasvendas.com',
      role: 'ADMIN',
      department: 'Diretoria',
      profile_id: 'prof-admin',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: adminSalt3,
      password_hash: adminHash3,
      allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
      permissions: DEFAULT_ADMIN_PERMISSIONS,
      created_at: '2026-01-10T08:00:00Z',
    },
    {
      id: 'usr-admin-primary',
      name: 'Manoel Vilela (Admin)',
      email: 'manoelvilelaneto@gmail.com',
      role: 'ADMIN',
      department: 'Diretoria',
      profile_id: 'prof-admin',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: adminSalt2,
      password_hash: adminHash2,
      allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
      permissions: DEFAULT_ADMIN_PERMISSIONS,
      created_at: '2026-01-10T08:00:00Z',
    },
    {
      id: 'usr-admin-1',
      name: 'Carlos Oliveira',
      email: 'carlos.admin@suasvendas.com',
      role: 'ADMIN',
      department: 'Diretoria',
      profile_id: 'prof-admin',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: adminSalt1,
      password_hash: adminHash1,
      allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
      permissions: DEFAULT_ADMIN_PERMISSIONS,
      created_at: '2026-01-10T08:00:00Z',
    },
    {
      id: 'usr-sup-2',
      name: 'Mariana Souza',
      email: 'mariana.supervisor@suasvendas.com',
      role: 'SUPERVISOR',
      department: 'Suporte',
      profile_id: 'prof-supervisor',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: defaultTeamSalt,
      password_hash: defaultTeamHash,
      allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'COLUMNS'],
      permissions: DEFAULT_SUPERVISOR_PERMISSIONS,
      created_at: '2026-01-15T09:30:00Z',
    },
    {
      id: 'usr-sup-3',
      name: 'Lucas Ferreira',
      email: 'lucas.suporte@suasvendas.com',
      role: 'SUPPORT',
      department: 'Suporte',
      profile_id: 'prof-support',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: defaultTeamSalt,
      password_hash: defaultTeamHash,
      allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS'],
      permissions: DEFAULT_SUPPORT_PERMISSIONS,
      created_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 'usr-dev-4',
      name: 'Bruno Alcantara',
      email: 'bruno.dev@suasvendas.com',
      role: 'TECH',
      department: 'Técnico',
      profile_id: 'prof-tech',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: defaultTeamSalt,
      password_hash: defaultTeamHash,
      allowed_menus: ['KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS'],
      permissions: DEFAULT_TECH_PERMISSIONS,
      created_at: '2026-02-10T11:00:00Z',
    },
    {
      id: 'usr-com-5',
      name: 'Patricia Vendas',
      email: 'patricia.comercial@suasvendas.com',
      role: 'COMMERCIAL',
      department: 'Comercial',
      profile_id: 'prof-commercial',
      avatar_url: '',
      is_blocked: false,
      is_active: true,
      password_salt: defaultTeamSalt,
      password_hash: defaultTeamHash,
      allowed_menus: ['KB', 'CHAT', 'MENTIONS'],
      permissions: DEFAULT_COMMERCIAL_PERMISSIONS,
      created_at: '2026-02-15T11:00:00Z',
    },
  ];

  const initialModules: SystemModule[] = [
    {
      id: 'mod-1',
      slug: 'faturamento-nfe',
      name: 'Faturamento e NF-e',
      description: 'Emissão fiscal, contingência SEFAZ, DANFE e regras tributárias de ICMS-ST.',
      color: '#2563EB',
      icon: 'Receipt',
      order_index: 0,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mod-2',
      slug: 'pedidos-orcamentos',
      name: 'Pedidos e Orçamentos',
      description: 'Criação de pedidos, tabelas de preços, regras de desconto e aprovação comercial.',
      color: '#10B981',
      icon: 'ShoppingCart',
      order_index: 1,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mod-3',
      slug: 'integracoes-erp',
      name: 'Integrações ERP & API',
      description: 'Conectores Bling, Tiny, Omie, Totvs Protheus, Webhooks e endpoints REST.',
      color: '#8B5CF6',
      icon: 'RefreshCw',
      order_index: 2,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mod-4',
      slug: 'catalogo-b2b',
      name: 'Catálogo & Portal B2B',
      description: 'Vitrine digital para representantes e compras diretas de clientes lojistas.',
      color: '#F59E0B',
      icon: 'Store',
      order_index: 3,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mod-5',
      slug: 'app-mobile',
      name: 'App Mobile Força de Vendas',
      description: 'Aplicativo Android e iOS para operação de vendas e pedidos offline.',
      color: '#EC4899',
      icon: 'Smartphone',
      order_index: 4,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const initialColumns: KanbanColumn[] = [
    { id: 'col-novo', name: 'Novo bug', color: '#64748B', order_index: 0, is_system: true },
    { id: 'col-analise', name: 'Em análise', color: '#3B82F6', order_index: 1, is_system: true },
    { id: 'col-identificado', name: 'Bug identificado', color: '#F59E0B', order_index: 2, is_system: true },
    { id: 'col-aguardando', name: 'Aguardando desenvolvimento', color: '#EC4899', order_index: 3, is_system: true },
    { id: 'col-desenvolvimento', name: 'Em desenvolvimento', color: '#8B5CF6', order_index: 4, is_system: true },
    { id: 'col-testes', name: 'Em testes', color: '#06B6D4', order_index: 5, is_system: true },
    { id: 'col-resolvido', name: 'Resolvido', color: '#10B981', order_index: 6, is_system: true, is_resolved_stage: true },
    { id: 'col-encerrado', name: 'Encerrado', color: '#059669', order_index: 7, is_system: true, is_closed_stage: true },
  ];

  const now = new Date();
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const initialBugs: Bug[] = [
    {
      id: 'bug-1041',
      code: 'SV-1041',
      title: 'Rejeição 215 SEFAZ ao emitir nota fiscal com caractere "&" no complemento',
      description: 'Ao faturar pedidos onde o endereço possui caracteres especiais como "&" ou quebras de linha no complemento, o retorno da SEFAZ falha no Schema XML com código 215.',
      module_id: 'mod-1',
      module_name: 'Faturamento e NF-e',
      column_id: 'col-desenvolvimento',
      priority: 'CRITICAL',
      reporter_id: 'usr-sup-3',
      reporter_name: 'Lucas Ferreira',
      assignee_id: 'usr-dev-4',
      assignee_name: 'Bruno Alcantara',
      supervisor_id: 'usr-sup-2',
      supervisor_name: 'Mariana Souza',
      estimated_due_date: inThreeDays,
      effective_resolution_date: null,
      solution_applied: null,
      technical_notes: 'Sanitizar inputs no gateway fiscal antes de montar o payload XML.',
      attachments: [],
      comments: [],
      history: [
        {
          id: 'h-1',
          bug_id: 'bug-1041',
          user_id: 'usr-sup-3',
          user_name: 'Lucas Ferreira',
          user_role: 'SUPPORT',
          field_changed: 'status',
          old_value: 'Nenhum',
          new_value: 'Novo bug',
          description: 'Bug registrado pelo suporte.',
          created_at: pastWeek,
        },
      ],
      created_at: pastWeek,
      updated_at: yesterday,
      is_reopened: false,
    },
    {
      id: 'bug-1042',
      code: 'SV-1042',
      title: 'Divergência de Saldo de Estoque após sincronização com Bling ERP',
      description: 'Vendas físicas realizadas diretamente no PDV do ERP não são refletidas no SuasVendas. O webhook de estoque apresenta atraso.',
      module_id: 'mod-3',
      module_name: 'Integrações ERP & API',
      column_id: 'col-testes',
      priority: 'HIGH',
      reporter_id: 'usr-sup-3',
      reporter_name: 'Lucas Ferreira',
      assignee_id: 'usr-dev-4',
      assignee_name: 'Bruno Alcantara',
      supervisor_id: 'usr-sup-2',
      supervisor_name: 'Mariana Souza',
      estimated_due_date: yesterday,
      effective_resolution_date: null,
      solution_applied: null,
      technical_notes: 'Worker assíncrono otimizado.',
      attachments: [],
      comments: [],
      history: [],
      created_at: pastWeek,
      updated_at: yesterday,
      is_reopened: false,
    },
  ];

  const initialNotifications: BugNotification[] = [
    {
      id: 'notif-1',
      recipient_user_id: 'ALL',
      type: 'OVERDUE',
      title: 'Bug Atrasado: SV-1042',
      message: 'O bug "Divergência de Saldo de Estoque Bling" ultrapassou o prazo estimado.',
      bug_id: 'bug-1042',
      bug_code: 'SV-1042',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];

  const initialChannels: ChatChannel[] = [
    { id: 'chan-geral', name: 'Geral & Suporte', description: 'Canal de comunicação rápida de toda a equipe', order_index: 0 },
    { id: 'chan-bugs', name: 'Bugs & Engenharia', description: 'Discussão técnica sobre chamados e correções', order_index: 1 },
    { id: 'chan-fiscal', name: 'Faturamento & Fiscal', description: 'Rejeições SEFAZ e regras tributárias', order_index: 2 },
    { id: 'chan-plantao', name: 'Plantão Técnico', description: 'Plantão de atendimento e alertas de incidentes', order_index: 3 },
  ];

  const initialMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      channel_id: 'chan-bugs',
      sender_id: 'usr-sup-3',
      sender_name: 'Lucas Ferreira',
      sender_role: 'SUPPORT',
      content: 'Olá @Carlos Oliveira e @Bruno Alcantara, o cliente da Distribuidora Sul relatou rejeição 215 ao emitir a NF-e número 8821. Já registrei o bug SV-1041 no Kanban.',
      mentions: ['usr-admin-1', 'usr-dev-4', 'usr-admin-primary'],
      created_at: yesterday,
    },
    {
      id: 'msg-2',
      channel_id: 'chan-bugs',
      sender_id: 'usr-dev-4',
      sender_name: 'Bruno Alcantara',
      sender_role: 'TECH',
      content: 'Recebido @Lucas Ferreira! Já estou com a branch de sanitização aberta para tratar caracteres especiais.',
      mentions: ['usr-sup-3'],
      created_at: yesterday,
    },
    {
      id: 'msg-3',
      channel_id: 'chan-geral',
      sender_id: 'usr-sup-2',
      sender_name: 'Mariana Souza',
      sender_role: 'SUPERVISOR',
      content: 'Bom dia time! Lembrem de validar as resoluções de bugs com os clientes antes de mover os chamados para Encerrado.',
      mentions: [],
      created_at: now.toISOString(),
    },
  ];

  const initialMentions: UserMention[] = [
    {
      id: 'men-1',
      user_id: 'usr-admin-1',
      message_id: 'msg-1',
      channel_id: 'chan-bugs',
      channel_name: 'Bugs & Engenharia',
      sender_id: 'usr-sup-3',
      sender_name: 'Lucas Ferreira',
      sender_role: 'SUPPORT',
      content: 'Olá @Carlos Oliveira e @Bruno Alcantara, o cliente da Distribuidora Sul relatou rejeição 215...',
      is_read: false,
      created_at: yesterday,
    },
    {
      id: 'men-2',
      user_id: 'usr-admin-primary',
      message_id: 'msg-1',
      channel_id: 'chan-bugs',
      channel_name: 'Bugs & Engenharia',
      sender_id: 'usr-sup-3',
      sender_name: 'Lucas Ferreira',
      sender_role: 'SUPPORT',
      content: 'Olá @Carlos Oliveira e @Bruno Alcantara, o cliente da Distribuidora Sul relatou rejeição 215...',
      is_read: false,
      created_at: yesterday,
    },
  ];

  return {
    users: initialUsers,
    modules: initialModules,
    columns: initialColumns,
    bugs: initialBugs,
    notifications: initialNotifications,
    channels: initialChannels,
    messages: initialMessages,
    mentions: initialMentions,
    articles: INITIAL_ARTICLES,
    categories: INITIAL_CATEGORIES,
    folders: INITIAL_FOLDERS,
    favorites: [],
    smtp_config: DEFAULT_SMTP_CONFIG,
    access_profiles: JSON.parse(JSON.stringify(DEFAULT_ACCESS_PROFILES)),
  };
}

// Read database from file or initialize
export function readDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure channels, messages, mentions exist in existing db
      let modified = false;
      if (!parsed.channels) {
        parsed.channels = [
          { id: 'chan-geral', name: 'Geral & Suporte', description: 'Canal de comunicação rápida de toda a equipe', order_index: 0 },
          { id: 'chan-bugs', name: 'Bugs & Engenharia', description: 'Discussão técnica sobre chamados e correções', order_index: 1 },
          { id: 'chan-fiscal', name: 'Faturamento & Fiscal', description: 'Rejeições SEFAZ e regras tributárias', order_index: 2 },
          { id: 'chan-plantao', name: 'Plantão Técnico', description: 'Plantão de atendimento e alertas de incidentes', order_index: 3 },
        ];
        modified = true;
      }
      if (!parsed.messages) {
        parsed.messages = [];
        modified = true;
      }
      if (!parsed.mentions) {
        parsed.mentions = [];
        modified = true;
      }

      // Ensure SMTP config exists
      if (!parsed.smtp_config) {
        parsed.smtp_config = { ...DEFAULT_SMTP_CONFIG };
        modified = true;
      }

      // Ensure access profiles exist
      if (!parsed.access_profiles || parsed.access_profiles.length === 0) {
        parsed.access_profiles = JSON.parse(JSON.stringify(DEFAULT_ACCESS_PROFILES));
        modified = true;
      }

      // Ensure KB data exists in existing db
      if (!parsed.articles || parsed.articles.length === 0) {
        parsed.articles = JSON.parse(JSON.stringify(INITIAL_ARTICLES));
        modified = true;
      }
      if (!parsed.categories) {
        parsed.categories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
        modified = true;
      }
      if (!parsed.folders) {
        parsed.folders = JSON.parse(JSON.stringify(INITIAL_FOLDERS));
        modified = true;
      }
      if (!parsed.favorites) {
        parsed.favorites = [];
        modified = true;
      }

      // Ensure every article has valid module_id, module_name, keywords
      parsed.articles.forEach((art: Article) => {
        if (!art.module_id) {
          const matched = parsed.modules.find((m: SystemModule) =>
            m.name.toLowerCase() === (art.module_name || art.module || '').toLowerCase()
          );
          if (matched) {
            art.module_id = matched.id;
            art.module_name = matched.name;
            art.module = matched.name;
          } else if (parsed.modules.length > 0) {
            art.module_id = parsed.modules[0].id;
            art.module_name = parsed.modules[0].name;
            art.module = parsed.modules[0].name;
          }
          modified = true;
        } else {
          const matchedMod = parsed.modules.find((m: SystemModule) => m.id === art.module_id);
          if (matchedMod && art.module_name !== matchedMod.name) {
            art.module_name = matchedMod.name;
            art.module = matchedMod.name;
            modified = true;
          }
        }
        if (!art.keywords) {
          art.keywords = [...(art.tags || [])];
          modified = true;
        }
      });

      // Ensure the master administrator Gabriel Souza exists with password 281007Gg!
      const userGabriel = parsed.users.find(
        (u: ServerUser) => u.email.toLowerCase() === 'gabrielsouza@suasvendas.com'
      );
      if (!userGabriel) {
        const salt = generateSalt();
        const hash = hashPassword('281007Gg!', salt);
        parsed.users.unshift({
          id: 'usr-admin-gabriel',
          name: 'Gabriel Souza (Admin Principal)',
          email: 'gabrielsouza@suasvendas.com',
          role: 'ADMIN',
          department: 'Diretoria',
          profile_id: 'prof-admin',
          avatar_url: '',
          is_blocked: false,
          is_active: true,
          password_salt: salt,
          password_hash: hash,
          allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
          permissions: { ...DEFAULT_ADMIN_PERMISSIONS },
          created_at: new Date().toISOString(),
        });
        modified = true;
      } else {
        // Enforce admin role and unblocked state for Gabriel Souza
        if (userGabriel.role !== 'ADMIN' || userGabriel.is_blocked || userGabriel.is_active === false) {
          userGabriel.role = 'ADMIN';
          userGabriel.is_blocked = false;
          userGabriel.is_active = true;
          userGabriel.permissions = { ...DEFAULT_ADMIN_PERMISSIONS, ...(userGabriel.permissions || {}) };
          modified = true;
        }
      }

      // Ensure the user email manoelvilelaneto@gmail.com exists as Admin with password 281007Gg!
      const userManoel = parsed.users.find(
        (u: ServerUser) => u.email.toLowerCase() === 'manoelvilelaneto@gmail.com'
      );
      if (!userManoel) {
        const salt = generateSalt();
        const hash = hashPassword('281007Gg!', salt);
        parsed.users.push({
          id: 'usr-admin-primary',
          name: 'Manoel Vilela (Admin)',
          email: 'manoelvilelaneto@gmail.com',
          role: 'ADMIN',
          department: 'Diretoria',
          profile_id: 'prof-admin',
          avatar_url: '',
          is_blocked: false,
          is_active: true,
          password_salt: salt,
          password_hash: hash,
          allowed_menus: ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'],
          permissions: { ...DEFAULT_ADMIN_PERMISSIONS },
          created_at: new Date().toISOString(),
        });
        modified = true;
      } else {
        if (userManoel.role !== 'ADMIN' || userManoel.is_blocked || userManoel.is_active === false) {
          userManoel.role = 'ADMIN';
          userManoel.is_blocked = false;
          userManoel.is_active = true;
          userManoel.permissions = { ...DEFAULT_ADMIN_PERMISSIONS, ...(userManoel.permissions || {}) };
          modified = true;
        }
      }

      // Ensure all users have passwords, is_active, department, allowed_menus, and complete permissions
      parsed.users.forEach((u: ServerUser) => {
        if (!u.password_hash) {
          const s = generateSalt();
          u.password_salt = s;
          u.password_hash = hashPassword(u.role === 'ADMIN' ? '281007Gg!' : 'SuasVendas123!', s);
          modified = true;
        }
        if (u.is_active === undefined) {
          u.is_active = !u.is_blocked;
          modified = true;
        }
        if (!u.department) {
          u.department =
            u.role === 'ADMIN' ? 'Diretoria' :
            u.role === 'SUPERVISOR' ? 'Suporte' :
            u.role === 'TECH' ? 'Técnico' :
            u.role === 'COMMERCIAL' ? 'Comercial' : 'Suporte';
          modified = true;
        }
        if (!u.allowed_menus || u.allowed_menus.length === 0) {
          u.allowed_menus =
            u.role === 'ADMIN'
              ? ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS']
              : u.role === 'SUPERVISOR'
              ? ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'COLUMNS']
              : u.role === 'TECH'
              ? ['KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS']
              : u.role === 'COMMERCIAL'
              ? ['KB', 'CHAT', 'MENTIONS']
              : ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS'];
          modified = true;
        }
        if (!u.profile_id) {
          u.profile_id =
            u.role === 'ADMIN' ? 'prof-admin' :
            u.role === 'SUPERVISOR' ? 'prof-supervisor' :
            u.role === 'TECH' ? 'prof-tech' :
            u.role === 'COMMERCIAL' ? 'prof-commercial' : 'prof-support';
          modified = true;
        }

        // Fill default granular permissions for any missing boolean
        const basePerms =
          u.role === 'ADMIN' ? DEFAULT_ADMIN_PERMISSIONS :
          u.role === 'SUPERVISOR' ? DEFAULT_SUPERVISOR_PERMISSIONS :
          u.role === 'TECH' ? DEFAULT_TECH_PERMISSIONS :
          u.role === 'COMMERCIAL' ? DEFAULT_COMMERCIAL_PERMISSIONS : DEFAULT_SUPPORT_PERMISSIONS;

        u.permissions = {
          ...basePerms,
          ...(u.permissions || {}),
        };
      });

      if (modified) {
        writeDatabase(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  const initial = getInitialDatabase();
  writeDatabase(initial);
  return initial;
}

// Write database atomically
export function writeDatabase(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Sanitize user for public/client responses (strip password_hash and password_salt)
export function sanitizeUser(user: ServerUser): User {
  const { password_hash, password_salt, ...safeUser } = user;
  return safeUser;
}

// Compute dynamic stats
function computeStats(db: DatabaseSchema): SystemStats {
  const total_bugs = db.bugs.length;
  const resolvedColumn = db.columns.find((c) => c.is_resolved_stage)?.id || 'col-resolvido';
  const closedColumn = db.columns.find((c) => c.is_closed_stage)?.id || 'col-encerrado';

  const resolved_bugs = db.bugs.filter((b) => b.column_id === resolvedColumn).length;
  const closed_bugs = db.bugs.filter((b) => b.column_id === closedColumn).length;
  const open_bugs = db.bugs.filter((b) => b.column_id === 'col-novo').length;
  const in_progress_bugs = db.bugs.filter(
    (b) => b.column_id !== resolvedColumn && b.column_id !== closedColumn && b.column_id !== 'col-novo'
  ).length;

  const critical_bugs = db.bugs.filter(
    (b) => b.priority === 'CRITICAL' && b.column_id !== closedColumn
  ).length;

  const now = new Date().getTime();
  const overdue_bugs = db.bugs.filter((b) => {
    if (b.column_id === resolvedColumn || b.column_id === closedColumn) return false;
    if (!b.estimated_due_date) return false;
    return new Date(b.estimated_due_date).getTime() < now;
  }).length;

  let totalHours = 0;
  let countWithDates = 0;
  db.bugs.forEach((b) => {
    if (b.effective_resolution_date && b.created_at) {
      const created = new Date(b.created_at).getTime();
      const resolved = new Date(b.effective_resolution_date).getTime();
      const diffHours = (resolved - created) / (1000 * 60 * 60);
      if (diffHours >= 0) {
        totalHours += diffHours;
        countWithDates++;
      }
    }
  });
  const avg_resolution_hours = countWithDates > 0 ? Math.round((totalHours / countWithDates) * 10) / 10 : 24;

  const bugs_by_module = db.modules.map((m) => ({
    module_name: m.name,
    count: db.bugs.filter((b) => b.module_id === m.id).length,
    color: m.color,
  }));

  const bugs_by_priority = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => ({
    priority: p,
    count: db.bugs.filter((b) => b.priority === p).length,
  }));

  const bugs_by_status = db.columns.map((c) => ({
    column_name: c.name,
    count: db.bugs.filter((b) => b.column_id === c.id).length,
    color: c.color,
  }));

  const allHistory = db.bugs
    .flatMap((b) => b.history)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  return {
    total_bugs,
    open_bugs,
    in_progress_bugs,
    critical_bugs,
    overdue_bugs,
    resolved_bugs,
    closed_bugs,
    avg_resolution_hours,
    bugs_by_module,
    bugs_by_priority,
    bugs_by_status,
    recent_activity: allHistory,
  };
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'CONNECTED', payload: { message: 'Real-time WebSocket connection active' } }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      clients.delete(ws);
    });
  });

  // Broadcast event to all active clients
  function broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  app.use(express.json({ limit: '15mb' }));

  // ================= 1. AUTHENTICATION & SESSION ROUTES =================

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const db = readDatabase();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    if (user.is_blocked || user.is_active === false) {
      return res.status(403).json({ error: 'Acesso inativo ou bloqueado. Entre em contato com a administração da SuasVendas.' });
    }

    // Verify password with secure salt/hash
    const isValid = verifyPassword(password, user.password_salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas. Senha incorreta.' });
    }

    user.last_login_at = new Date().toISOString();
    writeDatabase(db);

    const token = createSession(user.id);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // Current session verify
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: 'Sessão expirada ou não autenticado.' });
    }

    const db = readDatabase();
    const user = db.users.find((u) => u.id === userId);
    if (!user || user.is_blocked || user.is_active === false) {
      return res.status(401).json({ error: 'Usuário não encontrado, inativo ou bloqueado.' });
    }

    res.json({ user: sanitizeUser(user) });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) activeSessions.delete(token);
    res.json({ success: true });
  });

  // ================= 3-STEP SECURE PASSWORD RECOVERY & REAL EMAIL (SMTP) =================

  // Step 1: Request recovery code & send email
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'O e-mail corporativo é obrigatório.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDatabase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail corporativo.' });
    }

    if (user.is_blocked || user.is_active === false) {
      return res.status(403).json({ error: 'Usuário inativo ou bloqueado. Entre em contato com a administração.' });
    }

    // Generate secure 6-digit verification code & pre-generate valid reset ticket
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const ticket = crypto.randomBytes(32).toString('hex');

    // Store in recovery store (valid for 15 minutes, max 5 attempts)
    passwordResetStore.set(cleanEmail, {
      email: cleanEmail,
      codeHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
      attempts: 0,
      ticket,
      ticketExpiresAt: Date.now() + 15 * 60 * 1000,
    });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const resetUrl = `${protocol}://${host}/?action=reset-password&token=${ticket}&email=${encodeURIComponent(cleanEmail)}`;

    console.log(`[AUTH] Código gerado para ${cleanEmail}: ${code} | Link direto: ${resetUrl}`);

    // Attempt real email delivery via Nodemailer
    const smtpConfig = db.smtp_config || DEFAULT_SMTP_CONFIG;
    let emailSent = false;
    let emailErr: string | undefined;

    if (smtpConfig && smtpConfig.is_configured && smtpConfig.user && smtpConfig.pass) {
      const mailResult = await sendRecoveryEmail(smtpConfig, cleanEmail, user.name, code, resetUrl);
      emailSent = mailResult.success;
      emailErr = mailResult.error;
    }

    // Return confirmation, dev fallback code, and 1-click link
    res.json({
      success: true,
      message: emailSent
        ? `Código de verificação enviado para ${cleanEmail}. Verifique sua caixa de entrada.`
        : `Código de verificação gerado com sucesso. ${emailErr ? `(Nota SMTP: ${emailErr})` : ''}`,
      email_sent: emailSent,
      dev_code: code,
      reset_url: resetUrl,
      expires_in_minutes: 15,
    });
  });

  // Verify direct 1-click token from email link
  app.get('/api/auth/verify-reset-token', (req, res) => {
    const email = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
    const token = req.query.token ? String(req.query.token).trim() : '';

    if (!email || !token) {
      return res.status(400).json({ error: 'Parâmetros email e token são obrigatórios.' });
    }

    const record = passwordResetStore.get(email);
    if (!record || !record.ticket || record.ticket !== token) {
      return res.status(400).json({ error: 'Token de recuperação inválido ou expirado.' });
    }

    if (!record.ticketExpiresAt || Date.now() > record.ticketExpiresAt) {
      passwordResetStore.delete(email);
      return res.status(400).json({ error: 'Token de recuperação expirado.' });
    }

    res.json({ success: true, email, message: 'Token válido para redefinição.' });
  });

  // Step 2: Verify 6-digit code and generate reset ticket
  app.post('/api/auth/verify-reset-code', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código de verificação são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    const record = passwordResetStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: 'Nenhuma solicitação de recuperação encontrada para este e-mail. Solicite um novo código.' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Código de verificação expirado (validade de 15 minutos excedida). Solicite um novo código.' });
    }

    // Rate limiting brute-force protection
    record.attempts += 1;
    if (record.attempts > 5) {
      passwordResetStore.delete(cleanEmail);
      return res.status(429).json({ error: 'Muitas tentativas inválidas. Por segurança, solicite um novo código de verificação.' });
    }

    const enteredHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (enteredHash !== record.codeHash) {
      return res.status(400).json({
        error: `Código incorreto. Você possui mais ${Math.max(0, 5 - record.attempts)} tentativa(s).`,
      });
    }

    // Return the pre-generated valid ticket
    if (!record.ticket) {
      record.ticket = crypto.randomBytes(32).toString('hex');
      record.ticketExpiresAt = Date.now() + 15 * 60 * 1000;
    }

    res.json({
      success: true,
      ticket: record.ticket,
      message: 'Código validado com sucesso! Agora você pode cadastrar sua nova senha.',
    });
  });

  // Step 3: Redefine password using valid ticket
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, ticket, new_password } = req.body;
    if (!email || !ticket || !new_password) {
      return res.status(400).json({ error: 'E-mail, ticket de validação e nova senha são obrigatórios.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = passwordResetStore.get(cleanEmail);

    if (!record || !record.ticket || record.ticket !== ticket) {
      return res.status(400).json({ error: 'Ticket de validação inválido. Reinicie o processo de recuperação.' });
    }

    if (!record.ticketExpiresAt || Date.now() > record.ticketExpiresAt) {
      passwordResetStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Ticket de validação expirado. Reinicie o processo de recuperação.' });
    }

    const db = readDatabase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Set new password with secure salt & PBKDF2 hash
    user.password_salt = generateSalt();
    user.password_hash = hashPassword(new_password, user.password_salt);
    writeDatabase(db);

    // Invalidate all active sessions for this user across all devices
    invalidateUserSessions(user.id);

    // Invalidate the recovery ticket immediately
    passwordResetStore.delete(cleanEmail);

    console.log(`[AUTH] Senha redefinida com sucesso para ${cleanEmail}. Sessões anteriores invalidadas.`);

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login com suas novas credenciais.',
    });
  });

  // ================= 2. BOOTSTRAP & STATS =================

  app.get('/api/bootstrap', (req, res) => {
    const authHeader = req.headers.authorization;
    let requesterUserId = req.query.user_id ? String(req.query.user_id) : null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const uid = getUserIdFromToken(authHeader.substring(7));
      if (uid) requesterUserId = uid;
    }

    const db = readDatabase();
    const stats = computeStats(db);

    // Filter channels so private chats only appear for their participants
    const visibleChannels = db.channels.filter((c) => {
      if (!c.is_private) return true;
      if (!requesterUserId) return false;
      return Array.isArray(c.participant_ids) && c.participant_ids.includes(requesterUserId);
    });

    res.json({
      users: db.users.map(sanitizeUser),
      modules: db.modules,
      columns: db.columns,
      bugs: db.bugs,
      notifications: db.notifications,
      channels: visibleChannels,
      articles: db.articles,
      categories: db.categories,
      folders: db.folders,
      favorites: db.favorites,
      stats,
    });
  });

  app.get('/api/stats', (req, res) => {
    const db = readDatabase();
    res.json(computeStats(db));
  });

  // ================= 3. CHAT & MENTIONS ROUTES =================

  // Get Channels (with participant-based privacy check)
  app.get('/api/chat/channels', (req, res) => {
    const authHeader = req.headers.authorization;
    let requesterUserId = req.query.user_id ? String(req.query.user_id) : null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const uid = getUserIdFromToken(authHeader.substring(7));
      if (uid) requesterUserId = uid;
    }

    const db = readDatabase();
    const visibleChannels = db.channels.filter((c) => {
      if (!c.is_private) return true;
      if (!requesterUserId) return false;
      return Array.isArray(c.participant_ids) && c.participant_ids.includes(requesterUserId);
    });

    res.json(visibleChannels);
  });

  // Create Custom Private Chat Channel
  app.post('/api/chat/channels', (req, res) => {
    const authHeader = req.headers.authorization;
    let creatorId = req.body.created_by;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const uid = getUserIdFromToken(authHeader.substring(7));
      if (uid) creatorId = uid;
    }

    const { name, description, participant_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da conversa é obrigatório.' });
    }

    const db = readDatabase();
    const creator = db.users.find((u) => u.id === creatorId);
    const participants = Array.from(
      new Set([...(Array.isArray(participant_ids) ? participant_ids : []), creatorId].filter(Boolean))
    );

    if (participants.length < 2) {
      return res.status(400).json({ error: 'Selecione pelo menos mais um participante para criar o chat.' });
    }

    const newChannel: ChatChannel = {
      id: `chan-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description?.trim() || `Conversa restrita com ${participants.length} participantes`,
      order_index: db.channels.length,
      is_private: true,
      participant_ids: participants,
      created_by: creatorId || undefined,
      created_at: new Date().toISOString(),
    };

    db.channels.push(newChannel);
    writeDatabase(db);
    broadcast('CHANNEL_CREATED', newChannel);

    res.status(201).json(newChannel);
  });

  // Delete Custom Chat Channel
  app.delete('/api/chat/channels/:id', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let authUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUserId = getUserIdFromToken(authHeader.substring(7));
    }
    if (!authUserId && typeof req.body?.user_id === 'string') {
      authUserId = req.body.user_id;
    }

    const systemChannelIds = ['chan-geral', 'chan-bugs', 'chan-fiscal', 'chan-plantao'];
    if (systemChannelIds.includes(id)) {
      return res.status(400).json({ error: 'Canais padrão do sistema não podem ser excluídos.' });
    }

    const db = readDatabase();
    const channelIndex = db.channels.findIndex((c) => c.id === id);
    if (channelIndex === -1) {
      return res.status(404).json({ error: 'Canal não encontrado.' });
    }

    const channel = db.channels[channelIndex];
    const requestingUser = db.users.find((u) => u.id === authUserId);

    // Permission check: must be ADMIN or creator of this channel
    const isAdmin = requestingUser?.role === 'ADMIN' || requestingUser?.permissions?.can_delete_channels;
    const isCreator = channel.created_by && channel.created_by === authUserId;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Apenas o criador da conversa ou um Administrador pode excluir este chat.' });
    }

    // Remove channel
    db.channels.splice(channelIndex, 1);

    // Clean up messages and mentions belonging to this channel
    const removedMessages = db.messages.filter((m) => m.channel_id === id);
    db.messages = db.messages.filter((m) => m.channel_id !== id);
    db.mentions = db.mentions.filter((m) => m.channel_id !== id);

    writeDatabase(db);
    broadcast('CHANNEL_DELETED', { id, name: channel.name, removed_messages_count: removedMessages.length });
    res.json({ success: true, id, message: `Conversa "${channel.name}" excluída com sucesso.` });
  });

  // ================= 15.1 EDIT CHAT CHANNEL PARTICIPANTS (ADMIN ONLY) =================
  app.put('/api/chat/channels/:id/participants', (req, res) => {
    const { id } = req.params;
    const { participant_ids } = req.body;
    const authHeader = req.headers.authorization;
    let authUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUserId = getUserIdFromToken(authHeader.substring(7));
    }
    if (!authUserId && typeof req.body?.user_id === 'string') {
      authUserId = req.body.user_id;
    }

    const db = readDatabase();
    const requestingUser = db.users.find((u) => u.id === authUserId);

    // Section 15.1 strictly enforces: "A edição dos participantes deverá ser permitida somente ao administrador do sistema."
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas o administrador do sistema pode editar os participantes da conversa.' });
    }

    const channel = db.channels.find((c) => c.id === id);
    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado.' });
    }

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'A lista de participantes não pode ficar vazia.' });
    }

    // Sanitize participant IDs and retain channel creator / admin
    const sanitizedParticipants = Array.from(new Set(participant_ids.filter(Boolean)));

    channel.participant_ids = sanitizedParticipants;
    channel.is_private = true; // custom channels with participant filtering are private
    writeDatabase(db);

    broadcast('CHANNEL_PARTICIPANTS_UPDATED', {
      id: channel.id,
      participant_ids: channel.participant_ids,
      channel,
    });
    broadcast('CHANNEL_UPDATED', channel);

    res.json({
      success: true,
      channel,
      message: `Participantes da conversa "${channel.name}" atualizados com sucesso.`,
    });
  });

  // Get Messages (with participant authorization for private channels)
  app.get('/api/chat/messages', (req, res) => {
    const { channel_id } = req.query;
    const authHeader = req.headers.authorization;
    let requesterUserId = req.query.user_id ? String(req.query.user_id) : null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const uid = getUserIdFromToken(authHeader.substring(7));
      if (uid) requesterUserId = uid;
    }

    const db = readDatabase();

    // Verify channel permission if channel_id is provided
    if (channel_id) {
      const channel = db.channels.find((c) => c.id === channel_id);
      if (channel && channel.is_private) {
        if (!requesterUserId || !channel.participant_ids?.includes(requesterUserId)) {
          return res.status(403).json({ error: 'Acesso negado. Você não é participante desta conversa restrita.' });
        }
      }
    }

    let msgs = db.messages;
    if (channel_id) {
      msgs = msgs.filter((m) => m.channel_id === channel_id);
    }
    res.json(msgs);
  });

  // Send Chat Message & Extract Mentions
  app.post('/api/chat/messages', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUserId = getUserIdFromToken(authHeader.substring(7));
    }
    const sender_id = req.body.sender_id || authUserId;
    const { channel_id, content, attachments, mentions } = req.body;

    if (!content || !channel_id || !sender_id) {
      return res.status(400).json({ error: 'Canal, remetente e conteúdo são obrigatórios.' });
    }

    const db = readDatabase();
    const channel = db.channels.find((c) => c.id === channel_id);
    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado.' });
    }

    // Backend participant security check: if private, sender must be in participant_ids
    if (channel.is_private && (!channel.participant_ids || !channel.participant_ids.includes(sender_id))) {
      return res.status(403).json({ error: 'Acesso negado. Apenas participantes selecionados podem enviar mensagens nesta conversa.' });
    }

    const senderUser = db.users.find((u) => u.id === sender_id);
    const sender_name = req.body.sender_name || senderUser?.name || 'Membro da Equipe';
    const sender_role = req.body.sender_role || senderUser?.role || 'SUPPORT';
    const channelName = channel?.name || 'Chat';

    // Auto-detect any mentions in text if not explicitly sent: e.g. @Name
    const mentionedUserIds: string[] = Array.isArray(mentions) ? [...mentions] : [];
    // Auto-detect @todos or @all broadcast
    if (/@(todos|all)/i.test(content)) {
      db.users.forEach((u) => {
        if (!u.is_blocked && u.id !== sender_id && !mentionedUserIds.includes(u.id)) {
          mentionedUserIds.push(u.id);
        }
      });
    }

    // Parse content for @[User Name] or @Name patterns
    db.users.forEach((u) => {
      const escapedName = u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}`, 'i');
      if (regex.test(content) && !mentionedUserIds.includes(u.id)) {
        mentionedUserIds.push(u.id);
      }
    });

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      channel_id,
      sender_id,
      sender_name: sender_name || 'Usuário',
      sender_role: sender_role || 'SUPPORT',
      content,
      mentions: mentionedUserIds,
      attachments: attachments || [],
      created_at: new Date().toISOString(),
    };

    db.messages.push(newMsg);

    // Create user mention records for each mentioned user (excluding sender)
    mentionedUserIds.forEach((mUserId) => {
      if (mUserId !== sender_id) {
        const mentionRecord: UserMention = {
          id: `men-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: mUserId,
          message_id: msgId,
          channel_id,
          channel_name: channelName,
          sender_id,
          sender_name: newMsg.sender_name,
          sender_role: newMsg.sender_role,
          content: newMsg.content,
          attachments: newMsg.attachments,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        db.mentions.unshift(mentionRecord);
        broadcast('MENTION_CREATED', mentionRecord);
      }
    });

    writeDatabase(db);
    broadcast('CHAT_MESSAGE_CREATED', newMsg);
    res.status(201).json(newMsg);
  });

  // Get user's mentions
  app.get('/api/chat/mentions', (req, res) => {
    const { user_id, unread_only } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório.' });

    const db = readDatabase();
    let userMentions = db.mentions.filter((m) => m.user_id === user_id);
    if (unread_only === 'true') {
      userMentions = userMentions.filter((m) => !m.is_read);
    }
    res.json(userMentions);
  });

  // Mark mention as read
  app.put('/api/chat/mentions/:id/read', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const mention = db.mentions.find((m) => m.id === id);
    if (mention) mention.is_read = true;
    writeDatabase(db);
    res.json({ success: true, id });
  });

  // Mark all user mentions read
  app.put('/api/chat/mentions/read-all', (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório.' });

    const db = readDatabase();
    db.mentions.forEach((m) => {
      if (m.user_id === user_id) m.is_read = true;
    });
    writeDatabase(db);
    broadcast('MENTIONS_READ_ALL', { user_id });
    res.json({ success: true });
  });

  // ================= 4. KANBAN COLUMNS PERSONALIZATION & SAFE MIGRATION =================

  app.get('/api/columns', (req, res) => {
    const db = readDatabase();
    res.json(db.columns.sort((a, b) => a.order_index - b.order_index));
  });

  app.post('/api/columns', (req, res) => {
    const { name, color, is_resolved_stage, is_closed_stage } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da coluna é obrigatório' });

    const db = readDatabase();
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}`,
      name,
      color: color || '#3B82F6',
      order_index: db.columns.length,
      is_resolved_stage: !!is_resolved_stage,
      is_closed_stage: !!is_closed_stage,
      is_archived: false,
    };
    db.columns.push(newCol);
    writeDatabase(db);
    broadcast('COLUMN_CREATED', newCol);
    res.status(201).json(newCol);
  });

  app.put('/api/columns/:id', (req, res) => {
    const { id } = req.params;
    const { name, color, order_index, is_resolved_stage, is_closed_stage, is_archived } = req.body;
    const db = readDatabase();
    const col = db.columns.find((c) => c.id === id);
    if (!col) return res.status(404).json({ error: 'Coluna não encontrada' });

    if (name !== undefined) col.name = name;
    if (color !== undefined) col.color = color;
    if (order_index !== undefined) col.order_index = order_index;
    if (is_resolved_stage !== undefined) col.is_resolved_stage = is_resolved_stage;
    if (is_closed_stage !== undefined) col.is_closed_stage = is_closed_stage;
    if (is_archived !== undefined) col.is_archived = is_archived;

    writeDatabase(db);
    broadcast('COLUMN_UPDATED', col);
    res.json(col);
  });

  app.put('/api/columns-reorder', (req, res) => {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids)) return res.status(400).json({ error: 'ordered_ids inválido' });

    const db = readDatabase();
    ordered_ids.forEach((id: string, index: number) => {
      const col = db.columns.find((c) => c.id === id);
      if (col) col.order_index = index;
    });
    writeDatabase(db);
    broadcast('COLUMNS_REORDERED', db.columns);
    res.json(db.columns);
  });

  // Delete column with safe bug migration protection
  app.delete('/api/columns/:id', (req, res) => {
    const { id } = req.params;
    const { target_column_id } = req.body || {};
    const db = readDatabase();

    const col = db.columns.find((c) => c.id === id);
    if (!col) return res.status(404).json({ error: 'Coluna não encontrada' });

    const linkedBugs = db.bugs.filter((b) => b.column_id === id);

    if (linkedBugs.length > 0) {
      if (!target_column_id) {
        return res.status(400).json({
          error: `Esta coluna contém ${linkedBugs.length} bug(s). Selecione uma coluna de destino para mover os registros antes de remover.`,
          requires_migration: true,
          bug_count: linkedBugs.length,
        });
      }

      const targetCol = db.columns.find((c) => c.id === target_column_id && c.id !== id);
      if (!targetCol) {
        return res.status(400).json({ error: 'Coluna de destino para migração inválida.' });
      }

      // Safe migration: move all bugs to the target column
      linkedBugs.forEach((b) => {
        b.column_id = target_column_id;
        b.history.unshift({
          id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          bug_id: b.id,
          user_id: 'usr-admin',
          user_name: 'Administrador (Migração)',
          user_role: 'ADMIN',
          field_changed: 'column_id',
          old_value: col.name,
          new_value: targetCol.name,
          description: `Coluna "${col.name}" excluída. Registro migrado automaticamente para "${targetCol.name}".`,
          created_at: new Date().toISOString(),
        });
      });
      broadcast('BUGS_MIGRATED', { source_column_id: id, target_column_id, moved_count: linkedBugs.length });
    }

    db.columns = db.columns.filter((c) => c.id !== id);
    writeDatabase(db);
    broadcast('COLUMN_DELETED', { id });
    res.json({ success: true, id, migrated_count: linkedBugs.length });
  });

  // ================= 5. MODULES MANAGEMENT =================

  app.get('/api/modules', (req, res) => {
    const db = readDatabase();
    res.json(db.modules.sort((a, b) => a.order_index - b.order_index));
  });

  app.post('/api/modules', (req, res) => {
    const { name, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do módulo é obrigatório' });

    const db = readDatabase();
    const newModule: SystemModule = {
      id: `mod-${Date.now()}`,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
      name,
      description: description || '',
      color: color || '#2563EB',
      icon: icon || 'Layers',
      order_index: db.modules.length,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.modules.push(newModule);
    writeDatabase(db);
    broadcast('MODULE_CREATED', newModule);
    res.status(201).json(newModule);
  });

  app.put('/api/modules/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, color, icon, order_index, is_archived } = req.body;

    const db = readDatabase();
    const mod = db.modules.find((m) => m.id === id);
    if (!mod) return res.status(404).json({ error: 'Módulo não encontrado' });

    if (name !== undefined) mod.name = name;
    if (description !== undefined) mod.description = description;
    if (color !== undefined) mod.color = color;
    if (icon !== undefined) mod.icon = icon;
    if (order_index !== undefined) mod.order_index = order_index;
    if (is_archived !== undefined) mod.is_archived = is_archived;
    mod.updated_at = new Date().toISOString();

    if (name) {
      db.bugs.forEach((b) => {
        if (b.module_id === id) b.module_name = name;
      });
      db.articles.forEach((a) => {
        if (a.module_id === id) {
          a.module_name = name;
          a.module = name;
        }
      });
    }

    writeDatabase(db);
    broadcast('MODULE_UPDATED', mod);
    res.json(mod);
  });

  app.delete('/api/modules/:id', (req, res) => {
    const { id } = req.params;
    const { target_module_id } = req.body || {};
    const db = readDatabase();

    const mod = db.modules.find((m) => m.id === id);
    if (!mod) return res.status(404).json({ error: 'Módulo não encontrado' });

    const associatedBugs = db.bugs.filter((b) => b.module_id === id);
    const associatedArticles = db.articles.filter((a) => a.module_id === id);

    if ((associatedBugs.length > 0 || associatedArticles.length > 0) && !target_module_id) {
      return res.status(400).json({
        error: `Não é possível excluir o módulo "${mod.name}" pois existem ${associatedBugs.length} bug(s) e ${associatedArticles.length} artigo(s) vinculados a ele. Selecione um módulo de destino para migrar os registros ou arquive o módulo.`,
        associated_bugs_count: associatedBugs.length,
        associated_articles_count: associatedArticles.length,
      });
    }

    if (target_module_id) {
      const targetMod = db.modules.find((m) => m.id === target_module_id);
      if (!targetMod) {
        return res.status(400).json({ error: 'Módulo de destino para migração não encontrado.' });
      }
      associatedBugs.forEach((b) => {
        b.module_id = targetMod.id;
        b.module_name = targetMod.name;
      });
      associatedArticles.forEach((a) => {
        a.module_id = targetMod.id;
        a.module_name = targetMod.name;
        a.module = targetMod.name;
      });
    }

    db.modules = db.modules.filter((m) => m.id !== id);
    writeDatabase(db);
    broadcast('MODULE_DELETED', { id, target_module_id });
    res.json({
      success: true,
      id,
      migrated_bugs: associatedBugs.length,
      migrated_articles: associatedArticles.length,
    });
  });

  // ================= 6. USERS & CREDENTIALS MANAGEMENT =================

  app.get('/api/users', (req, res) => {
    const db = readDatabase();
    res.json(db.users.map(sanitizeUser));
  });

  app.post('/api/users', (req, res) => {
    const authHeader = req.headers.authorization;
    let requesterId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      requesterId = getUserIdFromToken(authHeader.substring(7));
    }
    const db = readDatabase();
    const requester = db.users.find((u) => u.id === requesterId);
    if (requester && requester.role !== 'ADMIN' && !requester.permissions?.can_manage_users) {
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar novos usuários.' });
    }

    const {
      name,
      email,
      role,
      department,
      profile_id,
      password,
      permissions,
      allowed_menus,
      is_active,
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Nome, email e papel/função são obrigatórios.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'Já existe um usuário com este e-mail corporativo.' });
    }

    const salt = generateSalt();
    const userPass = password && password.trim() ? password.trim() : 'SuasVendas123!';
    const passHash = hashPassword(userPass, salt);

    // Compute base permissions from role or profile
    const basePerms =
      role === 'ADMIN' ? DEFAULT_ADMIN_PERMISSIONS :
      role === 'SUPERVISOR' ? DEFAULT_SUPERVISOR_PERMISSIONS :
      role === 'TECH' ? DEFAULT_TECH_PERMISSIONS :
      role === 'COMMERCIAL' ? DEFAULT_COMMERCIAL_PERMISSIONS : DEFAULT_SUPPORT_PERMISSIONS;

    const baseMenus: AppMenuKey[] =
      role === 'ADMIN' ? ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'MODULES', 'COLUMNS', 'USERS', 'SETTINGS'] :
      role === 'SUPERVISOR' ? ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS', 'COLUMNS'] :
      role === 'TECH' ? ['KANBAN', 'KB', 'CHAT', 'MENTIONS', 'ALGORITHMS'] :
      role === 'COMMERCIAL' ? ['KB', 'CHAT', 'MENTIONS'] :
      ['DASHBOARD', 'KANBAN', 'KB', 'CHAT', 'MENTIONS'];

    const newUser: ServerUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      department: department?.trim() || (role === 'COMMERCIAL' ? 'Comercial' : 'Suporte'),
      profile_id: profile_id || (role === 'COMMERCIAL' ? 'prof-commercial' : 'prof-support'),
      avatar_url: '',
      is_blocked: false,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      password_salt: salt,
      password_hash: passHash,
      allowed_menus: Array.isArray(allowed_menus) && allowed_menus.length > 0 ? allowed_menus : baseMenus,
      permissions: { ...basePerms, ...(permissions || {}) },
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDatabase(db);
    broadcast('USER_CREATED', sanitizeUser(newUser));
    res.status(201).json(sanitizeUser(newUser));
  });

  // Update personal profile (User self-service: Name, Email, Avatar, Theme, Password)
  app.put("/api/users/profile", (req, res) => {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token && typeof req.body.token === "string") {
      token = req.body.token;
    }
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Sessão inválida ou não autenticada." });
    }

    const { name, email, avatar_url, theme_preference, current_password, new_password } = req.body;
    const db = readDatabase();
    const user = db.users.find((u) => u.id === userId);

    if (!user || user.is_blocked || user.is_active === false) {
      return res.status(401).json({ error: "Usuário não encontrado, inativo ou bloqueado." });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Nome de exibição não pode ser vazio." });
      }
      user.name = name.trim();
    }

    if (email !== undefined && typeof email === "string" && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Formato de e-mail inválido." });
      }
      const existingUser = db.users.find((u) => u.id !== userId && u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Este e-mail já está sendo utilizado por outro usuário." });
      }
      user.email = cleanEmail;
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url === "string") {
        user.avatar_url = avatar_url;
      }
    }

    if (theme_preference === "light" || theme_preference === "dark") {
      user.theme_preference = theme_preference;
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: "Informe a senha atual para definir uma nova senha." });
      }
      const isCurrentValid = verifyPassword(current_password, user.password_salt, user.password_hash);
      if (!isCurrentValid) {
        return res.status(400).json({ error: "Senha atual incorreta." });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres." });
      }
      user.password_salt = generateSalt();
      user.password_hash = hashPassword(new_password.trim(), user.password_salt);
    }

    writeDatabase(db);
    broadcast("USER_UPDATED", sanitizeUser(user));
    res.json({
      success: true,
      user: sanitizeUser(user),
      message: "Perfil atualizado com sucesso!",
    });
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const {
      name,
      email,
      role,
      department,
      profile_id,
      is_blocked,
      is_active,
      allowed_menus,
      permissions,
      new_password,
    } = req.body;

    const db = readDatabase();
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Section 13.6 - Master admin protection
    const isMasterAdmin = MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase());

    if (isMasterAdmin && (is_blocked === true || is_active === false)) {
      return res.status(400).json({ error: 'O Administrador principal do sistema não pode ser desativado ou bloqueado.' });
    }

    if (isMasterAdmin && role && role !== 'ADMIN') {
      return res.status(400).json({ error: 'A conta de Administrador principal não pode ser rebaixada.' });
    }

    if (name !== undefined && typeof name === 'string' && name.trim()) user.name = name.trim();
    if (email !== undefined && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      if (!isMasterAdmin) user.email = cleanEmail;
    }
    if (role !== undefined && !isMasterAdmin) user.role = role;
    if (department !== undefined) user.department = department;
    if (profile_id !== undefined) user.profile_id = profile_id;
    if (is_blocked !== undefined && !isMasterAdmin) user.is_blocked = Boolean(is_blocked);
    if (is_active !== undefined && !isMasterAdmin) user.is_active = Boolean(is_active);
    if (Array.isArray(allowed_menus)) user.allowed_menus = allowed_menus;
    if (permissions !== undefined) user.permissions = { ...user.permissions, ...permissions };

    if (new_password && typeof new_password === 'string' && new_password.trim().length >= 6) {
      user.password_salt = generateSalt();
      user.password_hash = hashPassword(new_password.trim(), user.password_salt);
      invalidateUserSessions(user.id);
    }

    writeDatabase(db);
    broadcast('USER_UPDATED', sanitizeUser(user));
    res.json(sanitizeUser(user));
  });

  // Delete user (Admin only with Master Admin protection)
  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let requesterId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      requesterId = getUserIdFromToken(authHeader.substring(7));
    }

    const db = readDatabase();
    const requester = db.users.find((u) => u.id === requesterId);

    // Verify requester permission if authenticated
    if (requester && requester.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir usuários.' });
    }

    // Prevent self-deletion
    if (requesterId && requesterId === id) {
      return res.status(400).json({ error: 'Você não pode excluir a sua própria conta de administrador.' });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Protect primary admin accounts (Section 13.6)
    if (MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.id === 'usr-admin-primary' || user.id === 'usr-admin-gabriel') {
      return res.status(400).json({ error: 'O Administrador principal do sistema não pode ser excluído.' });
    }

    // Invalidate any active session for the deleted user
    for (const [token, sess] of activeSessions.entries()) {
      if (sess.userId === id) {
        activeSessions.delete(token);
      }
    }

    // Preserve historical integrity: unassign from active bugs without removing bug records
    db.bugs.forEach((b) => {
      if (b.assignee_id === id) {
        b.assignee_id = null;
        b.assignee_name = null;
      }
      if (b.supervisor_id === id) {
        b.supervisor_id = null;
        b.supervisor_name = null;
      }
    });

    db.users = db.users.filter((u) => u.id !== id);
    writeDatabase(db);
    broadcast('USER_DELETED', { id });
    return res.json({ success: true, id, message: `Conta do usuário ${user.name} excluída com sucesso.` });
  });

  // ================= ACCESS PROFILES MANAGEMENT =================
  app.get('/api/admin/profiles', (req, res) => {
    const db = readDatabase();
    res.json(db.access_profiles || DEFAULT_ACCESS_PROFILES);
  });

  app.post('/api/admin/profiles', (req, res) => {
    const { name, description, role, allowed_menus, permissions } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do perfil de acesso é obrigatório.' });
    }
    const db = readDatabase();
    if (!db.access_profiles) db.access_profiles = JSON.parse(JSON.stringify(DEFAULT_ACCESS_PROFILES));

    const newProfile: AccessProfile = {
      id: `prof-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      role: role || 'CUSTOM',
      is_system: false,
      allowed_menus: Array.isArray(allowed_menus) ? allowed_menus : ['DASHBOARD', 'KB', 'CHAT', 'MENTIONS'],
      permissions: permissions || DEFAULT_SUPPORT_PERMISSIONS,
    };

    db.access_profiles.push(newProfile);
    writeDatabase(db);
    broadcast('PROFILE_CREATED', newProfile);
    res.status(201).json(newProfile);
  });

  app.put('/api/admin/profiles/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, role, allowed_menus, permissions } = req.body;
    const db = readDatabase();
    if (!db.access_profiles) db.access_profiles = JSON.parse(JSON.stringify(DEFAULT_ACCESS_PROFILES));

    const prof = db.access_profiles.find((p) => p.id === id);
    if (!prof) return res.status(404).json({ error: 'Perfil de acesso não encontrado.' });

    if (name) prof.name = name.trim();
    if (description !== undefined) prof.description = description.trim();
    if (role) prof.role = role;
    if (Array.isArray(allowed_menus)) prof.allowed_menus = allowed_menus;
    if (permissions) prof.permissions = { ...prof.permissions, ...permissions };

    writeDatabase(db);
    broadcast('PROFILE_UPDATED', prof);
    res.json(prof);
  });

  app.delete('/api/admin/profiles/:id', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    if (!db.access_profiles) db.access_profiles = JSON.parse(JSON.stringify(DEFAULT_ACCESS_PROFILES));

    const prof = db.access_profiles.find((p) => p.id === id);
    if (!prof) return res.status(404).json({ error: 'Perfil não encontrado.' });
    if (prof.is_system) {
      return res.status(400).json({ error: 'Perfis de sistema nativos não podem ser excluídos.' });
    }

    db.access_profiles = db.access_profiles.filter((p) => p.id !== id);
    writeDatabase(db);
    broadcast('PROFILE_DELETED', { id });
    res.json({ success: true, id, message: `Perfil "${prof.name}" excluído com sucesso.` });
  });

  // ================= SMTP SERVER CONFIG & TESTING =================
  app.get('/api/admin/smtp', (req, res) => {
    const db = readDatabase();
    const cfg = db.smtp_config || DEFAULT_SMTP_CONFIG;
    // Mask password when sending to UI
    res.json({
      ...cfg,
      pass_masked: cfg.pass ? '••••••••' : '',
    });
  });

  app.put('/api/admin/smtp', (req, res) => {
    const { host, port, secure, user, pass, from_name, from_email } = req.body;
    const db = readDatabase();
    const current = db.smtp_config || DEFAULT_SMTP_CONFIG;

    db.smtp_config = {
      host: host !== undefined ? host.trim() : current.host,
      port: port !== undefined ? Number(port) : current.port,
      secure: secure !== undefined ? Boolean(secure) : current.secure,
      user: user !== undefined ? user.trim() : current.user,
      pass: pass !== undefined && pass !== '••••••••' && pass !== '' ? pass.trim() : current.pass,
      from_name: from_name !== undefined ? from_name.trim() : current.from_name,
      from_email: from_email !== undefined ? from_email.trim() : current.from_email,
      is_configured: Boolean((user || current.user) && (pass || current.pass)),
      updated_at: new Date().toISOString(),
    };

    writeDatabase(db);
    broadcast('SMTP_CONFIG_UPDATED', { success: true });
    res.json({ success: true, message: 'Configurações SMTP atualizadas com sucesso!', config: db.smtp_config });
  });

  app.post('/api/admin/smtp/test', async (req, res) => {
    const { to_email, host, port, secure, user, pass, from_name, from_email } = req.body;
    if (!to_email || !to_email.trim()) {
      return res.status(400).json({ error: 'Informe um endereço de e-mail de teste de destino.' });
    }

    const db = readDatabase();
    const current = db.smtp_config || DEFAULT_SMTP_CONFIG;

    const testConfig: SmtpConfig = {
      host: host || current.host,
      port: port ? Number(port) : current.port,
      secure: secure !== undefined ? Boolean(secure) : current.secure,
      user: user || current.user,
      pass: pass && pass !== '••••••••' ? pass : current.pass,
      from_name: from_name || current.from_name || 'Suporte SuasVendas',
      from_email: from_email || current.from_email || 'suporte@suasvendas.com',
      is_configured: true,
    };

    const hostReq = req.get('host') || 'localhost:3000';
    const protoReq = req.protocol || 'http';
    const sampleLink = `${protoReq}://${hostReq}/?action=test-smtp`;

    const result = await sendRecoveryEmail(
      testConfig,
      to_email.trim(),
      'Administrador SuasVendas',
      '999888',
      sampleLink
    );

    if (result.success) {
      res.json({ success: true, message: `E-mail de teste enviado com sucesso para ${to_email}!` });
    } else {
      res.status(500).json({ error: `Falha no envio de teste SMTP: ${result.error}` });
    }
  });

  // ================= 7. BUGS & KANBAN ROUTES =================

  app.get('/api/bugs', (req, res) => {
    const db = readDatabase();
    res.json(db.bugs);
  });

  app.get('/api/bugs/:id', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });
    res.json(bug);
  });

  app.post('/api/bugs', (req, res) => {
    const {
      title,
      description,
      module_id,
      priority,
      reporter_id,
      reporter_name,
      estimated_due_date,
      customer_name,
      customer_email,
      attachments,
    } = req.body;

    if (!title || !description || !module_id) {
      return res.status(400).json({ error: 'Título, descrição e módulo são obrigatórios' });
    }

    const db = readDatabase();
    const mod = db.modules.find((m) => m.id === module_id);
    const nextCodeNum = 1040 + db.bugs.length + 1;
    const bugCode = `SV-${nextCodeNum}`;
    const bugId = `bug-${Date.now()}`;
    const initialColumn = db.columns[0]?.id || 'col-novo';

    const newBug: Bug = {
      id: bugId,
      code: bugCode,
      title,
      description,
      module_id,
      module_name: mod?.name || 'Geral',
      column_id: initialColumn,
      priority: priority || 'MEDIUM',
      reporter_id: reporter_id || 'usr-anon',
      reporter_name: reporter_name || 'Membro da Equipe',
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      assignee_id: null,
      assignee_name: null,
      supervisor_id: null,
      supervisor_name: null,
      estimated_due_date: estimated_due_date || null,
      effective_resolution_date: null,
      solution_applied: null,
      technical_notes: null,
      attachments: attachments || [],
      comments: [],
      history: [
        {
          id: `h-${Date.now()}`,
          bug_id: bugId,
          user_id: reporter_id || 'usr-anon',
          user_name: reporter_name || 'Membro da Equipe',
          user_role: 'SUPPORT',
          field_changed: 'status',
          old_value: 'Nenhum',
          new_value: 'Novo bug',
          description: `Bug registrado no módulo ${mod?.name || 'Geral'}.`,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_reopened: false,
    };

    db.bugs.unshift(newBug);

    const notif: BugNotification = {
      id: `notif-${Date.now()}`,
      recipient_user_id: 'ALL',
      type: 'NEW_BUG',
      title: `Novo Bug: ${bugCode}`,
      message: `${newBug.reporter_name} registrou "${title}" no módulo ${newBug.module_name}.`,
      bug_id: bugId,
      bug_code: bugCode,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.unshift(notif);

    writeDatabase(db);
    broadcast('BUG_CREATED', newBug);
    broadcast('NOTIFICATION_CREATED', notif);
    res.status(201).json(newBug);
  });

  app.put('/api/bugs/:id/move', (req, res) => {
    const { id } = req.params;
    const { target_column_id, user_id, user_name, user_role } = req.body;

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const oldColumn = db.columns.find((c) => c.id === bug.column_id);
    const newColumn = db.columns.find((c) => c.id === target_column_id);

    if (!newColumn) return res.status(400).json({ error: 'Coluna de destino inválida' });

    bug.column_id = target_column_id;
    bug.updated_at = new Date().toISOString();

    const historyEntry: BugHistoryEntry = {
      id: `h-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Membro da Equipe',
      user_role: user_role || 'SUPPORT',
      field_changed: 'status',
      old_value: oldColumn?.name || bug.column_id,
      new_value: newColumn.name,
      description: `Movido de "${oldColumn?.name}" para "${newColumn.name}".`,
      created_at: new Date().toISOString(),
    };
    bug.history.unshift(historyEntry);

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    res.json(bug);
  });

  app.put('/api/bugs/:id', (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      module_id,
      priority,
      assignee_id,
      supervisor_id,
      estimated_due_date,
      technical_notes,
      user_id,
      user_name,
      user_role,
    } = req.body;

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const historyEntries: BugHistoryEntry[] = [];
    const recordChange = (field: string, oldVal: string, newVal: string, desc: string) => {
      if (oldVal !== newVal) {
        historyEntries.push({
          id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          bug_id: bug.id,
          user_id: user_id || 'usr-anon',
          user_name: user_name || 'Membro da Equipe',
          user_role: user_role || 'SUPPORT',
          field_changed: field,
          old_value: oldVal || 'Não definido',
          new_value: newVal || 'Não definido',
          description: desc,
          created_at: new Date().toISOString(),
        });
      }
    };

    if (title && title !== bug.title) {
      recordChange('title', bug.title, title, `Título alterado para "${title}"`);
      bug.title = title;
    }

    if (description && description !== bug.description) {
      recordChange('description', 'Anterior', 'Atualizada', 'Descrição do problema atualizada');
      bug.description = description;
    }

    if (module_id && module_id !== bug.module_id) {
      const newMod = db.modules.find((m) => m.id === module_id);
      recordChange('module', bug.module_name, newMod?.name || module_id, `Módulo alterado para ${newMod?.name}`);
      bug.module_id = module_id;
      bug.module_name = newMod?.name || bug.module_name;
    }

    if (priority && priority !== bug.priority) {
      recordChange('priority', bug.priority, priority, `Prioridade alterada para ${priority}`);
      bug.priority = priority;
    }

    if (assignee_id !== undefined && assignee_id !== bug.assignee_id) {
      const newAssignee = db.users.find((u) => u.id === assignee_id);
      recordChange('assignee', bug.assignee_name || 'Não atribuído', newAssignee?.name || 'Não atribuído', `Responsável atribuído: ${newAssignee?.name}`);
      bug.assignee_id = assignee_id;
      bug.assignee_name = newAssignee?.name || null;

      if (newAssignee) {
        const notif: BugNotification = {
          id: `notif-${Date.now()}`,
          recipient_user_id: newAssignee.id,
          type: 'ASSIGNED',
          title: `Bug Atribuído: ${bug.code}`,
          message: `Você foi definido como responsável pela resolução de "${bug.title}".`,
          bug_id: bug.id,
          bug_code: bug.code,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        db.notifications.unshift(notif);
        broadcast('NOTIFICATION_CREATED', notif);
      }
    }

    if (supervisor_id !== undefined && supervisor_id !== bug.supervisor_id) {
      const newSup = db.users.find((u) => u.id === supervisor_id);
      recordChange('supervisor', bug.supervisor_name || 'Não definido', newSup?.name || 'Não definido', `Supervisor definido: ${newSup?.name}`);
      bug.supervisor_id = supervisor_id;
      bug.supervisor_name = newSup?.name || null;
    }

    if (estimated_due_date !== undefined && estimated_due_date !== bug.estimated_due_date) {
      recordChange('estimated_due_date', bug.estimated_due_date || 'Sem prazo', estimated_due_date || 'Sem prazo', `Prazo estimado alterado`);
      bug.estimated_due_date = estimated_due_date;
    }

    if (req.body.customer_name !== undefined) {
      recordChange('customer_name', bug.customer_name || '', req.body.customer_name || '', 'Nome do cliente atualizado');
      bug.customer_name = req.body.customer_name || null;
    }
    if (req.body.customer_email !== undefined) {
      recordChange('customer_email', bug.customer_email || '', req.body.customer_email || '', 'E-mail do cliente atualizado');
      bug.customer_email = req.body.customer_email || null;
    }
    if (technical_notes !== undefined) {
      bug.technical_notes = technical_notes;
    }

    bug.history = [...historyEntries, ...bug.history];
    bug.updated_at = new Date().toISOString();

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    res.json(bug);
  });

  app.post('/api/bugs/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { solution_applied, technical_notes, user_id, user_name, user_role } = req.body;

    if (!solution_applied) {
      return res.status(400).json({ error: 'A descrição da solução aplicada é obrigatória.' });
    }

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const resolvedCol = db.columns.find((c) => c.is_resolved_stage)?.id || 'col-resolvido';
    const oldCol = db.columns.find((c) => c.id === bug.column_id);

    bug.column_id = resolvedCol;
    bug.solution_applied = solution_applied;
    if (technical_notes) bug.technical_notes = technical_notes;
    bug.effective_resolution_date = new Date().toISOString();
    bug.updated_at = new Date().toISOString();

    const historyEntry: BugHistoryEntry = {
      id: `h-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Equipe Técnica',
      user_role: user_role || 'TECH',
      field_changed: 'status',
      old_value: oldCol?.name || bug.column_id,
      new_value: 'Resolvido',
      description: `Bug marcado como Resolvido. Solução: "${solution_applied.substring(0, 80)}..."`,
      created_at: new Date().toISOString(),
    };
    bug.history.unshift(historyEntry);

    const notif: BugNotification = {
      id: `notif-${Date.now()}`,
      recipient_user_id: 'ALL',
      type: 'RESOLVED',
      title: `Bug Resolvido: ${bug.code}`,
      message: `${user_name || 'Equipe Técnica'} concluiu a correção de "${bug.title}". Pronto para validação e retorno ao cliente!`,
      bug_id: bug.id,
      bug_code: bug.code,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.unshift(notif);

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    broadcast('NOTIFICATION_CREATED', notif);
    res.json(bug);
  });

  app.post('/api/bugs/:id/close', (req, res) => {
    const { id } = req.params;
    const { user_id, user_name, user_role, closing_notes } = req.body;

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const closedCol = db.columns.find((c) => c.is_closed_stage)?.id || 'col-encerrado';
    const oldCol = db.columns.find((c) => c.id === bug.column_id);

    bug.column_id = closedCol;
    bug.updated_at = new Date().toISOString();

    const desc = closing_notes
      ? `Chamado encerrado após validação. Nota: ${closing_notes}`
      : 'Suporte confirmou a resolução aplicada com o cliente e encerrou o problema.';

    const historyEntry: BugHistoryEntry = {
      id: `h-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Suporte Técnico',
      user_role: user_role || 'SUPPORT',
      field_changed: 'status',
      old_value: oldCol?.name || bug.column_id,
      new_value: 'Encerrado',
      description: desc,
      created_at: new Date().toISOString(),
    };
    bug.history.unshift(historyEntry);

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    res.json(bug);
  });

  app.post('/api/bugs/:id/reopen', (req, res) => {
    const { id } = req.params;
    const { user_id, user_name, user_role, reason } = req.body;

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const reopenCol = 'col-analise';
    const oldCol = db.columns.find((c) => c.id === bug.column_id);

    bug.column_id = reopenCol;
    bug.is_reopened = true;
    bug.effective_resolution_date = null;
    bug.updated_at = new Date().toISOString();

    const historyEntry: BugHistoryEntry = {
      id: `h-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Membro da Equipe',
      user_role: user_role || 'SUPPORT',
      field_changed: 'status',
      old_value: oldCol?.name || bug.column_id,
      new_value: 'Reaberto (Em análise)',
      description: `Bug reaberto. Motivo: ${reason || 'Problema reincidente ou solução insatisfatória.'}`,
      created_at: new Date().toISOString(),
    };
    bug.history.unshift(historyEntry);

    const notif: BugNotification = {
      id: `notif-${Date.now()}`,
      recipient_user_id: bug.assignee_id || 'ALL',
      type: 'REOPENED',
      title: `Bug Reaberto: ${bug.code}`,
      message: `${user_name || 'Suporte'} reabriu o bug "${bug.title}". Motivo: ${reason || 'Necessita nova análise.'}`,
      bug_id: bug.id,
      bug_code: bug.code,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.unshift(notif);

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    broadcast('NOTIFICATION_CREATED', notif);
    res.json(bug);
  });

  app.post('/api/bugs/:id/comments', (req, res) => {
    const { id } = req.params;
    const { content, user_id, user_name, user_role } = req.body;
    if (!content) return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const newComment: BugComment = {
      id: `comm-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Membro da Equipe',
      user_role: user_role || 'SUPPORT',
      content,
      created_at: new Date().toISOString(),
    };
    bug.comments.push(newComment);
    bug.updated_at = new Date().toISOString();

    const historyEntry: BugHistoryEntry = {
      id: `h-${Date.now()}`,
      bug_id: bug.id,
      user_id: user_id || 'usr-anon',
      user_name: user_name || 'Membro da Equipe',
      user_role: user_role || 'SUPPORT',
      field_changed: 'comments',
      old_value: '',
      new_value: '',
      description: `Novo comentário adicionado: "${content.substring(0, 50)}..."`,
      created_at: new Date().toISOString(),
    };
    bug.history.unshift(historyEntry);

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    res.status(201).json(newComment);
  });

  app.post('/api/bugs/:id/attachments', (req, res) => {
    const { id } = req.params;
    const { name, file_type, size_bytes, url, preview_url, user_name } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Arquivo inválido' });

    const db = readDatabase();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });

    const newAtt = {
      id: `att-${Date.now()}`,
      name,
      file_type: file_type || 'image/png',
      size_bytes: size_bytes || 120000,
      url,
      preview_url,
      uploaded_by: user_name || 'Membro da Equipe',
      uploaded_at: new Date().toISOString(),
    };
    bug.attachments.push(newAtt);
    bug.updated_at = new Date().toISOString();

    writeDatabase(db);
    broadcast('BUG_UPDATED', bug);
    res.status(201).json(newAtt);
  });

  // ================= 8. NOTIFICATIONS ROUTES =================

  app.get('/api/notifications', (req, res) => {
    const db = readDatabase();
    res.json(db.notifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) notif.is_read = true;
    writeDatabase(db);
    res.json({ success: true, id });
  });

  app.put('/api/notifications/read-all', (req, res) => {
    const db = readDatabase();
    db.notifications.forEach((n) => (n.is_read = true));
    writeDatabase(db);
    broadcast('NOTIFICATIONS_READ_ALL', {});
    res.json({ success: true });
  });

  // ================= 9. KNOWLEDGE BASE ARTICLES ROUTES =================

  function normalizeTextForSearch(text?: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Get articles with optional search, module filter, favorites and sorting
  app.get('/api/articles', (req, res) => {
    const { q, module_id, favorites_only, user_id, sort } = req.query;
    const db = readDatabase();
    let results = [...(db.articles || [])];

    // Module filter
    if (module_id && typeof module_id === 'string' && module_id !== 'ALL') {
      results = results.filter((a) => a.module_id === module_id);
    }

    // Smart search: case-insensitive, accent-insensitive, token matching across title, content, keywords, module
    if (q && typeof q === 'string' && q.trim()) {
      const queryNorm = normalizeTextForSearch(q);
      const queryTokens = queryNorm.split(/\s+/).filter(Boolean);

      results = results.filter((art) => {
        const titleNorm = normalizeTextForSearch(art.title);
        const summaryNorm = normalizeTextForSearch(art.summary);
        const moduleNorm = normalizeTextForSearch(art.module_name || art.module || '');
        const keywordsNorm = (art.keywords || []).map(normalizeTextForSearch).join(' ');
        const tagsNorm = (art.tags || []).map(normalizeTextForSearch).join(' ');
        const symptomNorm = normalizeTextForSearch(art.content?.symptom);
        const rootCauseNorm = normalizeTextForSearch(art.content?.root_cause);
        const stepsNorm = normalizeTextForSearch(art.content?.resolution_steps_markdown);
        const quickReplyNorm = normalizeTextForSearch(art.content?.quick_reply_snippet);

        const haystack = `${titleNorm} ${summaryNorm} ${moduleNorm} ${keywordsNorm} ${tagsNorm} ${symptomNorm} ${rootCauseNorm} ${stepsNorm} ${quickReplyNorm}`;

        return queryTokens.every((token) => haystack.includes(token));
      });
    }

    // User favorites map
    if (user_id && typeof user_id === 'string') {
      const userFavs = new Set(
        (db.favorites || []).filter((f) => f.user_id === user_id).map((f) => f.article_id)
      );
      results = results.map((art) => ({
        ...art,
        is_favorite: userFavs.has(art.id),
      }));

      if (favorites_only === 'true' || favorites_only === '1') {
        results = results.filter((art) => userFavs.has(art.id));
      }
    }

    // Sort order
    if (sort === 'recent') {
      results.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
    } else if (sort === 'views') {
      results.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    } else if (sort === 'helpful') {
      results.sort((a, b) => (b.helpful_yes || 0) - (a.helpful_yes || 0));
    }

    res.json(results);
  });

  // Get single article
  app.get('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { user_id, increment_view } = req.query;
    const db = readDatabase();
    const art = (db.articles || []).find((a) => a.id === id);
    if (!art) return res.status(404).json({ error: 'Artigo não encontrado.' });

    if (increment_view === 'true') {
      art.views_count = (art.views_count || 0) + 1;
      writeDatabase(db);
      broadcast('ARTICLE_UPDATED', art);
    }

    const isFav =
      user_id && typeof user_id === 'string'
        ? (db.favorites || []).some((f) => f.user_id === user_id && f.article_id === id)
        : false;

    res.json({ ...art, is_favorite: isFav });
  });

  // Create article
  app.post('/api/articles', (req, res) => {
    const {
      title,
      summary,
      folder_id,
      module_id,
      status,
      author_id,
      author_name,
      content,
      tags,
      keywords,
      public_solution_url,
      is_confidential,
    } = req.body;

    if (!title || !module_id) {
      return res.status(400).json({ error: 'Título e Módulo são obrigatórios.' });
    }

    const db = readDatabase();
    const mod = db.modules.find((m) => m.id === module_id);
    const module_name = mod ? mod.name : 'Geral';

    const newArticle: Article = {
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      folder_id: folder_id || db.folders[0]?.id || 'fld-sefaz',
      slug: title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-'),
      title,
      summary: summary || '',
      status: status || 'PUBLISHED',
      version: 1,
      author_id: author_id || 'usr-admin-primary',
      author_name: author_name || 'Manoel Vilela (Admin)',
      views_count: 1,
      helpful_yes: 0,
      helpful_no: 0,
      content_hash: crypto.createHash('sha256').update(JSON.stringify(content || {})).digest('hex'),
      public_solution_url: public_solution_url || '',
      module_id,
      module_name,
      module: module_name,
      keywords: keywords || tags || [],
      tags: tags || keywords || [],
      content: content || {
        symptom: '',
        root_cause: '',
        resolution_steps_markdown: '',
        quick_reply_snippet: '',
      },
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_confidential: !!is_confidential,
      is_favorite: false,
    };

    if (!db.articles) db.articles = [];
    db.articles.unshift(newArticle);
    writeDatabase(db);
    broadcast('ARTICLE_CREATED', newArticle);
    res.status(201).json(newArticle);
  });

  // Update article
  app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const db = readDatabase();
    const art = (db.articles || []).find((a) => a.id === id);
    if (!art) return res.status(404).json({ error: 'Artigo não encontrado.' });

    if (updates.title !== undefined) art.title = updates.title;
    if (updates.summary !== undefined) art.summary = updates.summary;
    if (updates.folder_id !== undefined) art.folder_id = updates.folder_id;
    if (updates.status !== undefined) art.status = updates.status;
    if (updates.public_solution_url !== undefined) art.public_solution_url = updates.public_solution_url;
    if (updates.is_confidential !== undefined) art.is_confidential = updates.is_confidential;
    if (updates.updated_by_name !== undefined) art.updated_by_name = updates.updated_by_name;

    if (updates.module_id !== undefined) {
      art.module_id = updates.module_id;
      const mod = db.modules.find((m) => m.id === updates.module_id);
      if (mod) {
        art.module_name = mod.name;
        art.module = mod.name;
      }
    }

    if (updates.keywords !== undefined) art.keywords = updates.keywords;
    if (updates.tags !== undefined) art.tags = updates.tags;
    if (updates.content !== undefined) {
      art.content = { ...art.content, ...updates.content };
      art.content_hash = crypto.createHash('sha256').update(JSON.stringify(art.content)).digest('hex');
    }

    art.version = (art.version || 1) + 1;
    art.updated_at = new Date().toISOString();

    writeDatabase(db);
    broadcast('ARTICLE_UPDATED', art);
    res.json(art);
  });

  // Delete article
  app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const index = (db.articles || []).findIndex((a) => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Artigo não encontrado.' });

    db.articles.splice(index, 1);
    if (db.favorites) {
      db.favorites = db.favorites.filter((f) => f.article_id !== id);
    }
    writeDatabase(db);
    broadcast('ARTICLE_DELETED', { id });
    res.json({ success: true, id });
  });

  // Toggle favorite for an article
  app.post('/api/articles/:id/favorite', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório.' });

    const db = readDatabase();
    if (!db.favorites) db.favorites = [];
    const favIndex = db.favorites.findIndex((f) => f.user_id === user_id && f.article_id === id);
    let isFavorite: boolean;

    if (favIndex >= 0) {
      db.favorites.splice(favIndex, 1);
      isFavorite = false;
    } else {
      db.favorites.push({ user_id, article_id: id });
      isFavorite = true;
    }

    writeDatabase(db);
    broadcast('ARTICLE_FAVORITE_TOGGLED', { article_id: id, user_id, is_favorite: isFavorite });
    res.json({ success: true, article_id: id, is_favorite: isFavorite });
  });

  // Vote helpfulness
  app.post('/api/articles/:id/vote', (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    const db = readDatabase();
    const art = (db.articles || []).find((a) => a.id === id);
    if (!art) return res.status(404).json({ error: 'Artigo não encontrado.' });

    if (type === 'helpful_yes') {
      art.helpful_yes = (art.helpful_yes || 0) + 1;
    } else if (type === 'helpful_no') {
      art.helpful_no = (art.helpful_no || 0) + 1;
    }

    writeDatabase(db);
    broadcast('ARTICLE_UPDATED', art);
    res.json({ success: true, helpful_yes: art.helpful_yes, helpful_no: art.helpful_no });
  });

  // ================= KB FOLDERS MANAGEMENT =================
  app.get('/api/kb/folders', (req, res) => {
    const db = readDatabase();
    res.json(db.folders || []);
  });

  app.post('/api/kb/folders', (req, res) => {
    const { name, category_id, visibility_level } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'O nome da pasta é obrigatório.' });
    }
    const db = readDatabase();
    if (!db.folders) db.folders = [];

    const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newFolder = {
      id: 'fld-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      category_id: category_id || (db.categories && db.categories[0]?.id) || 'cat-geral',
      slug: slug || 'pasta-' + Date.now(),
      name: name.trim(),
      visibility_level: visibility_level || 'INTERNAL',
    };

    db.folders.push(newFolder);
    writeDatabase(db);
    broadcast('KB_FOLDER_CREATED', newFolder);
    res.status(201).json(newFolder);
  });

  app.put('/api/kb/folders/:id', (req, res) => {
    const { id } = req.params;
    const { name, category_id, visibility_level } = req.body;
    const db = readDatabase();
    if (!db.folders) db.folders = [];
    const folder = db.folders.find((f) => f.id === id);
    if (!folder) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }
    if (name && typeof name === 'string' && name.trim()) {
      folder.name = name.trim();
      folder.slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (category_id) folder.category_id = category_id;
    if (visibility_level) folder.visibility_level = visibility_level;

    writeDatabase(db);
    broadcast('KB_FOLDER_UPDATED', folder);
    res.json(folder);
  });

  app.delete('/api/kb/folders/:id', (req, res) => {
    const { id } = req.params;
    const { target_folder_id } = req.body || {};
    const db = readDatabase();
    if (!db.folders) db.folders = [];
    const folderIndex = db.folders.findIndex((f) => f.id === id);
    if (folderIndex === -1) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    // Safely reassign any articles in this folder
    const affectedArticles = (db.articles || []).filter((a) => a.folder_id === id);
    if (affectedArticles.length > 0) {
      const destinationFolderId = target_folder_id && target_folder_id !== id ? target_folder_id : '';
      affectedArticles.forEach((a) => {
        a.folder_id = destinationFolderId;
      });
    }

    const [deletedFolder] = db.folders.splice(folderIndex, 1);
    writeDatabase(db);
    broadcast('KB_FOLDER_DELETED', {
      id,
      name: deletedFolder.name,
      target_folder_id: target_folder_id || null,
      affected_count: affectedArticles.length,
    });
    res.json({
      success: true,
      message: 'Pasta "' + deletedFolder.name + '" excluída com sucesso.',
      affected_articles: affectedArticles.length,
    });
  });

  // ================= BUG DELETION ENDPOINT =================
  app.delete('/api/bugs/:id', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token && typeof req.body?.token === 'string') token = req.body.token;
    const userId = getUserIdFromToken(token);
    const db = readDatabase();

    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user && user.role !== 'ADMIN' && !user.permissions?.can_delete_bug) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir bugs.' });
      }
    }

    const bugIndex = (db.bugs || []).findIndex((b) => b.id === id);
    if (bugIndex === -1) {
      return res.status(404).json({ error: 'Bug não encontrado.' });
    }

    const [deletedBug] = db.bugs.splice(bugIndex, 1);
    // Remove notifications related to this bug
    db.notifications = (db.notifications || []).filter((n) => n.bug_id !== id);

    writeDatabase(db);
    broadcast('BUG_DELETED', { id, code: deletedBug.code, title: deletedBug.title });
    res.json({ success: true, message: 'Bug ' + deletedBug.code + ' excluído com sucesso.' });
  });

  // Increment view count
  app.post('/api/articles/:id/view', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const art = (db.articles || []).find((a) => a.id === id);
    if (!art) return res.status(404).json({ error: 'Artigo não encontrado.' });

    art.views_count = (art.views_count || 0) + 1;
    writeDatabase(db);
    broadcast('ARTICLE_UPDATED', art);
    res.json({ success: true, views_count: art.views_count });
  });

  // ================= VITE OR STATIC MIDDLEWARE =================
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SuasVendas] Server and WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
