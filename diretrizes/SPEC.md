# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.4.0  
**Versão implementada da plataforma:** 0.18.0  
**Atualizado em:** 21 de julho de 2026  
**Fonte de verdade:** repositório `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é a plataforma modular da **Innovar Construções e Reformas** para gerir o ciclo completo:

```text
lead → oportunidade → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras → estoque
→ financeiro → indicadores → entrega → SAC/pós-venda → auditoria
```

A solução suporta múltiplas organizações e múltiplas obras por cliente, abertas ou concluídas.

## 2. Fonte de verdade e continuidade

GitHub contém código, migrations, testes, documentação, CI e recuperação. Perder contêiner, conversa ou máquina local não pode impedir a reconstrução. Segredos e dados reais permanecem fora do repositório.

Ordem de leitura:

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `diretrizes/RECUPERACAO.md`;
7. documentos em `docs/`.

## 3. Princípios inegociáveis

1. módulos plug-and-play por organização;
2. isolamento multiempresa e multiobra;
3. autorização em menu, rota, Server Action, RPC, tabela e arquivo;
4. RLS por padrão;
5. Service Role somente no servidor;
6. Storage privado e download autenticado;
7. versionamento, hash e imutabilidade;
8. auditoria de ações críticas;
9. idempotência em integrações e comandos repetíveis;
10. saldos derivados de razões, nunca editados diretamente;
11. concorrência protegida por transações e locks quando necessária;
12. migrations append-only e alinhadas ao ledger remoto;
13. privilégios mínimos;
14. documentação atualizada no mesmo PR;
15. CI como bloqueio obrigatório.

## 4. Modelo de autorização

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
- Compras/Almoxarifado;
- Pós-venda/SAC;
- Cliente.

Perfis personalizados não são sobrescritos pelos instaladores.

Níveis:

- `NONE`;
- `READ`;
- `EDIT`/`READ_WRITE`;
- `DELETE`/`FULL`.

Capacidades incluem criar, ler, editar, excluir, aprovar, liberar, assinar, exportar, administrar, configurar e visualizar dados sensíveis. Escopos incluem organização, cliente, obra e recurso específico.

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
16. compras e suprimentos;
17. **Estoque, Inventário e Almoxarifado**;
18. financeiro operacional;
19. pós-venda e SAC;
20. relatórios e indicadores;
21. auditoria;
22. administração.

Contratos detalhados: `diretrizes/MODULOS.md`.

## 6. Fluxos implementados

### Comercial e relacionamento — Etapa 18

```text
lead → qualificação → oportunidade → cliente 360
→ múltiplas obras/contratos → atendimento → pós-venda → avaliação
```

Regras:

- leads registram origem, campanha, interesse, orçamento e próximo contato;
- duplicidade é verificada por documento, e-mail e telefone normalizados;
- criação e conversão são idempotentes;
- conversão pode reutilizar cliente existente;
- funil possui histórico imutável;
- perda exige motivo;
- cliente 360 agrega contatos, oportunidades, contratos, obras, chamados e atividades;
- pipeline comercial não é exposto ao cliente;
- portal mostra somente obras liberadas;
- chamado pode conter mensagens internas ou visíveis ao cliente;
- anexos privados recebem SHA-256;
- cliente pode anexar foto ou documento e avaliar atendimento resolvido;
- eventos e consentimentos são append-only.

### Comercial e contratos

```text
orçamento versionado → aprovação → proposta PDF → aceite
→ contrato → assinatura → aditivo
```

### Obras

```text
cliente → múltiplas obras → EAP → cronograma → tarefas
→ equipes → diário → documentos → portal
```

### Assinatura avançada

```text
PDF/DOCX → hash → layout → assinatura/rubrica/data/nome/foto/anexo
→ PDF final → evidência → cópia ao cliente
```

### Qualidade e Compras

```text
FVS/FVM/formulário → resposta → revisão
solicitação → cotação → aprovação → pedido → recebimento → estoque
```

### Financeiro e Relatórios

```text
contrato/pedido/medição → lançamento → parcelas → aprovação → liquidação
fontes autorizadas → indicadores → metas → snapshot → exportação auditada
```

### Estoque, Inventário e Almoxarifado — Etapa 17

```text
recebimento/entrada → saldo físico → reserva → saldo disponível
→ consumo/devolução/transferência → custódia → inventário → reversão
```

Regras:

- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- recebimento de Compras integrado de forma idempotente;
- `REVERSAL` neutraliza o movimento original `REVERSED`;
- `pg_advisory_xact_lock` serializa posições concorrentes;
- custos são protegidos;
- isolamento multiempresa e multiobra;
- implementação e homologação preservadas em `docs/` e `supabase/tests/`.

## 7. Banco e migrations

- PostgreSQL/Supabase Auth/RLS/Storage;
- UUID e timestamps UTC;
- `organization_id` em dados multiempresa;
- `project_id` quando houver obra;
- RPC para operações multi-tabela;
- `SECURITY DEFINER` somente com autorização interna e `search_path` explícito;
- helpers internos sem execução pública;
- índices em FKs e caminhos críticos;
- arquivo aplicado nunca é reescrito;
- timestamp e nome local correspondem ao ledger remoto;
- CI rejeita timestamp, nome lógico ou conteúdo SQL duplicado.

## 8. Arquivos e documentos

Buckets privados. Upload valida autorização, tipo, tamanho, contexto e hash. Download ocorre por URL assinada curta após consulta autorizada. Falha de gravação remove objeto órfão quando possível.

Bucket da Etapa 18:

```text
crm-sac-attachments
```

Aceita PDF, DOCX, JPEG, PNG e WebP, até 25 MB.

## 9. Homologação

### Etapa 17

- 18 tabelas com RLS;
- seis views protegidas;
- advisory locks;
- 14 testes transacionais com `ROLLBACK`;
- migrations reconciliadas com o ledger remoto.

### Etapa 18

- 10 tabelas novas com RLS;
- 43 FKs, nenhuma sem índice líder;
- 14 políticas do domínio;
- bucket privado;
- três módulos ativos e sensíveis;
- zero RPC operacional acessível por `anon`;
- bootstrap, CRM, Cliente 360, SAC e RLS testados em transações revertidas;
- cliente de uma organização não vê dados de outra;
- portal não vê pipeline, mensagens internas, anexos internos ou eventos;
- obra não liberada não pode ser vinculada a chamado externo;
- estados críticos só mudam por RPC;
- migrations aplicadas e reconciliadas com o ledger Supabase.

## 10. CI obrigatório

```bash
pnpm validate:docs
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 11. Produção

Publicação externa exige revisão jurídica, fiscal, contábil e LGPD; provider jurídico real; proteção contra senhas comprometidas; MFA; antimalware; pentest; observabilidade; backup/restauração testados; rotação de secrets e aprovação explícita.

## 12. Próxima etapa oficial

Depois da aprovação e merge explícito da Etapa 18:

- **Etapa 19:** auditoria e observabilidade unificadas;
- **Etapa 20:** prontidão de produção e teste concorrente simultâneo;
- **Etapa 21:** WMS avançado, endereçamento automatizado, RFID em tempo real, ressuprimento automático sem aprovação, roteirização logística, integração fiscal de entrada e depreciação contábil oficial.

A Etapa 21 permanece planejada e não substitui o razão imutável do estoque.
