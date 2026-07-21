# VACINA-009 — Pré-requisitos antes do E2E e relatório sempre disponível

## Sintoma

O job de homologação inicia com variáveis críticas vazias, executa etapas caras antes de verificar o ambiente e termina sem artefato porque o script de teste nunca chegou a criar o relatório.

## Causa raiz

- secrets do ambiente `homologation` não estavam configurados ou não foram entregues ao evento;
- validação de secrets ocorria depois da instalação;
- o relatório só era criado dentro do script E2E;
- falha de bootstrap era mascarada por uma segunda falha no upload do artefato.

## Vacina

Todo workflow E2E protegido deve executar nesta ordem:

```text
checkout
→ criar relatório inicial sem secrets
→ validar nomes obrigatórios
→ preparar runtime
→ instalar dependências
→ provisionar
→ executar teste
→ atualizar relatório
→ enviar artefato com if: always()
```

Regras:

- nunca hardcodar Service Role ou senhas;
- listar somente nomes ausentes;
- falhar antes da instalação quando um secret estiver vazio;
- criar artefato inicial com `status: prerequisites_pending`;
- preservar relatório mesmo quando provisionamento ou instalação falhar;
- restringir E2E com secrets a branch do próprio repositório e ambiente protegido.

## Aplicação transversal

Aplicada em:

- `stage11-homologation.yml` para ordem de pré-requisitos;
- `stage18-concurrent-e2e.yml` para pré-requisitos, relatório inicial e artefato sempre disponível;
- futuros workflows autenticados.

## Bloqueio externo atual

Os seguintes nomes precisam existir no ambiente GitHub `homologation` ou nos repository secrets:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ADMIN_PASSWORD
DEMO_CLIENT_PASSWORD
```

Os valores não podem ser escritos no Git nem em documentação.

## Teste preventivo

`pnpm validate:vaccines` verifica:

- validação de secrets antes de `pnpm install`;
- criação do relatório antes da validação;
- `if: always()` no upload;
- `if-no-files-found` não configurado para mascarar a falha original;
- ausência de valores concretos de secrets.

## Critério de encerramento

- secrets validados antes de qualquer instalação;
- falha de pré-requisito gera relatório legível;
- job não apresenta segunda falha por artefato ausente;
- com secrets presentes, provisionamento e E2E prosseguem;
- relatório final não contém credenciais ou tokens.
