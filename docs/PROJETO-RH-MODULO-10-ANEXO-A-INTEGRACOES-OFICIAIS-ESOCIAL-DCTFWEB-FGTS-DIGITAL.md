# Projeto RH — Módulo 10 — Anexo A — Integrações Oficiais eSocial, DCTFWeb e FGTS Digital

**Versão:** 0.1.0  
**Estado:** especificação funcional/técnica detalhada; implementação pendente  
**Baseline oficial:** 7 de agosto de 2026

## 1. Princípio

Não existe uma única “API governamental da folha”. O Projeto RH deve usar o canal oficial adequado a cada sistema e manter adapters independentes.

```text
Folha / RH canônicos
  ├─ eSocial Adapter → Web Services oficiais eSocial
  ├─ DCTFWeb Adapter → integração automática por apuração + canais oficiais/Integra Contador quando contratados e suportados
  └─ FGTS Digital Adapter → reconciliação das bases originadas no eSocial + funcionalidades/canais oficiais disponíveis
```

Nenhum scraper de portal será tratado como integração oficial por padrão.

## 2. eSocial — fluxo funcional completo

### 2.1 Fontes canônicas internas

| Família | Origem interna principal |
|---|---|
| empregador/estabelecimento/obra | M02 |
| rubricas | M09 |
| lotações tributárias | M02/M09 |
| admissão e preliminar | M03 |
| alterações cadastrais | M01/M03 |
| alterações contratuais | M04 |
| afastamentos | M06 |
| CAT/SST/monitoramento | M08 |
| desligamento/reintegração | M11 |
| trabalhador sem vínculo | M01/M04 |
| remuneração | M09 |
| pagamentos | M09/Financeiro |
| processos trabalhistas | módulo/caso específico quando implementado |

### 2.2 Pipeline obrigatório

```text
fato interno aprovado
→ verificar aplicabilidade do evento
→ resolver versão do leiaute/XSD
→ resolver dependências aceitas
→ montar payload canônico
→ serializar XML na versão oficial
→ validar XSD
→ executar regras internas prévias
→ assinar digitalmente conforme contrato oficial
→ formar lote compatível
→ transmitir ao Web Service oficial
→ receber protocolo
→ persistir protocolo e hash
→ consultar resultado do processamento do lote
→ normalizar ocorrências
→ receber/persistir recibo do evento aceito
→ atualizar projeção externa
→ reconciliar retorno/totalizadores
```

### 2.3 Web Services

O adapter deve possuir contratos separados para:

- envio de lote de eventos;
- consulta do resultado do processamento de lote.

A documentação oficial vigente do eSocial deve ser carregada como configuração de ambiente. URLs, WSDLs, certificados, TLS e schemas não serão espalhados em código de domínio.

Ambientes:
- produção restrita;
- produção.

Filas, certificados e idempotency namespaces serão segregados por ambiente.

### 2.4 Assinatura digital

O serviço de assinatura deve receber XML canônico final e identidade autorizada e devolver:
- documento assinado;
- certificado/fingerprint usado;
- instante;
- hash pré e pós-assinatura;
- resultado da validação.

A chave privada não é persistida no banco do RH.

### 2.5 Protocolo e recibo

**Protocolo** identifica o lote recebido para processamento e deve permitir consulta posterior.

**Recibo de entrega do evento** comprova o processamento/aceite do evento conforme retorno do eSocial.

O sistema não pode marcar `ACCEPTED` apenas porque recebeu protocolo de lote.

### 2.6 Estados do evento

```text
DRAFT
→ VALIDATED
→ APPROVED
→ QUEUED
→ BATCHED
→ SENT
→ PROTOCOL_RECEIVED
→ PROCESSING
→ ACCEPTED
```

Alternativos:

```text
WARNING
REJECTED
TECHNICAL_FAILURE
UNKNOWN_EXTERNAL_STATE
RECTIFICATION_REQUIRED
EXCLUSION_REQUIRED
SUPERSEDED
```

### 2.7 Erros e advertências

Cada ocorrência externa terá:
- código oficial;
- mensagem original protegida;
- classificação interna;
- campo/grupo afetado quando identificável;
- evento;
- trabalhador/empregador;
- causa provável apenas quando comprovável;
- ação recomendada;
- owner;
- estado.

`WARNING` não será convertido automaticamente em erro; `REJECTED` não poderá ser ignorado para fechamento se o evento for obrigatório.

## 3. Catálogo de eventos eSocial por função

O catálogo real será importado/versionado a partir do leiaute oficial. A baseline atual deve mapear, entre outros:

### 3.1 Tabelas

- S-1000 — informações do empregador/contribuinte;
- S-1005 — estabelecimentos/obras ou unidades;
- S-1010 — tabela de rubricas;
- S-1020 — lotações tributárias;
- S-1070 — processos administrativos/judiciais quando aplicável.

### 3.2 Não periódicos

- S-2190 — registro preliminar quando usado;
- S-2200 — admissão/ingresso;
- S-2205 — alteração de dados cadastrais;
- S-2206 — alteração contratual;
- S-2210 — CAT;
- S-2220 — monitoramento da saúde;
- S-2221 — exame toxicológico quando aplicável;
- S-2230 — afastamento temporário;
- S-2240 — condições ambientais/agentes nocivos;
- S-2298 — reintegração;
- S-2299 — desligamento;
- S-2300 — início de trabalhador sem vínculo;
- S-2306 — alteração de trabalhador sem vínculo;
- S-2399 — término de trabalhador sem vínculo;
- S-2500/S-2501 — processos trabalhistas/tributos quando o escopo correspondente for implementado;
- S-3000/S-3500 — exclusões admitidas conforme família.

### 3.3 Periódicos

- S-1200 — remuneração de trabalhador vinculado ao RGPS, conforme aplicabilidade;
- demais eventos de remuneração por categoria/regime previstos na versão vigente;
- S-1210 — pagamentos de rendimentos do trabalho;
- S-1280 — informações complementares dos eventos periódicos quando aplicável;
- S-1298 — reabertura;
- S-1299 — fechamento.

### 3.4 Totalizadores

- S-5001 — contribuições sociais por trabalhador;
- S-5002 — IRRF por trabalhador;
- S-5003 — FGTS por trabalhador;
- S-5011 — contribuições sociais consolidadas;
- S-5012 — IRRF consolidado;
- S-5013 — FGTS consolidado;
- totalizadores de processos trabalhistas aplicáveis.

A lista acima é baseline funcional, não substitui o catálogo oficial versionado.

## 4. Retificação, exclusão e reabertura no eSocial

### 4.1 Correção antes do envio

Nova projeção interna; nenhuma operação externa.

### 4.2 Reenvio técnico

Mesmo evento lógico/payload após erro de transporte ou quando a consulta oficial comprovar que não houve processamento. Deve usar idempotência e controle de estado indeterminado.

### 4.3 Retificação

```text
erro no fato/origem
→ corrigir domínio responsável
→ recalcular impacto
→ nova projeção retificadora
→ validar/aprovar
→ transmitir
→ guardar relação original ↔ retificador
→ reconciliar totalizadores
```

### 4.4 Exclusão

Somente quando admitida pelo leiaute/regras. É evento/operação própria; nunca `DELETE` da linha interna.

### 4.5 Período fechado

Quando a correção exigir período aberto:

```text
solicitar correção
→ avaliar impacto
→ aprovar reabertura interna
→ projetar/transmitir S-1298
→ aguardar aceite
→ retificar/excluir/incluir eventos necessários
→ reconciliar
→ projetar/transmitir novo S-1299
→ aguardar aceite/totalizadores
→ reconciliar obrigações derivadas
```

## 5. DCTFWeb — relação funcional real

### 5.1 O que o sistema NÃO deve fazer

- não “calcular uma DCTFWeb paralela” como se fosse a Receita;
- não editar internamente um débito externo para fazer a reconciliação fechar;
- não presumir que S-1299 aceito significa DCTFWeb já transmitida;
- não tratar DARF emitido como pago.

### 5.2 Formação da declaração

A Receita informa que a integração das escriturações com a DCTFWeb ocorre automaticamente após transmissão e processamento com sucesso dos eventos de encerramento do eSocial e/ou EFD-Reinf. A DCTFWeb consolida as apurações recebidas.

Fluxo interno:

```text
eSocial fechado com sucesso
+ EFD-Reinf fechada quando aplicável
+ MIT/Sero/outros componentes quando aplicáveis
→ aguardar/sinalizar atualização DCTFWeb
→ consultar/registrar declaração em andamento
→ comparar totalizadores internos × apurações recebidas
→ transmitir declaração pelo canal oficial autorizado
→ registrar recibo
→ obter débitos/saldos/documentos disponíveis
→ gerar/registrar DARF
→ Financeiro paga
→ consultar/registrar pagamento
→ reconciliar
```

### 5.3 Correção de débito originado no eSocial

```text
divergência na DCTFWeb
→ localizar apuração de origem
→ se origem eSocial: reabrir período eSocial
→ corrigir fato/rubrica/remuneração
→ retificar eventos
→ fechar novamente
→ aguardar nova apuração sensibilizar DCTFWeb
→ nova declaração/retificadora conforme estado anterior
→ reconciliar
```

Não criar “ajuste DCTFWeb” para esconder erro de folha.

### 5.4 Adapter DCTFWeb

O adapter terá capabilities separadas e só habilitará as que o canal contratado/oficial suportar:

- receber evento/sinal de atualização da declaração;
- listar declarações;
- consultar declaração/apurações/débitos;
- transmitir quando o serviço oficial contratado suportar e estiver autorizado;
- consultar recibo/status;
- obter documentos/relatórios permitidos;
- consultar pagamentos por canal oficial correlato.

O SERPRO Integra Contador possui integração com DCTFWeb e eventos de atualização. A adoção exige contratação, autenticação, procuração, escopo e testes; não será presumida como disponível.

## 6. Estados internos da DCTFWeb

```text
AWAITING_ESOCIAL_CLOSE
AWAITING_REINF_CLOSE
AWAITING_EXTERNAL_UPDATE
IN_PROGRESS
READY_FOR_REVIEW
READY_FOR_TRANSMISSION
TRANSMITTED
RECTIFICATION_IN_PROGRESS
RECONCILING
RECONCILED
```

Alternativos:

```text
DIVERGENT
OVERDUE
EXTERNAL_UNAVAILABLE
MANUAL_ACTION_REQUIRED
```

O estado interno é projeção observável, nunca substitui o estado oficial.

## 7. DCTFWeb — conferências

Por período:
- total CP segurados por eSocial;
- total CP patronal/terceiros/RAT quando aplicável;
- totalizadores por contribuinte;
- apuração EFD-Reinf quando aplicável;
- MIT quando aplicável;
- débitos mostrados na declaração;
- créditos/vinculações importados quando o canal permitir;
- saldo;
- DARF;
- pagamento.

Toda diferença deve apontar dimensão e origem.

## 8. FGTS Digital — relação funcional real

### 8.1 Origem da base mensal

O FGTS Digital utiliza as remunerações declaradas no eSocial. O totalizador S-5003 contém informações do FGTS por trabalhador e é uma referência central para a reconciliação individual.

O fechamento mensal do eSocial não é requisito para cada remuneração aparecer no FGTS Digital; a alimentação ocorre a partir das remunerações transmitidas/processadas.

### 8.2 Correção de base mensal

A base mensal não será “corrigida no FGTS Digital”.

```text
divergência FGTS trabalhador
→ localizar rubrica/remuneração no eSocial
→ corrigir natureza/incidência/fato na origem
→ retificar S-1010 quando necessário
→ retificar remunerações afetadas
→ aguardar reprocessamento/atualização
→ consultar novamente FGTS Digital
→ reconciliar
```

Alterar somente a validade futura de uma rubrica não corrige eventos históricos já processados.

### 8.3 Conferências

O sistema deverá conferir:
- empregado/vínculo;
- competência;
- estabelecimento/inscrição;
- base interna de FGTS;
- base S-5003;
- base/débito do FGTS Digital disponível;
- tipo de débito;
- vencimento;
- guia;
- pagamento;
- saldo.

### 8.4 Rescisão

Para desligamentos:

```text
cálculo rescisório interno
→ S-2299/S-2399 e remunerações aplicáveis
→ bases/totalizadores FGTS
→ FGTS Digital / Remunerações para Fins Rescisórios quando necessário
→ recompor histórico ausente permitido
→ calcular/confirmar indenização compensatória no fluxo oficial
→ gerar guia
→ pagar
→ reconciliar trabalhador, competência e guia
```

O sistema deve suportar o leiaute oficial de importação de remunerações para fins rescisórios se esse canal continuar vigente na versão implantada.

### 8.5 Competências anteriores

Manter dimensão `reference_competence` separada da competência de declaração/recolhimento quando o FGTS Digital apresentar débitos complementares ou informações de períodos anteriores.

### 8.6 Processos trabalhistas

Quando o módulo de processos estiver implementado, as bases originadas em eventos específicos do eSocial devem permanecer segregadas e reconciliadas com os débitos correspondentes do FGTS Digital.

## 9. Estados de guia FGTS

```text
NOT_AVAILABLE
AVAILABLE
SELECTED_FOR_GUIDE
GUIDE_ISSUED
AWAITING_PAYMENT
PAID
PARTIALLY_PAID
OVERDUE
REPLACED
CANCELLED
REFUND_REQUESTED
REFUNDED
```

O sistema não inventará baixa: `PAID` exige retorno/consulta/evidência suficiente.

## 10. Matriz de reconciliação ponta a ponta

| Camada | Fonte A | Fonte B | Chave principal |
|---|---|---|---|
| remuneração | cálculo M09 | evento eSocial | trabalhador + vínculo + competência + demonstrativo |
| CP trabalhador | base M09 | S-5001 | trabalhador + período |
| IRRF trabalhador | base M09 | S-5002 | trabalhador + período/pagamento |
| FGTS trabalhador | base M09 | S-5003 | trabalhador + competência |
| CP contribuinte | total M09 | S-5011 | empregador + período |
| IRRF contribuinte | total M09 | S-5012 | empregador + período |
| FGTS contribuinte | total M09 | S-5013 | empregador + período |
| DCTFWeb | totalizadores eSocial/Reinf | declaração DCTFWeb | contribuinte + período |
| arrecadação federal | débito DCTFWeb | DARF/pagamento | documento + código/débito |
| FGTS Digital | S-5003/base | débito/guia FGTS | trabalhador + competência + tipo |

## 11. Observabilidade

Cada integração deve expor, sem payload sensível em log:
- fila pendente;
- idade do evento mais antigo;
- latência envio→protocolo;
- latência protocolo→processamento;
- taxa de rejeição;
- erros técnicos;
- estado indeterminado;
- divergências abertas;
- prazo mais próximo;
- certificado/procuração a vencer;
- última sincronização DCTFWeb/FGTS.

## 12. Baseline oficial utilizada

Em 7 de agosto de 2026 foram verificadas:

- eSocial — Documentação Técnica S-1.3 até NT 06/2026 e Manual do Desenvolvedor 1.15;
- ambiente de Produção Restrita do eSocial, que publica Web Services de envio e consulta;
- Tabela 03 e regras oficiais do eSocial;
- Receita Federal — página/manual/perguntas da DCTFWeb e orientação de 2026 de integração automática após fechamento bem-sucedido da escrituração;
- SERPRO — Integra Contador e eventos de atualização DCTFWeb;
- MTE — Manual do FGTS Digital 1.70 de 12/06/2026 e perguntas frequentes;
- leiaute de importação de Remunerações para Fins Rescisórios vigente no portal do FGTS Digital.

Endpoints, métodos, schemas e capabilities deverão ser lidos da documentação oficial vigente no momento da implementação. Este anexo não autoriza transmissão real.
