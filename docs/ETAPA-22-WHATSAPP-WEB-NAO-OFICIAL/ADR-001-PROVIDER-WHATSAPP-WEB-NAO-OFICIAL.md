# ADR-001 — Provider WhatsApp Web não oficial como extensão opcional

**Status:** aceito para arquitetura e pesquisa controlada; não autorizado para produção  
**Data:** 03 de agosto de 2026  
**Decisores técnicos:** Arquitetura Innov  
**Revisão obrigatória:** antes da primeira dependência Baileys, antes da homologação externa e a cada alteração material dos termos, da biblioteca ou do modelo operacional  
**Documentos relacionados:** [`SPEC.md`](./SPEC.md), [`INVENTARIO.md`](./INVENTARIO.md), [`MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md`](./MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md), [`POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md`](./POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md)

---

## 1. Contexto

A Etapa 22 já possui um domínio de WhatsApp baseado na Meta Cloud API, com inbox, contas, contatos, conversas, mensagens, eventos de status, fontes canônicas, RLS, idempotência e vínculos com Cliente 360, CRM, obras, contratos, documentos e SAC.

O novo subprojeto pretende estudar e, condicionadamente, implementar um engine baseado no WhatsApp Web Multi-Device para ampliar a capacidade de pesquisa, interoperabilidade e automação do Innov. A biblioteca inicialmente considerada é o Baileys, encapsulada por adapter próprio.

O uso de uma biblioteca open source não equivale a autorização do WhatsApp para operar um cliente não oficial. A licença MIT do Baileys disciplina o código do projeto; ela não substitui os termos e políticas do WhatsApp.

Na verificação realizada em 03 de agosto de 2026, os Termos de Serviço do WhatsApp proíbem, entre outros comportamentos, comunicações em massa ou automáticas não permitidas, uso não pessoal sem autorização e acesso automatizado, engenharia reversa ou criação de APIs substancialmente equivalentes em formas não autorizadas. A Política de Mensagens para Empresas exige opt-in, respeito ao opt-out e caminhos claros de escalonamento humano, e prevê limitação ou remoção de acesso por violações ou feedback negativo.

Esta ADR não conclui que qualquer uso específico seja juridicamente autorizado. Ela registra uma decisão técnica sujeita a revisão jurídica, de segurança, privacidade e operação.

---

## 2. Decisão

### D1 — Extensão opcional, nunca substituição implícita

O provider WhatsApp Web não oficial será tratado como uma extensão opcional e revogável. A Meta Cloud API permanece o provider oficial e o caminho padrão para operação empresarial.

### D2 — Domínio compartilhado, runtime separado

O provider oficial e o não oficial compartilharão:

- organizações e permissões;
- Cliente 360;
- contatos e aliases;
- conversas e mensagens canônicas;
- vínculos com CRM, obras, contratos, documentos e SAC;
- fontes canônicas, snapshots e hashes;
- workflow, atendimento humano, auditoria e observabilidade.

Eles não compartilharão o mesmo runtime de transporte.

```text
Aplicação Innov / domínio canônico
              │
      ┌───────┴────────┐
      │                │
Meta Cloud Adapter   Gateway persistente
                         │
                  BaileysEngineAdapter
```

O runtime Baileys não será executado:

- no processo da aplicação Next.js;
- em função serverless;
- no webhook oficial da Meta;
- com acesso irrestrito ao banco principal;
- com a service role da aplicação exposta ao engine.

### D3 — Adapter anticorrupção obrigatório

Tipos e formatos nativos do Baileys serão confinados ao adapter. O domínio não poderá importar ou persistir diretamente:

- `WAMessage`;
- `WAMessageKey`;
- `BinaryNode`;
- `proto.Message`;
- estruturas de auth state;
- JIDs específicos do engine.

O adapter traduzirá mensagens, identidades, receipts, erros e capacidades para contratos canônicos versionados do Innov.

### D4 — Número de homologação dedicado

A primeira sessão deverá usar número dedicado, autorizado, recuperável e não crítico. É proibido iniciar com:

- número comercial principal;
- número usado para emergência ou continuidade operacional;
- conta de colaborador sem autorização formal;
- número com histórico de clientes reais não inventariado;
- número cuja perda cause indisponibilidade relevante;
- sessão compartilhada com automações desconhecidas.

### D5 — Sem mecanismos de evasão

Não serão construídos ou adotados mecanismos de:

- rotação de contas para contornar bloqueios;
- fingerprint spoofing;
- simulação artificial de comportamento humano para enganar controles;
- proxy rotation para mascarar origem;
- criação automatizada de contas;
- disparo indiscriminado;
- cold blast;
- bypass de limites ou restrições;
- recuperação automática por criação de nova conta após banimento.

### D6 — Falha segura e kill switch

O sistema deverá conseguir interromper:

- todos os providers não oficiais;
- uma organização;
- uma sessão;
- automações;
- IA;
- downloads de mídia;
- workers de outbox.

Na dúvida, o comportamento padrão será não enviar e encaminhar para ação humana.

### D7 — IA independente do canal

O Baileys não chamará modelos de IA diretamente. Eventos normalizados serão persistidos e só então poderão chegar ao workflow e ao `AiOrchestrator`.

Ordem obrigatória:

```text
política → consentimento → persistência → workflow determinístico
→ recuperação de fatos → IA → validação → aprovação/handoff → outbox
```

### D8 — Produção continua bloqueada

Esta ADR autoriza apenas:

- desenho arquitetural;
- contratos canônicos;
- mocks;
- testes sem conta real;
- laboratório isolado;
- homologação com número dedicado após os gates previstos.

Produção permanece bloqueada até decisão posterior, registrada em nova ADR ou revisão formal desta ADR.

---

## 3. Fundamentos da decisão

1. **Separação de responsabilidades.** Conexões persistentes, chaves Signal, reconexão e sincronização não pertencem ao runtime web/serverless.
2. **Substituibilidade.** O domínio não pode depender da API de uma biblioteca não oficial.
3. **Reuso do investimento existente.** Inbox, CRM, contratos, SAC, documentos e fontes canônicas não serão duplicados.
4. **Operação reversível.** O provider deve poder ser desligado sem destruir o histórico do Innov.
5. **Risco explícito.** Banimento, quebra de protocolo e perda de sessão não podem ser tratados como exceções improváveis.
6. **Governança de IA.** IA deve ser uma capacidade transversal, não um plugin acoplado ao transporte.
7. **Licenças rastreáveis.** Técnica observada não autoriza cópia silenciosa de código.

---

## 4. Alternativas avaliadas

### A1 — Usar somente a Cloud API

**Vantagens:** suporte oficial, menor risco contratual, templates e métricas empresariais.  
**Limitação:** não atende todas as hipóteses de pesquisa e capacidades do cliente Web.  
**Decisão:** permanece como provider padrão, mas não elimina o laboratório opcional.

### A2 — Instalar Baileys diretamente no Next.js

**Rejeitada.** Conflita com conexão persistente, single writer, armazenamento de chaves, shutdown gracioso, serverless e isolamento de falhas.

### A3 — Adotar OpenWA ou Evolution API integralmente

**Rejeitada nesta fase.** Criaria backend, persistência, autenticação e operação paralelos, além de duplicar capacidades existentes. Seus padrões serão estudados e reimplementados seletivamente.

### A4 — Usar `whatsapp-web.js` como engine inicial

**Não selecionada.** É útil como oracle comportamental e laboratório, mas introduz Chromium/Puppeteer e maior custo por sessão.

### A5 — Usar `whatsmeow` como engine inicial

**Adiada.** Possui boa persistência SQL e runtime Go eficiente, mas introduziria uma segunda stack. Permanece alternativa futura na capability matrix.

---

## 5. Consequências positivas

- domínio multiprovider;
- adapter substituível;
- infraestrutura de sessão isolada;
- preservação da inbox única;
- possibilidade de laboratório com Baileys e oracle com Web.js;
- IA reaproveitável no site e em outros canais;
- risco e licenças documentados antes do código;
- rollback por desligamento do provider, sem apagar mensagens canônicas.

---

## 6. Consequências negativas e custos aceitos

- novo serviço persistente para operar;
- armazenamento criptográfico complexo;
- necessidade de single writer e fencing;
- manutenção diante de mudanças do protocolo;
- ausência de SLA do WhatsApp para o engine;
- possível suspensão ou perda da conta;
- maior carga de testes de reconexão, restauração e upgrade;
- revisão contínua de termos, licenças e segurança;
- impossibilidade de considerar o canal equivalente à Cloud API.

---

## 7. Gates eliminatórios

### G01 — Governança

Nenhuma dependência Baileys entra no repositório antes de:

- ADR publicada;
- matriz de licenças publicada;
- `THIRD_PARTY_NOTICES.md` criado;
- política de risco, consentimento e desligamento publicada;
- inventário atualizado.

### G02 — Fronteira do domínio

Nenhum tipo nativo do engine pode escapar do adapter.

### G03 — Sessão

Nenhum teste externo sem:

- session store criptografado;
- single writer;
- lease com fencing token;
- kill switch;
- redaction de logs.

### G04 — Dados

Nenhum dado real sem:

- RLS;
- isolamento por organização;
- política de retenção;
- quarentena de mídia;
- auditoria;
- consentimento e opt-out aplicáveis.

### G05 — IA

Nenhum auto-reply inicial. O primeiro modo permitido será `draft_only`, com aprovação humana.

### G06 — Homologação

Número dedicado, autorização registrada, testes repetidos e plano de remoção da sessão.

### G07 — Produção

Exige decisão posterior específica. A conclusão técnica do gateway não libera produção automaticamente.

---

## 8. Critérios de cancelamento antes da implantação

O subprojeto deverá ser cancelado ou suspenso quando ocorrer qualquer um dos seguintes:

1. impossibilidade de obter aprovação interna de risco;
2. necessidade de usar o número comercial principal para validar o MVP;
3. incapacidade de isolar credenciais e chaves;
4. ausência de single writer verificável;
5. dependência de evasão, spoofing ou comportamento enganoso;
6. biblioteca sem manutenção compatível com o protocolo vigente;
7. vulnerabilidade crítica sem mitigação;
8. termos ou orientação jurídica interna determinando interrupção;
9. repetidas restrições, bloqueios ou perda de sessão durante homologação;
10. impossibilidade de respeitar consentimento, opt-out e bloqueio;
11. necessidade de duplicar CRM, conversas ou fontes canônicas;
12. custo operacional superior ao benefício demonstrado;
13. incapacidade de restaurar sessão de backup de forma testada;
14. ausência de observabilidade suficiente para detectar mensagens perdidas ou duplicadas.

---

## 9. Processo de desligamento

O desligamento deve ocorrer em quatro níveis:

1. **Pausa de negócio:** bloquear novos comandos e manter leitura administrativa.
2. **Pausa de runtime:** interromper reconnect e desconectar o socket de forma graciosa.
3. **Desvinculação:** remover o dispositivo vinculado pelo procedimento autorizado da conta.
4. **Exclusão criptográfica:** revogar e destruir as chaves de criptografia da sessão, preservando apenas auditoria sanitizada e histórico canônico permitido.

É proibido apagar silenciosamente o histórico de negócio para “limpar” uma sessão.

---

## 10. Fontes verificadas

### Código e licenças

- `WhiskeySockets/Baileys` — licença MIT observada em `LICENSE`.
- `rmyndharis/OpenWA` — licença MIT observada em `LICENSE`.
- `tulir/whatsmeow` — MPL 2.0 observada em `LICENSE`.
- `ArnasDon/wacrm` — licença MIT observada em `LICENSE`.
- `wwebjs/whatsapp-web.js` — Apache 2.0 declarada no README/licença.
- `evolution-foundation/evolution-api` — Apache 2.0 com condições adicionais próprias no arquivo `LICENSE`.
- demais projetos — status detalhado na matriz de licenças.

### Termos e políticas oficiais

Verificados em 03 de agosto de 2026:

- WhatsApp Terms of Service: `https://www.whatsapp.com/legal/terms-of-service`;
- WhatsApp Business Messaging Policy: `https://whatsappbusiness.com/policy/`.

Essas páginas podem mudar. A revisão deve considerar a versão vigente no momento de cada gate.

---

## 11. Estado da decisão

| Item | Estado |
|---|---|
| Arquitetura opcional definida | `DOCUMENTED` |
| Runtime separado definido | `DOCUMENTED` |
| Uso produtivo autorizado | `NO` |
| Dependência Baileys adicionada | `NO` |
| Número de homologação aprovado | `NO` |
| Aceite operacional assinado | `NO` |
| Revisão jurídica concluída | `NO` |
| Gate para iniciar contratos canônicos | `YES`, após fechamento documental da W-01 |

A decisão é deliberadamente conservadora: autoriza construir a fundação, não autoriza operar em produção.