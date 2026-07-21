# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.3.0  
**Versão implementada da plataforma:** 0.17.0  
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

GitHub é a fonte definitiva de código, migrations, documentação, testes e recuperação. A solução precisa ser reconstruível mesmo após perda total de contêiner, conversa ou ambiente local. Nenhum segredo pertence à documentação.

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
12. CI como bloqueio obrigatório;
13. migrations append-only;
14. privilégio mínimo.

## 4. Modelo de autorização

Perfis canônicos: Super Administrador, Direção, Administrador, Comercial/Vendas, Gestor de Obras, Engenharia, Orçamentista, Financeiro, Qualidade, Compras/Almoxarifado, Pós-venda/SAC e Cliente. Perfis personalizados não são sobrescritos por instaladores.

Níveis: `NONE`, `READ`, `EDIT/READ_WRITE` e `FULL/DELETE`. Capacidades incluem criar, editar, excluir, aprovar, liberar, assinar, exportar, administrar, configurar e visualizar dados sensíveis. Escopos incluem organização, cliente, obra e recurso/depósito.

## 5. Aplicativos modulares

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
17. **Estoque, Inventário e Almoxarifado**;
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
cliente → múltiplas obras → EAP → cronograma → tarefas
→ equipes → diário → documentos → portal
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

Estado real:

- implementação incorporada à `main` pelo PR `#14`;
- migrations aplicadas no Supabase;
- homologação funcional e RLS executadas com dados temporários revertidos;
- correções e evidências no PR `#15`, aguardando CI final e revisão;
- merge do PR `#15` depende de aprovação explícita.

### Financeiro e relatórios

```text
contrato/pedido/medição → lançamento → parcelas → aprovação → liquidação
fontes autorizadas → métricas → dashboard → snapshot → exportação auditada
```

## 7. Regras essenciais do estoque

- 18 tabelas com RLS;
- seis views internas sem acesso direto;
- saldo físico = soma de movimentos `POSTED`;
- saldo reservado = reservas ativas líquidas;
- saldo disponível = físico menos reservado;
- saldo não é editável diretamente;
- movimento postado é imutável;
- reversão referencia o original;
- transferência conserva quantidade;
- saldo negativo é bloqueado por padrão;
- recebimento de Compras integrado de forma idempotente;
- somente quantidade aceita entra;
- inventário aprovado gera ajuste rastreável;
- custos não possuem leitura direta;
- vínculos incompatíveis entre organização e obra são bloqueados;
- postagem usa `pg_advisory_xact_lock` por posição;
- 101 FKs possuem índice líder;
- nenhuma RPC operacional é executável por `anon`.

Evidências transacionais:

- bootstrap de módulos e perfis;
- entrada, reserva, consumo e reversão idempotentes;
- tentativa acima do disponível bloqueada;
- segunda saída sobre saldo insuficiente bloqueada;
- movimento postado bloqueado para alteração e exclusão;
- inventário físico contabilizado;
- RLS direto: dados próprios visíveis e dados da outra organização ocultos;
- custo direto bloqueado;
- dados artificiais revertidos.

## 8. Dados e migrations

- PostgreSQL/Supabase, Auth e Storage privado;
- migrations exclusivamente em `supabase/migrations/`;
- migration aplicada nunca é reescrita;
- funções `SECURITY DEFINER` usam `search_path` explícito e autorização interna;
- helpers internos têm execução revogada;
- correções pós-merge incluem concorrência, escopo de obra, índices e privilégios.

## 9. Stack

- Next.js 16;
- React 19;
- TypeScript estrito;
- Server Components e Server Actions;
- validação server-side;
- interfaces responsivas e acessíveis.

## 10. Ambientes

### Homologação

O projeto conectado é `wyeojufebtwblsubkunr`. Testes criaram identidades, organizações, memberships, obras, itens e movimentos apenas dentro de transações revertidas. Nenhum dado artificial permaneceu.

O conector não conseguiu abrir duas conexões simultâneas sem credenciais explícitas. Teste de carga concorrente real permanece obrigatório na Etapa 20.

### Produção

Exige revisão jurídica, fiscal, contábil e LGPD, provider jurídico real, pentest, backup/restauração testados, observabilidade, rotação de segredos, antimalware e aprovação explícita.

## 11. CI obrigatório

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 12. Próxima etapa oficial

Após CI e revisão do PR `#15`:

- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — auditoria e observabilidade;
- Etapa 20 — prontidão de produção;
- **Etapa 21 — WMS avançado**, endereçamento automatizado, RFID em tempo real, ressuprimento automático sem aprovação, roteirização logística, integração fiscal de entrada e depreciação contábil oficial.

A Etapa 21 permanece apenas planejada e não substitui o razão imutável da Etapa 17.

## 13. Regra documental

Toda mudança atualiza no mesmo PR: `SPEC.md`, `INVENTARIO.md`, `MODULOS.md`, `ARQUITETURA.md` quando necessário, `ROADMAP.md`, `RECUPERACAO.md`, `HISTORICO-ETAPAS.md`, documento técnico e validadores.
