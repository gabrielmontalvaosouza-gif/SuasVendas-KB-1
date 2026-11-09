import { Category, Folder, Article, User, ArticleVersionSnapshot, SearchLog, AuditLog, OutdatedReport } from '../types/kb';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1-lead',
    external_sso_id: 'sso-analista-lead-01',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@suasvendas.com',
    role: 'ADMIN',
    last_login_at: '2026-10-26T14:30:00Z',
  },
  {
    id: 'usr-2-agent',
    external_sso_id: 'sso-agente-02',
    name: 'Mariana Souza',
    email: 'mariana.souza@suasvendas.com',
    role: 'REVIEWER',
    last_login_at: '2026-10-26T12:15:00Z',
  },
  {
    id: 'usr-3-agent',
    external_sso_id: 'sso-agente-03',
    name: 'Lucas Ferreira',
    email: 'lucas.ferreira@suasvendas.com',
    role: 'AGENT',
    last_login_at: '2026-10-26T10:00:00Z',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-faturamento',
    slug: 'faturamento-e-nfe',
    name: 'Faturamento e NF-e / NFC-e',
    description: 'Emissão fiscal, certificados digitais, contingência e comunicação com a SEFAZ.',
    external_helpcenter_id: 'help-cat-101',
    order_index: 1,
    icon: 'Receipt',
  },
  {
    id: 'cat-pedidos',
    slug: 'pedidos-e-orcamentos',
    name: 'Pedidos e Orçamentos',
    description: 'Fluxo comercial, aprovação, tabelas de preço, comissões e políticas de desconto.',
    external_helpcenter_id: 'help-cat-102',
    order_index: 2,
    icon: 'ShoppingCart',
  },
  {
    id: 'cat-integracoes',
    slug: 'integracoes-erp-api',
    name: 'Integrações ERP & API REST',
    description: 'Sincronização com Bling, Tiny, Omie, Totvs Protheus, Webhooks e API Pública.',
    external_helpcenter_id: 'help-cat-103',
    order_index: 3,
    icon: 'RefreshCw',
  },
  {
    id: 'cat-catalogo-b2b',
    slug: 'catalogo-e-portal-b2b',
    name: 'Catálogo & Portal B2B',
    description: 'Vitrine digital para representantes e autoatendimento de lojistas.',
    external_helpcenter_id: 'help-cat-104',
    order_index: 4,
    icon: 'Store',
  },
  {
    id: 'cat-mobile',
    slug: 'app-mobile-forca-vendas',
    name: 'App Mobile & Força de Vendas',
    description: 'Operação offline no Android/iOS, sincronização de pedidos e GPS de visitas.',
    external_helpcenter_id: 'help-cat-105',
    order_index: 5,
    icon: 'Smartphone',
  },
];

export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'fld-sefaz',
    category_id: 'cat-faturamento',
    slug: 'rejeicoes-sefaz-comuns',
    name: 'Rejeições SEFAZ Mais Comuns',
    visibility_level: 'PUBLIC_MIRROR',
  },
  {
    id: 'fld-certificados',
    category_id: 'cat-faturamento',
    slug: 'certificados-a1-a3',
    name: 'Certificado Digital A1/A3',
    visibility_level: 'INTERNAL',
  },
  {
    id: 'fld-regras-comerciais',
    category_id: 'cat-pedidos',
    slug: 'regras-tributacao-desconto',
    name: 'Regras Comerciais e Tributárias',
    visibility_level: 'INTERNAL',
  },
  {
    id: 'fld-erp-bling-tiny',
    category_id: 'cat-integracoes',
    slug: 'sync-bling-tiny',
    name: 'Sincronização Bling & Tiny ERP',
    visibility_level: 'INTERNAL',
  },
  {
    id: 'fld-api-webhooks',
    category_id: 'cat-integracoes',
    slug: 'erros-api-webhooks',
    name: 'Erros de API e Webhooks (Nível 3)',
    visibility_level: 'CONFIDENTIAL',
  },
  {
    id: 'fld-mobile-offline',
    category_id: 'cat-mobile',
    slug: 'sync-offline-conflitos',
    name: 'Sincronização Offline e Cache',
    visibility_level: 'INTERNAL',
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-rejeicao-215',
    folder_id: 'fld-sefaz',
    slug: 'como-resolver-rejeicao-215-falha-schema-xml',
    title: 'Como resolver Rejeição 215: Falha no Schema XML',
    summary: 'Identificação e remoção de caracteres proibidos (&, <, >, quebras de linha \\n) em campos cadastrais ou observações da NF-e.',
    status: 'PUBLISHED',
    version: 4,
    author_id: 'usr-1-lead',
    author_name: 'Carlos Oliveira',
    updated_by_name: 'Mariana Souza',
    views_count: 842,
    helpful_yes: 124,
    helpful_no: 3,
    content_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    public_solution_url: 'https://ajuda.suasvendas.com/support/solutions/articles/215-falha-no-schema-xml',
    module_id: 'mod-1',
    module_name: 'Faturamento e NF-e',
    module: 'Faturamento e NF-e',
    keywords: ['rejeicao', '215', 'schema', 'xml', 'caracteres especiais', 'nfe', 'sefaz', 'quebra de linha'],
    tags: ['nfe', 'sefaz', 'rejeicao-215', 'schema', 'xml', 'faturamento'],
    content: {
      symptom: 'Ao tentar emitir ou transmitir a Nota Fiscal Eletrônica no SuasVendas, o retorno da SEFAZ apresenta: "Rejeição 215: Falha no Schema XML do lote de NFe".',
      root_cause: 'Preenchimento incorreto com caracteres especiais proibidos (ex: &, <, >, tabulações ou quebras de linha \'\\n\') no nome do cliente, complemento do endereço, ou no campo Observações/Dados Adicionais do Pedido.',
      resolution_steps_markdown: `### Passo a Passo de Resolução:

1. Acesse o menu **Vendas > Pedidos** e abra o pedido rejeitado.
2. Clique na aba **Dados do Cliente**:
   - Verifique o campo **Razão Social / Nome** e **Nome Fantasia**;
   - Verifique o campo **Endereço**, **Bairro** e **Complemento**. Remova símbolos como \`&\` (substitua por \`E\`), \`º\`, \`ª\` ou aspas duplas;
   - Certifique-se de que o **CEP** contém apenas 8 dígitos numéricos.
3. Acesse a aba **Dados Adicionais da NF-e**:
   - Inspecione o campo **Informações Complementares de Interesse do Contribuinte**.
   - Se o cliente copiou e colou texto de uma planilha Excel ou WhatsApp, pode haver caracteres de quebra de linha oculta (\`\\r\\n\`). Apague o conteúdo e digite novamente de forma limpa.
4. No rodapé da nota, clique em **Mais Ações > Validar Estrutura XML**.
5. Clique em **Transmitir Novamente**.

\`\`\`xml
<!-- Exemplo de XML Inválido -->
<xNome>Supermercado Silva & Filhos Ltda</xNome> <!-- O '&' causa falha no parser SEFAZ -->

<!-- Exemplo Corrigido -->
<xNome>Supermercado Silva E Filhos Ltda</xNome>
\`\`\`

> **Dica do Suporte:** 95% dos casos de Rejeição 215 no SuasVendas estão concentrados no campo *Complemento de Endereço* ou *Observações do Pedido*.`,
      quick_reply_snippet: 'Olá! Identificamos que a Rejeição 215 ocorreu devido a um caractere especial (como "&" ou quebra de linha) no cadastro do cliente ou nas observações do pedido. Já orientamos o ajuste: remova esses caracteres e clique em "Transmitir Novamente". A nota será autorizada!',
      workaround_notes: 'Caso o validador SEFAZ persista mesmo sem caracteres no formulário, force uma nova geração da chave rodando o script de recalculação de digest via console de engenharia.',
      erp_parameters: 'Parâmetro `NFE_SANITIZE_INPUT_STRINGS=true` no painel de configurações gerais da conta.',
    },
    attachments: [
      {
        id: 'att-sefaz-schema-xml',
        file_name: 'nfe_schema_validacao_v4.00.xml',
        mime_type: 'application/xml',
        file_size_bytes: 42100,
        storage_url: 'https://cdn-kb.suasvendas.com/attachments/nfe_schema_validacao_v4.00.xml',
        sample_content: `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>102938</idLote>
  <indSinc>1</indSinc>
  <NFe>
    <infNFe Id="NFe35261000000000000000550010000099811000099818" versao="4.00">
      <ide><cUF>35</cUF><cNF>00009981</cNF><natOp>VENDA DE MERCADORIA</natOp></ide>
    </infNFe>
  </NFe>
</enviNFe>`,
      },
      {
        id: 'att-manual-pdf',
        file_name: 'Manual_Orientacao_Contribuinte_SEFAZ_v7.03.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 1420000,
        storage_url: 'https://cdn-kb.suasvendas.com/attachments/Manual_Orientacao_Contribuinte_SEFAZ.pdf',
      },
    ],
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-10-25T18:30:00Z',
  },
  {
    id: 'art-rejeicao-539',
    folder_id: 'fld-sefaz',
    slug: 'rejeicao-539-duplicidade-chave-acesso',
    title: 'Rejeição 539: Duplicidade de NF-e com diferença na Chave de Acesso',
    summary: 'A nota fiscal já foi autorizada pela SEFAZ mas a confirmação sofreu timeout na rede, gerando tentativa de emissão com nova chave.',
    status: 'PUBLISHED',
    version: 3,
    author_id: 'usr-2-agent',
    author_name: 'Mariana Souza',
    updated_by_name: 'Carlos Oliveira',
    views_count: 512,
    helpful_yes: 89,
    helpful_no: 1,
    content_hash: '9a7bc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
    public_solution_url: 'https://ajuda.suasvendas.com/support/solutions/articles/539-duplicidade-chave-acesso',
    module_id: 'mod-1',
    module_name: 'Faturamento e NF-e',
    module: 'Faturamento e NF-e',
    keywords: ['rejeicao', '539', 'duplicidade', 'chave de acesso', 'protocolo', 'sefaz', 'timeout', 'danfe'],
    tags: ['nfe', 'sefaz', 'rejeicao-539', 'duplicidade', 'faturamento'],
    content: {
      symptom: 'Ao reenviar uma nota fiscal que travou em "Em Processamento", o sistema retorna: "Rejeição 539: Duplicidade de NF-e com diferença na Chave de Acesso [chNFe: 3526... nRec: ...]".',
      root_cause: 'Na primeira tentativa, a SEFAZ autorizou a nota, porém houve oscilação de link antes do SuasVendas gravar o protocolo no banco de dados. Ao reenviar, o sistema gerou um novo código numérico aleatório (cNF), gerando uma chave diferente para o mesmo número de NF.',
      resolution_steps_markdown: `### Passo a Passo de Resolução:

1. Copie a **Chave de Acesso original informada na mensagem de erro** (ex: \`35261000000000000000550010000099811000099818\`).
2. Acesse o **Portal Nacional da SEFAZ** (ou Portal Estadual) e faça uma consulta pública com essa chave para confirmar se está com status **AUTORIZADA**.
3. Se estiver autorizada:
   - No SuasVendas, acesse **Faturamento > Notas Fiscais**.
   - Abra a nota rejeitada, clique no menu superior **Ações Avançadas > Sincronizar por Chave SEFAZ**.
   - Cole a chave e o número do protocolo exibido no portal.
   - O SuasVendas baixará o XML de distribuição autorizado automaticamente e atualizará o status para **Emitida / Concluída**.
4. Não altere o número da nota nem exclua o registro para não gerar buraco na sequência fiscal.`,
      quick_reply_snippet: 'Olá! A Rejeição 539 significa que sua nota fiscal já foi autorizada pela SEFAZ na tentativa anterior, mas o retorno oscilou. Já puxamos o protocolo oficial da SEFAZ para o seu SuasVendas e a nota está autorizada e pronta para impressão do DANFE!',
      workaround_notes: 'Caso o cliente utilize certificado A3 e a chave não seja encontrada no portal, verificar se a emissão anterior ocorreu em contingência SVC-AN.',
      erp_parameters: 'Módulo Fiscal > Timeout de Consulta SEFAZ: alterar de 15s para 30s se houver reincidência.',
    },
    attachments: [],
    created_at: '2026-08-15T11:00:00Z',
    updated_at: '2026-10-24T15:20:00Z',
  },
  {
    id: 'art-sync-estoque-erp',
    folder_id: 'fld-erp-bling-tiny',
    slug: 'divergencia-saldo-estoque-bling-tiny',
    title: 'Divergência de Saldo de Estoque: Integração Bling / Tiny ERP',
    summary: 'Procedimento para forçar sincronização de saldo de produtos físicos e depósitos quando há atraso no webhook.',
    status: 'PUBLISHED',
    version: 5,
    author_id: 'usr-1-lead',
    author_name: 'Carlos Oliveira',
    updated_by_name: 'Carlos Oliveira',
    views_count: 673,
    helpful_yes: 104,
    helpful_no: 4,
    content_hash: '3f7ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c002',
    public_solution_url: 'https://ajuda.suasvendas.com/support/solutions/articles/integracao-estoque-bling-tiny',
    module_id: 'mod-3',
    module_name: 'Integrações ERP & API',
    module: 'Integrações ERP & API',
    keywords: ['estoque', 'sincronizacao', 'bling', 'tiny', 'webhook', 'saldo', 'deposito', 'divergencia', 'erp'],
    tags: ['erp', 'bling', 'tiny', 'estoque', 'webhook', 'integracao'],
    content: {
      symptom: 'O estoque no Bling ou Tiny ERP foi alterado (ex: venda em loja física), porém o vendedor no SuasVendas ainda vê a quantidade antiga.',
      root_cause: 'Webhook de notificação de estoque desativado no painel do ERP ou divergência entre o "Depósito Geral" e "Depósito SuasVendas".',
      resolution_steps_markdown: `### Verificação e Resolução:

1. **Configuração do Webhook no ERP (Bling / Tiny):**
   - Acesse **Configurações > Integrações > Webhooks** no ERP.
   - Verifique se o evento \`estoque.alterado\` está ativo apontando para:
     \`https://api.suasvendas.com/v2/webhooks/erp/stock\`
2. **Mapeamento de Depósitos no SuasVendas:**
   - Acesse **Configurações > Integrações > [Seu ERP] > Mapeamento de Depósitos**.
   - Certifique-se de que o ID do depósito principal está selecionado.
3. **Disparo de Ressincronização Rápida:**
   - Para atualizar em massa, vá em **Produtos > Mais Ações > Sincronizar Estoque com ERP**.
   - O processo roda em fila assíncrona e processa 500 produtos/minuto.`,
      quick_reply_snippet: 'Olá! Fizemos a ressincronização forçada do saldo de estoque do seu ERP com o SuasVendas. O estoque dos produtos selecionados já foi atualizado! Por favor, pressione Ctrl+F5 no seu painel para atualizar a visualização.',
      workaround_notes: 'Se o cliente tiver mais de 20.000 SKUs e o Tiny retornar erro 429 Too Many Requests, ative o rate limiting dinâmico de 3 chamadas/seg no conector.',
      erp_parameters: 'Setting: `ERP_SYNC_BATCH_SIZE=250` e `ERP_STOCK_DEPOSIT_FILTER_ID=9812739`',
    },
    attachments: [
      {
        id: 'att-modelo-xlsx',
        file_name: 'planilha_mapeamento_depositos_erp.xlsx',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size_bytes: 18400,
        storage_url: 'https://cdn-kb.suasvendas.com/attachments/planilha_mapeamento_depositos_erp.xlsx',
      },
    ],
    created_at: '2026-07-20T09:00:00Z',
    updated_at: '2026-10-26T09:15:00Z',
  },
  {
    id: 'art-rejeicao-660',
    folder_id: 'fld-sefaz',
    slug: 'rejeicao-660-cfop-combustivel-grupo-combustivel-nao-informado',
    title: 'Rejeição 660: CFOP de Combustível e não informado grupo de combustível',
    summary: 'Erro ao faturar lubrificantes, graxas ou solventes com CFOPs fiscais da família 5.65x / 6.65x sem código ANP.',
    status: 'PUBLISHED',
    version: 2,
    author_id: 'usr-3-agent',
    author_name: 'Lucas Ferreira',
    updated_by_name: 'Mariana Souza',
    views_count: 231,
    helpful_yes: 42,
    helpful_no: 0,
    content_hash: '118ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852ab11',
    public_solution_url: 'https://ajuda.suasvendas.com/support/solutions/articles/rejeicao-660-combustivel-anp',
    module_id: 'mod-1',
    module_name: 'Faturamento e NF-e',
    module: 'Faturamento e NF-e',
    keywords: ['rejeicao', '660', 'combustivel', 'anp', 'cfop', 'graxa', 'oleo', 'tributacao', 'sefaz'],
    tags: ['nfe', 'sefaz', 'rejeicao-660', 'anp', 'cfop', 'faturamento'],
    content: {
      symptom: 'Ao emitir nota fiscal de óleo, lubrificante ou derivado de petróleo, a SEFAZ rejeita com código 660.',
      root_cause: 'O CFOP utilizado obriga o preenchimento do grupo fiscal de combustíveis (código ANP) no cadastro do item.',
      resolution_steps_markdown: `### Como Corrigir:

1. Acesse **Cadastros > Produtos** e localize o produto rejeitado.
2. Acesse a aba **Dados Fiscais / Tributação**.
3. No campo **Código ANP (Agência Nacional do Petróleo)**, informe o código regulatório de 9 dígitos correspondente (ex: \`810101001\` para Óleo Lubrificante Básico).
4. Salve o produto.
5. Volte na nota fiscal, clique em **Recalcular Tributos do Pedido** e reenvie a NF-e.`,
      quick_reply_snippet: 'Olá! A Rejeição 660 indica que o produto possui um CFOP tributário de derivado de petróleo/combustível e precisa do código ANP preenchido no cadastro do produto. Preencha o código ANP de 9 dígitos no item e reenvie a nota!',
      workaround_notes: 'Caso o item não seja combustível e sim graxa automotiva comum, oriente o cliente a consultar o contador para verificar se o CFOP correto não seria 5.102 / 5.405.',
      erp_parameters: 'Regra de validação fiscal: NFe v4.00 NT 2016/002.',
    },
    attachments: [],
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-10-22T10:45:00Z',
  },
  {
    id: 'art-api-401-confidential',
    folder_id: 'fld-api-webhooks',
    slug: 'troubleshooting-api-401-unauthorized-bearer-token',
    title: 'Troubleshooting: Erro 401 Unauthorized na API do Portal B2B [NÍVEL 3]',
    summary: 'Investigação profunda de tokens JWT expirados, escopo incorreto no gateway e rotação de credenciais de clientes corporativos.',
    status: 'PUBLISHED',
    version: 2,
    author_id: 'usr-1-lead',
    author_name: 'Carlos Oliveira',
    updated_by_name: 'Carlos Oliveira',
    views_count: 140,
    helpful_yes: 28,
    helpful_no: 0,
    content_hash: '554ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852de99',
    public_solution_url: '',
    module_id: 'mod-4',
    module_name: 'Catálogo & Portal B2B',
    module: 'Catálogo & Portal B2B',
    keywords: ['api', '401', 'unauthorized', 'jwt', 'token', 'portal b2b', 'oauth', 'autenticacao'],
    tags: ['api', 'jwt', 'auth', '401', 'confidencial', 'engenharia'],
    is_confidential: true,
    content: {
      symptom: 'A equipe de TI do cliente relata que chamadas para `https://api.suasvendas.com/v2/orders` retornam status HTTP 401 Unauthorized repentinamente.',
      root_cause: 'Expiração da chave secreta da API por ciclo de 90 dias ou ausência do header `X-SV-Tenant-ID` após migração de cluster.',
      resolution_steps_markdown: `### Procedimento Restrito à Engenharia e Nível 3:

1. Acesse o console administrativo de Tenants em: \`https://admin-internal.suasvendas.com/tenants\`.
2. Busque pelo CNPJ ou e-mail da conta master do cliente.
3. Inspecione o registro em **OAuth Clients**:
   - Verifique o campo \`is_active\` e \`token_expiration_timestamp\`.
   - Se expirado, gere um novo par de chaves (Client ID e Secret).
4. Verifique nos logs do Kubernetes (\`kubectl logs -n prod-api -l app=gateway-auth\`) se o IP do servidor do cliente não caiu na blocklist do WAF da Cloudflare por excesso de requisições malformadas.
5. Se o IP estiver bloqueado, limpe o cache de firewall com o comando de liberação temporária.`,
      quick_reply_snippet: 'Olá! Nossa equipe de engenharia validou a conectividade do seu endpoint. Identificamos que as credenciais de autenticação da API precisavam de renovação. Emitimos uma nova chave segura em Configurações > API no seu painel.',
      workaround_notes: 'Artigo estritamente restrito. Nunca encaminhar links ou screenshots deste procedimento para clientes finais.',
      erp_parameters: 'Rotacionar via CLI: `sv-cli tenant rotate-keys --id=tenant_8829`',
    },
    attachments: [],
    created_at: '2026-06-10T16:00:00Z',
    updated_at: '2026-10-18T17:00:00Z',
  },
  {
    id: 'art-mobile-sync-offline',
    folder_id: 'fld-mobile-offline',
    slug: 'pedidos-presos-offline-app-android',
    title: 'Pedidos Presos na Caixa de Saída Offline (App Android SuasVendas)',
    summary: 'Como destravar pedidos digitados em área sem cobertura de sinal de operadora que não sincronizam com o servidor.',
    status: 'PUBLISHED',
    version: 3,
    author_id: 'usr-3-agent',
    author_name: 'Lucas Ferreira',
    updated_by_name: 'Mariana Souza',
    views_count: 489,
    helpful_yes: 91,
    helpful_no: 2,
    content_hash: '778ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852ff44',
    public_solution_url: 'https://ajuda.suasvendas.com/support/solutions/articles/pedidos-offline-android',
    module_id: 'mod-5',
    module_name: 'App Mobile Força de Vendas',
    module: 'App Mobile Força de Vendas',
    keywords: ['mobile', 'android', 'offline', 'caixa de saida', 'pedidos', 'sincronizacao', 'fila'],
    tags: ['mobile', 'android', 'offline', 'caixa-de-saida', 'pedidos'],
    content: {
      symptom: 'O representante comercial digitou 5 pedidos no aplicativo enquanto viajava na estrada, mas ao conectar no Wi-Fi os pedidos continuam na aba "Pendentes de Envio".',
      root_cause: 'Inconsistência temporária na tabela SQLite local do aplicativo provocada por economia extrema de bateria do Android (Doze Mode) ou cliente com bloqueio de crédito pendente.',
      resolution_steps_markdown: `### Passo a Passo para o Analista Orientar o Vendedor:

1. No celular do vendedor, abra o app **SuasVendas Força de Vendas**.
2. Abra o menu lateral esquerdo e toque em **Configurações > Sincronização**.
3. Desative a opção **"Sincronizar apenas no Wi-Fi"** (para permitir uso de 4G/5G).
4. Vá em **Sincronização Avançada > Validar Integridade Local**:
   - O aplicativo verificará se há algum pedido com número de cliente duplicado ou item sem preço.
5. Se tudo estiver válido, toque em **Forçar Envio da Fila de Saída**.
6. **ATENÇÃO:** NUNCA oriente o vendedor a desinstalar o app ou "Limpar Dados" do Android enquanto houver pedidos na Caixa de Saída, pois isso apagará os pedidos salvos apenas no celular!`,
      quick_reply_snippet: 'Olá! Não se preocupe, seus pedidos offline continuam salvos no celular. Para enviar agora, abra o app SuasVendas, vá em Menu > Sincronização e toque em "Forçar Envio da Fila de Saída". Por favor, não desinstale o app!',
      workaround_notes: 'Em versões antigas do Android 11 da Xiaomi (MIUI), é necessário dar permissão de "Início Automático" nas configurações do aparelho.',
      erp_parameters: 'App config flag: `OFFLINE_SYNC_RETRY_INTERVAL_SECONDS=180`',
    },
    attachments: [],
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-10-25T11:00:00Z',
  },
  {
    id: 'art-pedidos-bloqueio-credito',
    folder_id: 'fld-regras-comerciais',
    slug: 'liberacao-pedidos-bloqueados-limite-credito',
    title: 'Liberação de Pedidos Bloqueados por Limite de Crédito ou Inadimplência',
    summary: 'Procedimento para o supervisor analisar o histórico de títulos e aprovar pedidos retidos na esteira comercial.',
    status: 'PUBLISHED',
    version: 1,
    author_id: 'usr-sup-2',
    author_name: 'Mariana Souza',
    updated_by_name: 'Mariana Souza',
    views_count: 310,
    helpful_yes: 58,
    helpful_no: 0,
    content_hash: 'aa1ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852ee33',
    public_solution_url: '',
    module_id: 'mod-2',
    module_name: 'Pedidos e Orçamentos',
    module: 'Pedidos e Orçamentos',
    keywords: ['pedidos', 'bloqueio', 'credito', 'limite', 'liberacao', 'supervisor', 'desconto', 'inadimplencia', 'aprovacao'],
    tags: ['pedidos', 'credito', 'supervisor', 'bloqueio', 'comercial'],
    content: {
      symptom: 'Vendedor tenta salvar pedido de venda e o sistema exibe alerta vermelho: "Pedido bloqueado para faturamento: cliente com títulos vencidos ou limite insuficiente".',
      root_cause: 'Política comercial ativada que trava pedidos quando o saldo em aberto do cliente excede o limite cadastrado na ficha ou possui boletos com mais de 5 dias de atraso.',
      resolution_steps_markdown: `### Como o Supervisor Avalia e Libera:

1. Acesse **Vendas > Pedidos > Filtro: Bloqueados**.
2. Abra o pedido em questão e clique no botão superior **Auditoria de Crédito**.
3. Verifique o resumo de inadimplência e o valor total do novo pedido.
4. Caso a diretoria comercial autorize a exceção:
   - Clique em **Autorizar Pedido (Aprovação Manual)**.
   - Digite a justificativa obrigatória (ex: *Negociação direta com o cliente via pagamento da primeira parcela*).
5. O status do pedido mudará para **Aprovado** e seguirá para faturamento.`,
      quick_reply_snippet: 'Olá! O pedido ficou retido na esteira comercial devido a uma pendência cadastral ou limite de crédito do cliente. A solicitação de liberação já foi enviada ao supervisor responsável para análise!',
      workaround_notes: 'Caso o cliente já tenha quitado o título no banco, pode ser dado baixa manual provisória no módulo financeiro.',
      erp_parameters: 'Política Comercial: `ALLOW_OVER_LIMIT_DISCOUNT=false`',
    },
    attachments: [],
    created_at: '2026-09-15T14:20:00Z',
    updated_at: '2026-10-25T16:00:00Z',
  },
  {
    id: 'art-cobranca-pix-qrcode',
    folder_id: 'fld-certificados',
    slug: 'configuracao-pix-dinamico-boletos-bancarios',
    title: 'Como Habilitar PIX Dinâmico com QR Code em Boletos Bancários',
    summary: 'Passo a passo para emitir boletos híbridos (código de barras + QR Code PIX) com liquidação instantânea e conciliação automática.',
    status: 'PUBLISHED',
    version: 1,
    author_id: 'usr-1-lead',
    author_name: 'Carlos Oliveira',
    updated_by_name: 'Carlos Oliveira',
    views_count: 420,
    helpful_yes: 73,
    helpful_no: 1,
    content_hash: 'cc3ba44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b785299aa',
    public_solution_url: '',
    module_id: 'mod-6',
    module_name: 'Financeiro & Cobrança',
    module: 'Financeiro & Cobrança',
    keywords: ['pix', 'qrcode', 'boleto', 'cobranca', 'banco', 'financeiro', 'baixa automatica', 'conciliacao'],
    tags: ['financeiro', 'pix', 'boleto', 'cobranca', 'bancario'],
    content: {
      symptom: 'Cliente deseja que as faturas e boletos emitidos pelo SuasVendas tenham QR Code do PIX impresso para pagamento imediato.',
      root_cause: 'A conta bancária da empresa está configurada no layout tradicional CNAB 240/400 sem a chave de integração com a API PIX do banco conveniado.',
      resolution_steps_markdown: `### Como Ativar a Cobrança Híbrida:

1. Acesse **Financeiro > Contas Bancárias** e edite a carteira de cobrança.
2. Na aba **PIX Híbrido**:
   - Marque a opção **"Imprimir QR Code PIX no corpo do Boleto"**;
   - Selecione a chave PIX cadastrada no Banco (CNPJ, E-mail ou Chave Aleatória);
   - Insira o Certificado mTLS (.p12 ou .pem) fornecido pelo portal de desenvolvedores do banco (ex: Banco do Brasil, Itaú, Bradesco ou Cora).
3. Salve a configuração e faça uma emissão de teste em homologação.
4. Ao escanear o QR Code, a liquidação ocorre em menos de 10 segundos e o SuasVendas registra a baixa automática sem necessidade de envio de arquivo de retorno CNAB.`,
      quick_reply_snippet: 'Olá! O boleto híbrido já pode ser emitido com QR Code PIX no SuasVendas. Basta ativar a opção em Financeiro > Contas Bancárias e anexar as credenciais da API do seu banco. A baixa dos pagamentos é instantânea!',
      workaround_notes: 'Caso o banco não possua API de webhook ativa, a conciliação pode ser feita através da leitura diária do arquivo de retorno tradicional.',
      erp_parameters: 'Flag de gateway: `ENABLE_PIX_DYNAMIC_PAYMENTS=true`',
    },
    attachments: [],
    created_at: '2026-10-01T11:00:00Z',
    updated_at: '2026-10-24T18:00:00Z',
  },
];

export const INITIAL_VERSION_HISTORY: Record<string, ArticleVersionSnapshot[]> = {
  'art-rejeicao-215': [
    {
      id: 'snap-215-v1',
      article_id: 'art-rejeicao-215',
      version_number: 1,
      title: 'Rejeição 215 SEFAZ',
      content_snapshot: {
        symptom: 'Retorno 215 ao emitir nota.',
        root_cause: 'Caracteres inválidos.',
        resolution_steps_markdown: '1. Verifique o cadastro do cliente e remova acentos.',
        quick_reply_snippet: 'Remova os acentos e tente novamente.',
      },
      changed_by: 'Carlos Oliveira',
      change_reason: 'Criação inicial da documentação técnica.',
      created_at: '2026-09-10T10:00:00Z',
    },
    {
      id: 'snap-215-v2',
      article_id: 'art-rejeicao-215',
      version_number: 2,
      title: 'Como resolver Rejeição 215: Falha no Schema XML',
      content_snapshot: {
        symptom: 'Ao emitir nota fiscal no SuasVendas a SEFAZ rejeita com 215.',
        root_cause: 'Caracteres proibidos como &, <, > e quebras de linha.',
        resolution_steps_markdown: '1. Acesse o pedido.\n2. Verifique o endereço e complemento.\n3. Remova símbolos proibidos.',
        quick_reply_snippet: 'Olá! Remova os caracteres especiais do cadastro e reenvie.',
      },
      changed_by: 'Mariana Souza',
      change_reason: 'Inclusão de detalhes sobre campos de endereço e quebras de linha.',
      created_at: '2026-09-28T14:00:00Z',
    },
    {
      id: 'snap-215-v3',
      article_id: 'art-rejeicao-215',
      version_number: 3,
      title: 'Como resolver Rejeição 215: Falha no Schema XML',
      content_snapshot: {
        symptom: 'Ao tentar emitir ou transmitir a Nota Fiscal Eletrônica no SuasVendas, o retorno da SEFAZ apresenta: "Rejeição 215: Falha no Schema XML do lote de NFe".',
        root_cause: 'Preenchimento incorreto com caracteres especiais proibidos (ex: &, <, >, tabulações ou quebras de linha) no destinatário ou observações.',
        resolution_steps_markdown: '1. Acesse o menu Vendas > Pedidos.\n2. Verifique endereço e observações.\n3. Remova símbolos como & (use E).\n4. Transmita novamente.',
        quick_reply_snippet: 'Olá! Identificamos que a Rejeição 215 ocorreu devido a um caractere especial no cadastro.',
      },
      changed_by: 'Carlos Oliveira',
      change_reason: 'Formatação padronizada e adição do validador XML.',
      created_at: '2026-10-15T16:00:00Z',
    },
  ],
};

export const INITIAL_SEARCH_LOGS: SearchLog[] = [
  {
    id: 'log-1',
    user_email: 'mariana.souza@suasvendas.com',
    query_text: 'rejeicao 215',
    results_count: 1,
    clicked_article_id: 'art-rejeicao-215',
    latency_ms: 6,
    searched_at: '2026-10-26T14:10:00Z',
  },
  {
    id: 'log-2',
    user_email: 'lucas.ferreira@suasvendas.com',
    query_text: 'estoque bling',
    results_count: 1,
    clicked_article_id: 'art-sync-estoque-erp',
    latency_ms: 4,
    searched_at: '2026-10-26T14:18:00Z',
  },
  {
    id: 'log-3',
    user_email: 'lucas.ferreira@suasvendas.com',
    query_text: 'rejeicao 999 sefaz',
    results_count: 0, // Content Gap!
    latency_ms: 5,
    searched_at: '2026-10-26T14:25:00Z',
  },
  {
    id: 'log-4',
    user_email: 'mariana.souza@suasvendas.com',
    query_text: 'pix dinamico qrcode santander',
    results_count: 0, // Content Gap!
    latency_ms: 4,
    searched_at: '2026-10-26T14:40:00Z',
  },
  {
    id: 'log-5',
    user_email: 'carlos.oliveira@suasvendas.com',
    query_text: 'impressora zebra etiquetas',
    results_count: 0, // Content Gap!
    latency_ms: 5,
    searched_at: '2026-10-26T14:55:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    action: 'EXPORT_JSON',
    user_email: 'carlos.oliveira@suasvendas.com',
    details: 'Exportação completa do acervo da base (6 categorias, 142 artigos).',
    timestamp: '2026-10-26T08:00:00Z',
  },
  {
    id: 'aud-2',
    action: 'UPDATE_STATUS',
    user_email: 'mariana.souza@suasvendas.com',
    details: 'Artigo "Como resolver Rejeição 215" homologado para status PUBLISHED.',
    timestamp: '2026-10-25T18:30:00Z',
  },
];

export const INITIAL_OUTDATED_REPORTS: OutdatedReport[] = [
  {
    id: 'rep-1',
    article_id: 'art-sync-estoque-erp',
    article_title: 'Divergência de Saldo de Estoque: Integração Bling / Tiny ERP',
    reported_by: 'lucas.ferreira@suasvendas.com',
    reason: 'O Tiny ERP atualizou a interface de Webhooks no release de outubro e o caminho do menu mudou de lugar.',
    erp_version_affected: 'Tiny ERP v3.8.2',
    created_at: '2026-10-26T11:30:00Z',
    status: 'PENDING',
  },
];
