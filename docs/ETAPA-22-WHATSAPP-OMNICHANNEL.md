# Etapa 22 — WhatsApp oficial e atendimento omnichannel

**Status:** implementação inicial em branch, sem homologação externa  
**Rota:** `/app/whatsapp`  
**Provider:** WhatsApp Business Platform — Cloud API  
**Produção:** não liberada

## Objetivo

Incorporar ao Innov uma central de conversas multiatendente ligada a CRM, Cliente 360,
obras, contratos e SAC, sem criar cadastro paralelo nem copiar mensagens padrão.

O princípio central é:

```text
modelo/documento versionado → binding canônico → resolução no envio
→ snapshot/hash da fonte → mensagem → status do provider → auditoria
```

## Regra de fonte única

`whatsapp_content_bindings` não possui corpo de mensagem. O registro contém somente:

- organização;
- nome operacional;
- tipo da fonte;
- ID da versão/origem;
- campo autorizado;
- template aprovado na Meta, quando aplicável;
- idioma;
- ordem dos parâmetros;
- esquema das variáveis.

No momento do envio, `lib/whatsapp/source-resolver.ts` lê a fonte existente e produz o
conteúdo. A mensagem enviada conserva `source_snapshot` com:

- tipo, ID e campo da fonte;
- número da versão;
- nome da fonte;
- SHA-256;
- instante da resolução.

Assim, o histórico continua reproduzível mesmo que um novo modelo seja criado depois.

## Fontes suportadas

| Fonte | Campos permitidos |
| --- | --- |
| `contract_templates` | `body_template` |
| `proposal_versions` | título, objeto, escopo, resumo comercial, pagamento, prazo, garantia, notas e PDF |
| `contract_versions` | corpo renderizado e PDF |
| `amendment_versions` | corpo renderizado e PDF |
| `project_document_versions` | arquivo privado da versão |

Documentos usam URL assinada temporária. Nenhum bucket é tornado público.

## Escopo funcional

### Caixa de entrada

- conversas por conta e contato;
- status aberto, pendente ou encerrado;
- não lidas;
- responsável;
- vínculo opcional com cliente, obra, contrato, oportunidade e chamado;
- histórico de texto, template e documento;
- status enviado, entregue, lido ou falho.

### Abertura de conversa

- número normalizado com país e DDD;
- contato reutilizado por conta;
- vínculo com Cliente 360 e obra;
- apenas uma conversa aberta/pendente por contato e conta.

### Mensagens padrão

- cadastro a partir de uma fonte existente;
- variáveis em JSON;
- ordem explícita dos parâmetros do template aprovado;
- idioma configurável;
- nenhum texto duplicado no domínio WhatsApp.

### Provider

- versão da Graph API obrigatoriamente configurável;
- token somente no cofre do ambiente;
- envio por Bearer token server-side;
- texto, template e documento;
- erros técnicos registrados internamente sem expor token ou payload sensível.

### Webhook

- verificação `hub.verify_token`;
- validação HMAC SHA-256 de `x-hub-signature-256`;
- idempotência por SHA-256 do corpo;
- mensagens recebidas;
- criação de contato e conversa;
- atualização da janela de atendimento;
- status de envio, entrega, leitura e falha;
- payload bruto não persistido;
- tentativas falhas podem ser reprocessadas.

## Janela de atendimento

Mensagens livres e documentos são autorizados somente quando a última mensagem do cliente
está dentro da janela de 24 horas. A regra é aplicada:

1. na Server Action;
2. novamente na RPC `queue_whatsapp_outbound_message`.

Fora da janela, a versão inicial exige um binding com `meta_template_name`. Documento fora
da janela permanece bloqueado até a implementação de cabeçalho de mídia em template.

## Banco de dados

- `whatsapp_accounts`;
- `whatsapp_contacts`;
- `whatsapp_conversations`;
- `whatsapp_content_bindings`;
- `whatsapp_messages`;
- `whatsapp_message_status_events`;
- `whatsapp_webhook_events`.

Mensagens, eventos de status e webhooks são históricos protegidos contra escrita direta
por `authenticated`.

## Segurança

- RLS em todas as tabelas;
- autorização pelo módulo e escopo da obra;
- configuração exige `whatsapp:administer`;
- envio exige edição;
- leitura exige acesso ao módulo;
- `service_role` somente no servidor e webhook;
- tokens, segredo do app e token de verificação nunca entram no banco;
- URLs de documentos expiram em cinco minutos;
- idempotência de envio e webhook;
- hashes de origem e payload;
- erros do provider sanitizados;
- nenhuma RPC operacional para `anon`.

## Variáveis de ambiente

```env
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

A versão da Graph API não possui fallback fixo, pois deve ser promovida de forma controlada.

## Permissões padrão

| Perfil | Acesso inicial |
| --- | --- |
| SUPER_ADMIN, DIREÇÃO, ADMINISTRADOR | completo e administração |
| COMERCIAL, SAC | edição |
| GESTOR DE OBRAS, ENGENHEIRO, ORÇAMENTISTA, FINANCEIRO | leitura |
| demais e CLIENTE | nenhum |

O aplicativo é instalado habilitado para permitir configuração, mas não envia nada enquanto
as variáveis do provider e uma conta ativa não existirem.

## Arquivos

```text
app/app/whatsapp/page.tsx
app/actions/whatsapp.ts
app/api/webhooks/whatsapp/route.ts
lib/whatsapp/domain.ts
lib/whatsapp/client.ts
lib/whatsapp/source-resolver.ts
lib/whatsapp/server.ts
supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql
scripts/validate-stage22.mjs
tests/whatsapp-domain.test.ts
```

## Validação local

```bash
pnpm validate:stage22
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Pendências externas

- criar/configurar o aplicativo e a conta na Meta;
- cadastrar URL pública do webhook;
- configurar secrets em homologação;
- aprovar templates da Meta;
- aplicar a migration no Supabase;
- executar E2E autenticado com número de teste;
- validar envio e recebimento de mídia real;
- revisar advisor de RLS, índices e privilégios;
- homologar visualmente em mobile e desktop;
- definir política de retenção de conversas conforme LGPD.

## Definition of Done

A etapa não pode ser considerada concluída antes de:

- migration aplicada e alinhada ao ledger remoto;
- provider configurado em homologação;
- webhook verificado e assinado;
- texto dentro da janela aprovado;
- template fora da janela aprovado;
- documento privado aprovado;
- mensagens recebidas e status aprovados;
- vínculo com cliente/obra/SAC validado;
- RLS e isolamento multiempresa testados;
- nenhuma credencial versionada;
- documentação canônica atualizada;
- validador, lint, tipos, testes e build verdes;
- PR revisado; nenhum merge automático.
