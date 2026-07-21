# VACINA-006 — Runtimes obsoletos em GitHub Actions

## Sintoma

O job conclui, mas o runner emite aviso de que actions baseadas em Node.js 20 estão obsoletas e foram forçadas a executar em Node.js 24.

Exemplos observados:

- `actions/checkout@v4`;
- `actions/setup-node@v4`;
- `actions/setup-python@v5`;
- `actions/upload-artifact@v4`.

## Causa raiz

Workflows permaneceram presos a majors cujo runtime interno era Node.js 20. Definir `node-version: 24` no projeto não altera o runtime embutido da própria action.

## Vacina

Usar actions oficiais com runtime Node.js 24:

```yaml
uses: actions/checkout@v6
uses: actions/setup-node@v6
uses: actions/setup-python@v6
uses: actions/upload-artifact@v7
```

Quando `setup-node` detectar automaticamente `packageManager`, declarar conscientemente a política de cache. Neste projeto:

```yaml
package-manager-cache: false
```

A instalação e o cache continuam controlados explicitamente pelo workflow.

## Aplicação transversal

Aplicada em:

- `.github/workflows/ci.yml`;
- `.github/workflows/stage11-homologation.yml`;
- novos workflows de E2E concorrente.

Toda nova workflow deve iniciar pelos majors canônicos registrados nesta vacina.

## Teste preventivo

`pnpm validate:vaccines` varre `.github/workflows/*.yml` e bloqueia:

- `actions/checkout@v4` ou anterior;
- `actions/setup-node@v4` ou anterior;
- `actions/setup-python@v5` ou anterior;
- `actions/upload-artifact@v4` ou anterior;
- workflow de Node sem versão explícita quando a action exigir configuração.

## Limitação

Actions Node.js 24 exigem runner GitHub Actions compatível. Nos runners hospedados pelo GitHub isso é administrado pela plataforma. Runner self-hosted deve estar em versão compatível antes da atualização.

## Critério de encerramento

- nenhum workflow usa os majors obsoletos catalogados;
- CI e homologação continuam executando;
- o aviso de runtime Node.js 20 desaparece;
- versões futuras são atualizadas por nova revisão desta vacina, sem alterações pontuais divergentes entre workflows.
