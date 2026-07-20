# Contratos dos módulos — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Versão:** 0.17.0  
**Registro técnico:** `lib/modules/registry.ts`

Cada módulo possui chave estável, rota, estado, dependências, capacidades, regras de segurança e documento técnico quando aplicável.

## `dashboard` — Início

- rota `/app`;
- estado operacional;
- exibe somente aplicativos habilitados e autorizados.

## `crm` — CRM e Vendas

- rota `/app/crm`;
- estado parcial;
- leads, oportunidades e pipeline;
- consolidação prevista na Etapa 18.

## `clientes` — Clientes

- rota `/app/clientes`;
- estado parcial;
- um cliente pode possuir múltiplas obras;
- consolidação prevista na Etapa 18.

## `obras` — Obras

- rota `/app/obras`;
- estado operacional;
- carteira multiobra, datas, progresso e portal;
- dados pertencem à organização e, quando aplicável, cliente e contrato.

## `planejamento` — Planejamento

- rota `/app/planejamento`;
- estado operacional;
- EAP, cronograma, dependências, marcos e baselines;
- baseline concluída é imutável.

## `tarefas` — Tarefas

- rota `/app/tarefas`;
- estado operacional;
- responsáveis, prioridade, progresso, datas e bloqueios;
- reservas de estoque podem apontar para tarefa.

## `diario` — Diário de Obras

- rota `/app/diario`;
- estado operacional;
- atividades, mão de obra, segurança, ocorrências e mídias;
- Storage privado `daily-log-media`.

## `equipes` — Equipes

- rota `/app/equipes`;
- estado operacional;
- recursos, equipes, integrantes e atribuições;
- integração com custódia de ativos.

## `orcamentos` — Orçamentos

- rota `/app/orcamentos`;
- estado operacional;
- custos, taxa administrativa, BDI, markup, margem, ROI, cenários e aprovação;
- versão congelada é imutável.

## `propostas` — Propostas

- rota `/app/propostas`;
- estado operacional;
- versões, PDF, validade, liberação e aceite;
- cliente vê somente versão liberada.

## `contratos` — Contratos

- rota `/app/contratos`;
- estado operacional;
- templates, versões, partes, vigência e valores;
- versão enviada ou assinada é imutável.

## `aditivos` — Aditivos

- rota `/app/aditivos`;
- estado operacional;
- alterações de escopo, valor e prazo;
- aplicação ao contrato é idempotente.

## `assinaturas` — Assinaturas

- rota `/app/assinaturas`;
- estado operacional em sandbox;
- PDF/DOCX, conversão, campos, assinatura, rubrica, foto, anexos e evidência;
- token bruto não é persistido e o provider jurídico real permanece pendente.

## `documentos` — Documentos

- rota `/app/documentos`;
- estado operacional;
- arquivos privados, disciplinas, versões, hashes e liberação;
- versão liberada é imutável.

## `qualidade` — Qualidade

- rota `/app/qualidade`;
- estado operacional;
- biblioteca, FVS, FVM, formulários, pesquisas, anexos e revisão;
- schema publicado é imutável.

## `compras` — Compras e Suprimentos

- rota `/app/compras`;
- estado operacional;
- solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos;
- recebimento vazio é bloqueado e quantidades aceitas/rejeitadas são rastreadas;
- somente quantidade aceita alimenta estoque.

## `estoque` — Estoque, Inventário e Almoxarifado

- rota `/app/estoque`;
- estado: implementação incorporada à `main` pelo PR `#14`; homologação funcional concluída; correções e evidências no PR `#15` aguardando revisão;
- versão do módulo `1.0.0`;
- dependências: compras e obras;
- integrações: equipes, financeiro e relatórios;
- documentos: `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md` e `docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md`.

### Escopo da Etapa 17

- itens, categorias, unidades, depósitos, localizações, lotes e validade;
- entradas, saídas, devoluções, transferências, perdas, ajustes e reversões;
- reservas por obra, tarefa, depósito, localização e lote;
- estoque mínimo e alertas;
- ativos individualizados, custódias, devoluções e manutenção;
- inventário físico, contagem, aprovação e ajuste;
- importação idempotente de recebimentos aceitos de Compras;
- dashboard e detalhes seguros.

### Razão e concorrência

```text
saldo físico = soma das linhas de movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

- saldo não é editável diretamente;
- movimento `POSTED` é imutável;
- correção ocorre por reversão;
- transferência conserva quantidade;
- saldo negativo é bloqueado por padrão;
- postagem usa `pg_advisory_xact_lock` por organização, depósito, localização, item e lote;
- duas saídas sobre o mesmo saldo foram testadas: a segunda foi recusada.

### Segurança e evidências

- RLS nas 18 tabelas;
- seis views sem leitura direta;
- isolamento multiempresa e multiobra validado;
- custos sem leitura direta e mascarados por capacidade;
- nenhuma RPC operacional executável por `anon`;
- 101 FKs, nenhuma sem índice líder;
- bootstrap, saldo, reserva, consumo, reversão, imutabilidade, inventário e RLS testados em transações revertidas.

### Definition of Done adicional da Etapa 17

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

### Evolução agendada — Etapa 21

WMS avançado, endereçamento automatizado, RFID em tempo real, ressuprimento automático sem aprovação, roteirização logística, integração fiscal de entrada e depreciação contábil oficial permanecem apenas planejados. Eles não substituem o razão imutável.

## `financeiro` — Financeiro Operacional

- rota `/app/financeiro`;
- estado operacional;
- lançamentos, parcelas, aprovações, baixas, comprovantes, medições e caixa;
- custos de estoque são informativos e não criam lançamento automaticamente.

## `sac` — Pós-venda e SAC

- rota `/app/ocorrencias`;
- estado parcial;
- ocorrências, prioridade, SLA, responsáveis e anexos;
- consolidação prevista na Etapa 18.

## `relatorios` — Relatórios e Indicadores

- rota `/app/relatorios`;
- estado operacional;
- dashboards, metas, alertas, relatórios salvos, snapshots e CSV;
- valores sensíveis são mascarados e snapshots concluídos são imutáveis.

## `auditoria` — Auditoria

- rota `/app/auditoria`;
- estado parcial transversal;
- consolidação prevista na Etapa 19;
- eventos críticos são append-only e não armazenam secrets.

## `administracao` — Administração

- rota `/app/administracao`;
- estado operacional;
- catálogo de módulos, perfis, usuários, escopos, overrides e permissões;
- perfis personalizados não são sobrescritos por instaladores.
