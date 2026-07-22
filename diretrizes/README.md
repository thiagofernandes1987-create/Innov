# Diretrizes canônicas da Innovar Platform

Este diretório é a **fonte única de verdade operacional e de recuperação** da Innovar Platform.

A regra é inegociável:

> Nenhuma etapa, módulo, migration, correção recorrente ou alteração arquitetural é considerada concluída enquanto a documentação canônica, o manifesto de estado e as vacinas aplicáveis não estiverem atualizados e validados no repositório.

## Documentos obrigatórios

| Documento | Finalidade |
|---|---|
| [`SPEC.md`](./SPEC.md) | Especificação mestra do produto, regras e limites. |
| [`ESTADO-ATUAL.json`](./ESTADO-ATUAL.json) | Manifesto legível por máquina com versão, etapa, branch, PR, CI e próxima etapa. |
| [`INVENTARIO.md`](./INVENTARIO.md) | Inventário atual de módulos, rotas, integrações, dados e estado de implementação. |
| [`MODULOS.md`](./MODULOS.md) | Contrato funcional e técnico de cada aplicativo modular. |
| [`ARQUITETURA.md`](./ARQUITETURA.md) | Arquitetura, segurança, autorização e padrões de integração. |
| [`ROADMAP.md`](./ROADMAP.md) | Sequência oficial de etapas e escopo planejado. |
| [`RECUPERACAO.md`](./RECUPERACAO.md) | Procedimento para reconstruir o projeto a partir do GitHub. |
| [`VACINAS.md`](./VACINAS.md) | Catálogo de causas-raiz, correções canônicas e prevenção automática. |
| [`PADRAO-DOCUMENTACAO.md`](./PADRAO-DOCUMENTACAO.md) | Definition of Done documental e regras de atualização. |
| [`HISTORICO-ETAPAS.md`](./HISTORICO-ETAPAS.md) | Índice dos documentos técnicos históricos em `docs/`. |

## Hierarquia de autoridade

Em caso de divergência, vale a seguinte ordem:

1. `diretrizes/SPEC.md`;
2. `diretrizes/ESTADO-ATUAL.json` para estado operacional verificável;
3. `diretrizes/ARQUITETURA.md`;
4. `diretrizes/MODULOS.md`;
5. `diretrizes/INVENTARIO.md`;
6. `diretrizes/VACINAS.md` para causas-raiz já catalogadas;
7. migrations e código da `main`;
8. documentos históricos em `docs/ETAPA-*`;
9. descrições antigas de PRs ou conversas.

Uma divergência entre documentação canônica, manifesto e código deve bloquear a entrega. O responsável pela etapa precisa corrigir a documentação ou registrar explicitamente a decisão arquitetural.

## Política de recuperação

O projeto deve poder ser recuperado sem depender de:

- histórico de conversa;
- arquivos temporários do contêiner;
- memória do assistente;
- máquina local específica;
- credenciais gravadas em documentação;
- artefatos que existam apenas fora do GitHub.

Segredos permanecem nos ambientes seguros do GitHub, Supabase, Vercel ou Lovable. O repositório contém somente nomes, finalidade e procedimento de configuração.

## Validação automática

```bash
pnpm validate:docs
pnpm validate:vaccines
```

O CI executa ambas antes dos validadores funcionais das etapas. A `VACINA-012` compara o manifesto com a versão, a última etapa concluída, a próxima etapa, o CI e o E2E corrente.

## Regra para novas etapas

Toda nova etapa deve, no mesmo PR:

1. atualizar `SPEC.md` quando houver mudança de requisito;
2. atualizar `ESTADO-ATUAL.json` quando houver mudança de estado;
3. atualizar `INVENTARIO.md`;
4. atualizar a seção do módulo em `MODULOS.md`;
5. atualizar `ROADMAP.md`;
6. criar ou atualizar o documento técnico em `docs/`;
7. registrar migrations, rotas, RPCs, buckets, variáveis e pendências;
8. consultar e aplicar vacinas existentes;
9. criar nova vacina quando a causa raiz for reutilizável;
10. atualizar o procedimento de recuperação quando surgir nova dependência;
11. manter o CI verde.
