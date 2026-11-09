import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  X,
  FileCode,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Sparkles,
  Eye,
  Edit2,
  Lock,
  Layers,
  HelpCircle,
  Tag,
  Plus,
  Compass,
  Paperclip,
  Upload,
  Trash2,
  Image as ImageIcon,
  Columns,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Check,
  Copy,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { Article, ArticleStatus, Category, Folder, UserRole } from '../types/kb';
import { SystemModule } from '../types/bugs';
import { marked } from 'marked';

interface ArticleEditorProps {
  initialArticle?: Article | null;
  categories: Category[];
  folders: Folder[];
  modules: SystemModule[];
  userRole: UserRole;
  onSave: (articleData: Partial<Article>, changeReason: string) => void;
  onCancel: () => void;
}

const TEMPLATES: Record<
  string,
  {
    title: string;
    symptom: string;
    root_cause: string;
    markdown: string;
    snippet: string;
    menuPath: string;
    observations: string;
    workaround: string;
    erpParams: string;
    tags: string[];
  }
> = {
  nfe_sefaz: {
    title: 'Como resolver Rejeição [CÓDIGO]: [MOTIVO SEFAZ]',
    symptom: 'Ao emitir ou transmitir a NF-e no SuasVendas, o retorno da SEFAZ apresenta Rejeição [CÓDIGO] e o documento não é autorizado.',
    root_cause: 'Divergência cadastral tributária (NCM, CST, CFOP ou Inscrição Estadual) incompatível com as regras vigentes da SEFAZ estadual.',
    markdown: `### Procedimento de Resolução Homologado:

1. Acesse o menu **Vendas > Pedidos** e localize o pedido correspondente.
2. Inspecione o cadastro fiscal do produto rejeitado:
   - Verifique se o **NCM** possui 8 dígitos e está ativo na tabela da Receita.
   - Confirme a regra de **CST / CSOSN** conforme o regime tributário da empresa.
3. No rodapé da nota, clique em **Validar Schema XML**.
4. Reenvie o lote de emissão para a SEFAZ.

\`\`\`xml
<!-- Exemplo de tag corrigida no XML -->
<det nItem="1">
  <imposto>
    <ICMS>
      <ICMS00>
        <orig>0</orig>
        <CST>00</CST>
        <modBC>3</modBC>
        <vBC>100.00</vBC>
        <pICMS>18.00</pICMS>
        <vICMS>18.00</vICMS>
      </ICMS00>
    </ICMS>
  </imposto>
</det>
\`\`\`

> **Dica do Suporte:** Caso o erro persista, consulte o SINTEGRA/CCC do destinatário para validar a Inscrição Estadual informada.`,
    snippet: 'Olá! Identificamos que a rejeição ocorreu por uma divergência tributária no cadastro. Já ajustamos a parametrização e sua nota fiscal pode ser reenviada agora com sucesso!',
    menuPath: 'Vendas > Pedidos > [Selecionar Pedido] > Ações Fiscais > Emitir NF-e',
    observations: 'Requer permissão de emissão fiscal ativa no perfil do usuário no SuasVendas.',
    workaround: 'Caso o servidor da SEFAZ esteja em manutenção, orientar a emissão temporária em contingência SCAN/SVC.',
    erpParams: 'CFOP: 5102 / CST ICMS: 102 / Regime: Simples Nacional',
    tags: ['nfe', 'sefaz', 'rejeicao', 'fiscal', 'impostos', 'xml'],
  },
  erp_sync: {
    title: 'Divergência de Sincronização: Integração [Nome do ERP] x SuasVendas',
    symptom: 'Pedidos de venda gerados no SuasVendas não são exportados ou atualizações de estoque do ERP não refletem no catálogo.',
    root_cause: 'Token da API do ERP expirado, Webhook pausado por timeout ou divergência no código de identificação do vendedor.',
    markdown: `### Diagnóstico da Integração:

1. Acesse **Configurações > Integrações > [ERP]**.
2. Verifique o status da conexão da API (requer resposta com código HTTP 200).
3. Teste as credenciais:
   - Verifique a chave de API (Token).
   - Confirme se os códigos de depósito de estoque estão mapeados.
4. Para reprocessar os pedidos pendentes, clique em **Forçar Sincronização Manual**.
5. Solicite ao operador que atualize o painel com **Ctrl + F5**.

\`\`\`json
// Payload de verificação de status do Webhook
{
  "event": "order.sync",
  "status": "active",
  "retry_count": 0,
  "endpoint": "https://api.suasvendas.com/v2/integrations/webhook"
}
\`\`\``,
    snippet: 'Olá! Forçamos a sincronização e reprocessamos a fila de pedidos entre o seu ERP e o SuasVendas. Os dados já estão atualizados no seu painel!',
    menuPath: 'Configurações > Integrações > Gerenciar Conexões > Sincronizar Agora',
    observations: 'A fila de sincronização em lote pode levar até 3 minutos para processar grandes volumes de pedidos.',
    workaround: 'Exportar os pedidos afetados em formato CSV ou XML e importar manualmente pelo módulo de integração.',
    erpParams: 'TIMEOUT_MS: 30000 / MAX_RETRIES: 3',
    tags: ['integracao', 'erp', 'sincronizacao', 'bling', 'tiny', 'webhook', 'pedidos'],
  },
  workaround: {
    title: 'Workaround Técnico: [Descrição do Problema Temporário]',
    symptom: 'Comportamento anômalo na interface ou lentidão ao gerar relatórios complexos com muitos filtros aplicados.',
    root_cause: 'Incidente em análise pela equipe de engenharia (registrado sob issue interna do Kanban).',
    markdown: `### Procedimento de Contorno Temporário:

1. Oriente o usuário a limpar o cache do navegador ou acessar em janela anônima.
2. Como alternativa direta, utilize a exportação de dados pelo menu auxiliar.
3. Este procedimento é temporário e deve ser utilizado até a aplicação do patch definitivo pela engenharia.`,
    snippet: 'Olá! Nossa equipe de engenharia já está trabalhando em uma atualização para este ponto. Como solução imediata para você continuar operando sem pausas, siga o passo a passo alternativo.',
    menuPath: 'Menu Superior > Relatórios > Exportações Rápidas',
    observations: 'Não aplicar este procedimento caso o cliente utilize versões legadas do navegador.',
    workaround: 'Utilizar filtros por período mensal em vez de intervalos anuais para acelerar o processamento.',
    erpParams: '',
    tags: ['workaround', 'contorno', 'suporte', 'engenharia', 'procedimento'],
  },
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  initialArticle,
  categories,
  folders,
  modules,
  userRole,
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialArticle;

  // Form Fields
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [summary, setSummary] = useState(initialArticle?.summary || '');
  const [folderId, setFolderId] = useState(initialArticle?.folder_id || folders[0]?.id || '');
  const [moduleId, setModuleId] = useState<string>(() => {
    if (initialArticle?.module_id) return initialArticle.module_id;
    const found = modules.find(
      (m) => m.name.toLowerCase() === (initialArticle?.module || '').toLowerCase()
    );
    return found ? found.id : (modules[0]?.id || 'mod-1');
  });
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || 'PUBLISHED');
  const [symptom, setSymptom] = useState(initialArticle?.content.symptom || '');
  const [rootCause, setRootCause] = useState(initialArticle?.content.root_cause || '');
  const [resolutionMarkdown, setResolutionMarkdown] = useState(
    initialArticle?.content.resolution_steps_markdown || ''
  );
  const [quickSnippet, setQuickSnippet] = useState(
    initialArticle?.content.quick_reply_snippet || ''
  );
  const [workaroundNotes, setWorkaroundNotes] = useState(
    initialArticle?.content.workaround_notes || ''
  );
  const [erpParameters, setErpParameters] = useState(
    initialArticle?.content.erp_parameters || ''
  );
  const [menuPath, setMenuPath] = useState(initialArticle?.content.menu_path || '');
  const [observations, setObservations] = useState(initialArticle?.content.observations || '');
  const [limitations, setLimitations] = useState(initialArticle?.content.limitations || '');
  const [escalationNotes, setEscalationNotes] = useState(initialArticle?.content.escalation_notes || '');
  const [articleAttachments, setArticleAttachments] = useState<any[]>(
    initialArticle?.attachments || []
  );
  const [publicUrl, setPublicUrl] = useState(initialArticle?.public_solution_url || '');

  // Keywords
  const [keywords, setKeywords] = useState<string[]>(() => {
    if (initialArticle?.keywords && initialArticle.keywords.length > 0) {
      return [...initialArticle.keywords];
    }
    if (initialArticle?.tags && initialArticle.tags.length > 0) {
      return [...initialArticle.tags];
    }
    return ['suporte', 'tecnico'];
  });
  const [keywordInput, setKeywordInput] = useState('');

  const [isConfidential, setIsConfidential] = useState(
    initialArticle?.is_confidential || false
  );
  const [changeReason, setChangeReason] = useState(
    isEditing ? 'Atualização de procedimento' : 'Criação do artigo técnico'
  );

  // Editor View Mode: 'split' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isDirty, setIsDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Track changes to warn before accidental leave
  useEffect(() => {
    setIsDirty(true);
  }, [
    title,
    summary,
    moduleId,
    symptom,
    rootCause,
    resolutionMarkdown,
    quickSnippet,
    workaroundNotes,
    erpParameters,
    menuPath,
  ]);

  // Keyboard shortcut Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleCancelWithConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, summary, moduleId, symptom, rootCause, resolutionMarkdown]);

  const addKeyword = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/^#+/, '');
    if (clean && !keywords.includes(clean)) {
      setKeywords((prev) => [...prev, clean]);
    }
  };

  const removeKeyword = (tagToRemove: string) => {
    setKeywords((prev) => prev.filter((k) => k !== tagToRemove));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (keywordInput.trim()) {
        addKeyword(keywordInput);
        setKeywordInput('');
      }
    }
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    if (
      title &&
      !window.confirm(
        'Substituir os campos atuais pelo modelo estruturado selecionado?'
      )
    ) {
      return;
    }
    setTitle(tpl.title);
    setSymptom(tpl.symptom);
    setRootCause(tpl.root_cause);
    setResolutionMarkdown(tpl.markdown);
    setQuickSnippet(tpl.snippet);
    setMenuPath(tpl.menuPath);
    setObservations(tpl.observations);
    setWorkaroundNotes(tpl.workaround);
    setErpParameters(tpl.erpParams);
    tpl.tags.forEach(addKeyword);
  };

  // Helper formatting insertions
  const insertMarkdownText = (before: string, after: string = '') => {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const replacement = `${before}${selectedText || 'texto'}${after}`;
    const newValue =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    setResolutionMarkdown(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selectedText ? selectedText.length : 5)
      );
    }, 50);
  };

  // Clipboard paste inside editor (for prints)
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result as string;
          const fileName = `Screenshot-${Date.now().toString().slice(-4)}.png`;
          const newAtt = {
            id: `att-${Date.now()}`,
            file_name: fileName,
            file_type: 'image',
            file_size_bytes: file.size,
            url: dataUrl,
          };
          setArticleAttachments((prev) => [...prev, newAtt]);
          // Insert image markdown reference
          insertMarkdownText(`\n![${fileName}](${dataUrl})\n`, '');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // File upload from computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 20 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        const isImg = file.type.startsWith('image/');
        const newAtt = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file_name: file.name,
          file_type: isImg ? 'image' : 'document',
          file_size_bytes: file.size,
          url: dataUrl,
        };
        setArticleAttachments((prev) => [...prev, newAtt]);
        if (isImg) {
          insertMarkdownText(`\n![${file.name}](${dataUrl})\n`, '');
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Por favor informe o título principal do artigo.');
      return;
    }

    const selectedMod = modules.find((m) => m.id === moduleId);
    const modName = selectedMod ? selectedMod.name : 'Geral';

    const articleData: Partial<Article> = {
      title: title.trim(),
      summary: summary.trim(),
      folder_id: folderId,
      module_id: moduleId,
      module_name: modName,
      module: modName,
      status,
      public_solution_url: publicUrl.trim() || undefined,
      keywords,
      tags: keywords,
      is_confidential: isConfidential,
      content: {
        symptom: symptom.trim(),
        root_cause: rootCause.trim(),
        resolution_steps_markdown: resolutionMarkdown.trim(),
        quick_reply_snippet: quickSnippet.trim(),
        workaround_notes: workaroundNotes.trim(),
        erp_parameters: erpParameters.trim(),
        menu_path: menuPath.trim(),
        observations: observations.trim(),
        limitations: limitations.trim(),
        escalation_notes: escalationNotes.trim(),
      },
      attachments: articleAttachments,
    };

    onSave(articleData, changeReason);
  };

  const handleCancelWithConfirm = () => {
    if (
      isDirty &&
      title.trim() &&
      !window.confirm('Existem alterações não salvas. Deseja realmente fechar o editor?')
    ) {
      return;
    }
    onCancel();
  };

  // Render markdown preview safely
  const renderedPreview = React.useMemo(() => {
    if (!resolutionMarkdown.trim()) {
      return '<p class="text-slate-400 italic">Nenhum procedimento de resolução redigido ainda.</p>';
    }
    try {
      return marked.parse(resolutionMarkdown);
    } catch {
      return resolutionMarkdown;
    }
  }, [resolutionMarkdown]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col overflow-hidden animate-fade-in select-none">
      {/* ================= 1. STUDIO TOPBAR ================= */}
      <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs transition-colors">
        {/* Left: Back & Title info */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={handleCancelWithConfirm}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Voltar à Base de Conhecimento (Esc)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white tracking-tight truncate">
                {isEditing ? `Editar Artigo Técnico (v${initialArticle.version})` : 'Criar Novo Artigo de Suporte'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 shrink-0">
                Studio de Documentação
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isEditing
                ? 'Atualizações geram automaticamente um snapshot versionado para auditoria'
                : 'Interface ampla para criação de soluções homologadas e atendimento ágil'}
            </p>
          </div>
        </div>

        {/* Center: View Mode Toggle */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Apenas Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Lado a Lado (Split)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Prévia Formatada</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCancelWithConfirm}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            title="Salvar artigo e registrar no histórico (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Artigo</span>
            <kbd className="hidden sm:inline bg-emerald-700/60 text-emerald-100 px-1.5 py-0.2 rounded text-[10px] font-mono">
              Ctrl+S
            </kbd>
          </button>
        </div>
      </header>

      {/* ================= 2. WORKSPACE CANVAS ================= */}
      <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors select-text">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Quick Templates Bar */}
          {!isEditing && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-950 dark:text-white">Modelos Estruturados de Suporte</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Preencha rapidamente a documentação com a estrutura homologada</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('nfe_sefaz')}
                  className="text-xs bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition shadow-2xs flex items-center gap-1.5"
                >
                  <span>Rejeição SEFAZ / NF-e</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('erp_sync')}
                  className="text-xs bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition shadow-2xs flex items-center gap-1.5"
                >
                  <span>Integração ERP / Sincronização</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('workaround')}
                  className="text-xs bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition shadow-2xs flex items-center gap-1.5"
                >
                  <span>Workaround Técnico</span>
                </button>
              </div>
            </div>
          )}

          {/* MAIN DOCUMENT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Título do Artigo / Nome da Solução *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Como resolver Rejeição 215 SEFAZ ou Falha de Sincronização no Bling..."
                className="w-full text-lg sm:text-2xl font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Metadata Grid (Module, Folder, Mirror URL, Confidential) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              {/* Dynamic Module Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Módulo do Sistema *</span>
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  className="w-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Taxonomy Folder */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Pasta / Categoria</span>
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">(Sem Pasta / Raiz)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Public Mirror URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Link Público (Ajuda SV)</span>
                </label>
                <input
                  type="url"
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                  placeholder="https://ajuda.suasvendas.com/..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              {/* Confidential Switch */}
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Restrito (Nível 3)</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Exclusivo equipe técnica</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Resumo Curto (Exibido nas listagens e cards de busca)
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Explicação direta e objetiva de uma frase sobre o problema ou procedimento..."
                className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Interactive Keywords / Tags Manager */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Palavras-Chave de Busca Inteligente</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pressione <strong>Enter</strong> ou vírgula para adicionar cada termo
                </span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-semibold text-xs px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs"
                  >
                    <span>#{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="text-blue-500 hover:text-rose-600 p-0.5 rounded transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder={keywords.length === 0 ? "Digite palavras-chave (ex: rejeicao, sefaz, xml, bling)..." : "Adicionar outra palavra-chave..."}
                  className="flex-1 min-w-[180px] bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 p-1 font-medium"
                />
              </div>

              {/* Suggested quick chips */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Sugestões rápidas:</span>
                {['sincronizacao', 'nfe', 'sefaz', 'xml', 'rejeicao-215', 'bling', 'pedido', 'importacao', 'comissao'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => addKeyword(sug)}
                    className="text-[10px] bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded-md transition font-mono"
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Reply Snippet (1-Click Support) */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <label className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                  Resposta Pronta para o Cliente (Suporte Ágil em 1 Clique)
                </label>
              </div>
              <textarea
                rows={2}
                value={quickSnippet}
                onChange={(e) => setQuickSnippet(e.target.value)}
                placeholder="Mensagem clara, cordial e profissional que o analista pode copiar e enviar de imediato no chat ou e-mail com o cliente..."
                className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-blue-200 dark:border-blue-800 rounded-xl p-3 outline-none focus:border-blue-500 font-normal leading-relaxed"
              />
            </div>

            {/* Diagnostic Fields: Symptom & Root Cause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Sintoma / Mensagem de Erro Relatada
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Ex: Mensagem exata exibida na tela do usuário, código de retorno da API ou comportamento inesperado..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Causa Raiz Identificada
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Ex: Motivo técnico que causa o erro (ex: certificado vencido, chave duplicada, caractere especial no XML)..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* RESOLUTION PROCEDURE (MARKDOWN EDITOR & PREVIEW) */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <label className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                    Procedimento de Resolução Homologado (Markdown) *
                  </label>
                </div>

                {/* Markdown Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('**', '**')}
                    className="px-2 py-1 font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Negrito"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('*', '*')}
                    className="px-2 py-1 italic font-serif text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Itálico"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('\n### ', '')}
                    className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Subtítulo H3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('`', '`')}
                    className="px-2 py-1 font-mono text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Código em linha"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('\n```xml\n', '\n```\n')}
                    className="px-2 py-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Bloco de Código XML/JSON"
                  >
                    XML
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('\n1. ', '')}
                    className="px-2 py-1 font-mono text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Lista numerada"
                  >
                    1.
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownText('\n> **Importante:** ', '')}
                    className="px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                    title="Nota de destaque"
                  >
                    Nota
                  </button>
                </div>
              </div>

              {/* Dynamic Split / Editor / Preview View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Editor Panel (shown if split or editor) */}
                {viewMode !== 'preview' && (
                  <div className={`space-y-1.5 ${viewMode === 'editor' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Editor Markdown (cole prints com Ctrl+V)</span>
                      <span>{resolutionMarkdown.length} caracteres</span>
                    </div>
                    <textarea
                      ref={markdownTextareaRef}
                      rows={14}
                      value={resolutionMarkdown}
                      onChange={(e) => setResolutionMarkdown(e.target.value)}
                      onPaste={handleEditorPaste}
                      placeholder={`### Passo a Passo de Resolução:

1. Acesse o menu Vendas > Pedidos.
2. Localize o registro com erro e clique em Editar.
3. Altere o parâmetro fiscal conforme a orientação da SEFAZ.
4. Salve e revalide o documento fiscal.

\`\`\`xml
<!-- Tag XML de exemplo -->
\`\`\``}
                      className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 leading-relaxed resize-y"
                    />
                  </div>
                )}

                {/* Preview Panel (shown if split or preview) */}
                {viewMode !== 'editor' && (
                  <div className={`space-y-1.5 ${viewMode === 'preview' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Prévia Formatada em Tempo Real</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Renderização Ativa
                      </span>
                    </div>
                    <div className="min-h-[280px] max-h-[500px] overflow-y-auto bg-slate-50/60 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 rounded-2xl p-5">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed prose-headings:font-bold prose-headings:text-slate-950 dark:prose-headings:text-white prose-code:bg-slate-200 dark:prose-code:bg-slate-800 prose-code:text-blue-700 dark:prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-emerald-400 prose-pre:p-3 prose-pre:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: renderedPreview }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Menu Path & Technical Workaround */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Caminho dos Menus no SuasVendas</span>
                </label>
                <input
                  type="text"
                  value={menuPath}
                  onChange={(e) => setMenuPath(e.target.value)}
                  placeholder="Ex: Vendas > Pedidos > Mais Ações > Corrigir Documento"
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Workaround Técnico (Solução Temporária de Contorno)</span>
                </label>
                <input
                  type="text"
                  value={workaroundNotes}
                  onChange={(e) => setWorkaroundNotes(e.target.value)}
                  placeholder="Instrução alternativa enquanto a correção definitiva do bug é lançada..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ERP Parameters & Escalation Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Parâmetros ERP / Comandos Técnicos
                </label>
                <textarea
                  rows={2}
                  value={erpParameters}
                  onChange={(e) => setErpParameters(e.target.value)}
                  placeholder="Ex: TIMEOUT: 30s, Webhook Event: invoice.create..."
                  className="w-full text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Critérios de Escalação (Quando Acionar Equipe Técnica)
                </label>
                <textarea
                  rows={2}
                  value={escalationNotes}
                  onChange={(e) => setEscalationNotes(e.target.value)}
                  placeholder="Ex: Escalar para Nível 3 caso o retorno da API persista em erro 500 por mais de 10 minutos..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ATTACHMENTS & SCREENSHOTS SECTION */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Anexos, Prints & Documentos Técnicos ({articleAttachments.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selecione arquivos do computador, arraste para cá ou cole com Ctrl+V
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.xml,.json,.txt,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adicionar Arquivo</span>
                  </button>
                </div>
              </div>

              {/* Attachments List */}
              {articleAttachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {articleAttachments.map((att) => {
                    const isImg =
                      att.file_type === 'image' ||
                      (att.url && att.url.startsWith('data:image'));
                    return (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isImg ? (
                            <img
                              src={att.url}
                              alt={att.file_name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <FileCode className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                              {att.file_name}
                            </span>
                            {att.file_size_bytes && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {(att.file_size_bytes / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setArticleAttachments((prev) =>
                              prev.filter((a) => a.id !== att.id)
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Clique aqui para selecionar capturas de tela ou documentos do computador
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Suporta imagens PNG/JPG, arquivos XML, JSON, PDFs e logs técnicos até 20 MB
                  </p>
                </div>
              )}
            </div>

            {/* Version Change Reason (when editing) */}
            {isEditing && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Motivo da Atualização (Registrado no Histórico de Versões)
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Ex: Atualização do procedimento após patch da SEFAZ..."
                  className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
