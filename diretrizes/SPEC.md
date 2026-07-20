# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.2.0  
**Versão implementada da plataforma:** 0.17.0  
**Atualizado em:** 20 de julho de 2026  
**Fonte de verdade:** branch `main` e branches/PRs explicitamente registrados do repositório `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é a plataforma modular da **Innovar Construções e Reformas** para gerir o ciclo completo:

```text
lead → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras
→ estoque → financeiro → indicadores → entrega → pós-venda → auditoria
```

A arquitetura suporta múltiplas organizações, clientes e obras. Um cliente pode possuir várias obras abertas ou encerradas.

## 2. Fonte de verdade e continuidade

O GitHub é a fonte definitiva de código, migrations, testes e documentação. A solução precisa ser reconstruível mesmo com perda de contêiner, conversa, máquina local ou artefato temporário.

Ordem de leitura:

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `diretrizes/RECUPERACAO.md`;
7. documentos técnicos e relatórios em `docs/`.

Credenciais permanecem em cofres externos. O repositório registra somente nomes, finalidade e procedimento seguro.

## 3. Princípios inegociáveis

1. **Modular e plug-and-play:** aplicativos habilitados por organização.
2. **Multiempresa e multiobra:** todo dado operacional pertence a organização e, quando aplicável, obra.
3. **Autorização real:** menu oculto não substitui controle em rota, RPC, RLS e arquivo.
4. **RLS por padrão:** tabelas de negócio expostas ao Supabase usam Row Level Security.
5. **Service Role somente no servidor:** nunca enviada ao navegador.
6. **Storage privado:** arquivos sensíveis por URL assinada ou rota autenticada.
7. **Versionamento e imutabilidade:** documentos e eventos concluídos não são reescritos.
8. **Auditoria:** operações críticas registram ator, data, ação e contexto.
9. **Idempotência:** repetição não produz duplicidade.
10. **Concorrência:** saldo e operações críticas usam locks/transações adequados.
11. **Documentação viva:** código e documentação são atualizados no mesmo PR.
12. **Recuperabilidade:** nenhum componente necessário pode existir apenas no contêiner ou na conversa.

## 4. Atores e perfis canônicos

- Super Administrador;
- Direção;
- Administrador;
- Comercial/Vendas;
- Gestor de Obras;
- Engenharia;
- Orçamentista;
- Financeiro;
- Qualidade;
- Pós-venda/SAC;
- Cliente.

Perfis personalizados são suportados e não podem ser sobrescritos automaticamente por instaladores.

## 5. Modelo de autorização

### Níveis

- `NONE`;
- `READ`;
- `READ_WRITE`/`EDIT`;
- `FULL`/`DELETE`.

### Capacidades

- criar;
- ler;
- editar;
- excluir;
- aprovar;
- liberar ao cliente;
- assinar;
- exportar;
- administrar;
- visualizar dados financeiros sensíveis;
- atribuir usuários;
- configurar.

### Escopos

- organização;
- cliente;
- obra.

A resolução considera associação ativa, módulo habilitado, perfil, capacidades, escopo, overrides e AAL. Negação explícita prevalece.

## 6. Aplicativos modulares

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
16. compras e suprimentos;
17. Estoque, Inventário e Almoxarifado;
18. financeiro operacional;
19. pós-venda e SAC;
20. relatórios e indicadores;
21. auditoria;
22. administração.

O contrato de cada aplicativo está em `diretrizes/MODULOS.md`.

## 7. Fluxos implementados

### Comercial e contratos

```text
orçamento versionado → cálculo → aprovação → proposta PDF
→ aceite → contrato → assinatura → aditivo
```

### Obras

```text
cliente/contrato → obra → EAP → cronograma → tarefas
→ equipes → diário → documentos → portal
```

### Assinatura avançada

```text
PDF/DOCX → hash → conversão → layout → campos
→ assinatura/rubrica/foto/anexo → PDF final → evidência → cópia
```

### Qualidade

```text
biblioteca → FVS/FVM/formulário → publicação
→ preenchimento → anexos → revisão → aprovação/rejeição
```

### Compras

```text
solicitação → cotação → comparação → aprovação
→ pedido → recebimento → FVM → estoque
```

### Financeiro

```text
contrato/pedido/medição → lançamento → parcelas
→ aprovação → liquidação → comprovante → fluxo de caixa
```

### Relatórios

```text
dados autorizados → métricas → dashboard → metas
→ relatório salvo → snapshot → exportação auditada
```

### Estoque

```text
recebimento/entrada → saldo físico → reserva → saldo disponível
→ consumo/devolução/transferência → custódia → inventário → reversão
```

## 8. Regras do Estoque, Inventário e Almoxarifado

### Razão e saldo

```text
saldo físico = linhas de movimentos POSTED + linhas dos originais REVERSED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

- não há coluna de saldo editável;
- `REVERSAL` neutraliza o original `REVERSED`;
- movimento concluído é imutável;
- correção cria novo movimento;
- saldo negativo é bloqueado por padrão.

### Concorrência

- advisory lock por organização, depósito, localização, item e lote;
- locks adquiridos em ordem determinística;
- saldo físico e disponível validados na mesma transação;
- saída comum não consome quantidade reservada;
- transferência conserva quantidade.

### Compras

- somente recebimentos aceitos ou aceitos com ressalva;
- somente quantidade aceita;
- quantidade rejeitada não entra;
- mapeamento e fator de conversão explícitos;
- importação idempotente por recebimento.

### Multiempresa e multiobra

- vínculos entre tenants são bloqueados;
- depósito com obra só pode ser usado por operação da mesma obra;
- depósito geral depende de autorização, mas não fica preso a uma obra.

### Segurança

- 18 tabelas com RLS;
- seis views `security_invoker`;
- custos mascarados no banco;
- detalhes sensíveis por RPC autorizada;
- funções privilegiadas com `search_path=public`;
- RPCs de negócio não são expostas a `anon`.

## 9. Homologação da Etapa 17

A Etapa 17 foi incorporada à `main`, aplicada no Supabase e homologada tecnicamente.

Evidências:

- 18 migrations alinhadas ao ledger remoto;
- 14 testes transacionais aprovados com `ROLLBACK`;
- correção de reversão de saldo;
- correção de isolamento multiobra;
- migration de advisory locks recuperada e versionada;
- CI do branch original verde.

Arquivos:

- `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`;
- `docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`;
- `supabase/tests/stage17_inventory_homologation.sql`.

Ainda pendentes para produção:

- E2E autenticado após a Etapa 17;
- teste simultâneo com duas conexões reais;
- configuração de proteção contra senhas comprometidas;
- opções adicionais de MFA;
- carga, pentest, backup/restauração e observabilidade.

## 10. Banco e migrations

- PostgreSQL/Supabase;
- migrations exclusivamente em `supabase/migrations/`;
- aplicação em ordem lexical;
- migration aplicada nunca é editada;
- correção usa novo timestamp;
- ledger remoto precisa corresponder aos arquivos canônicos;
- funções `SECURITY DEFINER` exigem autorização interna e `search_path` explícito;
- FKs usadas por RLS e consultas precisam de índices.

## 11. Frontend e backend

- Next.js 16;
- React 19;
- TypeScript estrito;
- Server Components e Server Actions;
- validação server-side;
- `server-only` para credenciais privilegiadas;
- interfaces responsivas e acessíveis;
- alternativa a drag-and-drop.

## 12. Ambientes

### Desenvolvimento

- `.env.local` não versionado;
- dados artificiais;
- assinatura sandbox.

### Homologação

- Supabase dedicado;
- migrations aplicadas;
- testes com rollback;
- contas permanentes somente por provisionamento seguro;
- secrets em ambiente protegido.

### Produção

Exige revisão jurídica, contábil e LGPD, provider jurídico real, pentest, backups testados, observabilidade, rotação de segredos, proteção de anexos e aprovação explícita.

## 13. Qualidade e CI

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

O CI precisa permanecer verde antes de qualquer merge.

## 14. Próxima etapa oficial

Após a consolidação documental da Etapa 17, a sequência planejada é:

- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e Observabilidade;
- Etapa 20 — Prontidão de Produção;
- Etapa 21 — WMS avançado e Automação Logística.

## 15. Etapa 21 — WMS avançado

Fila aprovada:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

Essa fila é planejamento, não funcionalidade disponível na versão 0.17.0.
