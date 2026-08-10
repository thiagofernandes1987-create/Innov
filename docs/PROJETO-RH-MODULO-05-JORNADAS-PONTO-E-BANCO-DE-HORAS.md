# Projeto RH — Módulo 05: Jornadas, Horários, Escalas, Controle de Ponto e Banco de Horas

**Versão:** 0.1.0  
**Data:** 6 de agosto de 2026  
**Estado:** especificação funcional inicial concluída; validação de produto, jurídica e técnica pendente  
**Implementação:** não iniciada  

---

## 1. Finalidade

O Módulo 05 administrará o ciclo de tempo de trabalho desde a definição da jornada contratual até o fechamento do período e a entrega de eventos apurados à folha.

O módulo deverá:

- representar jornadas e horários por vigência;
- planejar escalas e turnos;
- receber marcações por canais autorizados;
- preservar o registro original;
- detectar divergências sem impedir o fato;
- permitir tratamento auditável;
- calcular resultados por política versionada;
- administrar acordos e saldos de banco de horas;
- fechar períodos de forma reproduzível;
- integrar ponto, folha, obras, equipes e custos sem confundir suas fontes canônicas.

A separação central será:

```text
Jornada contratual
  → Escala planejada
    → Turno da data
      → Marcações originais
        → Tratamentos aprovados
          → Apuração versionada
            → Banco de horas e eventos de folha
              → Fechamento
```

---

## 2. Escopo

### 2.1 Incluído

- políticas de jornada;
- jornadas contratuais;
- modelos de horário;
- modelos de escala;
- calendários e feriados;
- atribuição de escalas;
- planejamento de turnos;
- troca e substituição de turnos;
- convocação e plantão;
- marcação web, móvel, quiosque e integração;
- operação offline;
- comprovantes;
- importação de REP;
- ocorrências e inconsistências;
- solicitações de ajuste;
- tratamentos e aprovações;
- apuração diária e por período;
- horas normais e classificações derivadas;
- autorização de sobrejornada;
- acordos de compensação;
- banco de horas;
- fechamento e reabertura;
- portal do trabalhador;
- relatórios e auditoria;
- integração com folha, obras, diário, equipes, tarefas e financeiro.

### 2.2 Fora deste módulo

- cálculo monetário definitivo da folha;
- pagamento de remuneração;
- gestão completa de férias e afastamentos;
- medicina ocupacional;
- controle de acesso físico a instalações;
- vigilância contínua de localização;
- biometria obrigatória universal;
- certificação de equipamentos;
- fabricação de REP;
- interpretação jurídica automática de instrumentos coletivos;
- substituição de assessoria trabalhista.

---

## 3. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultados:

- texto compilado da CLT;
- Decreto nº 10.854/2021;
- Portaria MTP nº 671/2021 na página oficial consolidada do Ministério do Trabalho e Emprego;
- página oficial de Registro Eletrônico de Ponto;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- leiautes e manuais relativos a horário contratual e alteração contratual.

Premissas de arquitetura extraídas da baseline:

- o sistema não poderá fabricar marcações a partir do horário contratual;
- o registro eletrônico deverá preservar fielmente as marcações;
- o canal de marcação não deverá restringir horário, exigir autorização prévia para marcar ou permitir alteração do dado original pelo empregador;
- a arquitetura deverá suportar REP-C, REP-A e REP-P por adaptadores, sem acoplamento ao fornecedor;
- comprovantes, arquivos e relatórios deverão ser gerados conforme a modalidade e a regulamentação aplicável;
- jornada contratual e alterações de jornada possuem representação própria no eSocial;
- campos, limites, prazos, formatos e requisitos deverão ser verificados novamente antes da implementação e homologação.

O produto deverá permitir configuração por empresa, estabelecimento, categoria, vínculo, instrumento coletivo e vigência. Nenhum limite apresentado em exemplo será tratado como regra universal sem validação.

---

## 4. Usuários e responsabilidades

| Perfil | Responsabilidade principal |
|---|---|
| Trabalhador | registrar, consultar, justificar e contestar o próprio ponto |
| Gestor imediato | planejar escala, acompanhar ocorrências e aprovar conforme alçada |
| Gestor de obra | administrar turnos operacionais e contexto de obra sem editar marcação bruta |
| Analista de DP | revisar tratamentos, apurar e preparar fechamento |
| Gestor de DP | aprovar políticas, exceções, fechamentos e reaberturas |
| Gestor de Folha | receber eventos fechados e reconciliar divergências |
| RH | consultar jornadas, escalas e indicadores autorizados |
| Financeiro/Controladoria | receber custos e rateios autorizados sem acessar dados desnecessários |
| Administrador | configurar canais, dispositivos, políticas e integrações |
| Auditor | consultar fatos, tratamentos, cálculos e evidências sem alterar registros |
| Suporte técnico | tratar falhas de sincronização sem decidir mérito trabalhista |

---

## 5. Navegação sugerida

```text
RH / Tempo de Trabalho
  ├─ Visão Geral
  ├─ Jornadas
  ├─ Horários
  ├─ Escalas
  ├─ Planejamento de Turnos
  ├─ Marcações
  ├─ Ocorrências
  ├─ Tratamentos
  ├─ Apurações
  ├─ Banco de Horas
  ├─ Fechamentos
  ├─ Dispositivos e Coletores
  ├─ Importações e Integrações
  ├─ Relatórios
  └─ Configurações
```

Rotas sugeridas:

- `/app/rh/tempo`;
- `/app/rh/tempo/jornadas`;
- `/app/rh/tempo/horarios`;
- `/app/rh/tempo/escalas`;
- `/app/rh/tempo/turnos`;
- `/app/rh/tempo/marcacoes`;
- `/app/rh/tempo/ocorrencias`;
- `/app/rh/tempo/tratamentos`;
- `/app/rh/tempo/apuracoes`;
- `/app/rh/tempo/banco-de-horas`;
- `/app/rh/tempo/fechamentos`;
- `/app/rh/tempo/dispositivos`;
- `/app/rh/tempo/configuracoes`;
- `/portal/ponto` para trabalhador autenticado;
- `/ponto/[collector]` para coletor autorizado.

---

## 6. Conceitos funcionais

### 6.1 Política de jornada

Define regras aplicáveis a um escopo, sem representar o horário concreto de uma pessoa.

Campos principais:

- código;
- nome;
- empresa;
- estabelecimento opcional;
- categoria;
- sindicato ou instrumento;
- tipo de regime;
- carga semanal de referência;
- limites configurados;
- regras de intervalo;
- regra de descanso;
- tratamento de componente noturno;
- regra de sobrejornada;
- regra de compensação;
- política de tolerância;
- vigência;
- estado;
- versão;
- aprovadores;
- documentos de suporte.

### 6.2 Jornada do vínculo

Representa a jornada contratada e versionada do trabalhador.

Deverá apontar para:

- versão contratual;
- política aplicável;
- carga semanal média;
- tipo de jornada;
- descrição semanal;
- componente noturno;
- modalidade parcial quando aplicável;
- horário ou escala de referência;
- vigência;
- origem;
- documento;
- evento externo correlato.

### 6.3 Horário diário

Representa uma sequência de segmentos em um dia.

Exemplo estrutural:

```text
08:00 início
12:00 início de intervalo
13:00 fim de intervalo
17:00 fim
```

O horário deverá suportar:

- mais de um intervalo;
- segmentos que atravessam meia-noite;
- horários sem marcação esperada em regime específico;
- duração variável;
- margem operacional sem fabricar ponto;
- indicação de dia seguinte.

### 6.4 Modelo de escala

Representa um ciclo reutilizável.

Tipos funcionais iniciais:

- semanal fixa;
- semanal com folga variável;
- ciclo de dias de trabalho e folga;
- 12x36 quando aplicável;
- turno ininterrupto de revezamento;
- escala mensal;
- escala por convocação;
- escala personalizada.

### 6.5 Calendário

O calendário deverá combinar:

- calendário nacional;
- calendário estadual;
- calendário municipal;
- feriados da empresa;
- dias de ponte;
- paralisações;
- dias compensados;
- eventos de obra;
- exceções por estabelecimento.

A classificação jurídica do dia deverá ser versionada e validada.

### 6.6 Turno planejado

Representa uma data concreta e poderá ser gerado por escala ou criado manualmente.

Campos:

- trabalhador/vínculo;
- data operacional;
- início e fim;
- intervalos;
- tipo do dia;
- local;
- obra;
- equipe;
- posição;
- aprovador;
- origem;
- estado;
- versão;
- observação.

### 6.7 Marcação

Representa o fato bruto.

Tipos possíveis de evento:

- entrada;
- início de intervalo;
- fim de intervalo;
- saída;
- marcação livre sem tipo;
- evento importado;
- evento de contingência.

O sistema poderá inferir pares para visualização, mas deverá preservar o tipo original e a inferência separadamente.

### 6.8 Ocorrência

Representa uma divergência detectada.

Uma ocorrência terá:

- severidade;
- categoria;
- trabalhador;
- período;
- eventos relacionados;
- regra que a detectou;
- descrição;
- estado;
- responsável;
- prazo;
- tratamento relacionado;
- resolução.

### 6.9 Tratamento

Representa uma decisão humana ou automatizada autorizada sobre a visão tratada.

### 6.10 Apuração

Representa o cálculo temporal e classificatório, ainda sem transformar automaticamente os resultados em valores monetários.

### 6.11 Banco de horas

Representa uma razão de movimentos vinculada a acordo válido.

---

## 7. Estados

### 7.1 Jornada ou política

```text
DRAFT
  → UNDER_REVIEW
  → APPROVED
  → ACTIVE
  → ENDED

DRAFT | UNDER_REVIEW
  → CANCELED
```

### 7.2 Escala

```text
DRAFT
  → PUBLISHED
  → IN_EFFECT
  → COMPLETED

DRAFT | PUBLISHED
  → CANCELED
```

Alteração após publicação criará nova versão ou revisão identificada.

### 7.3 Turno

```text
PLANNED
  → PUBLISHED
  → CONFIRMED
  → IN_PROGRESS
  → COMPLETED

PLANNED | PUBLISHED | CONFIRMED
  → CANCELED
```

### 7.4 Marcação

```text
RECEIVED
  → VALIDATED
  → LINKED
  → AVAILABLE

RECEIVED
  → QUARANTINED
  → RESOLVED | REJECTED
```

### 7.5 Ocorrência

```text
OPEN
  → ASSIGNED
  → UNDER_ANALYSIS
  → RESOLVED | DISMISSED

OPEN | ASSIGNED
  → OVERDUE
```

### 7.6 Tratamento

```text
DRAFT
  → SUBMITTED
  → UNDER_REVIEW
  → APPROVED | REJECTED | RETURNED
  → APPLIED

DRAFT | RETURNED
  → CANCELED
```

### 7.7 Apuração

```text
PENDING
  → CALCULATING
  → CALCULATED
  → WITH_WARNINGS | BLOCKED
  → REVIEWED
  → APPROVED
  → CLOSED
```

Nova execução substitui logicamente a anterior com estado `SUPERSEDED`.

### 7.8 Período

```text
OPEN
  → IN_REVIEW
  → READY_TO_CLOSE
  → CLOSED
  → REOPENED
  → CLOSED
```

### 7.9 Movimento de banco

```text
PENDING
  → POSTED
  → PARTIALLY_COMPENSATED
  → COMPENSATED | EXPIRED | LIQUIDATED

POSTED
  → REVERSED
```

---

## 8. Tela: Visão Geral

Indicadores:

- trabalhadores esperados hoje;
- trabalhadores com marcação iniciada;
- turnos sem entrada;
- jornadas abertas há tempo anormal;
- marcações offline pendentes;
- ocorrências críticas;
- solicitações aguardando aprovação;
- períodos com bloqueio;
- saldo positivo e negativo por acordo;
- fechamentos próximos;
- integrações com falha.

Filtros:

- empresa;
- estabelecimento;
- obra;
- equipe;
- gestor;
- período;
- situação;
- tipo de jornada;
- acordo de banco.

A visão do gestor de obra não exibirá detalhes salariais, biometria ou localização histórica completa.

---

## 9. Tela: Jornadas

A lista deverá apresentar:

- código;
- nome;
- tipo;
- carga média;
- escopo;
- vigência;
- versão;
- trabalhadores vinculados;
- estado;
- alertas.

Ações:

- criar;
- duplicar como rascunho;
- versionar;
- enviar para revisão;
- aprovar;
- encerrar vigência;
- simular impacto;
- consultar histórico.

Validações:

- vigência coerente;
- segmentos sem sobreposição inválida;
- carga calculada compatível com a informada;
- instrumento aplicável;
- conflitos com versões futuras;
- escopo não ambíguo;
- regras obrigatórias preenchidas.

---

## 10. Tela: Escalas

Visualizações:

- calendário mensal;
- semana;
- grade por trabalhador;
- grade por equipe;
- grade por obra;
- ciclo;
- lista de conflitos.

Ações:

- gerar por modelo;
- copiar semana;
- publicar;
- atribuir em lote;
- trocar turno;
- convocar;
- substituir;
- cancelar;
- exportar;
- comparar capacidade com demanda.

Conflitos detectados:

- dois turnos simultâneos;
- turno durante férias ou afastamento;
- descanso planejado insuficiente conforme política;
- trabalhador em obra incompatível;
- jornada contratual não vigente;
- posição ou equipe encerrada;
- intervalo inconsistente;
- excesso planejado;
- ausência de habilitação exigida pela atividade.

O sistema deverá alertar e classificar o conflito. Bloqueios dependerão da política e do risco.

---

## 11. Troca de turno

Fluxo:

1. solicitante seleciona turno;
2. informa trabalhador substituto ou solicita troca aberta;
3. sistema verifica conflitos;
4. gestor analisa;
5. trabalhadores envolvidos confirmam quando exigido;
6. mudança é aprovada;
7. nova versão da escala é publicada;
8. notificações são enviadas;
9. histórico anterior permanece disponível.

A troca de escala não altera jornada contratual automaticamente.

---

## 12. Canais de marcação

### 12.1 Portal autenticado

Adequado a trabalhadores com usuário associado.

### 12.2 Aplicativo móvel

Poderá suportar offline, dispositivo cadastrado e localização pontual quando aprovada.

### 12.3 Quiosque

Permitirá marcação compartilhada por identificação individual segura.

### 12.4 REP integrado

Adaptadores deverão importar arquivos ou eventos mantendo metadados de origem.

### 12.5 Coletor de obra

Poderá operar em tablet ou terminal local com sincronização posterior.

### 12.6 Importação administrativa

Permitida para migração ou contingência, com trilha específica e sem se passar por marcação do trabalhador.

### 12.7 API

Somente integrações autenticadas, assinadas, idempotentes e autorizadas.

---

## 13. Fluxo de marcação

1. coletor identifica o trabalhador;
2. resolve vínculo e contexto autorizados;
3. captura data, hora, fuso e metadados;
4. gera chave idempotente;
5. persiste localmente se offline;
6. transmite evento;
7. camada de ingestão valida integridade técnica;
8. evento é aceito ou colocado em quarentena;
9. sistema emite ou disponibiliza comprovante quando aplicável;
10. ocorrência é criada quando houver divergência;
11. trabalhador recebe confirmação.

O sistema não perguntará ao gestor se o trabalhador “pode” marcar naquele instante.

---

## 14. Operação offline

Requisitos:

- fila criptografada no dispositivo;
- contador monotônico local;
- relógio e fuso registrados;
- detecção de alteração suspeita de relógio;
- hash do evento;
- identificação do coletor;
- repetição segura;
- sincronização idempotente;
- indicação visual de pendência;
- comprovante local ou posterior conforme canal;
- política de retenção local;
- revogação de dispositivo;
- reconciliação administrativa.

O sistema armazenará separadamente:

- hora declarada pelo coletor;
- hora recebida pelo servidor;
- diferença;
- motivo de atraso conhecido;
- resultado da validação.

---

## 15. Geolocalização

A localização será opcional por política e finalidade aprovada.

Regras:

- coletar somente no instante da marcação;
- informar finalidade;
- guardar precisão;
- não ocultar marcação fora da área;
- não bloquear automaticamente;
- criar ocorrência;
- permitir justificativa;
- restringir visualização;
- evitar exibição desnecessária de mapa histórico;
- definir retenção específica;
- não usar rastreamento contínuo.

Geocerca poderá classificar:

- dentro da área;
- próximo da área;
- fora da área;
- precisão insuficiente;
- localização indisponível;
- localização recusada;
- suspeita técnica.

---

## 16. Dispositivos e coletores

Cadastro:

- identificador;
- tipo;
- empresa;
- estabelecimento;
- obra;
- local;
- fornecedor;
- modelo;
- versão;
- certificado ou registro aplicável;
- chaves técnicas;
- estado;
- última comunicação;
- responsável;
- política de atualização;
- histórico.

Estados:

```text
PENDING
  → ACTIVE
  → SUSPENDED
  → REVOKED
  → RETIRED
```

Revogação não apagará eventos anteriores.

---

## 17. Comprovantes

O trabalhador deverá conseguir acessar comprovantes aplicáveis ao canal.

O sistema deverá:

- correlacionar comprovante e marcação;
- preservar hash;
- registrar emissão;
- permitir extração;
- controlar assinatura quando aplicável;
- registrar indisponibilidade;
- regenerar representação sem alterar o conteúdo assinado;
- manter política de retenção;
- impedir acesso de outro trabalhador.

---

## 18. Ocorrências automáticas

Catálogo inicial:

- `MISSING_ENTRY`;
- `MISSING_EXIT`;
- `MISSING_INTERVAL_START`;
- `MISSING_INTERVAL_END`;
- `ODD_NUMBER_OF_MARKS`;
- `POSSIBLE_DUPLICATE`;
- `OUT_OF_ORDER`;
- `SHIFT_NOT_PLANNED`;
- `WORK_ON_DAY_OFF`;
- `WORK_ON_HOLIDAY`;
- `EARLY_START`;
- `LATE_START`;
- `EARLY_EXIT`;
- `LATE_EXIT`;
- `OVERTIME_NOT_PLANNED`;
- `INTERVAL_EXCEPTION`;
- `EXCESSIVE_OPEN_SHIFT`;
- `OUTSIDE_EXPECTED_LOCATION`;
- `UNKNOWN_DEVICE`;
- `OFFLINE_SYNC_DELAY`;
- `CLOCK_DRIFT`;
- `CONFLICT_WITH_LEAVE`;
- `CONFLICT_WITH_VACATION`;
- `CONFLICT_WITH_ANOTHER_SHIFT`;
- `UNRESOLVED_WORKER`;
- `INTEGRATION_FORMAT_ERROR`;
- `POLICY_NOT_FOUND`;
- `CALCULATION_DIVERGENCE`.

Severidades:

- informativa;
- atenção;
- relevante;
- crítica;
- impeditiva para fechamento.

A severidade será configurada por política e contexto.

---

## 19. Solicitação de ajuste pelo trabalhador

O trabalhador poderá:

- informar marcação esquecida;
- justificar atraso;
- justificar saída antecipada;
- contestar marcação;
- apontar duplicidade;
- solicitar abono;
- informar falha do coletor;
- anexar evidência;
- acompanhar decisão;
- recorrer quando o fluxo permitir.

Campos:

- período;
- tipo;
- fato alegado;
- horário proposto;
- justificativa;
- anexos;
- local;
- obra;
- pessoas envolvidas;
- declaração de veracidade;
- estado.

O sistema não deverá permitir que a solicitação altere diretamente o espelho.

---

## 20. Tratamento administrativo

O analista poderá:

- relacionar eventos;
- incluir evento derivado;
- desconsiderar logicamente evento;
- corrigir vínculo associado;
- classificar intervalo;
- reconhecer contingência;
- aplicar abono permitido;
- devolver ao trabalhador;
- rejeitar;
- escalar para gestor;
- solicitar evidência;
- encaminhar para revisão técnica.

Toda decisão deverá guardar:

- antes e depois;
- fundamento;
- autor;
- aprovador;
- data;
- evidência;
- política usada;
- impacto estimado;
- versão da apuração afetada.

---

## 21. Autorização de sobrejornada

A autorização representa planejamento e governança, não condição para receber a marcação.

Campos:

- trabalhador ou grupo;
- período;
- quantidade estimada;
- motivo;
- obra ou centro de custo;
- solicitante;
- aprovador;
- limite;
- estado;
- documento;
- vigência.

Estados:

```text
DRAFT
  → SUBMITTED
  → APPROVED | REJECTED
  → USED | EXPIRED | CANCELED
```

Horas realizadas sem autorização poderão gerar ocorrência e análise, mas permanecerão registradas.

---

## 22. Motor de apuração

### 22.1 Entradas

- jornada contratual vigente;
- escala e turno;
- calendário;
- marcações originais;
- tratamentos aprovados;
- afastamentos e férias;
- políticas de cálculo;
- acordos;
- autorizações;
- regras especiais;
- fuso e localização temporal.

### 22.2 Saídas temporais

- tempo marcado;
- tempo tratado;
- tempo normal;
- tempo excedente;
- componente noturno;
- atraso;
- saída antecipada;
- ausência;
- intervalo;
- descanso;
- tempo compensável;
- tempo não compensável;
- tempo pendente de classificação;
- avisos;
- bloqueios.

### 22.3 Memória de cálculo

Para cada resultado, guardar:

- regra aplicada;
- versão;
- período de vigência;
- entradas;
- passos;
- arredondamentos;
- classificação;
- resultado;
- avisos;
- origem da regra.

### 22.4 Reprodutibilidade

O mesmo conjunto de entradas e versões deverá produzir o mesmo resultado.

---

## 23. Tratamento de turnos que atravessam meia-noite

O sistema deverá possuir uma data operacional e não depender somente da data civil.

Exemplo:

```text
Turno de 06/08
  início: 22:00 de 06/08
  fim: 06:00 de 07/08
```

Regras:

- associar eventos ao turno correto;
- manter instantes absolutos;
- calcular componentes por faixa;
- reconhecer intervalos no dia seguinte;
- evitar duplicação em relatórios;
- permitir fechamento por competência;
- preservar fuso.

---

## 24. Banco de horas

### 24.1 Cadastro do acordo

Campos:

- empresa;
- estabelecimento;
- instrumento;
- modalidade;
- escopo;
- início e fim;
- prazo de compensação;
- limites;
- regras de adesão;
- créditos elegíveis;
- débitos elegíveis;
- prioridade de consumo;
- expiração;
- desligamento;
- liquidação;
- aprovadores;
- documentos;
- versão.

### 24.2 Elegibilidade

Antes de movimentar:

- verificar vínculo;
- verificar escopo;
- verificar vigência;
- verificar categoria;
- verificar instrumento;
- verificar política;
- verificar data do fato.

### 24.3 Conta individual

Uma conta será criada por vínculo e acordo.

### 24.4 Razão de movimentos

Tipos:

- crédito;
- débito;
- compensação;
- expiração;
- liquidação;
- ajuste;
- reversão;
- migração;
- encerramento.

### 24.5 Consumo

A regra de consumo poderá considerar:

- ordem cronológica;
- vencimento mais próximo;
- tipo de crédito;
- origem;
- multiplicador;
- restrições do instrumento.

A política deverá ser explícita e versionada.

### 24.6 Extrato

O trabalhador deverá consultar:

- saldo anterior;
- créditos;
- débitos;
- compensações;
- itens a vencer;
- itens expirados;
- ajustes;
- saldo atual;
- regras aplicáveis.

---

## 25. Fechamento do ponto

### 25.1 Pré-fechamento

O sistema deverá executar:

- apuração de todos os vínculos;
- detecção de ocorrências impeditivas;
- reconciliação com afastamentos;
- reconciliação de banco;
- validação de política;
- verificação de integrações;
- comparação com período anterior;
- geração de resumo.

### 25.2 Aprovação

Poderá exigir:

- aprovação do gestor;
- aprovação de DP;
- dupla aprovação para exceções;
- ciência do trabalhador;
- justificativa de pendência não impeditiva.

### 25.3 Fechamento

Deverá gerar:

- snapshot das entradas;
- hash;
- versão da apuração;
- eventos para folha;
- movimentos de banco;
- relatórios;
- outbox de integrações;
- auditoria.

### 25.4 Reabertura

Requisitos:

- capacidade específica;
- motivo;
- período;
- impacto;
- aprovação;
- invalidação lógica do lote anterior;
- nova versão;
- notificação à folha;
- histórico.

---

## 26. Portal do trabalhador

Funcionalidades:

- marcar ponto nos canais permitidos;
- visualizar última marcação;
- acessar comprovantes;
- consultar espelho;
- consultar escala;
- receber alterações;
- solicitar ajuste;
- anexar justificativa;
- acompanhar aprovação;
- contestar resultado;
- consultar banco de horas;
- baixar extrato;
- confirmar ciência;
- consultar políticas aplicáveis em linguagem acessível.

O portal deverá distinguir claramente:

- marcação original;
- marcação tratada;
- solicitação pendente;
- resultado apurado;
- resultado fechado.

---

## 27. Integrações

### 27.1 Contratos

A jornada vigente virá da versão contratual.

### 27.2 Admissão

Ativação poderá criar atribuição inicial de jornada e escala.

### 27.3 Obras

A obra poderá definir contexto planejado e rateio, sem alterar a marcação.

### 27.4 Equipes

Equipe poderá apoiar planejamento e aprovação operacional.

### 27.5 Diário de Obras

Presenças poderão ser comparadas como evidência.

### 27.6 Tarefas

Apontamentos poderão ser reconciliados com horas fechadas.

### 27.7 Férias e afastamentos

Bloquearão ou classificarão turnos conforme vigência.

### 27.8 Folha

Receberá lote fechado, detalhado e idempotente.

### 27.9 Financeiro e custos

Receberá horas e rateios autorizados após fechamento.

### 27.10 eSocial

Alterações da jornada contratual poderão projetar evento aplicável. Marcações diárias não serão tratadas como envio direto ao eSocial sem obrigação específica validada.

### 27.11 Notificações

Eventos relevantes serão publicados em barramento ou outbox.

---

## 28. Permissões

Capacidades sugeridas:

- `view_own_time_records`;
- `create_own_time_mark`;
- `request_time_adjustment`;
- `view_team_schedules`;
- `manage_team_schedules`;
- `view_raw_time_marks`;
- `view_time_location`;
- `manage_time_devices`;
- `review_time_occurrences`;
- `approve_time_adjustments`;
- `approve_overtime`;
- `calculate_time_period`;
- `approve_time_period`;
- `close_time_period`;
- `reopen_time_period`;
- `manage_time_policies`;
- `manage_time_bank_agreements`;
- `adjust_time_bank`;
- `export_time_data`;
- `audit_time_records`;
- `view_sensitive_time_metadata`.

Regras:

- gestor de obra não edita marcação bruta;
- suporte técnico não aprova abono;
- trabalhador não visualiza dados de colegas;
- acesso a localização exige capacidade específica;
- ajuste de banco exige alçada distinta do tratamento comum;
- reabertura não será concedida por permissão genérica de RH.

---

## 29. Auditoria

Eventos mínimos:

- política criada, revisada, aprovada e encerrada;
- escala criada, publicada e alterada;
- turno atribuído, trocado ou cancelado;
- dispositivo ativado, suspenso ou revogado;
- evento recebido e sincronizado;
- comprovante emitido;
- ocorrência criada;
- solicitação apresentada;
- tratamento decidido;
- apuração executada;
- política aplicada;
- banco movimentado;
- período fechado;
- período reaberto;
- exportação realizada;
- localização consultada;
- relatório sensível baixado.

Cada evento deverá registrar:

- organização;
- empresa;
- ator;
- pessoa afetada;
- tipo;
- entidade;
- versão;
- instante;
- origem;
- antes e depois quando aplicável;
- justificativa;
- correlação;
- metadados minimizados.

---

## 30. Alertas e notificações

- turno próximo sem escala publicada;
- trabalhador sem jornada vigente;
- dispositivo offline;
- marcação em quarentena;
- turno aberto por tempo excessivo;
- ocorrência crítica;
- ajuste aguardando análise;
- prazo de tratamento vencendo;
- banco próximo da expiração;
- saldo acima de limite configurado;
- período próximo do fechamento;
- fechamento bloqueado;
- integração com folha rejeitada;
- reabertura solicitada;
- alteração contratual de jornada ainda não refletida na escala.

Canais:

- central interna;
- e-mail;
- push;
- WhatsApp, quando aprovado e adequado;
- tarefa operacional.

---

## 31. Relatórios

- espelho de ponto;
- marcações originais;
- marcações tratadas;
- comprovantes;
- ocorrências por tipo;
- tratamentos por responsável;
- tempo de resolução;
- jornadas por trabalhador;
- escalas publicadas;
- faltas de cobertura;
- horas por obra;
- horas por equipe;
- horas por centro de custo;
- sobrejornada planejada e realizada;
- divergência entre ponto e diário;
- banco de horas por acordo;
- créditos a vencer;
- saldos negativos;
- períodos fechados e reabertos;
- integrações rejeitadas;
- dispositivos e sincronização;
- auditoria de localização;
- relatório de reconstrução de apuração.

Exportações sensíveis deverão ser autorizadas, registradas e minimizadas.

---

## 32. Requisitos funcionais

### RH-M05-FR-001 — Cadastrar política de jornada

O sistema deverá cadastrar política com versão, vigência, escopo, regras e documentos.

### RH-M05-FR-002 — Aprovar política

A política somente poderá ser ativada após validações e aprovação conforme alçada.

### RH-M05-FR-003 — Versionar política

Alteração futura criará nova versão sem modificar cálculos antigos.

### RH-M05-FR-004 — Cadastrar horário diário

O sistema deverá representar segmentos, intervalos e passagem de dia.

### RH-M05-FR-005 — Cadastrar modelo de escala

O sistema deverá suportar ciclos e modelos configuráveis.

### RH-M05-FR-006 — Atribuir jornada ao vínculo

A atribuição deverá possuir vigência e origem contratual.

### RH-M05-FR-007 — Atribuir escala ao trabalhador

O sistema deverá validar conflitos e preservar histórico.

### RH-M05-FR-008 — Gerar turnos

O sistema deverá gerar turnos por ciclo e calendário.

### RH-M05-FR-009 — Publicar escala

Publicação deverá congelar versão e notificar afetados.

### RH-M05-FR-010 — Revisar escala publicada

Revisão deverá criar versão identificada e informar mudanças.

### RH-M05-FR-011 — Solicitar troca de turno

O trabalhador ou gestor autorizado poderá iniciar fluxo de troca.

### RH-M05-FR-012 — Validar troca

O sistema deverá detectar conflitos de jornada, local e disponibilidade.

### RH-M05-FR-013 — Registrar marcação autenticada

O sistema deverá receber marcação com identidade, instante, fuso e origem.

### RH-M05-FR-014 — Registrar marcação offline

O coletor deverá armazenar e sincronizar de modo idempotente.

### RH-M05-FR-015 — Emitir comprovante

O sistema deverá emitir ou disponibilizar comprovante conforme canal aplicável.

### RH-M05-FR-016 — Preservar marcação original

Não deverá existir atualização ou exclusão por fluxo normal.

### RH-M05-FR-017 — Quarentenar evento inválido

Falha técnica deverá preservar evidência recebida para resolução.

### RH-M05-FR-018 — Resolver trabalhador não identificado

Usuário autorizado poderá correlacionar evento sem alterar seu conteúdo bruto.

### RH-M05-FR-019 — Detectar duplicidade

O sistema deverá relacionar possíveis duplicidades e evitar ingestão repetida por idempotência.

### RH-M05-FR-020 — Detectar ocorrência

O motor deverá gerar ocorrência por política e evidência.

### RH-M05-FR-021 — Classificar severidade

A severidade deverá ser configurável e versionada.

### RH-M05-FR-022 — Solicitar ajuste

O trabalhador poderá apresentar solicitação com justificativa e anexos.

### RH-M05-FR-023 — Incluir marcação derivada

Somente tratamento aprovado poderá criar evento derivado para apuração.

### RH-M05-FR-024 — Desconsiderar logicamente marcação

A decisão não poderá remover o evento original.

### RH-M05-FR-025 — Aprovar tratamento

A aprovação deverá guardar responsável, versão, motivo e impacto.

### RH-M05-FR-026 — Rejeitar ou devolver tratamento

A decisão deverá ser motivada e notificada.

### RH-M05-FR-027 — Autorizar sobrejornada

O sistema deverá registrar planejamento e alçada sem bloquear a marcação real.

### RH-M05-FR-028 — Calcular período

O motor deverá executar política versionada sobre entradas identificadas.

### RH-M05-FR-029 — Gerar memória de cálculo

Cada item deverá explicar regra, entradas e resultado.

### RH-M05-FR-030 — Calcular turno noturno e passagem de dia

O motor deverá tratar instantes e faixas conforme política vigente.

### RH-M05-FR-031 — Detectar conflito com férias

O sistema deverá bloquear fechamento ou gerar ocorrência conforme regra.

### RH-M05-FR-032 — Detectar conflito com afastamento

O sistema deverá reconciliar vigências.

### RH-M05-FR-033 — Simular apuração

Usuário autorizado poderá simular sem publicar resultado oficial.

### RH-M05-FR-034 — Reprocessar apuração

Nova execução deverá criar versão e preservar a anterior.

### RH-M05-FR-035 — Cadastrar acordo de banco

O acordo deverá possuir escopo, vigência, instrumento e regras.

### RH-M05-FR-036 — Criar conta individual

A conta será vinculada ao vínculo e ao acordo elegível.

### RH-M05-FR-037 — Lançar crédito

Crédito deverá derivar de apuração ou ajuste aprovado.

### RH-M05-FR-038 — Lançar débito

Débito deverá possuir origem e regra aplicável.

### RH-M05-FR-039 — Compensar movimentos

O sistema deverá relacionar crédito e débito sem editar históricos.

### RH-M05-FR-040 — Expirar crédito

Expiração deverá produzir movimento e efeito conforme política.

### RH-M05-FR-041 — Reverter movimento

Reversão será movimento oposto auditado.

### RH-M05-FR-042 — Consultar extrato

Trabalhador e usuários autorizados poderão consultar razão e saldo.

### RH-M05-FR-043 — Pré-fechar período

O sistema deverá validar trabalhadores, ocorrências, banco e integrações.

### RH-M05-FR-044 — Bloquear fechamento inconsistente

Pendências classificadas como impeditivas impedirão fechamento.

### RH-M05-FR-045 — Fechar período

O fechamento deverá gerar snapshot, hash e lote de integração.

### RH-M05-FR-046 — Reabrir período

Reabertura exigirá permissão, justificativa e aprovação.

### RH-M05-FR-047 — Exportar para folha

A exportação deverá ser versionada, idempotente e reconciliável.

### RH-M05-FR-048 — Integrar com Obras

Horas fechadas poderão ser associadas a obra e rateio sem expor salário.

### RH-M05-FR-049 — Comparar com Diário de Obras

O sistema deverá apresentar divergências como evidência, sem criar ponto automático.

### RH-M05-FR-050 — Integrar com Tarefas

Apontamentos poderão ser comparados às horas fechadas.

### RH-M05-FR-051 — Administrar dispositivos

O sistema deverá ativar, suspender, revogar e auditar coletores.

### RH-M05-FR-052 — Registrar metadados de localização

Somente quando permitido e com acesso segregado.

### RH-M05-FR-053 — Permitir contestação

O trabalhador poderá contestar resultado dentro do fluxo configurado.

### RH-M05-FR-054 — Disponibilizar espelho

O sistema deverá disponibilizar visão original, tratada e fechada conforme permissão.

### RH-M05-FR-055 — Auditar exportações

Toda exportação sensível deverá gerar evento nominal.

### RH-M05-FR-056 — Notificar alterações de escala

Mudanças publicadas deverão notificar trabalhadores afetados.

### RH-M05-FR-057 — Detectar política ausente

O fechamento deverá ser bloqueado quando não for possível determinar a regra aplicável.

### RH-M05-FR-058 — Manter fuso explícito

Eventos e cálculos deverão preservar fuso e instante absoluto.

### RH-M05-FR-059 — Disponibilizar API idempotente

Integrações deverão utilizar autenticação, autorização e chave de repetição.

### RH-M05-FR-060 — Reconstruir período

Auditor autorizado deverá reproduzir o resultado usando versões registradas.

---

## 33. Regras de negócio

### RH-M05-BR-001

Jornada contratual não cria marcação.

### RH-M05-BR-002

Escala planejada não prova trabalho realizado.

### RH-M05-BR-003

Marcação original é imutável.

### RH-M05-BR-004

Tratamento produz evento derivado.

### RH-M05-BR-005

Inclusão manual exige justificativa e autor.

### RH-M05-BR-006

Marcação fora do horário deverá ser recebida e sinalizada.

### RH-M05-BR-007

Falta de autorização de sobrejornada não bloqueará a marcação.

### RH-M05-BR-008

Eventos reenviados com a mesma chave não serão duplicados.

### RH-M05-BR-009

Evento offline manterá hora do fato e hora de sincronização.

### RH-M05-BR-010

Alteração do relógio do dispositivo gerará ocorrência.

### RH-M05-BR-011

Fuso horário será persistido.

### RH-M05-BR-012

Turno atravessando meia-noite pertence a uma data operacional.

### RH-M05-BR-013

Presença no Diário de Obras não cria ponto.

### RH-M05-BR-014

Tempo em tarefa não substitui jornada.

### RH-M05-BR-015

Gestor de obra não altera evento bruto.

### RH-M05-BR-016

Biometria não é obrigatória por padrão.

### RH-M05-BR-017

Geolocalização não será contínua.

### RH-M05-BR-018

Evento fora da geocerca não será descartado.

### RH-M05-BR-019

Política de cálculo possui vigência.

### RH-M05-BR-020

Regra futura não muda período antigo.

### RH-M05-BR-021

Reprocessamento cria nova versão.

### RH-M05-BR-022

Período fechado é imutável por fluxo comum.

### RH-M05-BR-023

Reabertura exige motivo e aprovação.

### RH-M05-BR-024

Banco de horas exige acordo aplicável.

### RH-M05-BR-025

Conta de banco pertence a vínculo e acordo.

### RH-M05-BR-026

Saldo deriva da razão de movimentos.

### RH-M05-BR-027

Movimento postado não é editado.

### RH-M05-BR-028

Reversão produz movimento oposto.

### RH-M05-BR-029

Expiração não apaga crédito histórico.

### RH-M05-BR-030

Compensação relaciona movimentos.

### RH-M05-BR-031

Acordo encerrado não recebe novos fatos posteriores à vigência.

### RH-M05-BR-032

Alteração contratual de jornada deve refletir escala futura ou gerar pendência.

### RH-M05-BR-033

Trabalhador sem login poderá usar coletor autorizado.

### RH-M05-BR-034

Conta de usuário só identifica trabalhador por associação válida.

### RH-M05-BR-035

Localização exige capacidade específica.

### RH-M05-BR-036

Exportação sensível será auditada.

### RH-M05-BR-037

Folha receberá somente lote fechado ou interface explicitamente preliminar.

### RH-M05-BR-038

Folha não recalculará silenciosamente o ponto.

### RH-M05-BR-039

Custo por obra não será tratado como salário.

### RH-M05-BR-040

Política não encontrada bloqueará fechamento.

### RH-M05-BR-041

Erro de integração não apagará o lote de origem.

### RH-M05-BR-042

Aprovação concorrente sobre versão antiga será rejeitada.

### RH-M05-BR-043

Comprovante será correlacionado à marcação.

### RH-M05-BR-044

Marcação importada manterá origem administrativa ou de dispositivo.

### RH-M05-BR-045

Ocorrência resolvida preservará diagnóstico e decisão.

---

## 34. Critérios de aceite

1. Uma marcação não pode ser editada pela interface administrativa.
2. Ajuste aprovado mantém a marcação original visível.
3. Dois envios offline iguais produzem um único evento canônico.
4. Marcação fora do horário é aceita e gera ocorrência.
5. Marcação sem autorização de extra é aceita.
6. Trabalhador recebe confirmação da marcação.
7. Evento com trabalhador não resolvido fica em quarentena.
8. Resolução de quarentena não altera data e hora originais.
9. Escala publicada mantém versão consultável.
10. Troca de turno não altera jornada contratual.
11. Alteração contratual futura gera pendência de escala quando necessário.
12. Turno noturno atravessando data é apurado uma única vez.
13. Férias conflitantes impedem ou sinalizam fechamento conforme política.
14. Diário de Obras divergente gera evidência, não marcação.
15. Tratamento rejeitado não afeta apuração oficial.
16. Tratamento aprovado produz visão derivada.
17. Apuração mostra política e versão utilizadas.
18. Reprocessamento preserva resultado anterior.
19. Política futura não muda apuração fechada.
20. Banco sem acordo válido não recebe movimento automático.
21. Saldo é igual à soma reconciliada dos movimentos válidos.
22. Reversão não edita movimento anterior.
23. Crédito expirado continua no histórico.
24. Extrato mostra vencimentos futuros.
25. Período com ocorrência impeditiva não fecha.
26. Fechamento gera hash e snapshot.
27. Reabertura registra responsável e motivo.
28. Novo fechamento não apaga o anterior.
29. Exportação repetida não duplica eventos na folha.
30. Gestor de obra não visualiza localização detalhada sem permissão.
31. Trabalhador só consulta seus próprios registros.
32. Auditor reproduz o período sem permissão de escrita.
33. Dispositivo revogado não envia novos eventos válidos.
34. Eventos anteriores do dispositivo revogado permanecem consultáveis.
35. Consulta de localização gera auditoria.
36. Exportação de marcações gera auditoria.
37. Falha do coletor pode ser tratada por contingência.
38. Erro de relógio gera ocorrência e preserva evento.
39. Marcação duplicada provável é relacionada, não apagada.
40. Cálculo sem política válida é bloqueado.

---

## 35. Testes obrigatórios

### 35.1 Unidade

- ciclos de escala;
- passagem de dia;
- fusos;
- intervalos;
- idempotência;
- prioridade de políticas;
- razão do banco;
- expiração;
- reversão;
- hashing;
- classificação de ocorrências.

### 35.2 Integração

- contrato para jornada;
- jornada para escala;
- coletor para ingestão;
- ingestão para comprovante;
- tratamento para apuração;
- apuração para banco;
- fechamento para folha;
- fechamento para custos;
- Diário de Obras para reconciliação;
- férias e afastamentos para bloqueio.

### 35.3 Segurança

- isolamento por organização;
- acesso próprio;
- acesso de gestor;
- localização;
- biometria, se adotada;
- exportação;
- assinatura de integração;
- replay;
- dispositivo revogado;
- manipulação de relógio;
- arquivo malformado;
- upload de evidência.

### 35.4 Concorrência

- duas marcações simultâneas;
- reenvio offline;
- duas aprovações;
- fechamento e tratamento simultâneos;
- reabertura e exportação;
- movimentos concorrentes de banco.

### 35.5 Ponta a ponta

- jornada fixa sem ocorrência;
- jornada com marcação faltante;
- turno atravessando meia-noite;
- obra offline;
- troca de turno;
- sobrejornada não planejada;
- banco com compensação;
- crédito expirado;
- fechamento e reabertura;
- alteração contratual no meio do período;
- conflito com férias;
- importação de REP;
- contestação do trabalhador.

---

## 36. Relatórios de conformidade técnica

Quando a modalidade exigir, a implementação deverá prever geração e validação dos arquivos e relatórios oficiais correspondentes, incluindo representações de marcações, tratamento e espelho.

A definição física dos formatos ficará condicionada à revisão da Portaria consolidada, anexos, manuais, requisitos de assinatura e versão vigente no início da implementação.

O produto deverá manter adaptadores por versão, evitando que mudança de leiaute reescreva arquivos históricos.

---

## 37. Requisitos não funcionais

### RH-M05-NFR-001 — Integridade

Marcações e comprovantes deverão possuir controles de integridade adequados ao canal.

### RH-M05-NFR-002 — Disponibilidade

Coletores críticos deverão suportar contingência e sincronização posterior.

### RH-M05-NFR-003 — Desempenho

A marcação deverá responder imediatamente ao trabalhador, sem aguardar apuração completa.

### RH-M05-NFR-004 — Escalabilidade

Ingestão e cálculo deverão suportar processamento por lotes e filas.

### RH-M05-NFR-005 — Reprodutibilidade

Apuração deverá ser determinística para entradas e versões iguais.

### RH-M05-NFR-006 — Observabilidade

Falhas de ingestão, sincronização, cálculo e exportação deverão produzir métricas e correlação.

### RH-M05-NFR-007 — Retenção

Classes de dados terão políticas próprias e preservação legal validada.

### RH-M05-NFR-008 — Privacidade

Localização e biometria terão minimização e acesso segregado.

### RH-M05-NFR-009 — Portabilidade

Integrações com REP utilizarão contratos e adaptadores versionados.

### RH-M05-NFR-010 — Acessibilidade

Portal e quiosque deverão suportar uso acessível e mensagens claras.

### RH-M05-NFR-011 — Internacionalização temporal

Instantes, fusos e calendários deverão ser explícitos.

### RH-M05-NFR-012 — Imutabilidade

Eventos críticos não serão atualizados por operações comuns.

---

## 38. Riscos

| Risco | Consequência | Tratamento |
|---|---|---|
| marcar horário contratual automaticamente | fabricação de evidência | proibir arquitetura e testar negativamente |
| editar ponto bruto | perda de auditabilidade | append-only e tratamento separado |
| relógio offline incorreto | evento temporal duvidoso | armazenar dois instantes e detectar deriva |
| geolocalização excessiva | risco de privacidade | coleta pontual e acesso específico |
| banco apenas com saldo | impossível reconciliar | razão imutável |
| regra legal no código | cálculo histórico instável | política versionada |
| folha recalculando ponto | divergência entre módulos | interface fechada e memória |
| diário usado como ponto | fonte inadequada | apenas evidência de reconciliação |
| fechamento com pendências | pagamento incorreto | gate e severidade |
| escala alterada sem ciência | conflito operacional | publicação versionada e notificação |
| integração dependente de fornecedor | lock-in | adaptadores |
| exposição a gestor de obra | vazamento sensível | permissões granulares |

---

## 39. Sequência recomendada de implementação

### Fase 1 — Fundação temporal

- políticas;
- jornadas;
- horários;
- calendários;
- escalas;
- turnos;
- permissões;
- auditoria.

### Fase 2 — Ingestão

- portal;
- coletor;
- eventos imutáveis;
- idempotência;
- comprovantes;
- offline;
- dispositivos.

### Fase 3 — Tratamento

- ocorrências;
- solicitações;
- aprovações;
- visão tratada;
- portal do trabalhador.

### Fase 4 — Apuração

- políticas de cálculo;
- motor;
- memória;
- simulação;
- reprocessamento.

### Fase 5 — Banco e fechamento

- acordos;
- razão;
- extrato;
- fechamento;
- reabertura;
- folha.

### Fase 6 — Integrações avançadas

- REP;
- Obras;
- Diário;
- Tarefas;
- custos;
- relatórios oficiais;
- homologação.

---

## 40. Gates antes de implementar

- revisão jurídica dos regimes do público inicial;
- revisão do instrumento coletivo aplicável;
- decisão sobre REP próprio ou integração;
- definição de biometria e localização;
- política de retenção;
- modelo de assinatura;
- contrato com folha;
- inventário das obras com operação offline;
- reconciliação com usuários e trabalhadores;
- reconciliação com `project_teams` e Diário de Obras;
- modelo físico aprovado;
- threat model;
- testes com dados sintéticos;
- CI estrutural da base regularizado.

---

## 41. Estado honesto

Este documento define comportamento funcional e fronteiras. Não foram implementados:

- tabelas;
- migrations;
- rotas;
- coletores;
- aplicativos;
- integrações REP;
- cálculos;
- banco de horas;
- fechamento;
- exportação para folha;
- relatórios oficiais;
- homologação legal ou técnica.

A próxima etapa funcional recomendada é **Férias, Afastamentos e Ausências**, pois esses eventos interferem diretamente na escala, no ponto, na apuração e na folha.
