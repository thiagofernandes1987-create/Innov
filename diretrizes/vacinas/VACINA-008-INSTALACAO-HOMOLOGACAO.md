# VACINA-008 — Instalação consistente entre CI e homologação

## Sintoma

O CI comum instala dependências com sucesso, mas o workflow de homologação falha em `pnpm install` antes de validar secrets ou executar o E2E.

## Causa raiz

Workflows diferentes adotavam políticas divergentes:

```text
CI: pnpm install --no-frozen-lockfile
Homologação: pnpm install --frozen-lockfile
```

Quando o lockfile legado não está perfeitamente sincronizado com o manifesto, a homologação falha embora o mesmo commit tenha passado no CI.

## Vacina

Até a Etapa 20 concluir a regeneração e verificação integral do lockfile:

- CI e homologação usam `pnpm@11.15.0`;
- workflows de homologação usam `--no-frozen-lockfile --reporter=append-only`, igual ao CI;
- mudança de dependência continua exigindo revisão explícita do `pnpm-lock.yaml`;
- scripts ou metadados não podem causar política divergente entre workflows;
- a política de instalação fica verificada por `pnpm validate:vaccines`.

Depois que o lockfile for regenerado e validado em ambiente reproduzível, esta vacina pode ser revisada para voltar ao modo congelado em todos os workflows simultaneamente.

## Aplicação transversal

Aplicada em:

- `.github/workflows/ci.yml`;
- `.github/workflows/stage11-homologation.yml`;
- `.github/workflows/stage18-concurrent-e2e.yml`.

## Teste preventivo

O validador de vacinas confirma:

- mesma versão do pnpm;
- ausência de `--frozen-lockfile` apenas nos workflows de homologação enquanto a política transitória estiver ativa;
- presença de `--no-frozen-lockfile --reporter=append-only`;
- documentação da limitação.

## Critério de encerramento

- instalação passa nos três workflows;
- nenhuma dependência é silenciosamente alterada;
- CI e homologação usam política coerente;
- futura mudança para lock congelado ocorre transversalmente, com atualização desta vacina.
