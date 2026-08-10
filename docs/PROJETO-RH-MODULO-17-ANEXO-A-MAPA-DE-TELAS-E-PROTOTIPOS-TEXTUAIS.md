# Projeto RH — Módulo 17 — Anexo A — Mapa de Telas e Protótipos Textuais

**Versão:** 0.1.0  
**Estado:** inventário e wireframes textuais concluídos; protótipos visuais não iniciados  
**Data:** 6 de agosto de 2026  
**Documento principal:** `PROJETO-RH-MODULO-17-DESIGN-DE-INTERFACE-FLUXOS-COMPONENTES-E-ACESSIBILIDADE.md`

---

## 1. Finalidade

Este anexo transforma a arquitetura de experiência em um inventário revisável de telas e wireframes textuais.

Os wireframes:

- não definem pixel, cor ou componente final;
- não substituem protótipo navegável;
- não autorizam implementação;
- não representam dados reais;
- servem para validar hierarquia, sequência, estados e densidade.

---

## 2. Convenções

- **W:** área de trabalho;
- **L:** lista ou fila;
- **D:** dossiê ou detalhe;
- **F:** formulário;
- **P:** processo multi-etapa;
- **C:** ciclo de processamento;
- **K:** configuração ou catálogo;
- **R:** relatório ou analytics;
- **S:** self-service;
- **M:** tarefa prioritariamente mobile;
- **A:** contém dados sensíveis ou acesso reforçado;
- **X:** efeito externo ou assíncrono.

---

## 3. Mapa de telas

### 3.1 Visão geral

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-001 | `/app/rh` | W | prioridades, ciclos, alertas e atividade recente |
| UI-002 | `/app/rh/minhas-pendencias` | L | fila pessoal de tarefas e decisões |
| UI-003 | `/app/rh/aprovacoes` | L | decisões aguardando aprovação |
| UI-004 | `/app/rh/alertas` | L | alertas operacionais, qualidade e prazos |
| UI-005 | `/app/rh/atividade` | L | eventos recentes autorizados |

### 3.2 Pessoas e estrutura

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-010 | `/app/rh/pessoas` | L | localizar pessoas e vínculos |
| UI-011 | `/app/rh/pessoas/nova` | F | cadastrar pessoa |
| UI-012 | `/app/rh/pessoas/[personId]` | D | dossiê da pessoa |
| UI-013 | `/app/rh/pessoas/[personId]/vinculos/[employmentId]` | D | dossiê do vínculo |
| UI-014 | `/app/rh/pessoas/[personId]/documentos` | D,A | documentos pessoais |
| UI-015 | `/app/rh/pessoas/[personId]/relacoes` | D,A | dependentes e relações |
| UI-016 | `/app/rh/estrutura` | W | visão da estrutura atual |
| UI-017 | `/app/rh/estrutura/unidades` | L,K | unidades organizacionais |
| UI-018 | `/app/rh/estrutura/cargos` | L,K | cargos e funções |
| UI-019 | `/app/rh/estrutura/posicoes` | L,K | posições, ocupação e vagas |
| UI-020 | `/app/rh/estrutura/lotacoes` | L | lotações atuais e futuras |

### 3.3 Admissões e contratos

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-030 | `/app/rh/movimentacoes` | W | resumo de admissões, alterações, férias e desligamentos |
| UI-031 | `/app/rh/admissoes` | L | fila de casos de admissão |
| UI-032 | `/app/rh/admissoes/nova` | P | iniciar pré-admissão |
| UI-033 | `/app/rh/admissoes/[caseId]` | P,D | concluir caso de admissão |
| UI-034 | `/app/rh/contratos` | L | vínculos e contratos |
| UI-035 | `/app/rh/contratos/[contractId]` | D | contrato e versões |
| UI-036 | `/app/rh/contratos/[contractId]/alteracoes/nova` | P | solicitar alteração |
| UI-037 | `/app/rh/alteracoes-contratuais` | L | fila e aprovações |
| UI-038 | `/app/rh/alteracoes-contratuais/[changeId]` | D | diferenças, impactos e decisão |

### 3.4 Jornada

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-050 | `/app/rh/jornada` | W | período atual, pendências e fechamento |
| UI-051 | `/app/rh/jornada/escalas` | L | escalas e atribuições |
| UI-052 | `/app/rh/jornada/marcacoes` | L | marcações e pesquisa |
| UI-053 | `/app/rh/jornada/inconsistencias` | L | fila de tratamento |
| UI-054 | `/app/rh/jornada/inconsistencias/[issueId]` | D,P | comparar escala, marcações e evidências |
| UI-055 | `/app/rh/jornada/apuracao` | C | apuração por período |
| UI-056 | `/app/rh/jornada/banco-de-horas` | L | saldos e movimentos |
| UI-057 | `/app/rh/jornada/fechamentos` | L | períodos e estados |
| UI-058 | `/app/rh/jornada/fechamentos/[periodId]` | C | qualidade, aprovação e fechamento |
| UI-059 | `/app/rh/meu-ponto` | S,M | marcações, escala e solicitações próprias |

### 3.5 Férias e afastamentos

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-070 | `/app/rh/ferias` | W | saldos, riscos e programação |
| UI-071 | `/app/rh/ferias/programacoes` | L | férias programadas e pendentes |
| UI-072 | `/app/rh/ferias/nova` | P | programar férias |
| UI-073 | `/app/rh/ferias/[vacationId]` | D | programação, cálculo, aviso e gozo |
| UI-074 | `/app/rh/afastamentos` | L | casos de afastamento |
| UI-075 | `/app/rh/afastamentos/novo` | P,A | registrar caso e documentos |
| UI-076 | `/app/rh/afastamentos/[leaveId]` | D,A | caso, benefício e retorno |
| UI-077 | `/app/rh/meus-afastamentos` | S,A | consulta e envio autorizado pelo trabalhador |

### 3.6 Benefícios

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-090 | `/app/rh/beneficios` | W | adesões, pendências e custos |
| UI-091 | `/app/rh/beneficios/catalogo` | L,K | benefícios e planos |
| UI-092 | `/app/rh/beneficios/adesoes` | L | adesões por pessoa |
| UI-093 | `/app/rh/beneficios/adesoes/[enrollmentId]` | D | cobertura, cobranças e eventos |
| UI-094 | `/app/rh/beneficios/fornecedores` | L,K | fornecedores e arquivos |
| UI-095 | `/app/rh/beneficios/conciliacoes` | L,C | divergências de fornecedor |
| UI-096 | `/app/rh/meus-beneficios` | S | benefícios e pessoas cobertas próprias |

### 3.7 SST

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-110 | `/app/rh/sst` | W | prioridades de risco, saúde e habilitação |
| UI-111 | `/app/rh/sst/riscos` | L,K | inventários e avaliações |
| UI-112 | `/app/rh/sst/exposicoes` | L | grupos e perfis de exposição |
| UI-113 | `/app/rh/sst/exames` | L | necessidades, convocações e vencimentos |
| UI-114 | `/app/rh/sst/exames/[examId]` | D,A | atendimento e documentos autorizados |
| UI-115 | `/app/rh/sst/asos` | L | ASOs e estados operacionais |
| UI-116 | `/app/rh/sst/prontuarios/[personId]` | D,A | conteúdo clínico restrito |
| UI-117 | `/app/rh/sst/incidentes` | L | incidentes e ações |
| UI-118 | `/app/rh/sst/incidentes/novo` | F,M | registro inicial em campo |
| UI-119 | `/app/rh/sst/incidentes/[incidentId]` | D,P | investigação e CAT |
| UI-120 | `/app/rh/sst/epis` | L | entregas, inspeções e trocas |
| UI-121 | `/app/rh/sst/treinamentos` | L | turmas, conclusões e validade |
| UI-122 | `/app/rh/sst/habilitacoes` | L | habilitações e bloqueios |
| UI-123 | `/app/rh/minhas-habilitacoes` | S,M | validade e restrições próprias |

### 3.8 Folha

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-140 | `/app/rh/folha` | W | competências, pendências e ciclos |
| UI-141 | `/app/rh/folha/competencias` | L | competências e tipos de processamento |
| UI-142 | `/app/rh/folha/competencias/[periodId]` | C | ciclo da competência |
| UI-143 | `/app/rh/folha/calculos/[runId]` | C | execução e qualidade |
| UI-144 | `/app/rh/folha/calculos/[runId]/pessoas/[employmentId]` | D,A | memória individual |
| UI-145 | `/app/rh/folha/diferencas` | L | retroatividades e complementares |
| UI-146 | `/app/rh/folha/aprovacoes` | L | decisões de folha |
| UI-147 | `/app/rh/folha/pagamentos` | L,A | lotes e retornos bancários |
| UI-148 | `/app/rh/folha/demonstrativos` | L,A | demonstrativos emitidos |
| UI-149 | `/app/rh/meus-demonstrativos` | S,A | demonstrativos do trabalhador |

### 3.9 Obrigações

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-160 | `/app/rh/obrigacoes` | W | calendário, riscos e estados externos |
| UI-161 | `/app/rh/obrigacoes/calendario` | L | prazos e obrigações |
| UI-162 | `/app/rh/obrigacoes/eventos` | L | projeções e eventos |
| UI-163 | `/app/rh/obrigacoes/eventos/[eventId]` | D,X | payload governado, tentativas e recibos |
| UI-164 | `/app/rh/obrigacoes/transmissoes` | L,X | filas e estados |
| UI-165 | `/app/rh/obrigacoes/periodos/[periodId]` | C,X | fechamento, totalizadores e reconciliação |
| UI-166 | `/app/rh/obrigacoes/dctfweb` | L,X | declarações, débitos e DARFs |
| UI-167 | `/app/rh/obrigacoes/fgts-digital` | L,X | débitos, guias e pagamentos |
| UI-168 | `/app/rh/obrigacoes/conciliacoes` | L,C | divergências por camada |

### 3.10 Desligamentos

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-180 | `/app/rh/desligamentos` | L | casos e prazos |
| UI-181 | `/app/rh/desligamentos/novo` | P,A | iniciar caso |
| UI-182 | `/app/rh/desligamentos/[caseId]` | P,D,A | fundamento, cálculo, eventos e offboarding |
| UI-183 | `/app/rh/desligamentos/[caseId]/calculo` | D,A | memória rescisória |
| UI-184 | `/app/rh/desligamentos/[caseId]/offboarding` | D | acessos, ativos e responsabilidades |
| UI-185 | `/app/rh/reintegracoes` | L,A | casos de reintegração |

### 3.11 Analytics e planejamento

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-200 | `/app/rh/relatorios` | W,R | relatórios e indicadores autorizados |
| UI-201 | `/app/rh/relatorios/operacionais` | L,R | relatórios para ação |
| UI-202 | `/app/rh/relatorios/indicadores` | R | métricas agregadas |
| UI-203 | `/app/rh/relatorios/qualidade` | R | qualidade e cobertura |
| UI-204 | `/app/rh/relatorios/exportacoes` | L,A | exportações e expiração |
| UI-205 | `/app/rh/planejamento` | W,R | planos e cenários |
| UI-206 | `/app/rh/planejamento/[planId]` | D,R | plano, premissas e aprovação |
| UI-207 | `/app/rh/planejamento/[planId]/cenarios/[scenarioId]` | D,R | demanda, capacidade, lacunas e custos |

### 3.12 Configuração e auditoria

| ID | Rota proposta | Tipo | Finalidade |
|---|---|---:|---|
| UI-220 | `/app/rh/configuracao` | W,K | índice de configurações |
| UI-221 | `/app/rh/configuracao/empresas` | L,K | empresas e estabelecimentos |
| UI-222 | `/app/rh/configuracao/politicas` | L,K | políticas versionadas |
| UI-223 | `/app/rh/configuracao/rubricas` | L,K | rubricas e fórmulas |
| UI-224 | `/app/rh/configuracao/parametros` | L,K | tabelas e parâmetros |
| UI-225 | `/app/rh/configuracao/integracoes` | L,K,X | ambientes e conectores |
| UI-226 | `/app/rh/configuracao/privacidade` | L,K,A | retenção, supressão e finalidades |
| UI-227 | `/app/rh/auditoria` | L,A | eventos, acessos e decisões |

O inventário contém **91 rotas/telas propostas**. A implementação poderá consolidar ou dividir rotas após teste de arquitetura de informação, sem alterar as fronteiras funcionais.

---

## 4. Protótipo textual — Visão geral

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Recursos Humanos   Visão geral  Pessoas  Movimentações  Jornada  Folha ... │
├──────────────────────────────────────────────────────────────────────────────┤
│ Visão geral · Trabalho prioritário                     [Empresa] [Ago/2026] │
├──────────────────────────────────────────────────────────────────────────────┤
│ 12 ações vencem hoje   4 aprovações   2 integrações com confirmação pendente│
├───────────────────────────────────────┬──────────────────────────────────────┤
│ PRIORIDADES                           │ CICLOS EM ANDAMENTO                  │
│ • 3 admissões com documento pendente │ Folha 08/2026 · Conferência          │
│ • 5 ASOs vencem em 7 dias            │ Ponto 07/2026 · 18 inconsistências  │
│ • 2 desligamentos aguardam aprovação │ eSocial 08/2026 · Pré-validação     │
│ • 2 guias ainda não conciliadas      │                                      │
├───────────────────────────────────────┴──────────────────────────────────────┤
│ QUALIDADE DOS DADOS   ATIVIDADE RECENTE   ATALHOS                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Estados adicionais:

- sem pendências;
- dados atrasados;
- acesso limitado;
- integração indisponível;
- loading parcial por bloco.

---

## 5. Protótipo textual — Lista de pessoas

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Pessoas                                             [Nova pessoa]            │
│ Localize pessoas, trabalhadores e vínculos.                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Buscar por nome, matrícula ou identificador] [Empresa] [Estado] [Filtros] │
│ Filtros: Empresa A ×  Ativos ×                         248 resultados        │
├──────────────────────────────────────────────────────────────────────────────┤
│ NOME                VÍNCULO            UNIDADE       ESTADO        AÇÃO      │
│ Ana Ribeiro         00231 · CLT        Obra Aurora   Ativo         Abrir →   │
│ Carlos Almeida      00198 · CLT        Escritório    Afastado      Abrir →   │
│ Joana Silva         00472 · Terceiro   Obra Vale     Ativo         Abrir →   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Carregar mais                                                Atualizado 18:42│
└──────────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
[Buscar]
[Filtros: 2]

Ana Ribeiro
00231 · CLT · Obra Aurora
ATIVO                                      Abrir
```

---

## 6. Protótipo textual — Dossiê da pessoa e vínculo

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Ana Ribeiro   Pessoa P-000184                         [Ações]                │
│ Vínculo 00231 · Empresa A · Ativo · Obra Aurora                              │
│ [Trocar vínculo ▾]                                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ ALERTAS: ASO vence em 12 dias · Banco de horas acima do limite              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Resumo | Contrato | Jornada | Férias | Benefícios | SST | Documentos | Histórico│
├──────────────────────────────────────────────────────────────────────────────┤
│ RESUMO ATUAL                                                                  │
│ Cargo: Mestre de obras         Jornada: 44h                                  │
│ Admissão: 04/03/2024           Lotação: Obra Aurora                         │
│ Próxima ação: renovar ASO      Responsável: SST                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ TIMELINE                                                                      │
│ 05/08/2026 · Alteração de lotação aplicada                                   │
│ 01/08/2026 · Folha 07/2026 fechada                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Dados clínicos não aparecem nesta página.

---

## 7. Protótipo textual — Admissão multi-etapa

```text
Caso ADM-2026-0041 · Maria Souza · Rascunho

[1 Pessoa ✓]—[2 Vínculo ✓]—[3 Documentos !]—[4 Checklist]—[5 Revisão]—[6 Ativação]

Etapa 3 — Documentos

Identificação civil                                      Recebido  Conferido
CPF                                                       ✓         ✓
Documento de identidade                                  ✓         pendente
Comprovante de endereço                                  ausente

[Bloqueios]
• Documento de identidade ainda não conferido.
• Comprovante de endereço obrigatório para esta política.

[Salvar rascunho]                                         [Continuar]
```

Na revisão final:

```text
Alterações que serão efetivadas
• criação do trabalhador;
• criação do vínculo;
• versão contratual inicial;
• lotação;
• obrigações externas aplicáveis.

[Voltar] [Ativar vínculo]
```

---

## 8. Protótipo textual — Tratamento de ponto

```text
Inconsistência PT-00482 · 05/08/2026 · Ana Ribeiro

ESCALA PREVISTA          MARCAÇÕES ORIGINAIS          APURAÇÃO ATUAL
07:00–12:00              06:58 Entrada                Entrada antecipada 2 min
13:00–16:48              12:03 Saída                  Intervalo incompleto
                         12:47 Entrada                Saída ausente
                         —

Evidências
• Diário da obra: equipe encerrou às 17:10
• Solicitação da trabalhadora: esquecimento de marcação

Tratamento proposto
[Adicionar marcação tratada 17:08] [Justificativa]

A marcação original será preservada.

[Devolver] [Aprovar tratamento]
```

---

## 9. Protótipo textual — Férias

```text
Programar férias · Ana Ribeiro · Vínculo 00231

Direito disponível: 30 dias       Prazo de concessão: 02/02/2027

Período 1
Início [14/09/2026]  Dias [20]  Abono [Não]

Período 2
Início [11/01/2027]  Dias [10]

Conflitos e cobertura
! Supervisor substituto ainda não definido para 14–18/09.
✓ Não há sobreposição com afastamento.
✓ Política permite o fracionamento proposto.

Estimativa do cálculo: disponível após validação final.

[Salvar rascunho] [Revisar programação]
```

---

## 10. Protótipo textual — SST e ASO

### Visão do gestor

```text
Ana Ribeiro · Aptidão ocupacional
APTA COM RESTRIÇÃO

Restrições operacionais
• Não executar trabalho em altura até 30/09/2026.
• Reavaliação necessária antes da liberação.

O diagnóstico e o prontuário não estão disponíveis neste perfil.
```

### Visão clínica autorizada

```text
Prontuário ocupacional · acesso restrito
Finalidade declarada: atendimento ocupacional
[Acesso registrado]

Atendimentos | Exames | Documentos clínicos | Histórico
```

---

## 11. Protótipo textual — Folha

```text
Folha · Competência 08/2026 · Mensal
Estado: CONFERÊNCIA            [Executar novamente] [Solicitar aprovação]

ENTRADAS
✓ 148 vínculos no snapshot
! 3 eventos de ponto com ressalva
✓ benefícios conciliados
✓ parâmetros versão 2026.08

EXECUÇÃO RUN-00027
Cálculo sombra · Motor 0.1.0 · 18:31

DIFERENÇAS VS. RUN-00026
2 vínculos alterados · diferença líquida total R$ 428,31

Pessoa             Rubrica            Antes       Agora      Diferença
Ana Ribeiro        Hora extra 50%     320,00      416,00      +96,00
Carlos Almeida     Desconto plano     122,40      454,71      +332,31

[Ver memória] [Exportar diferenças] [Solicitar aprovação]
```

Memória individual:

```text
Rubrica: Hora extra 50%
Base: 8,00 horas
Valor-hora: R$ 20,00
Fator: 1,50
Expressão: 8 × 20 × 1,5
Resultado antes de arredondamento: R$ 240,0000
Resultado: R$ 240,00
Regra: HE50 v3 · vigente desde 01/01/2026
```

---

## 12. Protótipo textual — Transmissão externa

```text
Evento S-1200 · EVT-2026-00831
Estado: CONFIRMAÇÃO EXTERNA PENDENTE

Projeção aprovada: 18:20
Tentativa 1 enviada: 18:22
Resposta: conexão encerrada antes do recibo

Não retransmita enquanto a reconciliação estiver em andamento.

[Atualizar situação] [Ver tentativa] [Abrir origem]

Correlação: 7e4a…f911
```

Após confirmação:

```text
Estado: ACEITO
Recibo: 1.2.0000000000000000000
Aceito em: 18:29
[Ver recibo] [Ver totalizador]
```

---

## 13. Protótipo textual — Desligamento

```text
Caso DES-2026-0017 · Ana Ribeiro
Estado: CÁLCULO EM REVISÃO

[1 Fundamento ✓]—[2 Proteções ✓]—[3 Aviso ✓]—[4 Cálculo !]—[5 Documentos]—[6 Término]—[7 Offboarding]

Bloqueios
• Divergência de R$ 187,42 entre cálculo atual e simulação anterior.
• Ativo notebook NB-042 ainda está sob custódia.

Resumo
Data do desligamento: 21/08/2026
Último dia trabalhado: 07/08/2026
Aviso: indenizado

[Comparar cálculos] [Devolver] [Aprovar cálculo]
```

A pendência do ativo não gera desconto automático.

---

## 14. Protótipo textual — Planejamento da força de trabalho

```text
Plano 2026-T4 · Obras Vale e Aurora
Cenário: Provável v4

PERÍODO        DEMANDA FTE      CAPACIDADE FTE      LACUNA
Set/2026       84,0             79,5                -4,5
Out/2026       92,0             81,0                -11,0
Nov/2026       88,0             86,0                -2,0

Principais lacunas
• 6 carpinteiros · Obra Vale · outubro
• 3 profissionais NR-35 válidos · Obra Aurora · setembro
• 2 encarregados · ambas as obras · outubro

Ações propostas
[Propor contratação] [Propor treinamento] [Comparar cenário]

O cenário não cria vaga ou contratação automaticamente.
```

---

## 15. Protótipo textual — Portal do trabalhador

```text
Olá, Ana

PRÓXIMAS AÇÕES
• Confirmar ciência do aviso de férias até 10/08
• ASO periódico agendado para 18/08 às 09:00

ATALHOS
[Meu ponto] [Demonstrativos] [Benefícios] [Documentos] [Solicitações]

ÚLTIMO DEMONSTRATIVO
Julho/2026 · disponível em 31/07/2026
[Visualizar]
```

O portal não apresenta menus administrativos, relatórios coletivos ou dados de outros trabalhadores.

---

## 16. Matriz de estados obrigatórios por protótipo

| Padrão | Loading | Vazio inicial | Vazio por filtro | Erro | Negado | Conflito | Assíncrono | Incerto |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Área de trabalho | x | x | — | x | x | — | x | x |
| Lista | x | x | x | x | x | — | x | — |
| Dossiê | x | — | — | x | x | x | x | x |
| Formulário | x | — | — | x | x | x | x | — |
| Processo | x | — | — | x | x | x | x | x |
| Ciclo | x | x | — | x | x | x | x | x |
| Relatório | x | x | x | x | x | — | x | — |
| Portal | x | x | — | x | x | — | x | — |

---

## 17. Conteúdo e terminologia

Rótulos preferidos:

| Evitar | Preferir |
|---|---|
| Colaborador | Trabalhador ou pessoa, conforme o conceito |
| Funcionário | Empregado, trabalhador ou vínculo, conforme o conceito |
| Cadastro ativo | Pessoa ativa, vínculo ativo ou configuração vigente |
| Demitir | Iniciar desligamento, quando ainda não efetivado |
| Processado | Calculado, transmitido, aceito, conciliado ou pago |
| Erro desconhecido | Não foi possível concluir; usar correlation ID |
| Pendente | Declarar o que está pendente |
| Salvar tudo | Salvar rascunho, publicar, aprovar ou aplicar |
| Cancelar | Fechar, descartar alterações ou cancelar processo |

Os termos poderão variar conforme política e contexto jurídico, mas não deverão misturar estados diferentes.

---

## 18. Componentes a prototipar primeiro

1. `RhScopeBar`;
2. `RhContextHeader`;
3. `RhStatusBadge`;
4. `RhBlockingIssues`;
5. `RhPriorityQueue`;
6. `RhDecisionPanel`;
7. `RhTimeline`;
8. `RhStepFlow`;
9. `RhAsyncOperationStatus`;
10. `RhSensitiveField`;
11. `RhCalculationTrace`;
12. `RhReconciliationPanel`;
13. `RhDataQualitySummary`;
14. lista responsiva;
15. resumo de erros.

---

## 19. Ordem de prototipação proposta

### Onda UX-0 — Fundação

- navegação do aplicativo;
- visão geral;
- listas;
- dossiê;
- formulários;
- estados transversais.

### Onda UX-1 — Ciclo da pessoa

- pessoa e vínculo;
- admissão;
- alteração contratual;
- férias e afastamento;
- desligamento.

### Onda UX-2 — Operação

- jornada;
- SST;
- benefícios;
- mobile de campo;
- portal do trabalhador.

### Onda UX-3 — Financeiro e governo

- folha;
- memória de cálculo;
- pagamentos;
- obrigações;
- reconciliação.

### Onda UX-4 — Gestão

- relatórios;
- analytics;
- planejamento;
- configuração;
- auditoria.

Nenhuma onda será convertida automaticamente em sprint de implementação.

---

## 20. Critérios para iniciar protótipo visual

- arquitetura de informação revisada;
- termos principais aprovados;
- personas e capacidades confirmadas;
- fluxos críticos priorizados;
- componentes existentes inventariados;
- tokens atuais confirmados;
- dados fictícios preparados;
- estados obrigatórios definidos;
- estratégia de acessibilidade definida;
- ferramenta e repositório do protótipo aprovados.

---

## 21. Estado honesto

Este anexo contém **91 telas/rotas propostas**, dez wireframes textuais principais, matriz de estados e ordem de prototipação.

Não foram criados:

- imagens;
- frames de Figma;
- protótipos clicáveis;
- componentes;
- rotas;
- menus;
- dados de fixture;
- testes com usuários;
- validações automatizadas.
