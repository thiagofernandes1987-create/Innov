# Contratos dos módulos — Innovar Platform

**Atualizado em:** 21 de julho de 2026  
**Versão:** 0.19.0  
**Registro técnico:** `lib/modules/registry.ts`

Cada módulo possui chave estável, rota, estado por organização, dependências, capacidades e escopos. Desabilitar um módulo preserva dados e bloqueia o uso funcional. Perfis personalizados não são sobrescritos por instaladores.

## `dashboard` — Início

- rota `/app`;
- operacional;
- mostra apenas aplicativos habilitados e autorizados.

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
- pipeline não é exposto ao cliente;
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
- operacional;
- depende de `clientes`;
- carteira multiobra, datas, progresso, gerente, contrato e portal;
- somente obra liberada aparece ao cliente.

## `planejamento` — Planejamento

- rota `/app/planejamento`;
- operacional;
- EAP, cronograma, dependências, marcos e baselines;
- baseline concluída é imutável.

## `tarefas` — Tarefas

- rota `/app/tarefas`;
- operacional;
- responsáveis, prioridade, datas, progresso e bloqueios;
- reservas de estoque podem apontar para tarefa.

## `diario` — Diário de Obras

- rota `/app/diario`;
- operacional;
- atividades, mão de obra, segurança, ocorrências e mídias;
- bucket privado `daily-log-media`.

## `equipes` — Equipes

- rota `/app/equipes`;
- operacional;
- equipes, integrantes, recursos e atribuições;
- integração com custódia de ativos.

## `orcamentos` — Orçamentos

- rota `/app/orcamentos`;
- operacional;
- custos, taxa administrativa, BDI, markup, margem, ROI e cenários;
- versão congelada é imutável.

## `propostas` — Propostas

- rota `/app/propostas`;
- operacional;
- versões, PDF, validade, liberação e aceite;
- cliente vê somente versão liberada.

## `contratos` — Contratos

- rota `/app/contratos`;
- operacional;
- templates, versões, partes, vigência e valores;
- versão enviada ou assinada é imutável.

## `aditivos` — Aditivos

- rota `/app/aditivos`;
- operacional;
- alterações de escopo, valor e prazo;
- aplicação ao contrato é idempotente.

## `assinaturas` — Assinaturas

- rota `/app/assinaturas`;
- operacional em sandbox;
- PDF/DOCX, conversão, layout e campos;
- assinatura, rubrica, data, nome completo, foto e anexos;
- SHA-256 do original, campos, anexos, PDF final e evidência;
- cópia para o cliente;
- provider jurídico real continua pendente de produção.

## `documentos` — Documentos

- rota `/app/documentos`;
- operacional;
- arquivos privados, disciplinas, versões, hashes e liberação;
- versão liberada é imutável.

## `qualidade` — Qualidade

- rota `/app/qualidade`;
- operacional;
- biblioteca, FVS, FVM, formulários internos, formulários para clientes e pesquisas;
- anexos online;
- schema publicado é imutável.

## `compras` — Compras e Suprimentos

- rota `/app/compras`;
- operacional;
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
- movimento concluído imutável;
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
- operacional;
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
- obra/contrato externo somente quando liberado ao cliente;
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
- upload do cliente autorizado pela sessão e realizado server-side;
- download autenticado por URL assinada curta;
- zero RPC operacional para `anon`.

## `relatorios` — Relatórios e Indicadores

- rota `/app/relatorios`;
- operacional;
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

Rotas:

```text
/app/auditoria
/app/auditoria/eventos
/app/auditoria/eventos/[id]
/app/auditoria/alertas
/app/auditoria/saude
/app/auditoria/configuracao
```

Escopo:

- fluxo unificado de eventos sem duplicar trilhas de domínio;
- fontes: auditoria, permissões, assinaturas, documentos, qualidade, compras, financeiro, relatórios, estoque, SAC e CRM;
- pesquisa por módulo, severidade, texto, período e `correlation_id`;
- correlação por organização, obra, cliente, ator, recurso e request;
- sanitização recursiva de payloads;
- idempotência por `deduplication_key`;
- alertas por severidade, padrão, limite, janela e cooldown;
- reconhecimento e resolução com motivo obrigatório;
- health checks de banco, workers, relatórios e SLA;
- diagnósticos de FKs, RLS, políticas, privilégios e ledger;
- retenção entre 30 e 3650 dias.

Segurança:

- leitura exige `auditoria:read`;
- configuração e transições exigem capacidade `administer`;
- eventos e health checks são append-only;
- escrita direta em eventos, alertas técnicos, health checks e diagnósticos é bloqueada;
- RPCs não são executáveis por `anon`;
- IP e user-agent somente como SHA-256;
- senhas, tokens, authorization, secrets, cookies e chaves privadas recebem `[REDACTED]`;
- payload bruto do provider de assinatura não é exposto.

Definition of Done da Etapa 19:

- schema, RLS e privilégios mínimos;
- fluxo unificado e sanitização;
- alertas, health checks e diagnósticos;
- interface administrativa;
- teste transacional com `ROLLBACK`;
- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas;
- advisors revisados;
- lint, typecheck, testes e build;
- CI verde.

## `administracao` — Administração

- rota `/app/administracao`;
- operacional;
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
