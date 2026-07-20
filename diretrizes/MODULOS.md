# Contratos dos módulos — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Versão da branch atual:** 0.17.0  
**Registro técnico:** `lib/modules/registry.ts`

Este documento descreve o contrato atual de cada aplicativo. O estado `Operacional` significa que existe implementação funcional no repositório estável; uma etapa em branch permanece `Em implementação` até homologação, revisão e merge.

## Convenções

Cada módulo declara:

- chave estável;
- rota-base;
- categoria;
- dependências;
- estado;
- dados e integrações;
- capacidades;
- invariantes de segurança;
- documento técnico principal.

## `dashboard` — Início

- **Rota:** `/app`;
- **Categoria:** Núcleo;
- **Estado:** Operacional;
- **Finalidade:** central de aplicativos autorizados;
- **Regra:** exibir somente módulos habilitados e permitidos;
- **Histórico:** `docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md`.

## `crm` — CRM e Vendas

- **Rota:** `/app/crm`;
- **Categoria:** Comercial;
- **Estado:** Parcial;
- **Finalidade:** leads, oportunidades, qualificação e pipeline;
- **Dependências:** clientes, orçamentos e propostas;
- **Próxima evolução:** consolidação na Etapa 18;
- **Segurança:** isolamento por organização e perfil.

## `clientes` — Clientes

- **Rota:** `/app/clientes`;
- **Categoria:** Comercial;
- **Estado:** Parcial;
- **Finalidade:** cadastro e visão consolidada de obras, contratos e documentos;
- **Regra:** um cliente pode possuir múltiplas obras;
- **Integrações:** CRM, contratos, obras, SAC e portal;
- **Próxima evolução:** Etapa 18.

## `obras` — Obras

- **Rota:** `/app/obras`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Dependência:** clientes;
- **Escopo:** carteira multiobra, criação, progresso, datas e portal;
- **Regras:** organização obrigatória; progresso em fração `0–1`; arquivamento preserva histórico;
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `planejamento` — Planejamento

- **Rota:** `/app/planejamento`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Dependência:** obras;
- **Escopo:** EAP, cronograma, dependências, marcos e baselines;
- **Regras:** baseline concluída é imutável; alterações relevantes são auditáveis.

## `tarefas` — Tarefas

- **Rota:** `/app/tarefas`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Dependência:** obras;
- **Escopo:** execução, responsáveis, prioridade, progresso, datas e bloqueios;
- **Integração:** reservas de estoque podem apontar para tarefa;
- **Regras:** bloqueio exige motivo; drag-and-drop possui alternativa por comando.

## `diario` — Diário de Obras

- **Rota:** `/app/diario`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Dependência:** obras;
- **Escopo:** atividades, mão de obra, segurança, qualidade, atrasos, ocorrências e mídias;
- **Storage:** `daily-log-media` privado;
- **Regra:** mídia pertence à organização e obra.

## `equipes` — Equipes

- **Rota:** `/app/equipes`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Dependência:** obras;
- **Escopo:** recursos, equipes, integrantes e atribuições;
- **Integração:** custódia de ferramentas e ativos;
- **Regra:** escopo de obra e organização obrigatório.

## `orcamentos` — Orçamentos

- **Rota:** `/app/orcamentos`;
- **Categoria:** Financeiro;
- **Estado:** Operacional;
- **Dependência:** clientes;
- **Escopo:** custos, taxa administrativa, BDI, markup, margem, ROI, cenários e aprovações;
- **Regras:** versão congelada é imutável; dupla contagem bloqueada; aprovação crítica pode exigir AAL2;
- **Dados sensíveis:** cálculos internos.

## `propostas` — Propostas

- **Rota:** `/app/propostas`;
- **Categoria:** Comercial;
- **Estado:** Operacional;
- **Dependência:** orçamentos;
- **Escopo:** versões, conteúdo comercial, PDF, validade e aceite;
- **Storage:** `commercial-documents` privado;
- **Regra:** cliente visualiza somente versão liberada.

## `contratos` — Contratos

- **Rota:** `/app/contratos`;
- **Categoria:** Jurídico;
- **Estado:** Operacional;
- **Dependência:** propostas;
- **Escopo:** templates, versões, partes, vigência e valores;
- **Storage:** `contract-documents` privado;
- **Regra:** versão enviada ou assinada é imutável.

## `aditivos` — Aditivos

- **Rota:** `/app/aditivos`;
- **Categoria:** Jurídico;
- **Estado:** Operacional;
- **Dependência:** contratos;
- **Escopo:** alterações de escopo, valor, prazo e data final;
- **Regra:** aplicação ao contrato é idempotente;
- **Integrações:** orçamento, contrato, obra, financeiro e assinatura.

## `assinaturas` — Assinaturas

- **Rota:** `/app/assinaturas`;
- **Categoria:** Jurídico;
- **Estado:** Operacional em sandbox;
- **Dependência:** documentos;
- **Escopo:** PDF/DOCX, conversão, campos, assinatura, rubrica, foto, anexos e evidência;
- **Storage:** `signature-artifacts` privado;
- **Regras:** token bruto não é persistido; hashes em todas as fases; conclusão idempotente;
- **Limitação:** sandbox sem validade jurídica externa.

## `documentos` — Documentos

- **Rota:** `/app/documentos`;
- **Categoria:** Operacional;
- **Estado:** Operacional;
- **Escopo:** arquivos privados, disciplinas, versões, hashes e liberação;
- **Storage:** `project-documents` e buckets especializados;
- **Regra:** versão liberada é imutável.

## `qualidade` — Qualidade

- **Rota:** `/app/qualidade`;
- **Categoria:** Qualidade;
- **Estado:** Operacional;
- **Dependência:** obras;
- **Escopo:** biblioteca, FVS, FVM, formulários, pesquisas, anexos e revisão;
- **Storage:** `quality-documents` e `quality-form-attachments` privados;
- **Regra:** schema publicado é imutável; alteração exige nova versão.

## `compras` — Compras e Suprimentos

- **Rota:** `/app/compras`;
- **Categoria:** Suprimentos;
- **Estado:** Operacional;
- **Dependências:** obras e qualidade;
- **Escopo:** solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos;
- **Storage:** `procurement-attachments` privado;
- **Regras:** recebimento vazio bloqueado; parcial permitido; quantidades aceitas e rejeitadas rastreadas;
- **Integrações:** estoque, financeiro e relatórios.

## `estoque` — Estoque, Inventário e Almoxarifado

- **Rota:** `/app/estoque`;
- **Categoria:** Suprimentos;
- **Estado:** Em implementação — Etapa 17, PR `#14`;
- **Versão do módulo:** `1.0.0`;
- **Dependências:** compras e obras;
- **Integrações:** equipes, financeiro e relatórios;
- **Documento:** `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`.

### Escopo da Etapa 17

- itens, categorias e unidades;
- depósitos e localizações;
- lotes e validade;
- entradas, saídas, devoluções, transferências, perdas, ajustes e reversões;
- reservas por obra, tarefa, depósito, localização e lote;
- estoque mínimo e alertas;
- ferramentas e ativos individualizados;
- custódias, devoluções e manutenção;
- inventário físico, recontagem, aprovação e ajuste;
- integração idempotente com recebimentos aceitos de Compras;
- dashboard e detalhes seguros;
- RLS, índices, RPCs, imutabilidade e auditoria.

### Razão e saldo

```text
saldo físico = soma das linhas de movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

- saldo não é editável diretamente;
- movimento `POSTED` é imutável;
- correção ocorre por reversão;
- transferência é atômica;
- saldo negativo é bloqueado por padrão;
- importação de recebimento é idempotente;
- quantidade rejeitada não entra;
- inventário postado é imutável.

### Segurança

- RLS nas 18 tabelas;
- isolamento multiempresa e multiobra;
- views internas sem acesso direto;
- custos mascarados por capacidade sensível;
- Service Role ausente do navegador;
- transições críticas somente por RPC;
- eventos sem secrets.

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

Após as Etapas 18, 19 e 20, o módulo será evoluído com:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

Documento: `docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`.

RFID e automações não substituem o razão imutável. Nenhuma capacidade da Etapa 21 é considerada implementada neste momento.

## `financeiro` — Financeiro Operacional

- **Rota:** `/app/financeiro`;
- **Categoria:** Financeiro;
- **Estado:** Operacional;
- **Dependências:** obras, contratos e compras;
- **Escopo:** lançamentos, contas, parcelas, aprovação, liquidação, comprovantes, medições e caixa;
- **Storage:** `finance-attachments` privado;
- **Regras:** capacidade sensível; baixa atômica; importações idempotentes;
- **Integração com estoque:** custos informativos não criam lançamento automaticamente.

## `sac` — Pós-venda e SAC

- **Rota:** `/app/ocorrencias`;
- **Categoria:** Pós-venda;
- **Estado:** Parcial;
- **Dependência:** clientes;
- **Escopo esperado:** ocorrências, prioridade, SLA, responsáveis, anexos e encerramento;
- **Próxima evolução:** Etapa 18.

## `relatorios` — Relatórios e Indicadores

- **Rota:** `/app/relatorios`;
- **Categoria:** Geral;
- **Estado:** Operacional;
- **Dependência:** obras; fontes opcionais em planejamento, financeiro, compras, qualidade, diário, documentos e estoque;
- **Escopo:** painel executivo, multiobra, metas, alertas, relatórios salvos, snapshots e CSV;
- **Regras:** RPCs aplicam autorização; valores sensíveis são mascarados; snapshot concluído é imutável.

## `auditoria` — Auditoria

- **Rota:** `/app/auditoria`;
- **Categoria:** Núcleo;
- **Estado:** Parcial sistêmico;
- **Finalidade:** visão unificada de eventos de segurança, acesso e alterações;
- **Próxima evolução:** Etapa 19;
- **Regras:** eventos críticos append-only; acesso restrito; sem segredo ou documento integral.

## `administracao` — Administração

- **Rota:** `/app/administracao`;
- **Categoria:** Núcleo;
- **Estado:** Operacional;
- **Escopo:** aplicativos, perfis, usuários, escopos, overrides e justificativas;
- **Regras:** negação explícita prevalece; alteração administrativa gera auditoria.

## Definition of Done de módulo

Um módulo somente muda para `Operacional` quando possui:

- contrato documentado;
- rota e interface funcional;
- schema/migrations reproduzíveis;
- migration aplicada e homologada;
- RLS e privilégios mínimos;
- autorização por capacidade e escopo;
- índices necessários;
- validação estrutural;
- testes de regras centrais e concorrência quando houver saldo;
- build e CI verdes;
- documentação histórica;
- inventário, SPEC e roadmap atualizados;
- procedimento de recuperação atualizado quando necessário.
