# Contratos dos módulos — Innovar Platform

**Versão:** 0.17.0  
**Atualizado em:** 20 de julho de 2026  
**Registro técnico:** `lib/modules/registry.ts`

Cada aplicativo declara rota, estado, dependências, integrações, capacidades e invariantes. `Operacional` não significa liberação automática para produção.

## `dashboard` — Início

- **Rota:** `/app`.
- **Estado:** Operacional.
- **Finalidade:** central dos aplicativos autorizados.
- **Regra:** exibir somente módulo habilitado e permitido.

## `crm` — CRM e Vendas

- **Rota:** `/app/crm`.
- **Estado:** Parcial.
- **Finalidade:** leads, oportunidades e pipeline.
- **Próxima consolidação:** Etapa 18.

## `clientes` — Clientes

- **Rota:** `/app/clientes`.
- **Estado:** Parcial/operacional.
- **Regra:** um cliente pode possuir várias obras abertas ou concluídas.
- **Integrações:** CRM, orçamentos, contratos, obras, SAC e portal.

## `obras` — Obras

- **Rota:** `/app/obras`.
- **Estado:** Operacional.
- **Dependência:** clientes.
- **Escopo:** carteira multiobra, progresso e portal.
- **Regra:** organização e escopo da obra são obrigatórios.

## `planejamento` — Planejamento

- **Rota:** `/app/planejamento`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Escopo:** EAP, cronograma, marcos e baselines.
- **Regra:** baseline concluída é imutável.

## `tarefas` — Tarefas

- **Rota:** `/app/tarefas`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Integrações:** planejamento, equipes, diário, qualidade e reservas de estoque.

## `diario` — Diário de Obras

- **Rota:** `/app/diario`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Storage:** `daily-log-media`, privado.

## `equipes` — Equipes

- **Rota:** `/app/equipes`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Integração:** custódia de ferramentas e ativos.

## `orcamentos` — Orçamentos

- **Rota:** `/app/orcamentos`.
- **Estado:** Operacional.
- **Dependência:** clientes.
- **Escopo:** custos, BDI, markup, cenários e aprovações.
- **Regra:** versão congelada é imutável.

## `propostas` — Propostas

- **Rota:** `/app/propostas`.
- **Estado:** Operacional.
- **Dependência:** orçamentos.
- **Regra:** cliente vê somente versão liberada.

## `contratos` — Contratos

- **Rota:** `/app/contratos`.
- **Estado:** Operacional.
- **Dependência:** propostas.
- **Regra:** documento enviado ou assinado é imutável.

## `aditivos` — Aditivos

- **Rota:** `/app/aditivos`.
- **Estado:** Operacional.
- **Dependência:** contratos.
- **Regra:** aplicação de valor e prazo é idempotente.

## `assinaturas` — Assinaturas

- **Rota:** `/app/assinaturas`.
- **Estado:** Operacional em sandbox.
- **Escopo:** PDF/DOCX, conversão, campos, assinatura, rubrica, data, nome, foto, anexos, hash, evidência e cópia.
- **Storage:** `signature-artifacts`, privado.
- **Limitação:** sandbox não possui validade jurídica externa.

## `documentos` — Documentos

- **Rota:** `/app/documentos`.
- **Estado:** Operacional.
- **Escopo:** arquivos privados, versões, hashes e liberação.
- **Regra:** versão liberada é imutável.

## `qualidade` — Qualidade

- **Rota:** `/app/qualidade`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Escopo:** PO, FVS, FVM, formulários e pesquisas.
- **Regra:** schema publicado exige nova versão para alteração.

## `compras` — Compras e Suprimentos

- **Rota:** `/app/compras`.
- **Estado:** Operacional.
- **Dependências:** obras e qualidade.
- **Escopo:** solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos.
- **Integrações:** estoque, financeiro e relatórios.
- **Regra:** quantidade aceita e rejeitada permanecem rastreáveis.

## `estoque` — Estoque, Inventário e Almoxarifado

- **Rota:** `/app/estoque`.
- **Estado:** Implementado e homologado tecnicamente.
- **Versão:** 1.0.0.
- **Dependências:** compras e obras.
- **Integrações:** equipes, financeiro e relatórios.

### Finalidade

Controlar materiais, consumíveis, ferramentas e ativos desde o recebimento até consumo, devolução, transferência, perda, ajuste ou inventário físico.

### Modelo de saldo
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
físico = movimentos POSTED + originais REVERSED
reservado = reservado - consumido - liberado
disponível = físico - reservado
```

O movimento `REVERSAL` neutraliza o original. Não existe saldo editável diretamente.

### Escopo

- catálogo, categorias e unidades;
- depósitos gerais e por obra;
- localizações, lotes e validade;
- movimentos e reversões;
- importação idempotente de Compras;
- reservas e consumo;
- ativos, custódias e manutenção;
- inventário físico;
- indicadores e auditoria.

### Concorrência

- advisory lock por posição de estoque;
- locks em ordem determinística;
- saldo físico e disponível verificados na transação;
- saída comum não consome reserva;
- transferência conserva quantidade.

### Multiempresa e multiobra

- vínculos entre organizações são rejeitados;
- depósito vinculado a obra somente pode ser usado pela mesma obra;
- depósito geral depende de autorização, sem vínculo obrigatório a uma obra.
- saldo não é editável diretamente;
- movimento `POSTED` é imutável;
- correção ocorre por reversão;
- transferência conserva quantidade;
- saldo negativo é bloqueado por padrão;
- postagem usa `pg_advisory_xact_lock` por organização, depósito, localização, item e lote;
- duas saídas sobre o mesmo saldo foram testadas: a segunda foi recusada.

### Segurança e evidências

- 18 tabelas com RLS;
- seis views `security_invoker`;
- custos mascarados por RPC;
- privilégios por coluna;
- movimentos e inventários concluídos imutáveis;
- Service Role ausente do navegador;
- RPCs privilegiadas validam autorização internamente.

### Homologação
- RLS nas 18 tabelas;
- seis views sem leitura direta;
- isolamento multiempresa e multiobra validado;
- custos sem leitura direta e mascarados por capacidade;
- nenhuma RPC operacional executável por `anon`;
- 101 FKs, nenhuma sem índice líder;
- bootstrap, saldo, reserva, consumo, reversão, imutabilidade, inventário e RLS testados em transações revertidas.

- schema e migration aplicada no Supabase;
- ledger reconciliado com 18 migrations;
- 14 testes transacionais com `ROLLBACK`;
- correção de reversão;
- correção de isolamento multiobra;
- CI original verde.

### Definition of Done adicional

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

Situação: todos possuem implementação/evidência, exceto o teste concorrente com duas conexões reais, que permanece obrigatório antes da produção. A branch corretiva também precisa de CI verde antes do merge.

### Evolução posterior

A Etapa 21 acrescentará WMS avançado, endereçamento automatizado, RFID, ressuprimento, roteirização, integração fiscal e depreciação oficial. Esse escopo não pertence à versão 0.17.0.

## `financeiro` — Financeiro Operacional

- **Rota:** `/app/financeiro`.
- **Estado:** Operacional.
- **Dependências:** obras, contratos e compras.
- **Regra:** leitura/escrita financeira exige capacidade sensível.
- **Integração com estoque:** custo informativo, sem lançamento automático.

## `sac` — Pós-venda e SAC

- **Rota:** `/app/ocorrencias`.
- **Estado:** Parcial.
- **Dependência:** clientes.
- **Próxima consolidação:** Etapa 18.

## `relatorios` — Relatórios e Indicadores

- **Rota:** `/app/relatorios`.
- **Estado:** Operacional.
- **Dependência:** obras.
- **Escopo:** dashboards, metas, relatórios salvos, snapshots e CSV.
- **Regra:** fontes operacionais são acessadas por RPC/view autorizada.

## `auditoria` — Auditoria

- **Rota:** `/app/auditoria`.
- **Estado:** Parcial sistêmico.
- **Regra:** eventos append-only, sem secrets ou documentos integrais.
- **Próxima consolidação:** Etapa 19.

## `administracao` — Administração

- **Rota:** `/app/administracao`.
- **Estado:** Operacional.
- **Escopo:** aplicativos, perfis, usuários, capacidades, escopos e overrides.
- **Regra:** negação explícita prevalece e alteração administrativa é auditada.

## Definition of Done de módulo

Um módulo somente muda para `Operacional` quando possui:

- contrato documentado;
- rota e interface funcional;
- migrations reproduzíveis;
- RLS e privilégios mínimos;
- autorização por capacidade e escopo;
- índices necessários;
- operações transacionais/idempotentes;
- testes centrais;
- CI verde;
- documentação histórica;
- inventário, roadmap e recuperação atualizados.
