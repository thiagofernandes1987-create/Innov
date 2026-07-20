# Diretrizes canônicas da Innovar Platform

Este diretório é a **fonte única de verdade operacional e de recuperação** da Innovar Platform.

A regra é inegociável:

> Nenhuma etapa, módulo, migration ou alteração arquitetural é considerada concluída enquanto a documentação canônica não estiver atualizada e validada no repositório.

## Documentos obrigatórios

| Documento | Finalidade |
|---|---|
| [`SPEC.md`](./SPEC.md) | Especificação mestra do produto, regras e limites. |
| [`INVENTARIO.md`](./INVENTARIO.md) | Inventário atual de módulos, rotas, integrações, dados e estado de implementação. |
| [`MODULOS.md`](./MODULOS.md) | Contrato funcional e técnico de cada aplicativo modular. |
| [`ARQUITETURA.md`](./ARQUITETURA.md) | Arquitetura, segurança, autorização e padrões de integração. |
| [`ROADMAP.md`](./ROADMAP.md) | Sequência oficial de etapas e escopo planejado. |
| [`RECUPERACAO.md`](./RECUPERACAO.md) | Procedimento para reconstruir o projeto a partir do GitHub. |
| [`PADRAO-DOCUMENTACAO.md`](./PADRAO-DOCUMENTACAO.md) | Definition of Done documental e regras de atualização. |
| [`HISTORICO-ETAPAS.md`](./HISTORICO-ETAPAS.md) | Índice dos documentos técnicos históricos em `docs/`. |

## Hierarquia de autoridade

Em caso de divergência, vale a seguinte ordem:

1. `diretrizes/SPEC.md`;
2. `diretrizes/ARQUITETURA.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/INVENTARIO.md`;
5. migrations e código da `main`;
6. documentos históricos em `docs/ETAPA-*`;
7. descrições antigas de PRs ou conversas.

Uma divergência entre documentação canônica e código deve bloquear a entrega. O responsável pela etapa precisa corrigir a documentação ou registrar explicitamente a decisão arquitetural.

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

O comando abaixo valida a presença e a coerência mínima da documentação:

```bash
pnpm validate:docs
```

O CI executa essa validação antes dos validadores funcionais das etapas.

## Regra para novas etapas

Toda nova etapa deve, no mesmo PR:

1. atualizar `SPEC.md` quando houver mudança de requisito;
2. atualizar `INVENTARIO.md`;
3. atualizar a seção do módulo em `MODULOS.md`;
4. atualizar `ROADMAP.md`;
5. criar ou atualizar o documento técnico em `docs/`;
6. registrar migrations, rotas, RPCs, buckets, variáveis e pendências;
7. atualizar o procedimento de recuperação quando surgir nova dependência;
8. manter o CI verde.
