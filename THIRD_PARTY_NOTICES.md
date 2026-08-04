# Third-Party Notices

Este arquivo registra componentes e referências de terceiros utilizados pela Innovar Platform.

**Atualizado em:** 04 de agosto de 2026  
**Regra:** dependência instalada, técnica conceitual e código adaptado são categorias distintas. Licença open source não autoriza automaticamente um canal perante o WhatsApp.

## 1. Dependência incorporada no gateway

### WhiskeySockets/Baileys

- pacote: `@whiskeysockets/baileys`;
- versão exata: `7.0.0-rc13`;
- repositório: `WhiskeySockets/Baileys`;
- licença declarada: MIT;
- workspace: `apps/messaging-gateway`;
- caminho do adapter: `apps/messaging-gateway/src/engines/baileys/`;
- uso: tipos oficiais confinados, fábrica lazy, tradução anticorrupção e contract tests sem rede;
- runtime registrado: não;
- conexão externa: não;
- sessão, QR, pairing ou número real: não;
- lifecycle scripts: bloqueados por `--ignore-scripts`;
- piloto e produção: não autorizados.

O runtime ativo do gateway continua sendo `FakeChannelClient`. A fábrica oficial de socket falha fechado sem autorização explícita.

Lockfile W-06:

- pacote resolvido: `@whiskeysockets/baileys@7.0.0-rc13`;
- SHA-256 aprovado: `d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9`;
- lifecycle scripts executados: não.

### Dependências transitivas

A cadeia resolvida inclui componentes como `libsignal`, `whatsapp-rust-bridge`, `ws`, `protobufjs` e `pino`, além de peer opcional de imagem. A licença MIT do pacote principal não elimina obrigações ou incompatibilidades transitivas.

Consequências:

- revisão jurídica e da SBOM é obrigatória antes de piloto;
- a dependência permanece experimental e confinada;
- incompatibilidade exige remoção, substituição ou isolamento sob política aprovada;
- nenhuma conexão externa é autorizada pelo simples fato de o pacote ser open source.

## 2. Referências arquiteturais sem cópia

| Projeto | Licença observada | Uso |
|---|---|---|
| `rmyndharis/OpenWA` | MIT | interface neutra, capability matrix, adapters e gateway |
| `tulir/whatsmeow` | MPL 2.0 | persistência SQL e PN/LID; nenhum arquivo MPL incorporado |
| `ArnasDon/wacrm` | MIT | retrieval híbrido, handoff, limites e workflow antes da IA |
| `evolution-foundation/evolution-api` | Apache 2.0 com condições adicionais | eventos e multiprovider; revisão específica obrigatória |
| `wwebjs/whatsapp-web.js` | Apache 2.0 | referência/laboratório; não instalado |
| `sebferreira/WhatsControl` | licença não localizada | UX conceitual; cópia proibida |
| `wangrongding/wechat-bot` | MIT/ISC conflitantes | separação canal/IA; cópia bloqueada |
| `mruniquehacker/Knightbot-MD` | declaração conflitante | command registry conceitual; cópia bloqueada |
| `lyfe00011/whatsapp-bot` | licença não localizada | referência histórica; cópia bloqueada |
| `sigalor/whatsapp-web-reveng` | MIT | referência histórica de protocolo legado |

Nenhum código-fonte desses projetos foi copiado ou adaptado substancialmente na Etapa 22.

## 3. Obrigações de contribuição

Adaptação substancial futura deve registrar:

- projeto, URL, tag/commit e arquivos de origem;
- licença e copyright;
- arquivos de destino;
- natureza e extensão da adaptação;
- testes próprios e análise de segurança;
- entrada neste arquivo;
- aprovação no PR.

MIT exige preservação do aviso em cópias substanciais. Apache 2.0 exige licença/NOTICE quando aplicável. MPL 2.0 mantém obrigações nos arquivos cobertos. Licença ausente ou inconsistente bloqueia cópia.

## 4. Proibições

- remover copyright ou origem;
- copiar projeto sem licença clara;
- misturar arquivo MPL em arquivo proprietário sem revisão;
- ocultar derivação textual;
- usar marca externa como endosso;
- tratar licença MIT como aprovação de toda a árvore transitiva;
- tratar teste sintético como autorização de uso real.

## 5. Encerramento W-22

- dependência Baileys registrada: sim;
- versão exata e lockfile verificados: sim;
- código externo copiado: não;
- revisão jurídica de produção: pendente;
- homologação real: não executada;
- piloto real: `HOLD / NOT_EXECUTED`;
- produção: `NOT_AUTHORIZED`;
- PR `#40`: draft, aberto e não mesclado.

Qualquer mudança de versão, licença, árvore ou estratégia deve atualizar este arquivo e a matriz de licenças no mesmo commit.
