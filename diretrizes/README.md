# Diretrizes canônicas da Innovar Platform

Este diretório é a **fonte única de verdade operacional e de recuperação** da Innovar Platform.

A regra é inegociável:

> Nenhuma etapa, módulo, migration, correção recorrente, interface ou alteração arquitetural é considerada concluída enquanto a documentação canônica, o manifesto de estado e as vacinas aplicáveis não estiverem atualizados e validados no repositório.

## Documentos obrigatórios

| Documento | Finalidade |
|---|---|
| [`LEIA-PRIMEIRO.md`](./LEIA-PRIMEIRO.md) | **Primeira leitura de toda sessão.** Mapa de skills, vacinas, blueprint, executable spec, Object Runtime e ordem de leitura. |
| [`INVENTARIO-DE-EXECUCAO.md`](./INVENTARIO-DE-EXECUCAO.md) | Marcos, sprints, tarefas e subtarefas, com as regras de execução e reordenação. |
| [`METODO-DE-TRABALHO.md`](./METODO-DE-TRABALHO.md) | Como se trabalha: decomposição em micro-problemas, evidência antes de afirmação e protocolo de vacinas. |
| [`SPEC.md`](./SPEC.md) | Especificação mestra do produto, regras e limites. |
| [`ESTADO-ATUAL.json`](./ESTADO-ATUAL.json) | Manifesto legível por máquina com versão, etapa, branch, PR, CI e próxima etapa. |
| [`INVENTARIO.md`](./INVENTARIO.md) | Inventário atual de módulos, rotas, integrações, dados e estado de implementação. |
| [`MODULOS.md`](./MODULOS.md) | Contrato funcional e técnico de cada aplicativo modular. |
| [`ARQUITETURA.md`](./ARQUITETURA.md) | Arquitetura, segurança, autorização e padrões de integração. |
| [`ROADMAP.md`](./ROADMAP.md) | Sequência oficial de etapas e escopo planejado. |
| [`RECUPERACAO.md`](./RECUPERACAO.md) | Procedimento para reconstruir o projeto a partir do GitHub. |
| [`VACINAS.md`](./VACINAS.md) | Catálogo de causas-raiz, correções canônicas e prevenção automática. |
| [`OBJECT-RUNTIME.md`](./OBJECT-RUNTIME.md) | Motor de objetos dinâmicos: composição por características, armazenamento, índices, RLS sobre dado dinâmico e escala. |
| [`UI-UX-PRO-MAX.md`](./UI-UX-PRO-MAX.md) | Design system, acessibilidade, responsividade, estados e pipeline permanente de interface. |
| [`PADRAO-DOCUMENTACAO.md`](./PADRAO-DOCUMENTACAO.md) | Definition of Done documental e regras de atualização. |
| [`HISTORICO-ETAPAS.md`](./HISTORICO-ETAPAS.md) | Índice dos documentos técnicos históricos em `docs/`. |

## Hierarquia de autoridade

Em caso de divergência, vale a seguinte ordem:

1. `diretrizes/LEIA-PRIMEIRO.md` como ponto de entrada e `diretrizes/INVENTARIO-DE-EXECUCAO.md` para o que está em execução;
2. `diretrizes/METODO-DE-TRABALHO.md` para questões de método;
3. `diretrizes/SPEC.md`;
4. `diretrizes/ESTADO-ATUAL.json` para estado operacional verificável;
5. `diretrizes/ARQUITETURA.md`;
6. `diretrizes/MODULOS.md`;
7. `diretrizes/UI-UX-PRO-MAX.md` para interfaces e experiências;
8. `diretrizes/OBJECT-RUNTIME.md` para objetos dinâmicos e customização por empresa;
9. `diretrizes/INVENTARIO.md`;
10. `diretrizes/VACINAS.md` para causas-raiz já catalogadas;
11. migrations e código da `main`;
12. documentos históricos em `docs/ETAPA-*`;
13. descrições antigas de PRs ou conversas.

Uma divergência entre documentação canônica, manifesto e código deve bloquear a entrega. O responsável pela etapa precisa corrigir a documentação ou registrar explicitamente a decisão arquitetural.

## Política de recuperação

O projeto deve poder ser recuperado sem depender de:

- histórico de conversa;
- arquivos temporários do contêiner;
- memória do assistente;
- máquina local específica;
- credenciais gravadas em documentação;
- artefatos que existam apenas fora do GitHub.

Segredos permanecem nos ambientes seguros do GitHub, Supabase, Vercel ou providers aprovados. O repositório contém somente nomes, finalidade e procedimento de configuração.

## Validação automática

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:stage20
```

O CI executa a documentação e as vacinas antes dos validadores funcionais. A `VACINA-012` compara o manifesto com a versão, a última etapa concluída, a próxima etapa, o CI e o E2E corrente. O validador da Etapa 20 verifica a aplicação da UI/UX Pro Max nos componentes-base.

## Regra para novas etapas

Toda nova etapa deve, no mesmo PR:

1. atualizar `SPEC.md` quando houver mudança de requisito;
2. atualizar `ESTADO-ATUAL.json` quando houver mudança de estado;
3. atualizar `INVENTARIO.md`;
4. atualizar a seção do módulo em `MODULOS.md` quando aplicável;
5. atualizar `ROADMAP.md`;
6. criar ou atualizar o documento técnico em `docs/`;
7. avaliar impacto em `UI-UX-PRO-MAX.md` e registrar exceções;
8. registrar migrations, rotas, RPCs, buckets, variáveis e pendências;
9. consultar e aplicar vacinas existentes;
10. criar nova vacina quando a causa raiz for reutilizável;
11. atualizar o procedimento de recuperação quando surgir nova dependência;
12. manter o CI verde.
