# Vacinas de engenharia — Innovar Platform

**Documento canônico:** sim  
**Regra:** todo erro relevante gera registro de causa raiz e prevenção reutilizável no mesmo PR.

## 1. Objetivo

Uma correção isolada resolve o sintoma. Uma **vacina** impede que a mesma causa raiz reapareça em outro módulo, etapa, ambiente ou implementação equivalente.

Cada erro detectado deve produzir, quando aplicável:

1. identificação da causa raiz;
2. arquivo `diretrizes/vacinas/VACINA-NNN-*.md`;
3. solução compartilhada ou padrão arquitetural;
4. varredura dos módulos suscetíveis;
5. correção das ocorrências equivalentes;
6. teste negativo ou validador automático;
7. atualização das diretrizes e do documento técnico da etapa;
8. referência no PR e no histórico.

## 2. Fluxo obrigatório

```text
erro detectado
→ reproduzir
→ separar sintoma de causa raiz
→ consultar catálogo de vacinas
→ aplicar vacina existente OU registrar nova vacina
→ procurar a mesma causa no repositório
→ corrigir módulos afetados
→ adicionar prevenção no CI
→ documentar evidências e limitações
```

Não é permitido encerrar um erro recorrente apenas com correção local quando existe uma causa raiz reutilizável.

## 3. Estado das vacinas

| ID | Causa raiz | Estado | Prevenção principal |
|---|---|---|---|
| `VACINA-001` | Relações Supabase podem chegar como `objeto | array | null` | aplicada | normalização central em `lib/supabase/relations.ts` e CI |
| `VACINA-002` | Validador acoplado à forma textual, não ao contrato | aplicada | validação semântica e arquivos reais |
| `VACINA-003` | Ledger local de migrations diverge do Supabase remoto | aplicada | `validate-supabase-migrations.mjs` |
| `VACINA-004` | Função PostgreSQL herda `EXECUTE` de `PUBLIC/anon` | aplicada | revoke explícito, auditoria e migrations de privilégio mínimo |
| `VACINA-005` | Estado crítico pode ser alterado fora da RPC de domínio | aplicada | privilégios por coluna, guards por identidade SQL e testes negativos |
| `VACINA-006` | Workflows usam actions com runtime Node.js 20 obsoleto | aplicada | majors Node.js 24 e varredura de todos os workflows |
| `VACINA-007` | Scanner de segredos confunde placeholders com credenciais | aplicada | classificação semântica do valor e varredura histórica preservada |
| `VACINA-008` | CI e homologação usam políticas diferentes de instalação | aplicada | versão/política pnpm alinhadas em todos os workflows |
| `VACINA-009` | E2E valida pré-requisitos tarde e perde relatório | aplicada | secrets antes da instalação e artefato inicial obrigatório |
| `VACINA-010` | JSON de workflow montado manualmente em shell | aplicada | `JSON.stringify` e validação de artefato parseável |
| `VACINA-011` | Script usa identificador reservado `module` | aplicada | nomes semânticos e varredura de `scripts/*.mjs` |
| `VACINA-012` | Documentação pós-merge diverge do estado real do GitHub | aplicada | `ESTADO-ATUAL.json`, fechamento pós-merge e bloqueio de frases obsoletas |
| `VACINA-013` | Fixture técnica tenta escrever coluna sensível diretamente | aplicada | fixture mínima, guards preservados e valores sensíveis somente por RPC autorizada |

## 4. Arquivos

```text
diretrizes/vacinas/
├── VACINA-001-RELACOES-SUPABASE.md
├── VACINA-002-VALIDADORES-SEMANTICOS.md
├── VACINA-003-LEDGER-MIGRATIONS-SUPABASE.md
├── VACINA-004-PRIVILEGIOS-RPCS.md
├── VACINA-005-WORKFLOW-PROTEGIDO.md
├── VACINA-006-RUNTIME-GITHUB-ACTIONS.md
├── VACINA-007-SCANNER-DE-SEGREDOS.md
├── VACINA-008-INSTALACAO-HOMOLOGACAO.md
├── VACINA-009-PREREQUISITOS-E-RELATORIO-E2E.md
├── VACINA-010-JSON-DE-RELATORIOS.md
├── VACINA-011-IDENTIFICADORES-RESERVADOS-NODE-NEXT.md
├── VACINA-012-ESTADO-POS-MERGE.md
└── VACINA-013-FIXTURES-RESPEITAM-FRONTEIRAS-SENSIVEIS.md
```

## 5. Critérios para nova vacina

Criar nova vacina quando pelo menos uma condição ocorrer:

- o erro já apareceu em mais de um arquivo ou módulo;
- há risco de reaparecer em etapas futuras;
- a correção depende de uma convenção não óbvia;
- envolve segurança, multiempresa, RLS, migrations, idempotência, concorrência ou imutabilidade;
- o CI poderia detectar preventivamente;
- a causa raiz é diferente das vacinas existentes.

## 6. Definition of Done de erro

- [ ] causa raiz registrada;
- [ ] vacina existente aplicada ou nova vacina criada;
- [ ] repositório varrido pela mesma causa;
- [ ] ocorrências equivalentes corrigidas;
- [ ] teste negativo criado;
- [ ] CI atualizado;
- [ ] documentação da etapa atualizada;
- [ ] limitações registradas;
- [ ] correção confirmada em CI ou homologação aplicável.
