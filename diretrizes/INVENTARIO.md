# Inventário canônico — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Base:** `main` após a consolidação da Etapa 16  
**Versão:** 0.16.0

Este documento registra o que precisa existir para recuperar, validar e continuar o projeto.

## 1. Repositório

- Repositório: `thiagofernandes1987-create/Innov`
- Branch estável: `main`
- Gerenciador: `pnpm@11.15.0`
- Node.js: `>=24`
- Python utilizado pelos testes de Qualidade: `3.13` no CI
- Banco/Auth/Storage: Supabase
- Framework web: Next.js 16 + React 19 + TypeScript

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa principal | Observação |
|---|---|---:|---:|---|
| `dashboard` | Início | Operacional | 12.1 | Exibe somente módulos autorizados. |
| `crm` | CRM e Vendas | Parcial | anterior ao recorte atual | Catálogo e rota genérica existem; domínio completo deve ser inventariado antes de nova evolução. |
| `clientes` | Clientes | Parcial | 12 | Clientes sustentam contratos e obras; tela dedicada completa ainda precisa de revisão. |
| `obras` | Obras | Operacional | 12 | Carteira multiobra, criação, detalhe e portal. |
| `planejamento` | Planejamento | Operacional | 12 | EAP, cronograma, dependências, marcos e baselines. |
| `tarefas` | Tarefas | Operacional | 12 | Kanban, progresso, bloqueios e responsáveis. |
| `diario` | Diário de Obras | Operacional | 12 | Diário mobile, atividades, ocorrências e mídias. |
| `equipes` | Equipes | Operacional | 12 | Recursos, equipes e integrantes. |
| `orcamentos` | Orçamentos | Operacional | 9 | Versões, custos, BDI, markup, cenários e aprovações. |
| `propostas` | Propostas | Operacional | 9 | Versões, PDF, liberação e aceite. |
| `contratos` | Contratos | Operacional | 9 | Contratos, versões, partes e vigência. |
| `aditivos` | Aditivos | Operacional | 9 | Escopo, valor, prazo e aplicação idempotente. |
| `assinaturas` | Assinaturas | Operacional em sandbox | 9 e 12.2 | PDF/DOCX, campos, evidências e entrega; provider jurídico real pendente. |
| `documentos` | Documentos | Operacional | 12 e 13 | Arquivos privados, versões, disciplina, qualidade e cliente. |
| `qualidade` | Qualidade | Operacional | 13 | FVS, FVM, formulários, pesquisas, anexos e revisão. |
| `compras` | Compras e Suprimentos | Operacional | 14 | Solicitações, cotações, comparação, pedidos e recebimentos. |
| `estoque` | Estoque e Inventário | Planejado | 17 | Próximo módulo oficial; desabilitado até implementação. |
| `financeiro` | Financeiro Operacional | Operacional | 15 | Lançamentos, parcelas, medições, baixas e fluxo de caixa. |
| `sac` | Pós-venda e SAC | Parcial | anterior ao recorte atual | Rotas e conceito existem; domínio persistido completo deve ser revisado. |
| `relatorios` | Relatórios e Indicadores | Operacional | 16 | Dashboards, metas, snapshots e CSV auditado. |
| `auditoria` | Auditoria | Parcial sistêmico | transversal | Eventos existem em vários domínios; painel unificado ainda precisa de consolidação. |
| `administracao` | Administração | Operacional | 12.1 | Aplicativos, perfis, usuários, escopos e overrides. |

## 3. Documentação canônica

Arquivos obrigatórios:

```text
diretrizes/
├── README.md
├── SPEC.md
├── INVENTARIO.md
├── MODULOS.md
├── ARQUITETURA.md
├── ROADMAP.md
├── RECUPERACAO.md
├── PADRAO-DOCUMENTACAO.md
└── HISTORICO-ETAPAS.md
```

Documentação histórica e de implementação permanece em `docs/`.

## 4. Documentos históricos existentes

```text
docs/ETAPA-09-FINANCEIRO-CONTRATOS.md
docs/ETAPA-09-TEST-PLAN.md
docs/ETAPA-10-HOMOLOGACAO-SUPABASE.md
docs/ETAPA-11-HOMOLOGACAO-AUTENTICADA.md
docs/ETAPA-12-GESTAO-DE-OBRAS.md
docs/RELATORIO-HOMOLOGACAO-ETAPA-12.md
docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md
docs/ETAPA-12-2-ASSINATURA-AVANCADA.md
docs/ETAPA-13-QUALIDADE-FORMULARIOS.md
docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md
docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md
docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md
docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md
docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md
```

## 5. Rotas internas principais

### Núcleo

```text
/app
/app/administracao
/app/administracao/aplicativos
/app/administracao/perfis
/app/administracao/usuarios
```

### Comercial e contratos

```text
/app/orcamentos
/app/orcamentos/novo
/app/orcamentos/[id]
/app/propostas
/app/contratos
/app/aditivos
/app/assinaturas
/app/assinaturas/novo
/app/assinaturas/documentos/[id]
```

### Obras e campo

```text
/app/obras
/app/obras/novo
/app/obras/[id]
/app/obras/[id]/eap
/app/obras/[id]/cronograma
/app/obras/[id]/tarefas
/app/obras/[id]/equipes
/app/obras/[id]/diario
/app/obras/[id]/diario/[logId]
/app/obras/[id]/documentos
/app/planejamento
/app/tarefas
/app/equipes
/app/diario
/app/documentos
```

### Qualidade

```text
/app/qualidade
/app/qualidade/documentos
/app/qualidade/formularios
/app/qualidade/formularios/novo
/app/qualidade/formularios/[id]
/app/qualidade/preenchimentos
/app/qualidade/preenchimentos/[id]
/app/qualidade/respostas/[id]
```

### Compras

```text
/app/compras
/app/compras/fornecedores
/app/compras/solicitacoes
/app/compras/solicitacoes/nova
/app/compras/solicitacoes/[id]
/app/compras/pedidos
/app/compras/pedidos/[id]
```

### Financeiro

```text
/app/financeiro
/app/financeiro/lancamentos
/app/financeiro/lancamentos/novo
/app/financeiro/lancamentos/[id]
/app/financeiro/medicoes
/app/financeiro/medicoes/nova
/app/financeiro/medicoes/[id]
/app/financeiro/fluxo-de-caixa
/app/financeiro/configuracoes
```

### Relatórios

```text
/app/relatorios
/app/relatorios/obras
/app/relatorios/obras/[id]
/app/relatorios/financeiro
/app/relatorios/compras
/app/relatorios/qualidade
/app/relatorios/metas
/app/relatorios/salvos
/app/relatorios/snapshots
```

## 6. Portal e rotas externas

### Portal do cliente

```text
/cliente
/cliente/obras
/cliente/obras/[id]
/cliente/cronograma
/cliente/documentos
/cliente/midia
/cliente/orcamentos
/cliente/contratos
/cliente/aditivos
/cliente/assinaturas
/cliente/formularios
/cliente/formularios/[id]
```

### Fluxos externos controlados

```text
/assinar/[token]
/formularios/[token]
/fornecedores/cotacoes/[token]
```

Tokens públicos brutos não podem ser persistidos; somente hashes.

## 7. APIs e rotas de arquivo

```text
/api/proposals/[versionId]/pdf
/api/contracts/[versionId]/pdf
/api/signatures/webhook
/api/documents/signatures/[envelopeId]
/api/qualidade/documentos/[id]
/api/qualidade/anexos/[id]
/api/compras/cotacoes/[id]/anexo
/api/financeiro/anexos/[id]
/api/relatorios/exportar
```

## 8. Buckets privados conhecidos

| Bucket | Domínio | Observação |
|---|---|---|
| `commercial-documents` | propostas | PDFs e versões comerciais. |
| `contract-documents` | contratos | PDFs contratuais e aditivos. |
| `project-documents` | obras | Documentos por obra e disciplina. |
| `daily-log-media` | diário | Fotos e vídeos de campo. |
| `signature-artifacts` | assinaturas | Originais, convertidos, campos, anexos e finais. |
| `quality-documents` | qualidade | Biblioteca e documentos de referência. |
| `quality-form-attachments` | qualidade | Evidências anexadas às respostas. |
| `procurement-attachments` | compras | Cotações, pedidos e recebimentos. |
| `finance-attachments` | financeiro | Comprovantes privados. |

Todo bucket sensível deve permanecer privado.

## 9. Grupos de migrations

| Faixa | Domínio |
|---|---|
| `20260719230000`–`20260719234500` | Etapa 9 — financeiro comercial, contratos e assinaturas. |
| `20260719214500` | Etapa 10 — hardening de homologação. |
| `20260719215500` | Etapa 11 — idempotência de signatários. |
| `20260719223000`–`20260719223500` | Etapa 12 — obras, planejamento, campo e documentos. |
| `20260720043000`–`20260720043300` | Etapa 12.1 — módulos, perfis e autorização. |
| `20260720054000`–`20260720054350` | Etapa 12.2 — assinatura avançada. |
| `20260720080000`–`20260720080220` | Etapa 13 — qualidade e formulários. |
| `20260720103000`–`20260720103400` | Etapa 14 — compras e suprimentos. |
| `20260720123000`–`20260720123500` | Etapa 15 — financeiro operacional. |
| `20260720143000`–`20260720143900` | Etapa 16 — relatórios e hardening relacionado. |

Novas migrations nunca devem reutilizar timestamp ou editar migration já aplicada para corrigir ambiente existente.

## 10. Scripts e workers

```text
scripts/provision-homologation-users.mjs
scripts/run-stage11-e2e.mjs
scripts/run-signature-conversion-worker.mjs
scripts/run-signature-delivery-worker.mjs
scripts/validate-stage9.mjs
scripts/validate-stage12.mjs
scripts/validate-stage12-1.mjs
scripts/validate-stage12-2.mjs
scripts/validate-stage13.mjs
scripts/validate-stage14.mjs
scripts/validate-stage15.mjs
scripts/validate-stage16.mjs
scripts/validate-documentation.mjs
```

## 11. Workflows

```text
.github/workflows/ci.yml
.github/workflows/stage11-homologation.yml
```

O CI principal deve executar `validate:docs` antes das validações funcionais.

## 12. Variáveis conhecidas

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
SIGNATURE_PROVIDER
SIGNATURE_WEBHOOK_SECRET
SIGNATURE_EMAIL_WEBHOOK_URL
DEMO_ADMIN_PASSWORD
DEMO_CLIENT_PASSWORD
```

Valores não pertencem ao repositório.

## 13. Dependências operacionais externas

- Supabase project e migrations aplicadas;
- GitHub Actions;
- provider de hospedagem web;
- LibreOffice headless no worker de conversão DOCX;
- webhook de entrega de e-mail para assinatura;
- provider jurídico real ainda não selecionado/configurado;
- serviço de análise antimalware ainda pendente para produção.

## 14. Lacunas conhecidas

- E2E autenticado deve ser executado regularmente com contas reais de homologação;
- provider de assinatura com validade jurídica externa não está ativo;
- revisão jurídica e contábil permanece obrigatória;
- CRM, Clientes, SAC e Auditoria precisam de inventário técnico adicional antes de novas evoluções;
- Estoque/Inventário ainda não está implementado;
- antivírus de anexos e pentest são pendências de produção;
- tipos Supabase gerados precisam permanecer sincronizados quando forem adotados.

## 15. Próximo item do inventário

A Etapa 17 adicionará o domínio `estoque` e deverá registrar neste arquivo:

- tabelas;
- enums;
- índices;
- RPCs;
- policies;
- buckets, se houver;
- rotas;
- integrações com recebimento de compras;
- regras de saldo, reserva, transferência e inventário físico;
- testes e limitações.
