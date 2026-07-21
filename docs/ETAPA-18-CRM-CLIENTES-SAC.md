# Etapa 18 — CRM, Clientes e SAC

**Estado:** em implementação  
**Branch:** `feature/etapa-18-crm-clientes-sac`  
**Versão alvo:** 0.18.0

## 1. Objetivo

Consolidar o relacionamento completo com o cliente sem criar cadastros paralelos:

```text
lead → qualificação → oportunidade → cliente 360
→ múltiplas obras/contratos → atendimento → pós-venda → pesquisa
```

## 2. Correção de base antes da etapa

O primeiro conjunto de commits reconcilia o diretório `supabase/migrations` com o ledger remoto. Migrations duplicadas da Etapa 17 foram removidas e as versões canônicas do banco foram preservadas:

```text
20260720233052_stage17_inventory_concurrency_locks.sql
20260720233657_stage17_homologation_balance_project_scope.sql
20260720234333_stage17_inventory_performance_indexes.sql
20260720234549_stage17_inventory_rpc_privileges.sql
```

O CI passou a rejeitar timestamps, nomes lógicos ou conteúdos SQL duplicados.

## 3. Escopo funcional

### CRM

- leads com origem, campanha, interesse, orçamento estimado, responsável e follow-up;
- pipeline configurado por estágios;
- oportunidades com valor, probabilidade, previsão, motivo de perda e histórico;
- atividades de ligação, mensagem, reunião, visita, e-mail e nota;
- conversão idempotente de lead em cliente e oportunidade;
- prevenção de duplicidade por documento, e-mail e telefone normalizados;
- visão de funil e tarefas de acompanhamento.

### Cliente 360

- pessoa física ou jurídica;
- múltiplos contatos e contato principal;
- preferências de comunicação e consentimentos LGPD;
- oportunidades, propostas, contratos, obras, documentos, financeiro e chamados;
- um cliente pode possuir várias obras abertas ou concluídas;
- arquivamento sem perda do histórico.

### SAC e pós-venda

- categorias e SLAs;
- abertura interna ou pelo portal do cliente;
- vínculo opcional a obra e contrato;
- prioridade, responsável, status e prazo;
- mensagens internas ou visíveis ao cliente;
- fotos e anexos privados;
- histórico append-only;
- encerramento, reabertura e avaliação;
- indicadores de chamados abertos, atrasados e tempo de resolução.

## 4. Modelo de dados

Tabelas existentes evoluídas:

- `clients`;
- `opportunities`.

Tabelas novas:

- `crm_leads`;
- `client_contacts`;
- `crm_activities`;
- `crm_opportunity_stage_history`;
- `client_consents`;
- `sac_categories`;
- `sac_tickets`;
- `sac_ticket_messages`;
- `sac_ticket_attachments`;
- `sac_ticket_events`.

Bucket privado:

- `crm-sac-attachments`.

## 5. Segurança

- RLS em todas as tabelas novas;
- acesso interno por módulos `crm`, `clientes` e `sac`;
- cliente autenticado acessa apenas seu cadastro e seus chamados;
- mensagens internas nunca são visíveis no portal;
- anexo exige ticket autorizado e caminho da organização;
- consentimentos possuem trilha de origem e data;
- dados pessoais sensíveis não são exportados sem capacidade;
- RPCs públicas inexistentes; operações externas passam por sessão autenticada;
- eventos de atendimento são append-only.

## 6. Integrações

- oportunidade ganha pode criar ou vincular cliente;
- cliente pode ter várias obras e contratos;
- SAC pode apontar para obra, contrato, documento ou entrega;
- formulários e pesquisas da Etapa 13 podem ser distribuídos após encerramento;
- relatórios recebem métricas agregadas, sem duplicar estado operacional.

## 7. Definition of Done

- [ ] ledger Supabase local reconciliado;
- [ ] documentação canônica atualizada;
- [ ] migrations aplicadas e homologadas;
- [ ] leads, oportunidades e conversão idempotente;
- [ ] cliente 360 multiobra;
- [ ] chamados internos e do portal;
- [ ] mensagens, anexos, SLAs e eventos;
- [ ] RLS interna e de cliente testada;
- [ ] nenhuma RPC operacional acessível por `anon`;
- [ ] índices de todas as FKs;
- [ ] advisors revisados;
- [ ] CI integral verde;
- [ ] PR pronto para revisão.
