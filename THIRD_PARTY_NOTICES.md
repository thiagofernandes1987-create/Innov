# Third-Party Notices

Este arquivo registra componentes, referências e adaptações de terceiros utilizadas pela Innovar Platform.

**Regra:** uma biblioteca planejada, mas ainda não adicionada, não é apresentada como dependência instalada. Uma técnica estudada, sem cópia de código, é registrada como referência arquitetural, não como obra derivada.

---

## 1. Estado do provider WhatsApp Web não oficial

Na data de 03 de agosto de 2026:

- nenhum código dos repositórios abaixo foi copiado para o novo provider;
- Baileys ainda não foi adicionado às dependências do Innov;
- nenhum arquivo MPL foi incorporado;
- nenhum código de projeto sem licença clara foi incorporado;
- a implementação do provider não oficial ainda não foi iniciada;
- os projetos foram utilizados apenas para análise arquitetural e planejamento.

---

## 2. Dependências planejadas, ainda não incorporadas

### WhiskeySockets/Baileys

- Repositório: `https://github.com/WhiskeySockets/Baileys`
- Licença observada: MIT
- Copyright observado: `Copyright (c) 2025 Rajeh Taher/WhiskeySockets`
- Estado: **planejada para avaliação como dependência do gateway; ainda não instalada**
- Uso previsto: engine WhatsApp Web Multi-Device, restrito ao adapter do gateway
- Condição: fixar versão exata, anexar SBOM, preservar licença e avisos e concluir os gates da Sprint W-01 antes da instalação

Quando a dependência for efetivamente adicionada, este arquivo deverá registrar:

- versão/tag;
- commit resolvido no lockfile;
- checksum/lockfile;
- caminho de uso;
- dependências transitivas críticas;
- data da revisão de licença e segurança.

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
- confundir licença open source com autorização do WhatsApp para operar um cliente não oficial.

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