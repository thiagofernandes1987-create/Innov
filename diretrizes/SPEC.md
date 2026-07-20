# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.2.0  
**Versão implementada:** 0.17.0  
**Atualizado em:** 20 de julho de 2026  
**Fonte de verdade:** `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é uma plataforma modular e multiempresa para gerir o ciclo completo da construção civil:

```text
lead → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras
→ estoque → financeiro → indicadores → entrega → pós-venda → auditoria
```

## 2. Regra de continuidade

GitHub é a fonte definitiva de código, migrations, documentação, testes e recuperação. A solução precisa ser reconstruível mesmo após perda total de contêiner, conversa ou ambiente local.

Nenhum segredo pertence à documentação. Credenciais são configuradas em cofres de ambiente.

## 3. Princípios inegociáveis

1. módulos plug-and-play por organização;
2. isolamento multiempresa e multiobra;
3. autorização em rota, RPC, tabela e arquivo;
4. RLS por padrão;
5. Service Role somente no servidor;
6. documentos e buckets privados;
7. versionamento, hash e imutabilidade;
8. auditoria de ações críticas;
9. idempotência em integrações;
10. documentação atualizada no mesmo PR;
11. saldos derivados de razões, nunca editados diretamente;
12. CI como bloqueio obrigatório.

## 4. Perfis e autorização

Perfis canônicos:

- Super Administrador;
- Direção;
- Administrador;
- Comercial/Vendas;
- Gestor de Obras;
- Engenharia;
- Orçamentista;
- Financeiro;
- Qualidade;
- Compras;
- Pós-venda/SAC;
- Cliente.

Perfis personalizados são permitidos e não podem ser sobrescritos por instaladores.

Níveis: `NONE`, `READ`, `EDIT/READ_WRITE` e `FULL/DELETE`. Capacidades incluem criar, editar, excluir, aprovar, liberar, assinar, exportar, administrar, configurar e visualizar dados sensíveis. Escopos incluem organização, cliente, obra e recurso/depósito.

## 5. Catálogo modular

1. dashboard;
2. CRM e Vendas;
3. clientes;
4. obras;
5. planejamento;
6. tarefas;
7. diário de obras;
8. equipes;
9. orçamentos;
10. propostas;
11. contratos;
12. aditivos;
13. assinaturas;
14. documentos;
15. qualidade;
16. compras;
17. estoque;
18. financeiro;
19. SAC;
20. relatórios;
21. auditoria;
22. administração.

## 6. Fluxos implementados

### Comercial e contratual

```text
orçamento versionado → aprovação → proposta PDF → aceite
→ contrato → assinatura → aditivo → valor/prazo consolidado
```

### Obras

```text
obra → EAP → cronograma → tarefas → equipes → diário
→ documentos → previsto x realizado → portal do cliente
```

### Qualidade e compras

```text
FVS/FVM/formulário → preenchimento → anexos → revisão
solicitação → cotação → comparação → aprovação → pedido → recebimento
```

### Estoque — Etapa 17

```text
recebimento aceito → entrada idempotente → saldo físico
→ reserva → saldo disponível → consumo/devolução/transferência
→ custódia de ativos → inventário físico → ajuste/reversão → auditoria
```

**Estado real:** PR `#14` mesclado na `main`; migrations aplicadas no Supabase; homologação estrutural registrada no PR `#15`. E2E autenticado permanece pendente porque o ambiente não possui identidades reais de homologação.

### Financeiro e relatórios

```text
contrato/pedido/medição → lançamento → parcelas → aprovação → liquidação
fontes autorizadas → métricas → dashboard → snapshot → exportação auditada
```

## 7. Regras essenciais do estoque

- 18 tabelas com RLS;
- seis views internas sem acesso direto pelo navegador;
- saldo físico = soma de movimentos `POSTED`;
- saldo reservado = reservas ativas líquidas;
- saldo disponível = físico menos reservado;
- movimento postado é imutável;
- reversão referencia o original;
- transferência é atômica;
- saldo negativo é bloqueado por padrão;
- recebimento de Compras é idempotente;
- somente quantidade aceita entra no estoque;
- inventário aprovado gera ajuste rastreável;
- vínculos incompatíveis entre organização e obra são bloqueados;
- custos não possuem leitura direta e escrita exige capacidade sensível;
- 101 FKs do domínio possuem cobertura de índice;
- nenhuma RPC do estoque é executável por `anon`.

## 8. Dados e migrations

- PostgreSQL/Supabase;
- Supabase Auth;
- Storage privado;
- migrations exclusivamente em `supabase/migrations/`;
- migration aplicada nunca é reescrita;
- funções `SECURITY DEFINER` usam `search_path` explícito e checagem interna;
- helpers internos têm execução revogada;
- correções pós-merge usam novas migrations.

Migrations corretivas da Etapa 17:

- concorrência de movimentos e reservas;
- escopo de saldo por obra;
- índices de performance;
- privilégios de RPC.

## 9. Stack

- Next.js 16;
- React 19;
- TypeScript estrito;
- Server Components e Server Actions;
- validação server-side;
- módulos privilegiados com `server-only`;
- interfaces responsivas e acessíveis.

## 10. Ambientes

### Homologação

O projeto Supabase conectado é `wyeojufebtwblsubkunr`. Atualmente não possui usuários, organizações, memberships ou obras. O E2E autenticado deve ser executado quando contas reais forem provisionadas, sem fabricar identidades ou desabilitar constraints.

### Produção

Exige revisão jurídica, fiscal, contábil e LGPD, provider jurídico real, pentest, backup/restauração testados, observabilidade, rotação de segredos, antimalware de anexos e aprovação explícita.

## 11. Variáveis conhecidas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SIGNATURE_PROVIDER=
SIGNATURE_WEBHOOK_SECRET=
SIGNATURE_EMAIL_WEBHOOK_URL=
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

Valores nunca são versionados.

## 12. CI obrigatório

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

O CI do commit atual do PR `#15` está verde.

## 13. Próxima etapa

A Etapa 17 está estruturalmente homologada. Antes da publicação externa, deve ser executado E2E autenticado com contas reais.

A próxima etapa funcional planejada é:

- Etapa 18 — consolidação de CRM, Clientes e SAC;
- Etapa 19 — auditoria e observabilidade;
- Etapa 20 — prontidão de produção;
- Etapa 21 — WMS avançado, RFID, automação logística, fiscal e patrimonial.

## 14. Regra documental

Toda alteração de escopo ou arquitetura atualiza no mesmo PR:

- `diretrizes/SPEC.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- `diretrizes/ARQUITETURA.md` quando necessário;
- `diretrizes/ROADMAP.md`;
- `diretrizes/HISTORICO-ETAPAS.md`;
- documento técnico da etapa;
- validadores correspondentes.
