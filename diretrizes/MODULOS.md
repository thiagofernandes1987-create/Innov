# Contratos dos módulos — Innovar Platform

**Atualizado em:** 3 de agosto de 2026  
**Versão:** 0.19.0  
**Registro técnico:** `lib/modules/registry.ts`

Cada módulo possui chave estável, rota, estado por organização, dependências, capacidades e escopos. Desabilitar um módulo preserva dados e bloqueia o uso funcional. Perfis personalizados não são sobrescritos por instaladores. Nenhum módulo em implementação deve ser descrito como homologado antes dos testes reais de banco, segurança e integração externa.

## `dashboard` — Início

- rota `/app`;
- módulo de sistema;
- mostra apenas aplicativos habilitados e autorizados;
- não expõe métricas inventadas quando uma fonte falha.

## `crm` — CRM e Vendas

- rota `/app/crm`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- implementação e banco homologados na Etapa 18.

Escopo:

- leads, origem, campanha, interesse, orçamento e follow-up;
- deduplicação por documento, e-mail e telefone;
- pipeline de oportunidades;
- atividades comerciais;
- conversão idempotente para cliente e oportunidade;
- motivo obrigatório de perda;
- histórico de estágio append-only;
- métricas de pipeline ponderado e vendas ganhas.

Segurança:

- acesso exclusivamente interno;
- pipeline não exposto ao cliente;
- criação e estados críticos somente por RPC;
- zero RPC operacional para `anon`;
- RLS por organização.

## `clientes` — Clientes

- rota `/app/clientes`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- Cliente 360 implementado e homologado na Etapa 18.

Escopo:

- pessoa física ou jurídica;
- contatos adicionais e contato principal;
- preferências de comunicação;
- consentimentos LGPD append-only;
- oportunidades, contratos, atividades e chamados;
- um cliente pode possuir múltiplas obras abertas ou concluídas;
- arquivamento sem apagar histórico;
- dados sensíveis mascarados por capacidade.

## `obras` — Obras

- rota `/app/obras`;
- depende de `clientes`;
- carteira multiobra, datas, progresso, gerente, contrato e portal;
- somente obra liberada aparece ao cliente.

## `planejamento` — Planejamento

- rota `/app/planejamento`;
- depende de `obras`;
- EAP, cronograma, dependências, marcos e baselines;
- baseline concluída é imutável.

## `tarefas` — Tarefas

- rota `/app/tarefas`;
- depende de `obras`;
- responsáveis, prioridade, datas, progresso e bloqueios;
- reservas de estoque podem apontar para tarefa.

## `diario` — Diário de Obras

- rota `/app/diario`;
- depende de `obras`;
- atividades, mão de obra, segurança, ocorrências e mídias;
- bucket privado `daily-log-media`;
- antimalware ainda pendente fora do SAC.

## `equipes` — Equipes

- rota `/app/equipes`;
- depende de `obras`;
- equipes, integrantes, recursos e atribuições;
- integração com custódia de ativos.

## `orcamentos` — Orçamentos

- rota `/app/orcamentos`;
- depende de `clientes`;
- custos, taxa administrativa, BDI, markup, margem, ROI e cenários;
- versão congelada é imutável.

## `propostas` — Propostas

- rota `/app/propostas`;
- depende de `orcamentos`;
- versões, PDF, validade, liberação e aceite;
- cliente vê somente versão liberada.

## `contratos` — Contratos

- rota `/app/contratos`;
- depende de `propostas`;
- templates, versões, partes, vigência e valores;
- versão enviada ou assinada é imutável.

## `aditivos` — Aditivos

- rota `/app/aditivos`;
- depende de `contratos`;
- alterações de escopo, valor e prazo;
- aplicação ao contrato é idempotente.

## `assinaturas` — Assinaturas

- rota `/app/assinaturas`;
- depende de `documentos`;
- operacional em sandbox;
- PDF/DOCX, conversão, layout e campos;
- assinatura, rubrica, data, nome completo, foto e anexos;
- SHA-256 do original, campos, anexos, PDF final e evidência;
- cópia para o cliente;
- provider jurídico real continua pendente de produção.

## `documentos` — Documentos

- rota `/app/documentos`;
- arquivos privados, disciplinas, versões, hashes e liberação;
- versão liberada é imutável;
- integra documentos de obras, propostas, contratos e assinaturas.

## `qualidade` — Qualidade

- rota `/app/qualidade`;
- depende de `obras`;
- biblioteca, FVS, FVM, formulários internos, formulários para clientes e pesquisas;
- schema publicado é imutável.

## `compras` — Compras e Suprimentos

- rota `/app/compras`;
- depende de `obras` e `qualidade`;
- solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos;
- somente quantidade aceita alimenta estoque;
- recebimento é idempotente.

## `estoque` — Estoque, Inventário e Almoxarifado

- rota `/app/estoque`;
- versão `1.0.0`;
- incorporado e homologado na Etapa 17;
- dependências: Compras e Obras;
- integrações: Equipes, Financeiro e Relatórios.

Escopo:

- catálogo, unidades, categorias, lotes e validade;
- depósitos e localizações;
- entradas, saídas, devoluções, transferências, perdas, ajustes e reversões;
- reservas por obra/tarefa;
- ativos, custódias e manutenção;
- inventário físico;
- dashboard e detalhes seguros.

Razão:

```text
saldo físico = soma das linhas de movimentos POSTED/REVERSED e REVERSAL
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

Segurança e concorrência:

- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- correção por reversão;
- advisory lock por posição;
- custos protegidos;
- isolamento multiempresa e multiobra;
- zero RPC operacional para `anon`.

Definition of Done adicional:

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## `financeiro` — Financeiro Operacional

- rota `/app/financeiro`;
- depende de `obras`, `contratos` e `compras`;
- contas a pagar/receber, parcelas, aprovações, baixas, comprovantes, medições e caixa;
- custos de estoque são informativos e não criam lançamento automaticamente.

## `sac` — Pós-venda e SAC

- rota interna `/app/ocorrencias`;
- rota do cliente `/cliente/ocorrencias`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- implementação e banco homologados na Etapa 18;
- depende de `clientes`.

Escopo:

- categorias e SLAs;
- abertura interna, telefone, e-mail, WhatsApp ou portal;
- vínculo a cliente, obra e contrato;
- prioridades, estados e responsáveis;
- mensagens internas ou públicas;
- fotos, PDF e DOCX até 25 MB;
- SHA-256 e bucket privado `crm-sac-attachments`;
- eventos append-only;
- encerramento, reabertura e satisfação;
- indicadores de fila, atraso e tempo de resolução.

Segurança:

- cliente vê somente os próprios chamados;
- mensagem interna, anexo interno e evento não aparecem no portal;
- mudanças de estado somente por RPC;
- download autenticado por URL assinada curta;
- anexos novos devem passar pela quarentena da Etapa 20;
- zero RPC operacional para `anon`.

## `whatsapp` — WhatsApp e Atendimento

- rota `/app/whatsapp`;
- versão inicial `1.0.0`;
- sensível;
- branch funcional `feature/etapa-22-whatsapp-omnichannel`;
- PR de rascunho `#39`;
- implementação em andamento e **não homologada**;
- provider produtivo inicial: Meta WhatsApp Business Platform — Cloud API;
- dependências: `clientes`, `crm`, `sac` e `documentos`.

Escopo inicial:

- caixa de entrada compartilhada;
- contas, contatos, conversas e mensagens;
- vínculo com Cliente 360, obra, contrato, oportunidade e chamado SAC;
- texto, template aprovado e documento privado;
- recebimento de texto e metadados de mídia;
- estados enviado, entregue, lido e falho;
- janela móvel de atendimento de 24 horas;
- webhooks assinados e idempotentes;
- registro de proveniência da mensagem.

Fontes canônicas das mensagens padrão:

- `contract_templates`;
- `proposal_versions`;
- `contract_versions`;
- `amendment_versions`;
- `project_document_versions`.

O módulo não mantém uma cópia editável das mensagens padrão. Cada binding referencia a fonte e o envio registra tipo, ID, campo, versão, nome, SHA-256 e instante de resolução. Mensagens livres permanecem possíveis somente dentro das regras do provider e das permissões do usuário.

Segurança:

- HMAC SHA-256 em `x-hub-signature-256`;
- RLS em todas as tabelas;
- `service_role` exclusivamente server-side;
- nenhuma credencial versionada;
- URLs de documentos privadas e temporárias;
- idempotência de envio e webhook;
- histórico sem exclusão direta;
- estados de entrega monotônicos no domínio e no PostgreSQL;
- nenhuma dependência de Puppeteer, Baileys, `whatsapp-web.js` ou sessão por QR Code em produção;
- WhatsControl e Evolution API não foram incorporados ao código;
- padrões do wacrm podem ser adaptados sob MIT com atribuição quando houver cópia substancial.

Pendências antes da homologação:

- aplicar migrations em ambiente controlado;
- verificar e registrar o número na Meta;
- assinar a WABA ao aplicativo;
- configurar secrets em homologação;
- sincronizar ciclo de vida dos templates;
- tornar mídia recebida compatível com quarentena/antimalware;
- E2E de texto, template, documento, inbound e status;
- filas, atribuição, notas internas e handoff;
- revisão de RLS, índices, advisors, LGPD e retenção;
- lint, typecheck, testes e build verdes.

Definition of Done:

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas;
- isolamento multiempresa e multiobra comprovado;
- nenhum texto padrão duplicado fora da fonte canônica;
- webhook e status idempotentes;
- nenhum provider não oficial no runtime produtivo;
- CI verde;
- PR revisado sem merge automático.

## `relatorios` — Relatórios e Indicadores

- rota `/app/relatorios`;
- depende de `obras`;
- dashboards, metas, alertas, relatórios salvos, snapshots e CSV;
- valores sensíveis mascarados;
- snapshots concluídos imutáveis.

## `auditoria` — Auditoria e Observabilidade

- rota-base `/app/auditoria`;
- versão `1.0.0` na Etapa 19;
- aplicativo sensível, central e habilitado por padrão;
- dependência: `administracao`;
- acesso padrão: `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR`;
- cliente não possui acesso.

Escopo:

- fluxo unificado de eventos sem duplicar trilhas de domínio;
- pesquisa por módulo, severidade, texto, período e `correlation_id`;
- sanitização recursiva de payloads;
- idempotência por `deduplication_key`;
- alertas, health checks e diagnósticos;
- retenção entre 30 e 3650 dias.

Segurança:

- leitura exige `auditoria:read`;
- configuração e transições exigem capacidade `administer`;
- eventos e health checks são append-only;
- escrita direta bloqueada;
- RPCs não executáveis por `anon`;
- segredos e credenciais recebem `[REDACTED]`.

## `administracao` — Administração

- rota `/app/administracao`;
- módulo de sistema;
- catálogo de módulos, perfis, usuários, escopos, overrides e permissões;
- níveis: nenhuma, leitura, edição e exclusão;
- capacidades adicionais: aprovar, liberar, assinar, exportar, administrar e visualizar sensíveis.

## Definition of Done da Etapa 18

- documentação atualizada no mesmo PR;
- migrations aplicadas, homologadas e alinhadas ao ledger remoto;
- leads, oportunidades e conversão idempotente;
- Cliente 360 multiobra;
- SAC interno e do portal;
- mensagens, anexos, SLA e eventos;
- RLS interna e do cliente;
- nenhuma RPC operacional para `anon`;
- todas as FKs indexadas;
- CI verde;
- PR pronto para revisão, sem merge automático.
