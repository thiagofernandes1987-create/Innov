# Projeto RH — Índice — Adendo 0.20.1 — Correção Funcional

**Data:** 7 de agosto de 2026  
**Relaciona-se ao índice mestre:** `PROJETO-RH-INDICE-E-ESTADO.md` versão 0.20.0

## 1. Motivo

Este adendo registra o loop corretivo executado após a revisão que identificou excesso de conteúdo meta/arquitetural e profundidade operacional insuficiente, especialmente em Folha, eSocial, DCTFWeb e FGTS Digital.

Ele não substitui o índice mestre. Acrescenta os documentos vinculantes que devem ser lidos antes de considerar M09 e M10 aprovados para revisão funcional.

## 2. Documentos corretivos

| Ordem | Documento | Função |
|---|---|---|
| Loop | `PROJETO-RH-LOOP-CORRECAO-FOCO-FUNCIONAL.md` | checklist e estado do loop |
| Auditoria | `PROJETO-RH-LOOP-CORRECAO-AUDITORIA-FINAL.md` | PASS/FAIL item a item |
| Núcleo | `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md` | entrada → operação → saída → integração dos 20 itens obrigatórios |
| M09 V2 | `PROJETO-RH-MODULO-09-ADENDO-V2-FOLHA-FUNCIONAL-INTEGRADA.md` | torna os anexos de folha vinculantes |
| M09 A | `PROJETO-RH-MODULO-09-ANEXO-A-CATALOGO-FUNCIONAL-DE-RUBRICAS.md` | catálogo e parametrização de rubricas |
| M09 B | `PROJETO-RH-MODULO-09-ANEXO-B-CICLOS-OPERACIONAIS-DA-FOLHA.md` | 35 capacidades/processamentos obrigatórios |
| M09 C | `PROJETO-RH-MODULO-09-ANEXO-C-CADASTROS-MESTRES-DO-DP-E-FOLHA.md` | empresas, estabelecimentos, lotações, TSV, cargos, funções, sindicatos, jornadas e salários |
| M10 V2 | `PROJETO-RH-MODULO-10-ADENDO-V2-OBRIGACOES-INTEGRADAS.md` | torna os anexos de integrações vinculantes |
| M10 A | `PROJETO-RH-MODULO-10-ANEXO-A-INTEGRACOES-OFICIAIS-ESOCIAL-DCTFWEB-FGTS-DIGITAL.md` | fluxos ponta a ponta dos sistemas oficiais |
| M10 B | `PROJETO-RH-MODULO-10-ANEXO-B-MATRIZ-FUNCIONAL-DE-EVENTOS-ESOCIAL.md` | eventos eSocial por origem, gatilho, dependência e correção |
| M10 C | `PROJETO-RH-MODULO-10-ANEXO-C-CANAIS-OFICIAIS-E-LIMITACOES-DE-INTEGRACAO.md` | WS/API/feed/arquivo/portal por capability |

## 3. Resultado do loop

- núcleo obrigatório: 20 PASS;
- capacidades da folha: 35 PASS;
- atributos da rubrica: 15 PASS;
- parametrização de rubricas: 17 PASS;
- eSocial — 15 etapas: 15 PASS;
- diferenciações eSocial: 13 PASS;
- DCTFWeb: 13 PASS;
- FGTS Digital: 18 PASS;
- canais oficiais críticos: 9 PASS;
- `PARTIAL`: 0;
- `FAIL`: 0.

## 4. Decisão de leitura

Para Folha:

```text
M09 base
+ Adendo V2
+ Anexos A/B/C
+ matriz do núcleo
+ M10 para obrigações externas
```

Para Obrigações:

```text
M10 base
+ Adendo V2
+ Anexos A/B/C
+ matriz do núcleo
```

## 5. Estado honesto

O loop conclui a **correção da especificação funcional**. Não foram implementados:
- motor de folha;
- tabelas/migrations do RH;
- Web Services do eSocial;
- Integra Contador;
- automação do FGTS Digital;
- certificados;
- transmissão externa;
- homologação;
- produção.

O próximo módulo lógico continua sendo a rastreabilidade/revisão cruzada, sem iniciar implementação automaticamente.
