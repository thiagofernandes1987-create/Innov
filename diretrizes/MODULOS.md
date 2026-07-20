# Contratos dos módulos — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Registro técnico:** `lib/modules/registry.ts`

Este documento descreve o contrato atual de cada aplicativo. O estado `Operacional` significa que há implementação funcional no repositório; não significa liberação automática para produção.

## Convenções

Cada módulo deve declarar:

- chave estável;
- rota-base;
- categoria;
- dependências;
- estado de implementação;
- dados e integrações;
- capacidades;
- invariantes de segurança;
- documento histórico principal.

## `dashboard` — Início

- **Rota:** `/app`
- **Categoria:** Núcleo
- **Estado:** Operacional
- **Finalidade:** central de aplicativos autorizados.
- **Regra:** exibir somente módulos habilitados na organização e permitidos ao usuário.
- **Segurança:** ocultação visual não substitui autorização de rota e dados.
- **Histórico:** `docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md`.

## `crm` — CRM e Vendas

- **Rota:** `/app/crm`
- **Categoria:** Comercial
- **Estado:** Parcial
- **Finalidade:** leads, oportunidades, qualificação e pipeline comercial.
- **Dependências esperadas:** clientes, orçamentos e propostas.
- **Pendência:** revisar se o domínio persistido anterior está integralmente presente na `main`; não declarar operacional sem migrations, RLS e testes inventariados.
- **Segurança:** dados comerciais limitados por organização e perfil.

## `clientes` — Clientes

- **Rota:** `/app/clientes`
- **Categoria:** Comercial
- **Estado:** Parcial
- **Finalidade:** cadastro do cliente e visão consolidada das suas obras, contratos e documentos liberados.
- **Regra:** um cliente pode possuir múltiplas obras abertas ou encerradas.
- **Integrações:** orçamentos, propostas, contratos, obras, SAC e portal.
- **Segurança:** cliente externo acessa apenas os próprios registros publicados.
- **Histórico:** `docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md`.

## `obras` — Obras

- **Rota:** `/app/obras`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Dependência:** clientes.
- **Escopo:** carteira multiobra, criação a partir de contrato, progresso, datas e portal.
- **Dados principais:** projetos, vínculos com cliente/contrato, snapshots de progresso.
- **Regras:** organização obrigatória; progresso armazenado em fração `0–1`; obra arquivada não aparece em consultas correntes.
- **Capacidades:** leitura, criação, edição, exclusão, administração e escopo por obra.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `planejamento` — Planejamento

- **Rota:** `/app/planejamento`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Dependência:** obras.
- **Escopo:** EAP, cronograma, dependências FS/SS/FF/SF, marcos e baselines.
- **Regras:** baseline concluída é imutável; pesos e progresso precisam manter coerência; alterações relevantes são auditáveis.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `tarefas` — Tarefas

- **Rota:** `/app/tarefas`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Dependência:** obras.
- **Escopo:** quadros de execução, responsáveis, prioridade, progresso, datas e bloqueios.
- **Regras:** bloqueio exige motivo; drag-and-drop precisa de alternativa por comando; status cancelado não conta como execução ativa.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `diario` — Diário de Obras

- **Rota:** `/app/diario`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Dependência:** obras.
- **Escopo:** registros mobile, atividades, mão de obra, segurança, qualidade, atrasos, ocorrências, fotos e vídeos.
- **Storage:** `daily-log-media` privado.
- **Regras:** mídia pertence à organização e obra; download por URL assinada ou rota autenticada.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `equipes` — Equipes

- **Rota:** `/app/equipes`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Dependência:** obras.
- **Escopo:** recursos, equipes, integrantes e atribuições.
- **Integrações futuras:** estoque para ferramentas/ativos sob responsabilidade.
- **Segurança:** escopo de obra e organização obrigatório.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md`.

## `orcamentos` — Orçamentos

- **Rota:** `/app/orcamentos`
- **Categoria:** Financeiro
- **Estado:** Operacional
- **Dependência:** clientes.
- **Escopo:** catálogo, composições, versões, custos, taxa administrativa, BDI, markup, margem, lucro, capital, ROI, payback, cenários e aprovações.
- **Regras:** versão congelada é imutável; dupla contagem bloqueada; aprovação crítica pode exigir AAL2; mudanças geram nova versão.
- **Dados sensíveis:** todos os cálculos internos.
- **Histórico:** `docs/ETAPA-09-FINANCEIRO-CONTRATOS.md`.

## `propostas` — Propostas

- **Rota:** `/app/propostas`
- **Categoria:** Comercial
- **Estado:** Operacional
- **Dependência:** orçamentos.
- **Escopo:** proposta derivada de orçamento aprovado, versões, conteúdo comercial, PDF, validade e aceite.
- **Storage:** `commercial-documents` privado.
- **Regras:** cliente visualiza somente versão liberada; PDF externo não expõe BDI, markup, margem, lucro ou ROI.
- **Histórico:** `docs/ETAPA-09-FINANCEIRO-CONTRATOS.md`.

## `contratos` — Contratos

- **Rota:** `/app/contratos`
- **Categoria:** Jurídico
- **Estado:** Operacional
- **Dependência:** propostas.
- **Escopo:** templates, versões, partes, vigência, valores original/aditivos/consolidado e documentos.
- **Storage:** `contract-documents` privado.
- **Regras:** versão enviada ou assinada é imutável; partes e organização devem ser compatíveis.
- **Histórico:** `docs/ETAPA-09-FINANCEIRO-CONTRATOS.md`.

## `aditivos` — Aditivos

- **Rota:** `/app/aditivos`
- **Categoria:** Jurídico
- **Estado:** Operacional
- **Dependência:** contratos.
- **Escopo:** alterações de escopo, valor, prazo, data final, versão e assinatura.
- **Regra:** aplicação ao contrato é idempotente; aditivo assinado não pode ser somado duas vezes.
- **Integrações:** orçamento, contrato, obra, financeiro e assinatura.
- **Histórico:** `docs/ETAPA-09-FINANCEIRO-CONTRATOS.md`.

## `assinaturas` — Assinaturas

- **Rota:** `/app/assinaturas`
- **Categoria:** Jurídico
- **Estado:** Operacional em sandbox
- **Dependência:** documentos.
- **Escopo:** PDF/DOCX, conversão, layout por página, assinatura, rubrica, data, nome, texto, checkbox, foto, anexos, evidência e entrega.
- **Storage:** `signature-artifacts` privado.
- **Workers:** conversão LibreOffice e entrega de e-mail.
- **Regras:** token bruto não é persistido; hashes em todas as fases; documento final imutável; webhook HMAC e idempotente.
- **Limitação:** sandbox não possui validade jurídica externa.
- **Histórico:** `docs/ETAPA-12-2-ASSINATURA-AVANCADA.md`.

## `documentos` — Documentos

- **Rota:** `/app/documentos`
- **Categoria:** Operacional
- **Estado:** Operacional
- **Escopo:** arquivos privados, disciplinas, versões, hashes, liberação ao cliente e downloads auditáveis.
- **Storage:** `project-documents`, além dos buckets especializados dos módulos.
- **Regras:** versão liberada é imutável; usuário acessa apenas organização/obra autorizada; cliente acessa somente publicação própria.
- **Histórico:** `docs/ETAPA-12-GESTAO-DE-OBRAS.md` e `docs/ETAPA-13-QUALIDADE-FORMULARIOS.md`.

## `qualidade` — Qualidade

- **Rota:** `/app/qualidade`
- **Categoria:** Qualidade
- **Estado:** Operacional
- **Dependência:** obras.
- **Escopo:** biblioteca, FVS, FVM, formulários internos/cliente/públicos, pesquisas, anexos, pontuação e revisão.
- **Storage:** `quality-documents` e `quality-form-attachments`, privados.
- **Regras:** schema publicado é imutável; alteração exige nova versão; resposta possui ciclo de revisão; token público somente em hash.
- **Motor auxiliar:** pacote Python para modelos/renderização e testes.
- **Histórico:** `docs/ETAPA-13-QUALIDADE-FORMULARIOS.md`.

## `compras` — Compras e Suprimentos

- **Rota:** `/app/compras`
- **Categoria:** Suprimentos
- **Estado:** Operacional
- **Dependências:** obras e qualidade.
- **Escopo:** solicitações, itens, fornecedores internos, convites, cotações, comparação, aprovação, pedidos e recebimentos.
- **Storage:** `procurement-attachments` privado.
- **Regras:** fornecedor sem autoinscrição; token de convite somente em hash; recebimento vazio bloqueado; recebimento parcial permitido; FVM aberta no recebimento.
- **Integrações:** estoque, financeiro e relatórios.
- **Histórico:** `docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md`.

## `estoque` — Estoque e Inventário

- **Rota:** `/app/estoque`
- **Categoria:** Suprimentos
- **Estado:** Planejado — Etapa 17
- **Dependência:** compras.
- **Escopo obrigatório:** itens, categorias, unidades, depósitos, localizações, entradas, saídas, transferências, devoluções, perdas, ajustes, reservas, estoque mínimo, lotes, validade, ativos, ferramentas, responsáveis e inventário físico.
- **Integrações:** recebimentos de compras, obras, equipes, financeiro e relatórios.
- **Regras planejadas:** saldo derivado de movimentos; nenhum saldo negativo sem política explícita; movimento concluído imutável; ajuste exige motivo e auditoria; transferência é atômica.
- **Documento inicial:** será criado em `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`.

## `financeiro` — Financeiro Operacional

- **Rota:** `/app/financeiro`
- **Categoria:** Financeiro
- **Estado:** Operacional
- **Dependências:** obras, contratos e compras.
- **Escopo:** lançamentos, contas a pagar/receber, parcelas, aprovação, liquidação, comprovantes, medições, categorias, centros de custo, contas e fluxo de caixa.
- **Storage:** `finance-attachments` privado.
- **Regras:** capacidade sensível obrigatória; baixa e comprovante atômicos; importações idempotentes; valores e saldos rastreáveis.
- **Histórico:** `docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md`.

## `sac` — Pós-venda e SAC

- **Rota:** `/app/ocorrencias`
- **Categoria:** Pós-venda
- **Estado:** Parcial
- **Dependência:** clientes.
- **Escopo esperado:** ocorrências, classificação, prioridade, responsáveis, SLA, anexos, histórico, comunicação e encerramento.
- **Pendência:** confirmar migrations, RLS e rotas persistidas na `main` antes de declarar operacional.
- **Integrações:** cliente, obra, qualidade e relatórios.

## `relatorios` — Relatórios e Indicadores

- **Rota:** `/app/relatorios`
- **Categoria:** Geral
- **Estado:** Operacional
- **Dependência:** obras; fontes opcionais em planejamento, financeiro, compras, qualidade, diário e documentos.
- **Escopo:** painel executivo, multiobra, detalhe, metas, alertas, relatórios salvos, snapshots e CSV.
- **Regras:** dados operacionais não são duplicados de forma mutável; RPCs aplicam autorização; financeiro é mascarado sem capacidade sensível; snapshot concluído é imutável; exportação possui SHA-256 e auditoria.
- **Views:** views internas com `security_invoker`; leitura direta revogada para usuários.
- **Histórico:** `docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md`.

## `auditoria` — Auditoria

- **Rota:** `/app/auditoria`
- **Categoria:** Núcleo
- **Estado:** Parcial sistêmico
- **Finalidade:** visão unificada de eventos de segurança, acesso e alterações.
- **Situação:** diversos módulos já possuem tabelas/eventos de auditoria, mas o painel transversal completo ainda precisa de consolidação.
- **Regras:** eventos críticos append-only; acesso restrito; não armazenar segredo ou documento integral em log.

## `administracao` — Administração

- **Rota:** `/app/administracao`
- **Categoria:** Núcleo
- **Estado:** Operacional
- **Escopo:** catálogo de aplicativos, habilitação por organização, perfis, múltiplos perfis por usuário, escopos, overrides e justificativas.
- **Regras:** negação explícita prevalece; alteração administrativa gera auditoria; escrita direta em tabelas de acesso é restrita; RPC valida permissão internamente.
- **Histórico:** `docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md` e `docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md`.

## Definition of Done de módulo

Um módulo somente muda para `Operacional` quando possui:

- contrato documentado nesta página;
- rota e interface funcional;
- schema/migrations reproduzíveis;
- RLS e privilégios mínimos;
- autorização por capacidade e escopo;
- índices necessários;
- validação estrutural;
- testes de regras centrais;
- build verde;
- documentação histórica da etapa;
- inventário e roadmap atualizados;
- procedimento de recuperação atualizado quando necessário.
