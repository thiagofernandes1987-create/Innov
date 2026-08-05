# Matriz de licenças e reaproveitamento técnico

**Data de verificação:** 03 de agosto de 2026  
**Escopo:** repositórios avaliados para o provider WhatsApp Web não oficial e ponte de IA  
**Finalidade:** orientar estudo, reimplementação, dependências e eventuais adaptações de código  
**Aviso:** este documento é controle técnico de conformidade; não substitui parecer jurídico.

---

## 1. Regra geral

A Innov adotará a seguinte ordem de preferência:

1. reutilizar princípios e padrões arquiteturais;
2. reimplementar contratos segundo o domínio Innov;
3. usar bibliotecas como dependências, preservando licença e avisos;
4. adaptar código apenas quando houver vantagem material comprovada;
5. não copiar código quando a licença estiver ausente, contraditória ou exigir revisão específica.

Toda adaptação substancial deverá registrar:

- projeto e repositório de origem;
- commit ou tag de origem;
- caminho do arquivo de origem;
- licença aplicável;
- arquivo de destino;
- natureza da alteração;
- testes próprios;
- aviso em `THIRD_PARTY_NOTICES.md`;
- revisão de segurança;
- aprovação no PR.

---

## 2. Classificação de uso

| Código | Significado |
|---|---|
| `CONCEPT` | estudar e reimplementar a técnica sem copiar expressão de código |
| `DEPENDENCY` | usar como dependência, preservando licença e avisos |
| `ADAPT-WITH-NOTICE` | adaptação possível, com rastreabilidade e avisos obrigatórios |
| `LEGAL-REVIEW` | nenhuma adaptação antes de revisão jurídica específica |
| `NO-COPY` | licença ausente, conflitante ou insuficiente para copiar |
| `LAB-ONLY` | uso apenas em laboratório/oracle, sem ser provider produtivo inicial |
| `HISTORICAL` | referência histórica, não base operacional |

---

## 3. Matriz por projeto

| Projeto | Categoria | Licença observada | Situação | Uso aprovado | Restrições principais |
|---|---|---|---|---|---|
| `WhiskeySockets/Baileys` | biblioteca de protocolo | MIT | licença raiz localizada | `DEPENDENCY`, `CONCEPT`, adaptação excepcional | preservar copyright/licença em cópias ou porções substanciais; licença do código não autoriza o canal perante o WhatsApp |
| `rmyndharis/OpenWA` | gateway multiprovider | MIT | licença raiz localizada | `CONCEPT`, `ADAPT-WITH-NOTICE` | não incorporar produto completo; evitar domínio, banco e dashboard paralelos |
| `tulir/whatsmeow` | biblioteca de protocolo em Go | MPL 2.0 | licença raiz localizada | `CONCEPT`; dependência futura sob revisão | arquivos MPL modificados e distribuídos permanecem sujeitos à MPL; não portar/copiar arquivos para TypeScript sem análise |
| `ArnasDon/wacrm` | CRM oficial + IA | MIT | licença raiz localizada | `CONCEPT`, `ADAPT-WITH-NOTICE` | não duplicar CRM, identidade visual ou modelos de conta; preservar aviso em adaptação substancial |
| `evolution-foundation/evolution-api` | gateway multiprovider | Apache 2.0 com condições adicionais próprias | licença localizada com notificação de uso e regras de marca | `CONCEPT`, `LEGAL-REVIEW` | nenhuma incorporação ou adaptação antes de avaliar as condições adicionais e eventual licença comercial |
| `wwebjs/whatsapp-web.js` | driver via Puppeteer | Apache 2.0 | licença declarada | `LAB-ONLY`, `CONCEPT`, possível dependência futura | manter NOTICE/licença quando aplicável; não será engine inicial; alto custo operacional de navegador |
| `sebferreira/WhatsControl` | CRM demonstrativo | licença não localizada na raiz | insuficiente para copiar | `CONCEPT`, `NO-COPY` | apenas UX e fluxos observáveis; nenhum código, texto ou asset copiado |
| `wangrongding/wechat-bot` | roteador IM/IA | `LICENSE.md` MIT; `package.json` declara ISC | metadados conflitantes | `CONCEPT`, `NO-COPY` até resolução | aproveitar apenas separação canal/provider; não copiar código enquanto a inconsistência persistir |
| `mruniquehacker/Knightbot-MD` | bot Baileys | README afirma MIT, mas arquivo `LICENSE` não foi localizado; README também contém linguagem de direitos reservados | conflitante/incompleto | `CONCEPT`, `NO-COPY` | somente padrão abstrato de command registry; nenhum plugin ou código copiado |
| `lyfe00011/whatsapp-bot` | userbot/plugin bot | licença não localizada | insuficiente para copiar | `CONCEPT`, `NO-COPY`, `HISTORICAL` | usar apenas como catálogo histórico de ideias; não importar plugins ou sessões |
| `sigalor/whatsapp-web-reveng` | pesquisa de protocolo legado | MIT | licença raiz localizada | `HISTORICAL`, `CONCEPT` | protocolo documentado é legado; não usar como implementação atual |

---

## 4. Matriz por técnica e arquivo de referência

### 4.1 Baileys

| Origem observada | Técnica | Destino planejado no Innov | Uso | Condição |
|---|---|---|---|---|
| `src/Socket/index.ts` | composição progressiva de sockets/capacidades | composição interna de adapters e services | `CONCEPT` | reimplementar contratos próprios |
| `src/Socket/socket.ts` | conexão, Noise, queries correlacionadas, pairing e lifecycle | `BaileysEngineAdapter` e `SessionLifecycleService` | `DEPENDENCY` + `CONCEPT` | tipos confinados ao adapter |
| `src/Socket/messages-send.ts` | devices, mutexes, sessions, media e receipts | outbound, locks e classificação de falhas | `CONCEPT` | não copiar grandes blocos sem aviso |
| `src/Socket/messages-recv.ts` | retries, placeholder resend, wrappers e identity change | ingress normalizado e retry ledger | `CONCEPT` | persistir antes de dispatch |
| `src/Utils/use-multi-file-auth-state.ts` | contrato de auth state e categorias de keys | `SessionCredentialStore` | `CONCEPT` | `useMultiFileAuthState` proibido em produção |
| `src/Defaults/index.ts` | defaults centralizados, TTLs e limites | configuração tipada e políticas explícitas | `CONCEPT` | não copiar números como verdade sem benchmark próprio |
| `WAProto` | estruturas protobuf do engine | apenas dependência transitiva/adapter | `DEPENDENCY` | não expor ao domínio |

### 4.2 OpenWA

| Origem observada | Técnica | Destino planejado | Uso | Condição |
|---|---|---|---|---|
| `src/engine/interfaces/whatsapp-engine.interface.ts` | interface neutra de engine e identidade | `MessagingEngine`, `SessionEngine`, modelos canônicos | `CONCEPT`; `ADAPT-WITH-NOTICE` se houver código derivado | preferência por reescrita própria |
| `src/engine/engine-capability-matrix.ts` | capability matrix por engine | `EngineCapabilityMatrix` | `CONCEPT` | capacidades definidas pelo domínio Innov |
| `src/engine/engine.factory.ts` | seleção e criação de engine | provider registry | `CONCEPT` | feature flags por organização |
| adapters Baileys/Web.js | fronteira anticorrupção | adapters separados | `CONCEPT` | não herdar persistência ou API inteira |
| segurança/API/webhooks | HMAC, API keys, CIDR, rate limit | gateway interno | `CONCEPT` | adaptar aos controles já existentes no Innov |

### 4.3 whatsmeow

| Origem observada | Técnica | Destino planejado | Uso | Condição |
|---|---|---|---|---|
| `store/sqlstore/container.go` | container SQL multi-sessão e migrations | schema transacional de sessões | `CONCEPT` | não portar código MPL linha a linha |
| `store/sqlstore/store.go` | persistência granular de Signal/app state | `SessionCredentialStore` | `CONCEPT` | implementação TypeScript própria |
| `store/sqlstore/lidmap.go` | mapeamento PN/LID persistente | identity aliases | `CONCEPT` | domínio neutro e RLS |

### 4.4 wacrm

| Origem observada | Técnica | Destino planejado | Uso | Condição |
|---|---|---|---|---|
| `src/lib/ai/knowledge.ts` | RAG híbrido, fallback lexical e ingest idempotente | knowledge retrieval do Innov | `CONCEPT`; possível `ADAPT-WITH-NOTICE` | filtros por organização, obra, versão e validade |
| `src/lib/ai/auto-reply.ts` | workflow primeiro, limites, handoff e fail-safe | `AiOrchestrator` | `CONCEPT`; possível `ADAPT-WITH-NOTICE` | primeiro modo `draft_only` |
| migrations de IA | pgvector, FTS e RLS | schema próprio | `CONCEPT` | não duplicar documentos canônicos |
| MCP/API keys | leitura por padrão, escopos e revogação | integração futura | `CONCEPT` | escrita somente opt-in e auditada |

### 4.5 Evolution API

| Técnica observada | Destino planejado | Uso | Condição |
|---|---|---|---|
| adapters de broker/eventos | `EventPublisher` e consumers | `CONCEPT` | implementar somente o broker necessário |
| multiprovider | provider registry | `CONCEPT` | não incorporar o backend completo |
| storage S3/MinIO | abstração de mídia | `CONCEPT` | usar storage já governado do Innov |
| integrações de IA/chatbot | consumers externos | `CONCEPT` | IA permanece independente do transporte |

### 4.6 whatsapp-web.js

| Técnica observada | Destino planejado | Uso | Condição |
|---|---|---|---|
| cliente Web via Puppeteer | oracle comportamental | `LAB-ONLY` | número descartável/autorizado, sem dados reais |
| eventos e compatibilidade visual | testes comparativos | `CONCEPT` | não usar como verdade única |
| auth strategies | comparação de lifecycle | `CONCEPT` | não reutilizar sessão de produção |

### 4.7 Projetos sem licença clara

Para WhatsControl, Knightbot-MD e `lyfe00011/whatsapp-bot`:

- não copiar código;
- não copiar textos, assets ou plugins;
- não derivar arquivos;
- registrar apenas padrões abstratos;
- usar exemplos próprios nos testes e documentação.

---

## 5. Obrigações por licença

### MIT

Quando código ou porções substanciais forem copiados/adaptados:

- manter copyright;
- incluir a permissão MIT;
- registrar origem e commit;
- não sugerir endosso do autor.

Usar somente a ideia ou padrão, com implementação independente, normalmente não exige copiar o aviso no arquivo novo, mas a Innov manterá rastreabilidade documental por prudência.

### Apache 2.0

Quando aplicável:

- preservar a licença;
- marcar arquivos modificados;
- preservar avisos pertinentes;
- incorporar NOTICE quando existir;
- observar cláusulas de patentes e marcas.

### MPL 2.0

- modificações em arquivos cobertos permanecem MPL quando distribuídas;
- o Larger Work pode ter outros termos, desde que os arquivos cobertos cumpram a MPL;
- não copiar arquivos MPL para arquivos proprietários sem revisão de arquitetura/licença.

### Licenças customizadas ou inconsistentes

- bloquear adaptação;
- obter revisão jurídica ou autorização do titular;
- não inferir permissões a partir de badges, README ou `package.json` isoladamente.

---

## 6. Gate de contribuição externa

Antes de qualquer PR com código derivado, o autor deverá preencher:

```text
Projeto de origem:
URL:
Commit/tag:
Arquivo(s) de origem:
Licença:
Arquivo(s) de destino:
Trecho/técnica adaptada:
Por que implementação própria não foi suficiente:
Alterações realizadas:
Testes adicionados:
Análise de segurança:
Entrada em THIRD_PARTY_NOTICES.md:
Aprovação:
```

PR sem esse bloco, quando houver adaptação substancial, deve falhar na revisão.

---

## 7. Estado atual

| Item | Estado |
|---|---|
| Código externo copiado para o novo provider | `NO` |
| Baileys adicionado como dependência | `NO` |
| Adaptação MIT substancial realizada | `NO` |
| Arquivo MPL incorporado | `NO` |
| Código de projeto sem licença incorporado | `NO` |
| `THIRD_PARTY_NOTICES.md` preventivo criado | `YES` |
| Revisão jurídica de produção concluída | `NO` |

A matriz deverá ser atualizada sempre que uma dependência, versão, arquivo ou estratégia de reaproveitamento mudar.