# Third-Party Notices

Este arquivo registra componentes, referências e adaptações de terceiros utilizadas pela Innovar Platform.

**Regra:** uma biblioteca planejada, mas ainda não adicionada, não é apresentada como dependência instalada. Uma técnica estudada, sem cópia de código, é registrada como referência arquitetural, não como obra derivada.

---

## 1. Estado do provider WhatsApp Web não oficial

Na data de 04 de agosto de 2026:

- `@whiskeysockets/baileys@7.0.0-rc13` foi adicionado somente ao workspace `apps/messaging-gateway`;
- a versão é exata, sem `latest`, `^`, `~` ou wildcard;
- nenhum código-fonte dos projetos de referência foi copiado para o Innov;
- o adapter próprio usa contratos e traduções desenvolvidos no repositório Innov;
- imports e tipos nativos Baileys ficam confinados a `apps/messaging-gateway/src/engines/baileys/`;
- nenhum arquivo MPL de projeto de referência foi incorporado;
- nenhum código de projeto sem licença clara foi incorporado;
- lifecycle scripts de dependências são bloqueados por `--ignore-scripts` no CI e no Docker;
- o runtime ativo do gateway continua sendo `FakeChannelClient`;
- a fábrica oficial de socket falha fechado sem autorização explícita;
- nenhuma conexão externa, sessão, credencial, QR persistido, pairing, número real, deploy ou produção foi criada;
- revisão jurídica continua obrigatória antes de piloto ou produção.

---

## 2. Dependência incorporada no gateway

### WhiskeySockets/Baileys

- Pacote: `@whiskeysockets/baileys`
- Versão fixada: `7.0.0-rc13`
- Tag upstream revisada: `v7.0.0-rc13`
- Repositório: `https://github.com/WhiskeySockets/Baileys`
- Licença declarada pelo pacote/tag: MIT
- Autor declarado: Rajeh Taher
- Caminho de uso: `apps/messaging-gateway/src/engines/baileys/`
- Escopo: tipos oficiais confinados, fábrica lazy de socket, tradução por adapter anticorrupção e contract tests sem rede
- Runtime registrado no Innov: **não**
- Sessão real: **não**
- Lifecycle scripts executados: **não**
- Lockfile resolvido em CI: artefato `pnpm-lock-w06`
- SHA-256 do lockfile resolvido: `d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9`
- SHA-256 do ZIP do artefato GitHub Actions: `4261c27746f362710344c066cf919fd9b15bd6932b894052782ad3c4e065baed`
- CI funcional de referência: `30904107383`

#### Dependências transitivas críticas observadas

O manifesto upstream da tag fixa ou declara, entre outras:

- `libsignal@^6.0.0`;
- `whatsapp-rust-bridge@0.5.4`;
- `ws@^8.13.0`;
- `protobufjs@^7.5.6`;
- `pino@^9.6`;
- peer opcional `sharp`.

Há histórico público de preocupação dos mantenedores com a licença GPLv3 associada à cadeia `libsignal`. A licença MIT declarada pelo pacote principal não elimina automaticamente obrigações ou incompatibilidades de dependências transitivas. Portanto:

- a incorporação atual é experimental e confinada;
- o adapter não está autorizado para piloto ou produção;
- uma revisão jurídica/SBOM da árvore efetivamente resolvida é gate obrigatório antes de qualquer promoção;
- se a revisão concluir incompatibilidade com o modelo de distribuição, o provider deverá ser substituído, isolado por serviço com política específica ou removido.

#### Lifecycle scripts bloqueados

O pacote upstream declara `preinstall`, `prepare` e `prepack`. A Innov não aprova nem executa esses scripts durante CI ou build do container. A instalação usa `--ignore-scripts`, e a integridade do lockfile regenerado é comparada ao SHA-256 aprovado da W-06.

---

## 3. Referências arquiteturais sem cópia de código

Os projetos abaixo foram estudados para identificar padrões de arquitetura, persistência, eventos, UX, segurança e IA. Até a data acima, não houve cópia ou adaptação substancial de seus arquivos.

### rmyndharis/OpenWA

- Repositório: `https://github.com/rmyndharis/OpenWA`
- Licença observada: MIT
- Referências: interface neutra de engine, capability matrix, adapters, isolamento e segurança de gateway
- Estado: referência conceitual

### tulir/whatsmeow

- Repositório: `https://github.com/tulir/whatsmeow`
- Licença observada: Mozilla Public License 2.0
- Referências: armazenamento SQL transacional de sessões, keys e LID mappings
- Estado: referência conceitual; nenhum arquivo MPL incorporado

### ArnasDon/wacrm

- Repositório: `https://github.com/ArnasDon/wacrm`
- Licença observada: MIT
- Referências: RAG híbrido, handoff, limites atômicos, workflow antes da IA, inbox e segurança
- Estado: referência conceitual

### evolution-foundation/evolution-api

- Repositório: `https://github.com/evolution-foundation/evolution-api`
- Licença observada: Apache 2.0 acompanhada de condições adicionais próprias
- Referências: multiprovider, eventos, filas, storage e integrações
- Estado: referência conceitual; código bloqueado para adaptação sem revisão específica

### wwebjs/whatsapp-web.js

- Repositório: `https://github.com/wwebjs/whatsapp-web.js`
- Licença observada: Apache 2.0
- Referências: oracle comportamental e laboratório via cliente Web/Puppeteer
- Estado: referência/laboratório; não instalado

### sebferreira/WhatsControl

- Repositório: `https://github.com/sebferreira/WhatsControl`
- Licença: não localizada na raiz durante a análise
- Referências: UX de inbox, multiagente e handoff
- Estado: somente referência visual/conceitual; cópia proibida

### wangrongding/wechat-bot

- Repositório: `https://github.com/wangrongding/wechat-bot`
- Licença: `LICENSE.md` declara MIT, enquanto `package.json` declara ISC
- Referências: separação entre canal e provider de IA
- Estado: somente referência conceitual até resolução da inconsistência

### mruniquehacker/Knightbot-MD

- Repositório: `https://github.com/mruniquehacker/Knightbot-MD`
- Licença: README afirma MIT, arquivo `LICENSE` não localizado e documentação contém linguagem conflitante
- Referências: command registry e middleware de bots
- Estado: somente referência conceitual; cópia proibida

### lyfe00011/whatsapp-bot

- Repositório: `https://github.com/lyfe00011/whatsapp-bot`
- Licença: não localizada durante a análise
- Referências: catálogo histórico de plugins
- Estado: somente referência histórica; cópia proibida

### sigalor/whatsapp-web-reveng

- Repositório: `https://github.com/sigalor/whatsapp-web-reveng`
- Licença observada: MIT
- Referências: história da engenharia reversa do protocolo Web legado
- Estado: referência histórica; não é base operacional atual

---

## 4. Modelo para futura adaptação de código

Cada adaptação substancial deverá adicionar uma entrada no formato:

```markdown
### <Componente ou arquivo adaptado>

- Projeto de origem:
- Repositório:
- Licença:
- Copyright:
- Commit/tag:
- Arquivo(s) de origem:
- Arquivo(s) de destino:
- Natureza da adaptação:
- Alterações relevantes:
- Testes próprios:
- Revisão de segurança:
- PR:
```

A entrada não substitui a obrigação de incluir o texto integral da licença quando ela assim exigir.

---

## 5. Proibições

É proibido:

- remover avisos de copyright;
- ocultar origem de código adaptado;
- copiar código de projeto sem licença clara;
- misturar arquivo MPL em arquivo proprietário sem revisão;
- afirmar que uma técnica conceitualmente semelhante é código original quando houve derivação textual;
- usar marca ou logo de projeto externo como se integrasse oficialmente a Innov;
- sugerir endosso dos mantenedores;
- confundir licença open source com autorização do WhatsApp para operar um cliente não oficial;
- interpretar a licença MIT do pacote principal como aprovação automática de toda a árvore transitiva.

---

## 6. Manutenção

Este arquivo deve ser atualizado no mesmo commit que:

- adiciona uma dependência relevante;
- adapta código de terceiros;
- altera versão ou licença de componente;
- inclui NOTICE exigido;
- remove definitivamente uma dependência;
- identifica inconsistência jurídica nova.

A ausência de atualização deve bloquear o PR.
