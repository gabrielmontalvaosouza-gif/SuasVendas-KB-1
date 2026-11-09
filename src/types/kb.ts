export type UserRole = 'AGENT' | 'REVIEWER' | 'ADMIN';

export type ArticleStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export type VisibilityLevel = 'INTERNAL' | 'CONFIDENTIAL' | 'PUBLIC_MIRROR';

export interface User {
  id: string;
  external_sso_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  last_login_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  external_helpcenter_id?: string;
  order_index: number;
  icon?: string;
}

export interface Folder {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  visibility_level: VisibilityLevel;
}

export interface Attachment {
  id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_url: string;
  checksum_sha256?: string;
  base64_fallback?: string | null;
  sample_content?: string;
}

export interface ArticleContent {
  symptom: string;
  root_cause: string;
  resolution_steps_markdown: string;
  quick_reply_snippet: string;
  menu_path?: string;
  observations?: string;
  limitations?: string;
  escalation_notes?: string;
  workaround_notes?: string;
  erp_parameters?: string;
}

export interface Article {
  id: string;
  folder_id: string;
  slug: string;
  title: string;
  summary: string;
  status: ArticleStatus;
  version: number;
  author_id: string;
  author_name: string;
  updated_by_name?: string;
  views_count: number;
  helpful_yes: number;
  helpful_no: number;
  content_hash: string;
  public_solution_url?: string;
  module_id?: string; // ID of central SystemModule, e.g. "mod-1"
  module_name?: string; // e.g. "Faturamento e NF-e"
  module: string; // backwards compatibility alias for module_name
  keywords?: string[]; // search keywords
  tags: string[];
  content: ArticleContent;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  is_confidential?: boolean;
  is_favorite?: boolean;
}

export interface ArticleVersionSnapshot {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content_snapshot: ArticleContent;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export interface SearchLog {
  id: string;
  user_email: string;
  query_text: string;
  results_count: number;
  clicked_article_id?: string;
  latency_ms: number;
  searched_at: string;
}

export interface AuditLog {
  id: string;
  action: 'EXPORT_JSON' | 'IMPORT_JSON' | 'DELETE_ARTICLE' | 'UPDATE_STATUS' | 'RESOLVE_CONFLICT' | 'REPORT_OUTDATED';
  user_email: string;
  details: string;
  timestamp: string;
}

export interface OutdatedReport {
  id: string;
  article_id: string;
  article_title: string;
  reported_by: string;
  reason: string;
  erp_version_affected?: string;
  created_at: string;
  status: 'PENDING' | 'RESOLVED';
}

export type DryRunStatus = 'NEW' | 'UNCHANGED' | 'FAST_FORWARD' | 'CONFLICT';

export interface DryRunItem {
  incomingArticle: Article;
  localArticle?: Article;
  status: DryRunStatus;
  suggestedAction: string;
  diffSummary?: {
    localVersion: number;
    incomingVersion: number;
    localUpdatedAt: string;
    incomingUpdatedAt: string;
  };
}

export interface SyncEnvelopeMetadata {
  schema_version: string;
  exported_at: string;
  exported_by: {
    uuid: string;
    email: string;
  };
  source_instance: string;
  export_scope: 'FULL' | 'CATEGORY';
  total_records: {
    categories: number;
    folders: number;
    articles: number;
    tags: number;
  };
  payload_checksum_sha256: string;
}

export interface SyncEnvelope {
  $schema: string;
  metadata: SyncEnvelopeMetadata;
  data: {
    categories: Category[];
    folders: Folder[];
    articles: Article[];
  };
}
