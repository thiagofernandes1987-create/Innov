# Análise de referências open source — WhatsApp no Innov

**Data:** 03/08/2026  
**Branch:** `feature/etapa-22-whatsapp-omnichannel`  
**Status:** decisão arquitetural; nenhum código externo copiado

## Objetivo

Avaliar projetos de CRM, mensageria e automação para identificar padrões que possam
fortalecer o módulo de WhatsApp do Innov sem:

- substituir a WhatsApp Business Platform oficial por automação não autorizada;
- duplicar CRM, clientes, obras, contratos, SAC ou documentos;
- introduzir banco, autenticação e governança paralelos;
- criar dependência jurídica incompatível com o produto;
- perder a regra de fonte única das mensagens padrão.

Projetos analisados:

- https://github.com/ArnasDon/wacrm
- https://github.com/evolution-foundation/evolution-api
- https://github.com/sebferreira/WhatsControl
- https://github.com/wwebjs/whatsapp-web.js

## Resultado executivo

| Projeto | Canal | Stack/forma | Licença observada | Adequação ao Innov | Decisão |
| --- | --- | --- | --- | --- | --- |
| wacrm | Meta Cloud API oficial | Next.js 16 + Supabase | MIT | Muito alta | Reaproveitar padrões e, quando vantajoso, adaptar código com atribuição |
| Evolution API | Cloud API oficial + Baileys | serviço Express/Prisma/Redis | Apache 2.0 com condições adicionais | Média como gateway externo | Usar como referência de provider/eventos; não incorporar o produto inteiro |
| WhatsControl | WhatsApp Web | React/Vite + Express + Socket.io | licença não localizada na raiz | Baixa para backend; média para UX | Usar apenas como referência visual/conceitual |
| whatsapp-web.js | WhatsApp Web via Puppeteer | biblioteca Node.js | Apache 2.0 | Baixa para produção corporativa | Não usar como canal primário ou fallback automático |

## 1. wacrm

### Pontos fortes

- mesma geração tecnológica do Innov: Next.js 16, React 19, TypeScript e Supabase;
- uso exclusivo da Meta Cloud API;
- caixa compartilhada, atribuição de atendentes e notas;
- contatos, tags, campos personalizados e deduplicação;
- campanhas por templates aprovados;
- automações e fluxos visuais;
- bot com transferência explícita para humano;
- base de conhecimento e resposta assistida;
- API pública com chaves escopadas;
- MCP somente leitura por padrão, com escrita opt-in;
- RLS, HMAC de webhook, rate limiting e CI;
- cifragem AES-256-GCM das credenciais armazenadas;
- registro do número e assinatura da WABA ao aplicativo;
- sincronização do ciclo de vida de templates;
- transições de status monotônicas;
- processamento posterior à confirmação do webhook em ambiente serverless.

### O que será incorporado

1. **Registro operacional do número**
   - verificar `phone_number_id`;
   - registrar o número no aplicativo;
   - assinar a WABA;
   - registrar `registered_at`, `subscribed_apps_at`, qualidade e último erro.

2. **Status monotônico**
   - `QUEUED → SENT → DELIVERED → READ`;
   - `FAILED` apenas antes da entrega;
   - eventos repetidos ou fora de ordem não rebaixam o estado.

3. **Templates sincronizados**
   - ID da Meta;
   - status real;
   - motivo de rejeição;
   - qualidade verde/amarela/vermelha;
   - indicação de componente alterado pela Meta;
   - sincronização manual de contingência.

4. **Deduplicação de contatos**
   - telefone normalizado por organização e conta;
   - prevenção de conversas duplicadas;
   - reconciliação segura com Cliente 360.

5. **Atendimento humano**
   - atribuição;
   - transferência;
   - notas internas;
   - notificações;
   - resumo de handoff quando houver automação/IA.

6. **Campanhas com outbox**
   - criação e entrega em fases separadas;
   - destinatários persistidos antes do envio;
   - falha isolada por destinatário;
   - contadores derivados do banco;
   - limite e rate limiting explícitos.

7. **API de integração**
   - chaves apresentadas uma única vez;
   - apenas hash armazenado;
   - escopos mínimos;
   - revogação e auditoria;
   - rate limit compartilhado quando houver múltiplas instâncias.

### O que não será copiado diretamente

- identidade visual;
- CRM/pipeline próprio;
- estrutura de contas que conflite com organizações e perfis do Innov;
- tabelas que dupliquem clientes, oportunidades, contratos ou documentos;
- textos de interface;
- código sem necessidade técnica demonstrável.

Quando houver adaptação substancial de código MIT, o aviso de copyright e a licença
correspondente deverão ser mantidos em `THIRD_PARTY_NOTICES.md`.

## 2. Evolution API

### Pontos fortes

- arquitetura multicanal e multiprovedor;
- suporte simultâneo a Cloud API e Baileys;
- API REST independente;
- Redis;
- WebSocket;
- RabbitMQ, Kafka, SQS, NATS e Pusher;
- S3/MinIO;
- integração com Chatwoot, Typebot, Dify, OpenAI e outros;
- isolamento por instância;
- capacidade de operar como gateway de mensageria.

### Limitações para o Innov

- adicionaria outro serviço de backend;
- introduziria Prisma e um segundo modelo de persistência;
- exigiria Redis e operação adicional;
- parte considerável das funções duplicaria o módulo já construído;
- o suporte a Baileys não deve ser confundido com integração oficial;
- a licença contém condições adicionais de marca e notificação de uso;
- a telemetria precisa ser avaliada/desabilitada conforme governança e LGPD.

### Decisão

Não embutir a Evolution API no Innov nesta etapa.

A arquitetura do Innov deverá possuir um contrato de provider para permitir, no futuro:

```text
META_CLOUD_DIRECT      obrigatório e padrão
EVOLUTION_CLOUD        adaptador externo opcional
OUTRO_PROVIDER_OFICIAL adaptador futuro
```

`EVOLUTION_BAILEYS` não será habilitado em produção.

A Evolution poderá ser considerada quando houver necessidade real de:

- múltiplos canais além do WhatsApp;
- filas externas de alto volume;
- integração pronta com Chatwoot/Typebot;
- gateway independente para várias aplicações;
- operação on-premises separada do Innov.

## 3. WhatsControl

### Pontos fortes observados

- interface orientada a conversas;
- múltiplos agentes;
- atualização em tempo real;
- transferência bot → humano;
- cadastro automático de contatos;
- dashboard operacional.

### Limitações

- backend baseado em `whatsapp-web.js`;
- dependência de navegador/sessão;
- risco de desconexão e bloqueio;
- stack separada do Innov;
- ausência de licença localizada na raiz durante a análise impede copiar código com segurança jurídica.

### Decisão

Usar somente como referência de experiência:

- disposição da caixa de entrada;
- indicação de atendimento humano/bot;
- painel de contato;
- transferência entre agentes;
- estados em tempo real.

Nenhum código será copiado sem licença expressa.

## 4. whatsapp-web.js

### Pontos fortes

- cobertura ampla das funções do cliente Web;
- mídia, respostas, reações, grupos, localização e enquetes;
- comunidade e manutenção ativa;
- licença Apache 2.0.

### Riscos incompatíveis com o núcleo do Innov

- usa Puppeteer sobre funções internas do WhatsApp Web;
- exige sessão persistente e navegador gerenciado;
- alterações do cliente Web podem quebrar a integração;
- não há garantia contra bloqueio;
- o próprio projeto declara não ser oficial e alerta que bots/clientes não oficiais não são permitidos;
- operação serverless é inadequada para sessões longas de navegador;
- não oferece as garantias, templates, governança e rastreabilidade da plataforma empresarial oficial.

### Decisão

Não adicionar `whatsapp-web.js` às dependências do Innov.

Somente poderá ser experimentado em um laboratório isolado, com número descartável e sem
dados reais, para pesquisa de UX/eventos. Não poderá:

- receber credenciais de produção;
- operar o número comercial;
- aparecer como fallback automático;
- compartilhar banco, sessão ou storage com o Innov;
- ser promovido sem revisão jurídica, de segurança e dos termos aplicáveis.

## Arquitetura selecionada

```text
Innovar Platform
├── domínio canônico
│   ├── Cliente 360
│   ├── CRM
│   ├── Obras
│   ├── Contratos e aditivos
│   ├── SAC
│   └── Modelos e documentos versionados
├── módulo WhatsApp
│   ├── Inbox
│   ├── Atribuição/notas/handoff
│   ├── Templates sincronizados
│   ├── Campanhas/outbox
│   ├── Automações
│   └── Auditoria
├── provider contract
│   └── Meta Cloud API direta
├── eventos duráveis
│   ├── inbound webhook
│   ├── status
│   ├── template lifecycle
│   └── outbox
└── Supabase
    ├── Auth/RLS
    ├── PostgreSQL
    ├── Realtime
    └── Storage privado/quarentena
```

## Melhorias incorporadas imediatamente

- prevenção de regressão dos estados de entrega;
- testes da máquina de estados;
- análise documentada e rastreável;
- preservação da Cloud API como único provider produtivo inicial.

## Backlog prioritário derivado da análise

### P0 — antes da homologação

- registrar número e WABA no aplicativo da Meta;
- diagnosticar qualidade e estado da conta;
- tornar o processamento do webhook durável;
- guardar tentativa, erro e reprocessamento;
- aplicar máquina de estados também no banco;
- sincronizar templates aprovados/rejeitados;
- baixar mídia recebida para quarentena antes do bucket final;
- validar isolamento multiempresa e escopo por obra;
- executar E2E com número de teste.

### P1 — atendimento

- filas e equipes;
- atribuição e transferência;
- notas internas;
- notificações;
- tags;
- SLA e vínculo automático com SAC;
- presença/digitação e atualização por Supabase Realtime;
- respostas e contexto da mensagem original.

### P2 — produtividade

- campanhas por templates;
- outbox e rate limiting;
- automações condicionais;
- bot com handoff humano;
- base de conhecimento usando documentos autorizados;
- API pública com chaves escopadas;
- MCP read-only por padrão.

### P3 — escala

- provider abstraction;
- fila externa quando métricas justificarem;
- adaptador opcional para gateway multicanal oficial;
- observabilidade de volume, latência, erro, qualidade e custo.

## Conclusão

O melhor caminho não é instalar um CRM externo dentro do Innov. É absorver os padrões maduros
do wacrm, manter a arquitetura modular inspirada nos providers/eventos da Evolution e rejeitar
a dependência de sessão Web para produção.

A implementação permanece proprietária do Innov e preserva seu diferencial principal:
mensagens, propostas, contratos, aditivos e documentos são resolvidos a partir das fontes
versionadas já existentes, com proveniência e hash, em vez de serem copiados para um cadastro
paralelo de respostas prontas.
