# Matriz de licenças e reaproveitamento técnico

**Data de verificação:** 04 de agosto de 2026  
**Escopo:** provider WhatsApp Web experimental, gateway, IA e referências arquiteturais  
**Aviso:** controle técnico; não substitui revisão jurídica.

## 1. Regra geral

Ordem de preferência:

1. reutilizar princípios e padrões;
2. reimplementar contratos no domínio Innov;
3. usar dependências com versão exata, licença e avisos;
4. adaptar código somente com vantagem material, rastreabilidade e testes;
5. bloquear cópia quando licença estiver ausente, conflitante ou exigir revisão.

Classificações:

- `CONCEPT`: estudar e reimplementar;
- `DEPENDENCY`: usar como dependência preservando obrigações;
- `ADAPT-WITH-NOTICE`: adaptação rastreada;
- `LEGAL-REVIEW`: revisão jurídica obrigatória;
- `NO-COPY`: cópia proibida;
- `LAB-ONLY`: laboratório, não runtime produtivo;
- `HISTORICAL`: referência histórica.

## 2. Dependência incorporada

### WhiskeySockets/Baileys

| Campo | Estado |
|---|---|
| Baileys adicionado como dependência | `YES` |
| Pacote | `@whiskeysockets/baileys` |
| Versão | `7.0.0-rc13` |
| Range | nenhum; versão exata |
| Workspace | `apps/messaging-gateway` |
| Licença declarada pelo pacote/tag | MIT |
| Uso | `DEPENDENCY` + `CONCEPT` |
| Código upstream copiado | `NO` |
| Tipos nativos fora do adapter | `NO` |
| Lifecycle scripts executados | `NO` |
| Runtime produtivo registrado | `NO` |
| Conexão externa executada | `NO` |
| Sessão/QR/pairing/número real | `NO` |
| Piloto/produção | `NOT_AUTHORIZED` |

O adapter anticorrupção foi desenvolvido no repositório Innov. A instalação usa `--ignore-scripts`, e o lockfile aprovado fixa a árvore resolvida da W-06.

### Risco transitivo

A licença MIT do pacote principal não resolve automaticamente obrigações ou incompatibilidades das dependências transitivas. A cadeia observada inclui componentes como `libsignal`, `whatsapp-rust-bridge`, `ws`, `protobufjs` e `pino`, além de peer opcional de processamento de imagem.

Portanto:

- a incorporação permanece experimental e confinada;
- revisão jurídica e revisão da SBOM transitiva são gates obrigatórios;
- se houver incompatibilidade, o provider deve ser removido, substituído ou isolado sob política aprovada;
- nenhuma licença open source constitui autorização do WhatsApp para operar cliente não oficial.

## 3. Projetos avaliados

| Projeto | Licença observada | Uso aprovado | Restrições |
|---|---|---|---|
| `WhiskeySockets/Baileys` | MIT | `DEPENDENCY`, `CONCEPT` | preservar licença; revisão jurídica transitiva; sem produção |
| `rmyndharis/OpenWA` | MIT | `CONCEPT`, eventual `ADAPT-WITH-NOTICE` | não incorporar produto/domínio completo |
| `tulir/whatsmeow` | MPL 2.0 | `CONCEPT`, futura dependência sob revisão | não portar/copiar arquivos MPL para TS proprietário |
| `ArnasDon/wacrm` | MIT | `CONCEPT`, eventual `ADAPT-WITH-NOTICE` | não duplicar CRM ou identidade visual |
| `evolution-foundation/evolution-api` | Apache 2.0 com condições adicionais | `CONCEPT`, `LEGAL-REVIEW` | sem adaptação antes da revisão específica |
| `wwebjs/whatsapp-web.js` | Apache 2.0 | `LAB-ONLY`, `CONCEPT` | não instalado; não é engine inicial |
| `sebferreira/WhatsControl` | licença não localizada | `CONCEPT`, `NO-COPY` | apenas fluxos/UX observáveis |
| `wangrongding/wechat-bot` | MIT/ISC conflitantes | `CONCEPT`, `NO-COPY` | sem código até resolução |
| `mruniquehacker/Knightbot-MD` | declaração conflitante/incompleta | `CONCEPT`, `NO-COPY` | nenhum plugin ou código copiado |
| `lyfe00011/whatsapp-bot` | licença não localizada | `CONCEPT`, `NO-COPY`, `HISTORICAL` | apenas catálogo histórico |
| `sigalor/whatsapp-web-reveng` | MIT | `HISTORICAL`, `CONCEPT` | protocolo legado; não operacional |

## 4. Técnicas reaproveitadas conceitualmente

### Baileys

- composição de sockets e capabilities;
- normalização de eventos, mensagens, receipts e identidades;
- categorias de auth state;
- lifecycle e reconnect;
- nenhum `useMultiFileAuthState` produtivo;
- nenhum tipo nativo fora da fronteira autorizada.

### OpenWA

- interface neutra de engine;
- capability matrix;
- adapters separados;
- HMAC, rate limit e isolamento de gateway.

### whatsmeow

- persistência granular e transacional;
- mapeamento PN/LID;
- nenhum arquivo MPL incorporado.

### wacrm

- retrieval híbrido;
- workflow antes da IA;
- limites atômicos;
- handoff;
- IA inicialmente `DRAFT_ONLY`.

### Evolution API e whatsapp-web.js

- eventos, filas e multiprovider apenas como conceitos;
- oracle/laboratório não instalado;
- nenhuma incorporação do backend completo.

## 5. Obrigações

### MIT

Preservar copyright e permissão em cópias ou porções substanciais; registrar origem, tag/commit e alterações; não sugerir endosso.

### Apache 2.0

Preservar licença, avisos e NOTICE quando aplicável; observar patentes e marcas.

### MPL 2.0

Arquivos cobertos modificados e distribuídos permanecem sujeitos à MPL. Não misturar conteúdo MPL em arquivo proprietário sem revisão.

### Licença ausente ou conflitante

Bloquear cópia e adaptação; obter autorização ou revisão jurídica; badges e README não bastam.

## 6. Estado final W-22

| Controle | Estado |
|---|---|
| Baileys adicionado como dependência | `YES` |
| Versão exata e lockfile verificado | `YES` |
| Código externo copiado | `NO` |
| Adaptação substancial MIT | `NO` |
| Arquivo MPL incorporado | `NO` |
| Código sem licença incorporado | `NO` |
| `THIRD_PARTY_NOTICES.md` atualizado | `YES` |
| Scanner de segredos | `GREEN` no head funcional anterior |
| SBOM técnica | `GENERATED_SYNTHETIC_REVIEW_PENDING` |
| revisão jurídica | `PENDING_EXTERNAL_REVIEW` |
| provider liberado para piloto | `NO` |
| provider liberado para produção | `NO` |

## 7. Gate futuro

Qualquer alteração de versão, dependência, licença, código derivado ou estratégia precisa atualizar esta matriz e `THIRD_PARTY_NOTICES.md` no mesmo commit. A ausência de revisão jurídica mantém o estado `HOLD / NOT_AUTHORIZED`.
