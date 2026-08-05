# Vacinas de engenharia — Innovar Platform

**Documento canônico:** sim  
**Atualizado em:** 04 de agosto de 2026  
**Regra:** todo erro relevante gera causa raiz, prevenção reutilizável, varredura e evidência no mesmo PR.

## 1. Objetivo

Uma correção isolada resolve o sintoma. Uma vacina impede que a mesma causa raiz reapareça em outro módulo, etapa, ambiente ou implementação equivalente.

Fluxo obrigatório:

```text
erro detectado
→ reproduzir
→ separar sintoma de causa raiz
→ consultar catálogo
→ aplicar vacina existente ou registrar nova
→ varrer o repositório
→ corrigir equivalentes
→ adicionar prevenção no CI
→ documentar evidências e limitações
```

## 2. Protocolo

Antes de resolver, consultar o catálogo. Depois de resolver, responder:

1. Qual foi o problema;
2. Como ocorreu;
3. Por que aconteceu;
4. Como foi detectado;
5. Qual foi a solução.

Vacina pode ser substituída somente em PR próprio, preservando garantia igual ou maior e demonstrando ganho material. A vacina substituída permanece no histórico.

## 3. Estado das vacinas

| ID | Causa raiz | Estado | Prevenção principal |
|---|---|---|---|
| `VACINA-001` | relação Supabase variável | aplicada | helpers canônicos de relação |
| `VACINA-002` | validador acoplado à forma textual | aplicada | validação semântica |
| `VACINA-003` | ledger local diverge do remoto | aplicada | validador de migrations |
| `VACINA-004` | função herda `EXECUTE` indevido | aplicada | revoke explícito |
| `VACINA-005` | estado crítico alterado fora da RPC | aplicada | guards e testes negativos |
| `VACINA-006` | actions usam runtime obsoleto | aplicada | Node 24 e varredura |
| `VACINA-007` | scanner confunde placeholder e segredo | aplicada | classificação semântica |
| `VACINA-008` | CI e homologação instalam diferente | aplicada | política pnpm única |
| `VACINA-009` | E2E valida pré-requisito tarde | aplicada | preflight e artefato inicial |
| `VACINA-010` | JSON montado manualmente | aplicada | `JSON.stringify` |
| `VACINA-011` | identificador reservado em scripts | aplicada | nomes semânticos e scanner |
| `VACINA-012` | documentação diverge do estado real | aplicada | manifesto e bloqueio de frases obsoletas |
| `VACINA-013` | fixture contorna campo sensível | aplicada | fronteira autorizada e fixture mínima |
| `VACINA-014` | lista fixa de migrations/testes envelhece | aplicada | descoberta lexical |
| `VACINA-015` | efeito colateral dentro de setState | aplicada | cálculo fora do atualizador |
| `VACINA-016` | validador perde procedência de vacina | aplicada | citação junto do código protegido |
| `VACINA-017` | parser assume LF | vigente | normalização CRLF/LF |
| `VACINA-018` | login confunde infraestrutura e credencial | vigente | classificação por código/status |
| `VACINA-019` | breakpoint remove navegação | vigente | destino equivalente responsivo |
| `VACINA-020` | `pg_isready` aprova bootstrap incompleto | vigente | marcador de bootstrap |
| `VACINA-021` | DDL oculta custo de RLS/FK | vigente | advisor pós-DDL |
| `VACINA-022` | persona diverge da autorização | vigente | guard persona–papel |
| `VACINA-023` | amostra exige efeito de produção | vigente | persistência explicitamente desligável |
| `VACINA-024` | conteúdo corta sem overflow global | vigente | inspeção de card/breakpoint |
| `VACINA-025` | lint aceita warnings | vigente | `--max-warnings=0` |
| `VACINA-026` | teste não executado passa | vigente | pré-requisito obrigatório |
| `VACINA-027` | mock aprovado não chega ao código | vigente | QA de fidelidade |
| `VACINA-028` | capacidade não tem porta de entrada | vigente | cobertura menu–rota–persona |
| `VACINA-029` | runner Python depende de POSIX | vigente | wrapper Node portátil |
| `VACINA-030` | menu desktop é recortado | vigente | modo compacto intermediário |
| `VACINA-031` | estado mistura tokens de tema | vigente | tokens semânticos completos |
| `VACINA-032` | função de extensão sem schema | vigente | qualificação `extensions.*` |
| `VACINA-033` | simulador e provider concluem estados diferentes | vigente | RPC transacional única |
| `VACINA-034` | permissão é confundida com independência | vigente | segundo ator obrigatório |
| `VACINA-035` | `CASE` textual alimenta enum | vigente | casts explícitos |
| `VACINA-036` | consulta presume coluna inexistente | vigente | contrato real da tabela |
| `VACINA-037` | orçamento sem composição/formação | vigente | readiness e testes de banco |
| `VACINA-038` | fonte externa publicada sem evidência | vigente | origem, data-base, hash e fail-closed |
| `VACINA-039` | fonte mensal altera histórico | vigente | snapshot imutável |
| `VACINA-040` | fluxo obriga documento predecessor | vigente | modo explícito e FK opcional |
| `VACINA-041` | alçada existe só na interface | vigente | regra no banco e trilha |
| `VACINA-042` | falha de formulário apaga contexto | vigente | `useActionState` e dependências separadas |

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
├── VACINA-013-FIXTURES-RESPEITAM-FRONTEIRAS-SENSIVEIS.md
├── VACINA-014-LISTA-FIXA-DE-MIGRATIONS-EM-TESTE.md
├── VACINA-015-EFEITO-DENTRO-DO-ATUALIZADOR-DE-ESTADO.md
├── VACINA-016-VALIDADOR-QUE-CITA-OUTRO-VALIDADOR.md
├── VACINA-017-VALIDADOR-PORTAVEL-CRLF.md
├── VACINA-018-ERRO-DE-AUTENTICACAO-POR-CODIGO.md
├── VACINA-019-NAVEGACAO-RESPONSIVA-SEM-SUMIR.md
├── VACINA-020-PRONTIDAO-POSTGRES-CONTAINER.md
├── VACINA-021-DDL-CONFERIDO-PELO-ADVISOR.md
├── VACINA-022-PERSONA-E-AUTORIZACAO-COERENTES.md
├── VACINA-023-AMOSTRA-SEM-EFEITO-DE-PRODUCAO.md
├── VACINA-024-METADADO-RESPONSIVO-SEM-CORTE.md
├── VACINA-025-LINT-SEM-AVISO-ACEITO.md
├── VACINA-026-TESTE-NAO-EXECUTADO-NAO-PASSA.md
├── VACINA-027-MOCK-APROVADO-EXIGE-QA-DE-FIDELIDADE.md
├── VACINA-028-CAPACIDADE-EXIGE-PORTA-DE-ENTRADA.md
├── VACINA-029-RUNNER-PYTHON-PORTAVEL.md
├── VACINA-030-MENU-DESKTOP-SEM-CORTE.md
├── VACINA-031-ESTADO-SEMPRE-USA-TOKENS-DE-TEMA.md
├── VACINA-032-FUNCAO-DE-EXTENSAO-QUALIFICADA.md
├── VACINA-033-SIMULADOR-E-PROVEDOR-CONCLUEM-O-MESMO-DOMINIO.md
├── VACINA-034-APROVACAO-EXIGE-ATOR-INDEPENDENTE.md
├── VACINA-035-TRANSICAO-ENUM-TIPADA.md
├── VACINA-036-CONSULTA-SEGUE-CONTRATO-REAL-DA-TABELA.md
├── VACINA-037-ORCAMENTO-EXIGE-COMPOSICAO-E-FORMACAO-DE-PRECO.md
├── VACINA-038-FONTE-EXTERNA-NAO-PUBLICA-SEM-EVIDENCIA.md
├── VACINA-039-FONTE-MENSAL-NAO-ALTERA-ORCAMENTO-HISTORICO.md
├── VACINA-040-FLUXO-NAO-OBRIGA-DOCUMENTO-ANTERIOR.md
├── VACINA-041-ALCADA-NAO-E-SOMENTE-CAMPO.md
├── VACINA-042-FALHA-DE-FORMULARIO-NAO-APAGA-CONTEXTO.md
├── VACINA-043-CORRECAO-VISUAL-EXIGE-CAPTURA-DO-PREVIEW.md
└── VACINA-044-REDE-LOGICA-VALIDADA-ANTES-DA-GRAVACAO.md
```

## 5. Aplicação no Encerramento da Etapa 22

A Etapa 22 reutiliza especialmente `VACINA-002`, `VACINA-007`, `VACINA-009`, `VACINA-012`, `VACINA-014`, `VACINA-016`, `VACINA-021`, `VACINA-025` e `VACINA-026`.

Regra de fechamento:

```text
evidência sintética aprovada
≠ homologação real
≠ piloto real
≠ autorização de produção
```

- QR, pairing, número, sessão, tráfego e piloto reais permanecem `BLOCKED_NOT_EXECUTED` quando não houve execução objetiva;
- dependência externa não recebe check por possuir documentação ou teste fake;
- o inventário, o manifesto, a decisão e as evidências precisam concordar;
- CI verde comprova o head testado, não autoriza operação externa;
- PR permanece draft até revisão técnica e de segurança.

Essa aplicação não cria uma vacina nova porque as causas raiz já são cobertas: documentação divergente, teste não executado tratado como sucesso e validador textual sem contrato semântico.

## 6. Critérios para nova vacina

Criar nova vacina quando a causa raiz for inédita, tiver risco de recorrência e puder ser prevenida por padrão, teste ou CI. Não criar vacina apenas para registrar uma decisão de projeto já coberta.

## 7. Definition of Done de erro

- [ ] causa raiz registrada;
- [ ] vacina existente aplicada ou nova vacina criada;
- [ ] repositório varrido;
- [ ] ocorrências equivalentes corrigidas;
- [ ] teste negativo criado;
- [ ] CI atualizado;
- [ ] documentação da etapa atualizada;
- [ ] limitações registradas;
- [ ] correção confirmada em CI ou homologação aplicável.
