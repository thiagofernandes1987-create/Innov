# VACINA-012 — Estado pós-merge coerente com a documentação

## Sintoma

Código, PRs e CI já foram concluídos, mas documentos canônicos continuam declarando branch ativa, PR em rascunho, secrets ausentes, E2E bloqueado ou checklist pendente.

O projeto passa a possuir duas realidades conflitantes: o GitHub mostra uma etapa concluída, enquanto a fonte canônica informa que ela ainda está em andamento.

## Causa raiz

- fechamento de PR sem rotina documental pós-merge;
- estado distribuído em vários arquivos Markdown sem manifesto legível por máquina;
- validadores verificando apenas presença de palavras, não coerência temporal;
- ausência de teste negativo para frases obsoletas;
- branches empilhadas sendo mescladas em sequência sem reconciliação final do inventário e roadmap.

## Vacina

1. manter `diretrizes/ESTADO-ATUAL.json` como manifesto operacional mínimo;
2. atualizar o manifesto no mesmo PR que altera o estado de uma etapa;
3. comparar `platformVersion` com `package.json`;
4. registrar última etapa concluída, próxima etapa, branch funcional ativa, PR funcional ativo, SHA estável e CI;
5. bloquear frases incompatíveis com o manifesto nos documentos canônicos e relatórios atuais;
6. após merge, executar fechamento documental antes de iniciar a próxima etapa;
7. branches concluídas não podem permanecer descritas como fonte ativa de desenvolvimento.

## Aplicação transversal

Aplicada em:

- `diretrizes/SPEC.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/ROADMAP.md`;
- `diretrizes/RECUPERACAO.md`;
- `diretrizes/HISTORICO-ETAPAS.md`;
- `docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md`;
- `docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md`;
- `scripts/validate-vaccines.mjs`;
- `scripts/validate-documentation.mjs`.

## Padrões proibidos

Quando `lastCompletedStage >= 19` e não existe PR funcional ativo, os documentos atuais não podem conter afirmações como:

```text
PR #18 em rascunho
PR #19 em rascunho
E2E concorrente permanece bloqueado
blocked_missing_secrets como evidência atual
Etapa 19 aguardando estabilização da Etapa 18
```

Registros históricos podem mencionar estados antigos somente quando identificados explicitamente como evidência anterior ou linha do tempo.

## Teste preventivo

`pnpm validate:vaccines` deve:

- exigir `diretrizes/ESTADO-ATUAL.json`;
- validar seu JSON;
- comparar a versão com `package.json`;
- exigir `baseBranch: main`;
- exigir Etapa 19 concluída e Etapa 20 como próxima etapa;
- exigir E2E da Etapa 18 com `status: passed` e `cleanup: passed`;
- procurar frases obsoletas na SPEC, inventário, roadmap e documentos técnicos atuais;
- confirmar que o catálogo inclui a `VACINA-012`.

## Critério de encerramento

- manifesto versionado e parseável;
- documentação canônica compatível com o estado real do GitHub;
- E2E aprovado registrado como concluído;
- Etapa 19 registrada como incorporada à `main`;
- próxima etapa registrada como Etapa 20;
- CI bloqueia a reintrodução dos estados obsoletos;
- fechamento confirmado em PR próprio antes da abertura funcional da etapa seguinte.
