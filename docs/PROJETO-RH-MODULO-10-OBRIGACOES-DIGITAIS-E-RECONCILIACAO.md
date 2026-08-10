# Projeto RH — Módulo 10 — Obrigações Digitais, Eventos Trabalhistas, Totalizadores e Reconciliação Governamental

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Objetivo

Definir o contexto funcional responsável por transformar fatos internos aprovados em obrigações digitais rastreáveis, transmitir projeções aos sistemas externos, acompanhar processamento, receber totalizadores, controlar fechamentos e reconciliar débitos, guias e pagamentos.

O módulo deverá permitir responder, com evidências:

1. qual fato originou cada obrigação;
2. qual regra e versão determinou o envio;
3. qual payload foi aprovado e transmitido;
4. quais tentativas ocorreram;
5. qual recibo e retorno foram recebidos;
6. quais totalizadores foram produzidos;
7. quais divergências existem entre sistema interno e externo;
8. qual declaração ou débito foi constituído;
9. quais guias foram emitidas;
10. quais valores foram efetivamente pagos ou continuam pendentes.

---

## 2. Escopo

### 2.1 Incluído

- catálogo de sistemas, obrigações, eventos e leiautes;
- matriz de aplicabilidade por empresa, inscrição, vínculo, período e fato;
- calendário de prazos versionado;
- projeção de eventos a partir dos módulos de origem;
- validação estrutural, semântica e de dependências;
- aprovação e segregação de funções;
- filas, lotes, idempotência e tentativas;
- certificados, procurações e ambientes;
- retornos, recibos, advertências e rejeições;
- eventos de tabelas, não periódicos, periódicos, SST e processos;
- exclusões, retificações, reaberturas e fechamentos;
- totalizadores por trabalhador e contribuinte;
- integração eSocial → DCTFWeb;
- integração eSocial → FGTS Digital;
- referências de EFD-Reinf e MIT para reconciliação da DCTFWeb;
- débitos, guias, pagamentos e saldos;
- contingência e indisponibilidade externa;
- dashboards, alertas, auditoria e dossiês.

### 2.2 Fora do primeiro corte técnico

- interpretação jurídica automatizada sem responsável;
- transmissão real antes de homologação;
- emissão de certificado digital;
- escrituração completa da EFD-Reinf;
- preenchimento integral do MIT;
- decisão automática sobre compensação, suspensão ou restituição;
- pagamento autônomo de guias;
- alteração direta de débitos derivados na DCTFWeb;
- robô de navegação sem contrato oficial e controles;
- substituição de portal governamental ou de sistema contábil especializado.

---

## 3. Princípios

1. Fato interno e evento externo são objetos distintos.
2. Projeções serão reproduzíveis e versionadas.
3. Payload aprovado não será sobrescrito.
4. Tentativa de transmissão será append-only.
5. Recibo não equivale a quitação.
6. Totalizador não substitui memória interna.
7. Correção ocorrerá no nível de origem adequado.
8. Produção e produção restrita serão segregadas.
9. Certificados e segredos terão proteção específica.
10. Fechamento dependerá de evidências e bloqueadores explícitos.
11. Reabertura não apagará o fechamento anterior.
12. Divergências permanecerão abertas até resolução documentada.
13. Sistemas externos não controlarão diretamente os domínios internos.
14. Prazos, códigos e regras serão configuráveis por vigência.
15. Nenhum pagamento será presumido.

---

## 4. Perfis

### Administrador de obrigações

Configura sistemas, leiautes, regras, ambientes, certificados e permissões.

### Analista de Departamento Pessoal

Prepara eventos trabalhistas, acompanha pendências e trata rejeições.

### Operador de folha

Valida eventos periódicos, totalizadores e diferenças com a folha.

### Analista fiscal ou contábil

Reconcilia DCTFWeb, EFD-Reinf, MIT, DARF e lançamentos.

### Analista de FGTS

Reconcilia débitos individualizados, guias, pagamentos e restituições.

### Responsável por SST

Acompanha eventos S-2210, S-2220, S-2221 e S-2240 sem acesso indevido a dados clínicos.

### Aprovador

Autoriza transmissão, fechamento, reabertura, retificação e exclusão conforme alçada.

### Auditor

Consulta fatos, payloads, hashes, acessos, transmissões, recibos e reconciliações.

### Serviço de integração

Executa filas e consultas com identidade técnica limitada e sem acesso interativo amplo.

---

## 5. Rotas previstas

```text
/app/rh/obrigacoes
/app/rh/obrigacoes/painel
/app/rh/obrigacoes/calendario
/app/rh/obrigacoes/pendencias
/app/rh/obrigacoes/eventos
/app/rh/obrigacoes/eventos/[id]
/app/rh/obrigacoes/lotes
/app/rh/obrigacoes/lotes/[id]
/app/rh/obrigacoes/periodos
/app/rh/obrigacoes/periodos/[id]
/app/rh/obrigacoes/totalizadores
/app/rh/obrigacoes/reconciliacao
/app/rh/obrigacoes/reconciliacao/[id]
/app/rh/obrigacoes/dctfweb
/app/rh/obrigacoes/fgts-digital
/app/rh/obrigacoes/guias
/app/rh/obrigacoes/pagamentos
/app/rh/obrigacoes/contingencias
/app/rh/obrigacoes/certificados
/app/rh/obrigacoes/auditoria
/app/rh/obrigacoes/configuracoes
```

---

## 6. Entidades conceituais

Nomes provisórios:

- `digital_obligation_systems`;
- `digital_obligation_types`;
- `digital_event_catalog`;
- `digital_layout_versions`;
- `digital_rule_versions`;
- `digital_deadline_calendars`;
- `digital_obligations`;
- `digital_event_projections`;
- `digital_event_dependencies`;
- `digital_event_validations`;
- `digital_event_approvals`;
- `digital_transmission_batches`;
- `digital_transmission_attempts`;
- `digital_processing_returns`;
- `digital_receipts`;
- `digital_periods`;
- `digital_period_closures`;
- `digital_period_reopenings`;
- `digital_correction_cases`;
- `digital_totalizer_snapshots`;
- `digital_totalizer_items`;
- `government_declarations`;
- `government_debts`;
- `government_guides`;
- `government_guide_debts`;
- `government_payments`;
- `government_payment_allocations`;
- `government_reconciliation_cases`;
- `government_reconciliation_items`;
- `digital_certificates`;
- `digital_authorizations`;
- `digital_contingency_cases`;
- `digital_audit_events`.

---

## 7. Catálogo de sistemas e eventos

Cada sistema deverá registrar:

- nome e órgão;
- ambientes;
- canais permitidos;
- autenticação;
- certificados aceitos;
- limites técnicos;
- janelas de manutenção;
- política de retry;
- documentação de referência;
- versões suportadas;
- estado operacional.

Cada tipo de evento deverá registrar:

- código;
- família;
- periodicidade;
- sujeito;
- inscrição de referência;
- origem interna;
- leiaute;
- dependências;
- prazo;
- operação permitida;
- necessidade de aprovação;
- totalizadores esperados;
- impacto em fechamento.

---

## 8. Famílias de eventos do eSocial

### Tabelas

Incluem, conforme aplicabilidade e versão vigente:

- empregador ou contribuinte;
- estabelecimentos e obras;
- rubricas;
- lotações tributárias;
- processos administrativos ou judiciais.

### Não periódicos

Incluem:

- registro preliminar e admissão;
- alterações cadastrais e contratuais;
- CAT, saúde e condições ambientais;
- afastamentos;
- reintegração;
- desligamento;
- trabalhadores sem vínculo;
- processos trabalhistas;
- exclusões.

### Periódicos

Incluem:

- remunerações;
- pagamentos;
- informações complementares;
- benefícios quando aplicáveis;
- reabertura;
- fechamento.

### Totalizadores

Incluem snapshots:

- contribuições sociais por trabalhador;
- IRRF por trabalhador;
- FGTS por trabalhador;
- contribuições consolidadas;
- IRRF consolidado;
- FGTS consolidado;
- tributos e FGTS de processos trabalhistas.

O catálogo deverá ser atualizado por versão sem apagar eventos históricos.

---

## 9. Obras, CNO e inscrições

Obra interna, estabelecimento e inscrição externa permanecerão distintos.

O módulo deverá:

- relacionar obra a empresa, estabelecimento e CNO quando aplicável;
- permitir múltiplas fases e períodos de inscrição;
- validar inscrição vigente na data do fato;
- impedir uso silencioso de CNPJ quando o evento exigir CNO;
- preservar a inscrição utilizada em cada evento;
- alertar obra ativa sem mapeamento necessário;
- reconciliar lotação tributária, centro de custo e contexto de obra sem unificá-los.

---

## 10. Obrigação e prazo

### Estados

```text
IDENTIFICADA
  → AGUARDANDO_DADOS
  → AGUARDANDO_DEPENDENCIA
  → PRONTA_PARA_PROJECAO
  → EM_PREPARACAO
  → PRONTA_PARA_ENVIO
  → CUMPRIDA
```

Alternativos:

```text
BLOQUEADA
VENCIDA
DISPENSADA_COM_JUSTIFICATIVA
CANCELADA
EM_CONTINGENCIA
REABERTA
```

O prazo será calculado por regra versionada e poderá considerar:

- data do fato;
- competência;
- tipo de evento;
- calendário nacional e local;
- antecipação ou prorrogação oficial;
- categoria do empregador;
- situação especial;
- evento predecessor.

Alteração da regra não mudará silenciosamente prazos históricos já calculados.

---

## 11. Projeção

### Estados

```text
RASCUNHO
  → VALIDANDO
  → VALIDADA
  → EM_APROVACAO
  → APROVADA
  → ENFILEIRADA
  → TRANSMITIDA
  → ACEITA
```

Alternativos:

```text
AGUARDANDO_DEPENDENCIA
BLOQUEADA
REJEITADA
SUPERADA
CANCELADA
RETIFICACAO_NECESSARIA
EXCLUSAO_NECESSARIA
```

### Conteúdo mínimo

- organização e empregador;
- sistema e ambiente;
- tipo e operação;
- sujeito;
- período ou data do fato;
- origem interna;
- snapshots;
- versão do leiaute;
- payload canônico;
- representação serializada;
- hash;
- chave idempotente;
- validações;
- dependências;
- aprovadores;
- nível de confidencialidade.

---

## 12. Validação

### Estrutural

- esquema;
- tipos;
- tamanho;
- formato;
- cardinalidade;
- caracteres;
- versão.

### Semântica

- inscrição;
- trabalhador;
- vínculo;
- datas;
- rubricas;
- lotações;
- categorias;
- códigos externos;
- coerência de valores.

### Temporal

- vigência do cadastro;
- ordem entre eventos;
- período aberto ou fechado;
- prazo;
- data de efeito;
- versões anteriores e futuras.

### Dependências

- tabela aceita;
- admissão anterior;
- evento predecessor;
- folha aprovada;
- pagamento existente;
- certificado válido;
- inscrição habilitada;
- ambiente disponível.

Advertências não impeditivas e erros impeditivos serão separados.

---

## 13. Aprovação

A política poderá exigir:

- aprovação única;
- dupla aprovação;
- aprovador diferente do preparador;
- aprovação por lote;
- aprovação individual para evento crítico;
- aprovação fiscal para fechamento;
- aprovação jurídica para processo;
- aprovação de SST para CAT ou exposição;
- reaprovação após qualquer mudança de hash.

A aprovação guardará o hash exato, escopo, data, usuário e justificativa.

---

## 14. Lotes e filas

Um lote poderá agrupar eventos compatíveis por:

- empregador;
- ambiente;
- tipo ou família;
- período;
- certificado;
- prioridade.

O sistema deverá controlar:

- limite de eventos;
- tamanho máximo;
- ordem causal;
- rate limit;
- backoff;
- prioridade;
- retry;
- timeout;
- cancelamento antes do envio;
- isolamento de evento inválido;
- retomada após falha parcial.

Falha de um evento não alterará silenciosamente eventos já aceitos.

---

## 15. Tentativas e retornos

### Estados da tentativa

```text
CRIADA
  → CONECTANDO
  → ENVIADA
  → AGUARDANDO_RESPOSTA
  → RESPOSTA_RECEBIDA
```

Resultados:

```text
ACEITA
REJEITADA_NEGOCIO
ERRO_TECNICO
TIMEOUT
CANCELADA
RESPOSTA_INDETERMINADA
```

Cada tentativa guardará:

- projeção e lote;
- instante;
- endpoint lógico;
- ambiente;
- certificado utilizado;
- identificador externo;
- request hash;
- status técnico;
- retorno bruto protegido;
- códigos e mensagens normalizadas;
- duração;
- correlação;
- operador ou serviço.

---

## 16. Recibos e processamento assíncrono

O módulo deverá suportar:

- recibo imediato;
- protocolo para consulta posterior;
- polling controlado;
- callback validado;
- resposta parcial;
- processamento ainda pendente;
- resultado indeterminado após timeout;
- consulta manual autorizada;
- deduplicação de retornos.

Recibo e payload terão hashes e armazenamento protegido.

---

## 17. Retificação, exclusão e reenvio

### Reenvio

Mesmo conteúdo, normalmente após falha técnica ou resposta indeterminada.

### Retificação

Novo conteúdo, relacionado ao evento anterior e sujeito às regras do sistema.

### Exclusão

Operação própria que referencia recibo ou identidade externa, sem apagar a origem interna.

### Estados do caso de correção

```text
ABERTO
  → IMPACTOS_IDENTIFICADOS
  → AGUARDANDO_REABERTURA
  → EM_PREPARACAO
  → EM_APROVACAO
  → EM_EXECUCAO
  → AGUARDANDO_REFECHAMENTO
  → RECONCILIADO
```

Alternativos:

```text
BLOQUEADO
REJEITADO
CANCELADO
ESCALADO
```

---

## 18. Períodos, fechamento e reabertura

### Estados do período

```text
ABERTO
  → COLETANDO
  → EM_PRE_FECHAMENTO
  → PRONTO_PARA_FECHAR
  → FECHANDO
  → FECHADO
  → RECONCILIANDO
  → RECONCILIADO
```

Alternativos:

```text
BLOQUEADO
REABERTURA_PENDENTE
REABRINDO
REABERTO
RETIFICANDO
NOVO_FECHAMENTO_PENDENTE
```

### Pré-fechamento

Verificará:

- eventos periódicos esperados;
- eventos rejeitados;
- trabalhadores sem remuneração justificada;
- pagamentos pendentes;
- tabelas inconsistentes;
- totalizadores ausentes;
- divergências acima da tolerância;
- certificado;
- procuração;
- prazo;
- integrações de folha;
- impacto de EFD-Reinf quando disponível.

### Fechamento

- exigirá aprovação;
- usará snapshot de pendências;
- será idempotente;
- bloqueará operações incompatíveis;
- manterá recibo e totalizadores relacionados;
- não transmitirá DCTFWeb automaticamente sem etapa própria.

### Reabertura

- exigirá motivo e impacto;
- preservará o fechamento anterior;
- bloqueará novo fechamento concorrente;
- criará caso de correção;
- exigirá reconciliação após o novo fechamento.

---

## 19. Totalizadores

Cada snapshot deverá guardar:

- sistema;
- tipo;
- empregador;
- inscrição;
- período;
- trabalhador quando aplicável;
- recibos ou fechamento de origem;
- data da consulta;
- payload bruto protegido;
- itens normalizados;
- hash;
- versão;
- relação com snapshot anterior.

O módulo comparará:

- bases previdenciárias;
- contribuições do segurado;
- contribuições patronais;
- terceiros;
- RAT e ajustes quando aplicáveis;
- IRRF;
- FGTS mensal;
- FGTS rescisório;
- processos trabalhistas;
- totais por trabalhador;
- totais por estabelecimento;
- totais por contribuinte.

---

## 20. Reconciliação

### Estados do item

```text
PENDENTE
CORRESPONDENTE
DIVERGENTE
AUSENTE_INTERNO
AUSENTE_EXTERNO
DUPLICADO
FORA_DE_ESCOPO
EM_INVESTIGACAO
RESOLVIDO
ACEITO_COM_JUSTIFICATIVA
```

### Causas normalizadas

- evento ausente;
- evento rejeitado;
- versão divergente;
- rubrica ou incidência;
- inscrição ou lotação;
- trabalhador ou vínculo;
- data ou competência;
- arredondamento;
- múltiplos vínculos;
- pagamento fora do período;
- retificação pendente;
- fechamento desatualizado;
- EFD-Reinf ou MIT ainda não encerrado;
- débito suspenso ou parcelado;
- guia parcial;
- retorno bancário ausente;
- indisponibilidade externa.

Cada resolução terá causa, ação, responsável, evidência e impacto.

---

## 21. DCTFWeb

A DCTFWeb será modelada como declaração externa derivada das apurações recebidas.

O módulo deverá registrar:

- período e categoria da declaração;
- apuração do eSocial;
- referência da EFD-Reinf;
- referência do MIT quando aplicável;
- estado da declaração;
- original ou retificadora;
- data de transmissão;
- recibo;
- débitos;
- créditos e vinculações quando importados;
- saldo a pagar;
- DARFs;
- pagamentos;
- pendências;
- relação com declaração substituída.

A integração automática entre escrituração encerrada e DCTFWeb será monitorada. Divergência deverá ser corrigida na escrituração de origem apropriada, não por edição fictícia do débito interno.

---

## 22. FGTS Digital

O módulo deverá suportar:

- remunerações declaradas por trabalhador;
- débitos individualizados;
- competências;
- categorias de débito;
- valores mensais e rescisórios;
- débitos de processos trabalhistas;
- acréscimos;
- guias rápidas e parametrizadas quando importadas;
- múltiplas competências na mesma guia;
- pagamento por PIX ou canal vigente;
- liquidação;
- saldo;
- restituição, estorno, parcelamento ou suspensão como estados externos;
- notificações e débitos confessados quando aplicáveis.

Pagamento direto ao trabalhador não será tratado como quitação do débito de FGTS.

---

## 23. Guias e pagamentos

### Estados da guia

```text
EM_PREPARACAO
EMITIDA
A_VENCER
VENCIDA
PARCIALMENTE_PAGA
PAGA
CANCELADA
SUBSTITUIDA
EM_RESTITUICAO
```

### Pagamento

Deverá registrar:

- guia;
- ordem financeira;
- banco e canal;
- identificador;
- valor;
- data;
- comprovante;
- retorno;
- alocação por débito;
- saldo;
- estorno;
- reconciliação contábil.

Comprovante anexado não será aceito automaticamente sem validação prevista.

---

## 24. Certificados e procurações

O módulo deverá controlar:

- titular;
- empregador autorizado;
- tipo;
- número de série;
- emissor;
- início e fim de validade;
- ambientes permitidos;
- sistemas permitidos;
- local seguro da chave;
- rotação;
- revogação;
- procuração relacionada;
- testes de autenticação;
- alertas de vencimento.

A chave privada não será exibida ou exportada pelo módulo.

---

## 25. Contingência

Um caso de contingência deverá registrar:

- sistema e ambiente afetados;
- início e fim;
- fonte da indisponibilidade;
- obrigações afetadas;
- prazos;
- fila acumulada;
- decisão operacional;
- canal alternativo autorizado;
- comunicações;
- evidências;
- regularização posterior;
- validação de duplicidade.

A contingência não autoriza transmissão para destino não homologado.

---

## 26. Permissões

- `obligations.view_dashboard`;
- `obligations.manage_catalog`;
- `obligations.manage_rules`;
- `obligations.manage_deadlines`;
- `obligations.view_events`;
- `obligations.prepare_events`;
- `obligations.validate_events`;
- `obligations.approve_events`;
- `obligations.transmit_events`;
- `obligations.retry_transmission`;
- `obligations.request_rectification`;
- `obligations.approve_rectification`;
- `obligations.request_exclusion`;
- `obligations.approve_exclusion`;
- `obligations.close_period`;
- `obligations.reopen_period`;
- `obligations.view_totalizers`;
- `obligations.manage_reconciliation`;
- `obligations.view_dctfweb`;
- `obligations.manage_dctfweb_evidence`;
- `obligations.view_fgts`;
- `obligations.manage_guides`;
- `obligations.reconcile_payments`;
- `obligations.manage_certificates_metadata`;
- `obligations.use_certificate`;
- `obligations.manage_contingency`;
- `obligations.export_sensitive_payload`;
- `obligations.audit`.

Gerenciar metadados do certificado não concede acesso à chave privada.

---

## 27. Requisitos funcionais

### Governança e catálogo

**RH-M10-FR-001.** Cadastrar sistemas externos e ambientes.  
**RH-M10-FR-002.** Versionar leiautes e esquemas.  
**RH-M10-FR-003.** Cadastrar tipos de obrigação e evento.  
**RH-M10-FR-004.** Configurar origem interna por evento.  
**RH-M10-FR-005.** Configurar aplicabilidade por empregador e inscrição.  
**RH-M10-FR-006.** Configurar operações de inclusão, retificação e exclusão.  
**RH-M10-FR-007.** Configurar dependências e ordem causal.  
**RH-M10-FR-008.** Versionar regras de prazo.  
**RH-M10-FR-009.** Configurar tolerâncias de reconciliação.  
**RH-M10-FR-010.** Manter fontes oficiais e data de verificação.

### Inscrições e contexto

**RH-M10-FR-011.** Relacionar empresa, estabelecimento, CNPJ, CPF e CNO.  
**RH-M10-FR-012.** Relacionar obra interna a inscrições externas por vigência.  
**RH-M10-FR-013.** Validar lotação tributária aplicável.  
**RH-M10-FR-014.** Preservar inscrição usada em cada projeção.  
**RH-M10-FR-015.** Alertar inscrição ausente ou vencida.  
**RH-M10-FR-016.** Suportar múltiplos empregadores na organização.  
**RH-M10-FR-017.** Segregar eventos por contribuinte.  
**RH-M10-FR-018.** Consultar contexto vigente em uma data.  
**RH-M10-FR-019.** Detectar inconsistência entre obra e CNO.  
**RH-M10-FR-020.** Impedir substituição silenciosa de inscrição.

### Obrigações e calendário

**RH-M10-FR-021.** Identificar obrigação a partir de fato aprovado.  
**RH-M10-FR-022.** Calcular prazo com regra versionada.  
**RH-M10-FR-023.** Aplicar calendários e prorrogações.  
**RH-M10-FR-024.** Registrar responsável e criticidade.  
**RH-M10-FR-025.** Controlar dependências.  
**RH-M10-FR-026.** Sinalizar obrigação a vencer.  
**RH-M10-FR-027.** Escalonar obrigação vencida.  
**RH-M10-FR-028.** Permitir dispensa justificada e aprovada.  
**RH-M10-FR-029.** Reabrir obrigação após novo fato.  
**RH-M10-FR-030.** Gerar calendário consolidado.

### Projeção e validação

**RH-M10-FR-031.** Projetar evento a partir de snapshots internos.  
**RH-M10-FR-032.** Registrar versão de cada origem.  
**RH-M10-FR-033.** Gerar payload canônico e serializado.  
**RH-M10-FR-034.** Calcular hash e chave idempotente.  
**RH-M10-FR-035.** Validar esquema.  
**RH-M10-FR-036.** Validar semântica.  
**RH-M10-FR-037.** Validar temporalidade.  
**RH-M10-FR-038.** Validar dependências externas aceitas.  
**RH-M10-FR-039.** Separar erro e advertência.  
**RH-M10-FR-040.** Gerar nova projeção sem apagar anterior.

### Aprovação e filas

**RH-M10-FR-041.** Configurar alçadas por evento.  
**RH-M10-FR-042.** Vincular aprovação ao hash.  
**RH-M10-FR-043.** Invalidar aprovação após mudança.  
**RH-M10-FR-044.** Impedir autoaprovação quando proibida.  
**RH-M10-FR-045.** Criar lotes compatíveis.  
**RH-M10-FR-046.** Preservar ordem causal.  
**RH-M10-FR-047.** Controlar prioridade.  
**RH-M10-FR-048.** Aplicar limite e rate limit.  
**RH-M10-FR-049.** Isolar evento inválido.  
**RH-M10-FR-050.** Retomar lote após falha parcial.

### Transmissão e retorno

**RH-M10-FR-051.** Registrar tentativa append-only.  
**RH-M10-FR-052.** Usar ambiente e certificado autorizados.  
**RH-M10-FR-053.** Registrar request hash e correlação.  
**RH-M10-FR-054.** Tratar timeout como resultado indeterminado.  
**RH-M10-FR-055.** Executar retry idempotente.  
**RH-M10-FR-056.** Receber retorno síncrono.  
**RH-M10-FR-057.** Consultar processamento assíncrono.  
**RH-M10-FR-058.** Validar callback.  
**RH-M10-FR-059.** Normalizar códigos e mensagens.  
**RH-M10-FR-060.** Preservar retorno bruto protegido.

### Recibos, correções e exclusões

**RH-M10-FR-061.** Armazenar recibo com integridade.  
**RH-M10-FR-062.** Relacionar recibo ao payload.  
**RH-M10-FR-063.** Preparar reenvio técnico.  
**RH-M10-FR-064.** Abrir caso de retificação.  
**RH-M10-FR-065.** Calcular impactos da retificação.  
**RH-M10-FR-066.** Preparar exclusão permitida.  
**RH-M10-FR-067.** Preservar evento excluído no histórico.  
**RH-M10-FR-068.** Bloquear correção incompatível com período fechado.  
**RH-M10-FR-069.** Relacionar evento original, retificador e exclusão.  
**RH-M10-FR-070.** Auditar aprovação e execução da correção.

### Períodos e fechamento

**RH-M10-FR-071.** Criar período por empregador e competência.  
**RH-M10-FR-072.** Executar checklist de pré-fechamento.  
**RH-M10-FR-073.** Detectar eventos esperados ausentes.  
**RH-M10-FR-074.** Bloquear fechamento com impeditivos.  
**RH-M10-FR-075.** Aprovar fechamento.  
**RH-M10-FR-076.** Transmitir fechamento idempotente.  
**RH-M10-FR-077.** Registrar recibo e totalizadores.  
**RH-M10-FR-078.** Abrir reabertura com motivo.  
**RH-M10-FR-079.** Controlar novo fechamento.  
**RH-M10-FR-080.** Preservar todas as versões do período.

### Totalizadores e reconciliação

**RH-M10-FR-081.** Importar totalizador por trabalhador.  
**RH-M10-FR-082.** Importar totalizador consolidado.  
**RH-M10-FR-083.** Versionar snapshots de consulta.  
**RH-M10-FR-084.** Comparar bases internas e externas.  
**RH-M10-FR-085.** Comparar contribuições e FGTS.  
**RH-M10-FR-086.** Comparar IRRF.  
**RH-M10-FR-087.** Classificar divergência.  
**RH-M10-FR-088.** Abrir caso de investigação.  
**RH-M10-FR-089.** Registrar resolução e evidência.  
**RH-M10-FR-090.** Reconciliar por trabalhador e contribuinte.

### DCTFWeb

**RH-M10-FR-091.** Registrar declaração por período.  
**RH-M10-FR-092.** Relacionar apurações eSocial e EFD-Reinf.  
**RH-M10-FR-093.** Relacionar MIT quando aplicável.  
**RH-M10-FR-094.** Registrar original e retificadora.  
**RH-M10-FR-095.** Registrar transmissão e recibo.  
**RH-M10-FR-096.** Importar débitos.  
**RH-M10-FR-097.** Importar DARFs e saldos.  
**RH-M10-FR-098.** Detectar declaração não sensibilizada.  
**RH-M10-FR-099.** Relacionar nova apuração à retificadora.  
**RH-M10-FR-100.** Reconciliar DCTFWeb com totalizadores.

### FGTS Digital, guias e pagamentos

**RH-M10-FR-101.** Importar débitos individualizados de FGTS.  
**RH-M10-FR-102.** Relacionar débito a trabalhador e competência.  
**RH-M10-FR-103.** Suportar débito mensal, rescisório e judicial.  
**RH-M10-FR-104.** Registrar guia com múltiplos débitos.  
**RH-M10-FR-105.** Registrar vencimento e acréscimos.  
**RH-M10-FR-106.** Relacionar ordem financeira.  
**RH-M10-FR-107.** Importar retorno de pagamento.  
**RH-M10-FR-108.** Suportar pagamento parcial.  
**RH-M10-FR-109.** Registrar estorno, restituição ou parcelamento externo.  
**RH-M10-FR-110.** Reconciliar saldo de FGTS.

### Segurança, contingência e auditoria

**RH-M10-FR-111.** Cadastrar metadados de certificado.  
**RH-M10-FR-112.** Controlar validade e revogação.  
**RH-M10-FR-113.** Segregar produção e produção restrita.  
**RH-M10-FR-114.** Auditar uso do certificado.  
**RH-M10-FR-115.** Abrir caso de contingência.  
**RH-M10-FR-116.** Identificar obrigações impactadas.  
**RH-M10-FR-117.** Retomar fila sem duplicar eventos.  
**RH-M10-FR-118.** Exportar dossiê autorizado.  
**RH-M10-FR-119.** Gerar painel de saúde das integrações.  
**RH-M10-FR-120.** Preservar trilha completa de acesso e alteração.

---

## 28. Regras de negócio

**RH-M10-BR-001.** Fato interno não será alterado por retorno externo.  
**RH-M10-BR-002.** Projeção identifica versões de origem.  
**RH-M10-BR-003.** Payload aprovado é imutável.  
**RH-M10-BR-004.** Mudança de conteúdo cria nova projeção.  
**RH-M10-BR-005.** Tentativa não será apagada.  
**RH-M10-BR-006.** Recibo não significa pagamento.  
**RH-M10-BR-007.** Totalizador não substitui memória da folha.  
**RH-M10-BR-008.** Guia não substitui débito.  
**RH-M10-BR-009.** Emissão não significa liquidação.  
**RH-M10-BR-010.** Produção e teste não compartilham fila.

**RH-M10-BR-011.** Certificado vencido bloqueia envio.  
**RH-M10-BR-012.** Bloqueio de certificado não apaga obrigação.  
**RH-M10-BR-013.** Chave privada não será exibida.  
**RH-M10-BR-014.** Aprovação é vinculada ao hash.  
**RH-M10-BR-015.** Alteração invalida aprovação.  
**RH-M10-BR-016.** Autoaprovação sensível é proibida.  
**RH-M10-BR-017.** Dependência ausente bloqueia envio.  
**RH-M10-BR-018.** Advertência não bloqueia salvo política.  
**RH-M10-BR-019.** Erro impeditivo não aceita override comum.  
**RH-M10-BR-020.** Inscrição usada fica historizada.

**RH-M10-BR-021.** Obra não será confundida com estabelecimento.  
**RH-M10-BR-022.** CNO será validado por vigência.  
**RH-M10-BR-023.** Lotação não será inferida sem regra.  
**RH-M10-BR-024.** Prazo guarda versão de cálculo.  
**RH-M10-BR-025.** Nova regra não reescreve prazo histórico.  
**RH-M10-BR-026.** Dispensa exige fundamento e aprovação.  
**RH-M10-BR-027.** Obrigação vencida permanece aberta.  
**RH-M10-BR-028.** Novo fato pode reabrir obrigação.  
**RH-M10-BR-029.** Chave idempotente é única no escopo.  
**RH-M10-BR-030.** Timeout não será presumido como rejeição.

**RH-M10-BR-031.** Resposta indeterminada exige consulta antes de novo conteúdo.  
**RH-M10-BR-032.** Retry do mesmo payload não é retificação.  
**RH-M10-BR-033.** Retificação preserva evento anterior.  
**RH-M10-BR-034.** Exclusão externa preserva origem interna.  
**RH-M10-BR-035.** Correção em período fechado exige fluxo aplicável.  
**RH-M10-BR-036.** Reabertura preserva fechamento anterior.  
**RH-M10-BR-037.** Novo fechamento é nova evidência.  
**RH-M10-BR-038.** Fechamento simultâneo é proibido.  
**RH-M10-BR-039.** Reabertura e fechamento concorrentes são proibidos.  
**RH-M10-BR-040.** Período fechado bloqueia operações incompatíveis.

**RH-M10-BR-041.** Evento rejeitado permanece auditável.  
**RH-M10-BR-042.** Mensagem externa não muda outro domínio diretamente.  
**RH-M10-BR-043.** Callback deve ser autenticado.  
**RH-M10-BR-044.** Retorno duplicado será deduplicado.  
**RH-M10-BR-045.** Totalizador será snapshot imutável.  
**RH-M10-BR-046.** Nova consulta cria nova versão de snapshot.  
**RH-M10-BR-047.** Divergência acima da tolerância bloqueia reconciliação.  
**RH-M10-BR-048.** Item resolvido exige evidência.  
**RH-M10-BR-049.** Aceite com justificativa exige alçada.  
**RH-M10-BR-050.** Camadas de reconciliação são independentes.

**RH-M10-BR-051.** Fechamento do eSocial não transmite DCTFWeb por si no sistema interno.  
**RH-M10-BR-052.** DCTFWeb é derivada das escriturações aplicáveis.  
**RH-M10-BR-053.** Correção derivada ocorre na origem adequada.  
**RH-M10-BR-054.** DCTFWeb retificadora relaciona declaração anterior.  
**RH-M10-BR-055.** EFD-Reinf ausente pode bloquear reconciliação global.  
**RH-M10-BR-056.** MIT não será duplicado pelo núcleo de RH.  
**RH-M10-BR-057.** DARF emitido não significa pago.  
**RH-M10-BR-058.** Pagamento parcial mantém saldo.  
**RH-M10-BR-059.** Pagamento sem guia será investigado.  
**RH-M10-BR-060.** Estorno não apaga pagamento anterior.

**RH-M10-BR-061.** FGTS Digital deriva remunerações do eSocial.  
**RH-M10-BR-062.** Débito de FGTS será individualizável.  
**RH-M10-BR-063.** Guia pode agregar competências sem perder origem.  
**RH-M10-BR-064.** Pagamento direto ao trabalhador não quita FGTS.  
**RH-M10-BR-065.** Processo trabalhista terá origem segregada.  
**RH-M10-BR-066.** Restituição e parcelamento são estados externos distintos.  
**RH-M10-BR-067.** Guia substituída permanece no histórico.  
**RH-M10-BR-068.** Acréscimos não alteram principal histórico.  
**RH-M10-BR-069.** Retorno financeiro não cria evento trabalhista.  
**RH-M10-BR-070.** Financeiro não altera totalizador externo.

**RH-M10-BR-071.** Contingência tem período e evidência.  
**RH-M10-BR-072.** Contingência não autoriza endpoint alternativo não homologado.  
**RH-M10-BR-073.** Retomada verifica duplicidade.  
**RH-M10-BR-074.** Segredo não será registrado em log.  
**RH-M10-BR-075.** Payload sensível terá exportação restrita.  
**RH-M10-BR-076.** Auditoria registra consulta e download.  
**RH-M10-BR-077.** Serviço técnico terá privilégio mínimo.  
**RH-M10-BR-078.** Regra externa será revalidada antes da produção.  
**RH-M10-BR-079.** Homologação não autoriza produção automaticamente.  
**RH-M10-BR-080.** Falha externa não apaga fato ou obrigação.

---

## 29. Relatórios e painéis

- obrigações por prazo e estado;
- eventos preparados, aceitos e rejeitados;
- rejeições por código e origem;
- filas e tempos de processamento;
- certificados e procurações a vencer;
- períodos abertos, fechados e reabertos;
- totalizadores ausentes;
- divergências por trabalhador, rubrica e inscrição;
- DCTFWeb por estado e saldo;
- DARFs a vencer e vencidos;
- débitos e guias do FGTS;
- pagamentos não reconciliados;
- contingências e backlog;
- retificações e exclusões;
- trilha de transmissão e aprovação.

---

## 30. Alertas

- obrigação próxima do prazo;
- obrigação vencida;
- dependência ausente;
- certificado a vencer;
- procuração inválida;
- evento rejeitado;
- timeout indeterminado;
- fila parada;
- fechamento bloqueado;
- período reaberto sem novo fechamento;
- totalizador não recebido;
- divergência acima da tolerância;
- DCTFWeb não sensibilizada;
- declaração retificadora pendente;
- guia próxima do vencimento;
- guia vencida;
- pagamento sem retorno;
- débito de FGTS não individualizado;
- indisponibilidade oficial;
- contingência sem regularização.

---

## 31. Não funcionais

- isolamento por organização e contribuinte;
- disponibilidade independente do sistema externo;
- filas duráveis e outbox;
- idempotência;
- consistência temporal;
- criptografia em trânsito e repouso;
- cofre de segredos;
- hashes de payloads e recibos;
- retenção configurável;
- observabilidade sem dados pessoais em logs;
- rastreamento distribuído com correlação;
- recuperação de desastre;
- rate limiting;
- circuit breaker;
- backoff exponencial;
- processamento em lote escalável;
- suporte a grandes volumes de trabalhadores;
- testes de contrato por versão;
- acessibilidade;
- exportação controlada;
- auditoria imutável.

---

## 32. Cenários pessimistas

1. evento enviado ao ambiente errado;
2. certificado vencido no dia do prazo;
3. timeout após aceite externo;
4. callback duplicado;
5. fechamento com evento rejeitado;
6. reabertura sem novo fechamento;
7. totalizador divergente por rubrica;
8. trabalhador duplicado;
9. obra associada ao CNO errado;
10. pagamento declarado sem remuneração correspondente;
11. DCTFWeb não atualizada após fechamento;
12. EFD-Reinf ainda aberta;
13. guia emitida duas vezes;
14. pagamento parcial tratado como total;
15. PIX pago sem retorno;
16. retificação após notificação externa;
17. exclusão bloqueada por evento posterior;
18. fila retoma e duplica lote;
19. chave privada aparece em log;
20. indisponibilidade prolongada no prazo.

Cada cenário deverá possuir prevenção, detecção, contenção, auditoria e recuperação.

---

## 33. Critérios de aceite

1. fato interno permanece mesmo sem conexão externa;
2. obrigação mostra regra e prazo utilizados;
3. projeção mostra todas as versões de origem;
4. payload aprovado possui hash;
5. alteração cria nova projeção;
6. tentativa rejeitada permanece no histórico;
7. retry não duplica evento lógico;
8. timeout é tratado como indeterminado;
9. callback duplicado não duplica recibo;
10. certificado vencido impede envio;
11. produção restrita não usa fila de produção;
12. obra e CNO são consultáveis por data;
13. dependência ausente bloqueia evento;
14. aprovação é invalidada por mudança;
15. lote preserva ordem causal;
16. falha parcial não perde eventos aceitos;
17. recibo mantém integridade;
18. retificação referencia evento anterior;
19. exclusão não apaga fato interno;
20. período fechado bloqueia operação incompatível;
21. reabertura preserva fechamento anterior;
22. novo fechamento gera nova evidência;
23. totalizador por trabalhador é importado;
24. totalizador consolidado é importado;
25. snapshot anterior não é sobrescrito;
26. divergência informa valores e dimensões;
27. resolução exige evidência;
28. reconciliação de eventos é independente da financeira;
29. DCTFWeb relaciona eSocial e EFD-Reinf;
30. declaração retificadora preserva a anterior;
31. débito não é alterado diretamente para esconder divergência;
32. DARF emitido permanece pendente até pagamento;
33. pagamento parcial mantém saldo;
34. ordem financeira é vinculada ao retorno;
35. FGTS é reconciliado por trabalhador;
36. guia com múltiplas competências preserva cada débito;
37. guia substituída permanece consultável;
38. pagamento direto ao trabalhador não baixa FGTS;
39. processo trabalhista possui origem separada;
40. contingência lista obrigações afetadas;
41. retomada consulta duplicidade;
42. segredo não aparece em logs;
43. exportação sensível é auditada;
44. operador não acessa chave privada;
45. painel mostra fila e indisponibilidade;
46. alerta de prazo usa calendário vigente;
47. alteração normativa cria nova versão;
48. produção exige homologação e autorização;
49. dossiê contém fato, payload, tentativa, recibo e reconciliação;
50. auditor identifica quem aprovou e transmitiu;
51. evento rejeitado pode ser corrigido sem apagar evidência;
52. fechamento não presume DCTFWeb transmitida;
53. totalizador não modifica a folha;
54. retorno bancário não modifica evento trabalhista;
55. nenhuma integração real é liberada apenas pela existência desta especificação.

---

## 34. Testes previstos

### Unitários

- prazos;
- chaves idempotentes;
- dependências;
- normalização de retorno;
- tolerâncias;
- estados;
- hashes;
- reconciliação.

### Contrato

- esquemas por versão;
- payloads válidos e inválidos;
- códigos de retorno;
- callbacks;
- polling;
- limites de lote.

### Integração

- admissão até recibo;
- folha até totalizador;
- fechamento até DCTFWeb;
- remuneração até FGTS;
- guia até pagamento;
- reabertura e retificação.

### Segurança

- segregação entre organizações;
- acesso a payload sensível;
- uso de certificado;
- injeção de callback;
- replay;
- vazamento em logs;
- privilégios do serviço.

### Concorrência

- fechamento simultâneo;
- retry duplicado;
- callback simultâneo;
- reabertura concorrente;
- duas guias para o mesmo débito;
- dois retornos de pagamento.

### Ponta a ponta

- admissão com rejeição e retificação;
- folha fechada e reconciliada;
- reabertura após diferença;
- DCTFWeb retificadora;
- FGTS com guia multi-competência;
- contingência e retomada sem duplicidade.

---

## 35. Sequência sugerida de implementação

1. catálogos, inscrições e ambientes;
2. cofre e metadados de certificados;
3. obrigações e calendário;
4. projeções e validações;
5. aprovações;
6. outbox, filas e tentativas;
7. retornos e recibos;
8. eventos de tabelas e não periódicos;
9. periódicos e fechamento;
10. retificação e exclusão;
11. totalizadores;
12. reconciliação;
13. DCTFWeb;
14. FGTS Digital;
15. guias e pagamentos;
16. contingência, relatórios e auditoria;
17. homologação externa;
18. piloto controlado;
19. autorização formal de produção.

---

## 36. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas:

- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- eventos S-1298, S-1299, S-3000 e totalizadores S-5001, S-5002, S-5003, S-5011, S-5012 e S-5013;
- eventos de processos trabalhistas e respectivos totalizadores;
- regras de envio durante o processamento do fechamento;
- regras de exclusão de eventos periódicos em períodos fechados;
- orientações da Receita Federal publicadas em 2026 sobre integração automática de eSocial e EFD-Reinf com a DCTFWeb;
- página e manual da DCTFWeb;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- comunicados de 2026 sobre recolhimentos decorrentes de processos trabalhistas.

A baseline confirma que o encerramento bem-sucedido das escriturações sensibiliza automaticamente a DCTFWeb; que correções em escriturações encerradas exigem reabertura, retificação e novo encerramento; e que o FGTS Digital utiliza remunerações declaradas no eSocial para individualizar débitos e gerar guias.

Leiautes, regras, endpoints, certificados, prazos e interpretações deverão ser novamente verificados antes da implementação, homologação e produção.

---

## 37. Estado honesto

Este documento é especificação funcional.

Não foram implementados:

- tabelas;
- migrations;
- conectores;
- certificados;
- filas;
- payloads;
- validações de esquema;
- transmissão;
- fechamento;
- totalizadores;
- DCTFWeb;
- FGTS Digital;
- guias;
- pagamentos;
- reconciliação;
- testes externos.

Nenhum envio real está autorizado por este documento.
