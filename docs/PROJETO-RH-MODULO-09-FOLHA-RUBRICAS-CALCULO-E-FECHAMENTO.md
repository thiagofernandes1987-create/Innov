# Projeto RH — Módulo 09 — Folha de Pagamento, Rubricas, Bases, Fórmulas, Cálculo e Fechamento

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Objetivo

Definir o contexto funcional de Folha de Pagamento da Innovar Platform para suportar, com cálculo reproduzível e auditável:

- competências mensais e processamentos especiais;
- população de trabalhadores por ciclo;
- catálogo e versões de rubricas;
- fórmulas e parâmetros temporais;
- entradas originadas nos demais módulos;
- cálculo de proventos, descontos, bases, encargos e líquido;
- múltiplos vínculos, rateios e centros de custo;
- demonstrativos e memória de cálculo;
- conferência, aprovação, fechamento e reabertura;
- pagamentos e conciliação financeira;
- eventos periódicos do eSocial;
- integração com FGTS Digital, obrigações e Contabilidade;
- retroatividades, folhas complementares e retificações;
- segurança de dados salariais e segregação de funções.

O módulo deverá permitir responder, com evidência reproduzível:

1. quais vínculos fizeram parte de cada folha;
2. quais fatos e versões cadastrais foram utilizados;
3. qual rubrica, fórmula e parâmetro gerou cada valor;
4. quais bases e incidências foram afetadas;
5. quais ajustes manuais foram aplicados e aprovados;
6. qual resultado foi aprovado e fechado;
7. quanto era devido, quanto foi pago e quanto foi declarado;
8. quais eventos externos foram enviados, aceitos ou retificados;
9. como os custos foram distribuídos por empresa, estabelecimento, obra e centro de custo;
10. qual versão permanece válida após reabertura ou recálculo.

---

## 2. Escopo

### 2.1 Incluído na especificação funcional

- calendários e competências;
- tipos de processamento;
- ciclos e máquinas de estado;
- população congelada e cortes;
- catálogo de rubricas;
- versões, incidências e mapeamentos externos;
- motor declarativo de fórmulas;
- tabelas e parâmetros por vigência;
- importação e geração de entradas;
- folha mensal;
- adiantamento;
- férias;
- décimo terceiro;
- folha complementar e diferenças;
- verbas variáveis, comissões e produção configuráveis;
- proventos, descontos, informativas, bases e encargos;
- múltiplos vínculos e acumulados;
- pensões, benefícios e descontos recorrentes;
- rateios por obra e centro de custo;
- cálculo individual e em lote;
- memória de cálculo e explicabilidade;
- ajustes manuais controlados;
- conferência e aprovação;
- fechamento e reabertura;
- demonstrativos e portal do trabalhador;
- ordens de pagamento e retorno bancário;
- contabilização e provisões;
- eventos S-1010, S-1200, S-1210, S-1298 e S-1299;
- totalizadores e reconciliações;
- segurança, auditoria e testes.

### 2.2 Fora do primeiro corte técnico

- aconselhamento jurídico ou tributário automatizado;
- alteração automática de incidência com base em IA;
- execução de código livre em fórmulas;
- transmissão para produção antes de homologação formal;
- substituição de sistema bancário ou contábil;
- emissão de parecer fiscal;
- cálculo de processo trabalhista sem módulo específico;
- cálculo definitivo de rescisão antes do Módulo de Desligamentos;
- folha internacional;
- decisão automática sobre enquadramento sindical;
- alteração de valores fechados sem reabertura;
- uso de planilhas como fonte oficial final.

---

## 3. Princípios

1. Folha é cálculo reproduzível, não tabela mutável.
2. Fato de origem, entrada, rubrica e resultado são objetos diferentes.
3. Rubrica possui identidade estável e versões por vigência.
4. Fórmula possui versão, testes e aprovação.
5. Parâmetros legais não serão fixados no código.
6. Resultado anterior nunca será sobrescrito.
7. Ajuste manual será explícito e segregado.
8. Valor devido e pagamento efetivo serão separados.
9. Evento externo será projeção, não fonte única.
10. Fechamento será explícito, atômico e auditável.
11. Reabertura criará nova versão e preservará a anterior.
12. Cálculo parcial não poderá parecer folha completa.
13. Arredondamento será regra versionada.
14. Totais deverão reconciliar em todos os níveis.
15. Dados salariais terão acesso mínimo necessário.

---

## 4. Perfis de usuário

### 4.1 Administrador de Folha

- configura calendários, rubricas, fórmulas e parâmetros;
- administra integrações e permissões;
- não aprova sozinho mudanças sensíveis quando houver segregação configurada.

### 4.2 Analista de Departamento Pessoal

- prepara entradas;
- executa simulações;
- trata pendências;
- confere demonstrativos;
- prepara eventos externos.

### 4.3 Especialista de Folha

- publica versões de rubricas;
- valida fórmulas e incidências;
- analisa diferenças e retroatividades;
- autoriza cálculos oficiais conforme alçada.

### 4.4 Aprovador

- revisa totais, exceções, ajustes e evidências;
- aprova ou rejeita fechamento;
- não modifica entradas durante a aprovação.

### 4.5 Financeiro

- recebe ordens de pagamento aprovadas;
- executa ou concilia pagamentos;
- não altera a memória da folha.

### 4.6 Contabilidade

- consulta lançamentos e rateios;
- valida contas e centros de custo;
- não modifica o demonstrativo do trabalhador.

### 4.7 Gestor de obra

- consulta custos agregados e rateios autorizados;
- não acessa salário individual por padrão.

### 4.8 Trabalhador

- consulta demonstrativos liberados;
- confirma ciência;
- solicita esclarecimento ou correção;
- não altera resultado diretamente.

### 4.9 Auditor

- consulta versões, cálculos, aprovações, transmissões e acessos;
- recebe dados individualizados apenas quando autorizado.

---

## 5. Rotas e telas previstas

```text
/app/departamento-pessoal/folha
/app/departamento-pessoal/folha/painel
/app/departamento-pessoal/folha/competencias
/app/departamento-pessoal/folha/competencias/[id]
/app/departamento-pessoal/folha/ciclos/[id]
/app/departamento-pessoal/folha/ciclos/[id]/populacao
/app/departamento-pessoal/folha/ciclos/[id]/entradas
/app/departamento-pessoal/folha/ciclos/[id]/calculos
/app/departamento-pessoal/folha/ciclos/[id]/conferencia
/app/departamento-pessoal/folha/ciclos/[id]/fechamento
/app/departamento-pessoal/folha/demonstrativos/[id]
/app/departamento-pessoal/folha/rubricas
/app/departamento-pessoal/folha/rubricas/[id]
/app/departamento-pessoal/folha/formulas
/app/departamento-pessoal/folha/parametros
/app/departamento-pessoal/folha/ajustes
/app/departamento-pessoal/folha/pagamentos
/app/departamento-pessoal/folha/eventos-digitais
/app/departamento-pessoal/folha/reconciliacoes
/app/departamento-pessoal/folha/relatorios
/app/departamento-pessoal/folha/configuracoes
/app/trabalhador/demonstrativos
```

---

## 6. Entidades conceituais

Os nomes técnicos são provisórios.

### 6.1 Calendário e ciclo

- `payroll_calendars`;
- `payroll_periods`;
- `payroll_cycles`;
- `payroll_cycle_versions`;
- `payroll_population_snapshots`;
- `payroll_population_members`;
- `payroll_cutoff_rules`.

### 6.2 Rubricas, fórmulas e parâmetros

- `payroll_earning_deduction_codes`;
- `payroll_rubric_versions`;
- `payroll_formula_definitions`;
- `payroll_formula_versions`;
- `payroll_formula_dependencies`;
- `payroll_parameter_sets`;
- `payroll_parameter_versions`;
- `payroll_external_mappings`;
- `payroll_rounding_rules`.

### 6.3 Entradas e fatos

- `payroll_source_facts`;
- `payroll_input_batches`;
- `payroll_inputs`;
- `payroll_input_reversals`;
- `payroll_accumulator_imports`;
- `payroll_manual_adjustments`.

### 6.4 Cálculo

- `payroll_calculation_runs`;
- `payroll_worker_calculations`;
- `payroll_calculation_lines`;
- `payroll_calculation_bases`;
- `payroll_employer_charges`;
- `payroll_calculation_traces`;
- `payroll_calculation_messages`;
- `payroll_calculation_hashes`.

### 6.5 Aprovação e fechamento

- `payroll_review_tasks`;
- `payroll_approvals`;
- `payroll_closures`;
- `payroll_reopenings`;
- `payroll_reconciliation_cases`.

### 6.6 Pagamento e integração

- `payroll_payment_orders`;
- `payroll_payment_items`;
- `payroll_payment_events`;
- `payroll_bank_return_items`;
- `payroll_accounting_batches`;
- `payroll_accounting_entries`;
- `payroll_government_events`;
- `payroll_external_totals`.

---

## 7. Calendário e competência

### 7.1 Competência

Campos mínimos:

- organização;
- empresa empregadora;
- tipo de processamento;
- período de apuração;
- início e fim de referência;
- data de corte;
- data prevista de cálculo;
- data prevista de pagamento;
- calendário bancário;
- situação;
- regras e parâmetros aplicáveis.

### 7.2 Tipos

- mensal;
- adiantamento;
- férias;
- décimo terceiro — adiantamento;
- décimo terceiro — quitação;
- complementar;
- diferença retroativa;
- rescisória;
- simulação;
- extraordinária configurada.

### 7.3 Regras

- tipos diferentes não compartilharão estado sem vínculo explícito;
- competência de referência não será confundida com data de pagamento;
- ciclo poderá abranger empresa inteira ou subconjunto autorizado;
- calendários serão versionados;
- datas vencidas gerarão alerta, não alteração automática do histórico.

---

## 8. Máquina de estados do ciclo

```text
RASCUNHO
  → CONFIGURANDO
  → COLETANDO_ENTRADAS
  → ENTRADAS_CONGELADAS
  → CALCULANDO
  → CALCULADA
  → EM_CONFERENCIA
  → COM_PENDENCIAS
  → AGUARDANDO_APROVACAO
  → APROVADA
  → FECHANDO
  → FECHADA
  → PAGAMENTO_EM_PREPARACAO
  → PAGAMENTO_PROCESSADO
  → RECONCILIADA
```

Estados alternativos:

```text
CANCELADA
FALHA_DE_CALCULO
REABERTURA_SOLICITADA
REABERTA
SUBSTITUIDA
```

### Regras

- ciclo fechado não aceita nova entrada;
- falha de um trabalhador não será ocultada por sucesso do lote;
- aprovação exige versão exata da execução;
- fechamento exige ausência de pendências impeditivas;
- reabertura exige motivo, permissão e impacto registrado.

---

## 9. População da folha

A população será formada por regras versionadas e depois congelada.

### 9.1 Fontes

- vínculos ativos ou com fato relevante;
- admissões no período;
- desligamentos no período;
- férias e afastamentos;
- trabalhadores sem vínculo quando aplicável;
- vínculos com diferenças retroativas;
- inclusões e exclusões manuais autorizadas.

### 9.2 Dados congelados

- pessoa e trabalhador;
- vínculo e matrícula;
- empresa, estabelecimento e lotação;
- categoria e regime;
- contrato e remuneração vigentes;
- sindicato ou instrumento aplicável quando configurado;
- jornada;
- dependentes relevantes;
- rateios;
- situação no período;
- motivo de inclusão.

### 9.3 Regras

- alteração após o corte não modifica silenciosamente a população;
- inclusão manual exige motivo;
- exclusão não apaga o candidato original;
- duplicidade de vínculo é impeditiva;
- histórico da população será preservado por ciclo.

---

## 10. Catálogo de rubricas

### 10.1 Identidade da rubrica

Campos:

- código interno estável;
- nome;
- descrição;
- finalidade;
- família;
- situação;
- responsável;
- política de acesso;
- rubrica substituída quando aplicável.

### 10.2 Versão da rubrica

Campos:

- vigência inicial e final;
- tipo: provento, desconto, informativa, base ou encargo;
- natureza econômica;
- fórmula vigente;
- unidade;
- prioridade de cálculo;
- dependências;
- incidências;
- arredondamento;
- limites e validações;
- reflexo em médias e provisões;
- contas contábeis;
- rateio;
- mapeamentos externos;
- exibição em demonstrativo;
- aprovação e publicação.

### 10.3 Estados

```text
RASCUNHO
  → EM_TESTE
  → EM_REVISAO
  → APROVADA
  → PUBLICADA
  → SUBSTITUIDA
  → ENCERRADA
```

### 10.4 Regras

- versão publicada será imutável;
- sobreposição de vigência será bloqueada;
- mudança de incidência exige nova versão;
- mapeamento externo terá vigência própria;
- rubrica encerrada permanece consultável;
- alteração não recalcula períodos fechados automaticamente.

---

## 11. Motor de fórmulas

### 11.1 Linguagem declarativa

O motor deverá suportar:

- constantes e parâmetros;
- operações aritméticas seguras;
- comparações e condicionais controladas;
- faixas progressivas;
- limites, mínimos e máximos;
- datas e proporcionalidades;
- acumuladores;
- dependências entre rubricas;
- quantidades e unidades;
- tabelas versionadas;
- funções autorizadas de arredondamento.

### 11.2 Segurança

- sem `eval`;
- sem JavaScript, SQL ou shell livre;
- sem acesso à rede;
- sem escrita em arquivos;
- sem acesso direto a tabelas não contratadas;
- limite de profundidade e execução;
- validação estática;
- grafo acíclico;
- assinatura da versão executada.

### 11.3 Testes da fórmula

Cada versão deverá possuir:

- casos normais;
- limites inferiores e superiores;
- valores nulos;
- proporcionalidade;
- arredondamentos;
- retroatividade;
- múltiplos vínculos quando aplicável;
- comparação com resultado homologado;
- teste de não regressão.

---

## 12. Parâmetros e tabelas

Categorias previstas:

- faixas previdenciárias;
- teto de contribuição;
- faixas e deduções de imposto de renda;
- dedução por dependente;
- desconto simplificado quando aplicável;
- percentuais e bases de FGTS;
- salário mínimo e pisos;
- adicionais e percentuais convencionais;
- limites de benefícios;
- calendários e dias úteis;
- limites de desconto;
- índices de correção;
- parâmetros patronais;
- regras específicas por categoria.

Cada parâmetro deverá registrar:

- fonte;
- jurisdição;
- vigência;
- data de publicação;
- valor ou faixas;
- responsável pela conferência;
- evidência;
- aprovação;
- versão substituída.

---

## 13. Entradas de cálculo

### 13.1 Fontes internas

- contrato e remuneração;
- ponto e banco de horas;
- férias;
- ausências e afastamentos;
- benefícios e coparticipações;
- dependentes e pensões;
- SST quando houver fato remuneratório formalmente autorizado;
- produção, comissão ou medição configurada;
- decisões judiciais;
- adiantamentos;
- ajustes de competência anterior.

### 13.2 Estrutura

- ciclo;
- trabalhador e vínculo;
- origem e identificador;
- rubrica sugerida ou tipo de fato;
- competência de referência;
- período do fato;
- quantidade;
- unidade;
- valor-base;
- moeda;
- versão da fonte;
- lote de importação;
- hash;
- estado de validação;
- reversão quando aplicável.

### 13.3 Estados

```text
RECEBIDA
VALIDANDO
VALIDA
COM_ALERTA
REJEITADA
CONGELADA
CONSUMIDA
REVERSA
```

### 13.4 Regras

- mesma origem não será importada duas vezes;
- reversão será movimento próprio;
- entrada rejeitada não será ignorada silenciosamente;
- alteração da fonte após congelamento gerará divergência;
- quantidade negativa exigirá regra específica;
- entrada manual exige permissão e evidência.

---

## 14. Cálculo

### 14.1 Execução

Cada execução deverá registrar:

- ciclo e versão;
- subconjunto calculado;
- versão do motor;
- snapshot de rubricas;
- snapshot de parâmetros;
- entradas utilizadas;
- data e executor;
- duração;
- resultados;
- avisos e erros;
- hash global.

### 14.2 Ordem de processamento

1. validar população;
2. validar entradas;
3. carregar versões vigentes;
4. validar grafo de dependências;
5. calcular rubricas primárias;
6. calcular bases;
7. calcular tributos e descontos;
8. calcular encargos patronais;
9. aplicar ajustes aprovados;
10. calcular bruto, descontos e líquido;
11. executar validações cruzadas;
12. gerar memória e hash.

### 14.3 Resultado individual

- remuneração contratual de referência;
- proventos;
- descontos;
- informativas;
- bases;
- encargos;
- líquido;
- rateios;
- mensagens;
- pendências;
- versão do demonstrativo.

---

## 15. Memória de cálculo

Cada linha deverá explicar:

- nome e versão da rubrica;
- fato de origem;
- quantidade e unidade;
- valor-base;
- fórmula aplicada;
- parâmetros utilizados;
- rubricas predecessoras;
- operações intermediárias;
- arredondamento;
- incidências;
- valor final;
- efeito em bases e totais;
- ajuste relacionado;
- mapeamento externo.

O sistema deverá oferecer:

- visão resumida para trabalhador;
- visão operacional para DP;
- visão técnica para especialista;
- trilha completa para auditor.

---

## 16. Bases e encargos

Bases serão objetos próprios, não totais implícitos.

Exemplos configuráveis:

- base previdenciária;
- base de imposto de renda;
- base de FGTS;
- base de pensão;
- base de médias;
- base de férias;
- base de décimo terceiro;
- base patronal;
- base contábil;
- base de provisão.

Regras:

- cada composição identificará linhas contribuintes;
- exclusões e deduções serão explicadas;
- teto e faixa serão aplicados por parâmetro vigente;
- múltiplos vínculos terão acumulados próprios;
- divergência com totalizador externo abrirá reconciliação.

---

## 17. Múltiplos vínculos e acumulados

O módulo deverá suportar:

- mais de um vínculo na mesma organização;
- remunerações externas declaradas quando necessárias;
- acumulados de contribuição e tributação;
- ordem e prioridade de vínculos;
- documentos de evidência;
- competência e validade da informação;
- recálculo quando houver correção.

Informação externa não será aceita sem origem, período e responsabilidade declarados.

---

## 18. Folha mensal

Fluxo:

```text
Abrir competência
  → formar população
  → coletar e congelar entradas
  → calcular prévia
  → tratar pendências
  → recalcular
  → conferir
  → aprovar
  → fechar
  → gerar pagamentos e eventos
  → reconciliar
```

Pendências impeditivas mínimas:

- vínculo sem versão contratual válida;
- rubrica sem versão vigente;
- parâmetro obrigatório ausente;
- ciclo em fórmula;
- entrada duplicada;
- líquido negativo sem regra autorizada;
- diferença de total não explicada;
- erro de mapeamento externo impeditivo;
- ajuste sensível sem aprovação.

---

## 19. Férias, décimo terceiro e folhas especiais

### Férias

- consumir concessão aprovada do Módulo 06;
- separar cálculo, pagamento e gozo;
- registrar rubricas e bases próprias;
- reconciliar cancelamentos ou remarcações;
- preservar competência de referência.

### Décimo terceiro

- suportar adiantamento e quitação;
- controlar bases e acumulados por ano;
- manter processamento separado da folha mensal;
- permitir diferenças posteriores.

### Complementar

- apontar folha originária;
- registrar fato novo ou correção;
- calcular somente diferenças autorizadas;
- gerar pagamentos e eventos próprios;
- não reescrever o resultado anterior.

### Rescisória

- será integrada ao futuro módulo de desligamentos;
- não será implementada isoladamente sem requisitos de rescisão;
- deverá usar o mesmo motor, versões e memória.

---

## 20. Ajustes manuais

### 20.1 Tipos

- inclusão de valor;
- estorno;
- correção de quantidade;
- diferença acordada;
- ajuste de arredondamento autorizado;
- ajuste judicial;
- compensação;
- informação sem efeito líquido.

### 20.2 Campos

- trabalhador e vínculo;
- ciclo e competência;
- rubrica;
- valor ou quantidade;
- motivo padronizado;
- descrição;
- evidência;
- solicitante;
- aprovador;
- validade;
- impacto;
- reversão;
- relação com ajuste anterior.

### 20.3 Regras

- autor não aprova o próprio ajuste sensível;
- ajuste não altera fórmula;
- ajuste não altera fato original;
- estorno não apaga lançamento;
- ajustes após fechamento exigem reabertura ou folha complementar;
- valores acima de alçada exigem aprovação adicional.

---

## 21. Conferência

### 21.1 Validações automáticas

- variação contra competência anterior;
- líquido negativo;
- salário ausente;
- provento ou desconto incomum;
- valor fora de faixa configurada;
- rubrica inédita;
- trabalhador duplicado;
- vínculo encerrado com remuneração sem justificativa;
- horas incompatíveis;
- benefício sem adesão;
- pensão sem ordem vigente;
- base divergente;
- total por lote;
- rateio incompleto;
- evento externo inconsistente.

### 21.2 Amostragem e tarefas

- amostra configurável por risco;
- checklist versionado;
- responsável e prazo;
- comentários e evidências;
- aceite ou devolução;
- reexecução após alteração.

---

## 22. Aprovação e segregação

A política poderá exigir:

- preparação por analista;
- conferência por segundo usuário;
- aprovação gerencial;
- aprovação de Financeiro para pagamento;
- aprovação adicional para ajustes sensíveis;
- aprovação de evento externo.

Regras:

- aprovação referencia hash exato;
- novo cálculo invalida aprovação anterior;
- usuário não acumula funções incompatíveis sem exceção registrada;
- fechamento não será autorizado por simples ausência de erro.

---

## 23. Fechamento e reabertura

### 23.1 Fechamento

A operação deverá:

1. bloquear novas entradas;
2. revalidar população e versões;
3. verificar pendências;
4. confirmar aprovações;
5. fixar execução aprovada;
6. calcular totais e hashes;
7. gerar snapshot de eventos;
8. emitir outbox;
9. registrar auditoria;
10. confirmar de forma atômica.

### 23.2 Reabertura

Campos:

- fechamento originário;
- motivo;
- competências e pessoas afetadas;
- impacto previsto;
- solicitante;
- aprovador;
- data;
- eventos externos já enviados;
- pagamentos já executados;
- plano de correção.

Regras:

- fechamento anterior permanece válido historicamente;
- reabertura não cancela pagamento automaticamente;
- evento externo poderá exigir reabertura correspondente;
- nova versão deverá reconciliar diferenças;
- impacto financeiro será explícito.

---

## 24. Demonstrativo do trabalhador

Conteúdo:

- empresa e vínculo;
- competência e tipo;
- data de pagamento;
- proventos;
- descontos;
- informativas;
- bases relevantes;
- líquido;
- dados bancários mascarados;
- mensagem e avisos;
- versão e hash;
- canal de disponibilização;
- ciência ou acesso.

O demonstrativo não exibirá detalhes internos desnecessários, mas deverá permitir explicação acessível de cada item.

---

## 25. Pagamentos

### 25.1 Ordem de pagamento

- ciclo e demonstrativo;
- beneficiário;
- valor devido;
- valor autorizado;
- conta ou meio;
- data prevista;
- lote;
- idempotency key;
- estado;
- retorno bancário;
- divergência.

### 25.2 Estados

```text
RASCUNHO
  → VALIDADA
  → APROVADA
  → ENVIADA
  → PROCESSANDO
  → PAGA
```

Alternativos:

```text
REJEITADA
DEVOLVIDA
CANCELADA
PAGAMENTO_PARCIAL
ESTORNADA
```

### 25.3 Regras

- pagamento duplicado será bloqueado;
- pagamento parcial ficará explícito;
- retorno bancário não altera o cálculo;
- divergência abre caso de conciliação;
- alteração de conta após aprovação exige revalidação;
- cancelamento não apaga a ordem.

---

## 26. Contabilidade, custos e obras

### 26.1 Rateio

Fontes:

- lotação contratual;
- centro de custo;
- alocação em obra;
- apontamento válido;
- regra de rateio;
- ajuste aprovado.

### 26.2 Saídas

- custo direto por obra;
- custo por centro de custo;
- encargos patronais;
- provisões;
- passivos;
- contas de salários;
- contas de benefícios e descontos;
- obrigações a recolher;
- líquido a pagar.

### 26.3 Regras

- rateio totalizará 100% quando obrigatório;
- arredondamento residual terá regra explícita;
- rateio não altera demonstrativo;
- custo individual poderá ser restrito;
- lançamento contábil terá referência à versão fechada;
- reabertura gerará estorno e nova contabilização, não edição silenciosa.

---

## 27. eSocial e eventos periódicos

A integração deverá suportar, por versão oficial:

- S-1010 — tabela de rubricas;
- S-1200 — remuneração;
- S-1210 — pagamentos;
- S-1298 — reabertura;
- S-1299 — fechamento;
- eventos de exclusão ou retificação permitidos;
- totalizadores retornados.

### Regras

- remuneração e pagamento serão gerados de objetos internos distintos;
- identificadores de demonstrativo serão estáveis e rastreáveis;
- fechamento externo não substituirá fechamento interno;
- exclusão de remuneração respeitará dependências de pagamento;
- período externo fechado exigirá fluxo de reabertura quando aplicável;
- payload, hash, recibo e retorno serão preservados;
- rejeição não apagará cálculo;
- retificação manterá evento original;
- totalizadores serão reconciliados com bases internas.

---

## 28. FGTS Digital e obrigações

O módulo deverá:

- projetar bases e valores por trabalhador e competência;
- correlacionar remuneração declarada;
- receber totalizações e guias quando integrado;
- registrar vencimento e estado;
- reconciliar diferenças;
- distinguir mensal, décimo terceiro, rescisório e diferenças;
- manter versão do manual e regra utilizada;
- não tratar guia paga como prova única da correção da folha.

---

## 29. Eventos internos

Eventos previstos:

- `payroll.period.opened`;
- `payroll.population.frozen`;
- `payroll.inputs.frozen`;
- `payroll.calculation.started`;
- `payroll.calculation.completed`;
- `payroll.calculation.failed`;
- `payroll.worker.pending`;
- `payroll.adjustment.requested`;
- `payroll.adjustment.approved`;
- `payroll.cycle.approved`;
- `payroll.cycle.closed`;
- `payroll.cycle.reopened`;
- `payroll.payment_order.created`;
- `payroll.payment.reconciled`;
- `payroll.government_event.accepted`;
- `payroll.external_divergence.detected`.

---

## 30. Requisitos funcionais

### Governança, calendários e ciclos

**RH-M09-FR-001.** Configurar calendários de folha por empresa e vigência.  
**RH-M09-FR-002.** Criar competências mensais e especiais.  
**RH-M09-FR-003.** Configurar tipos de processamento.  
**RH-M09-FR-004.** Criar ciclo com datas de corte, cálculo, aprovação e pagamento.  
**RH-M09-FR-005.** Controlar máquina de estados do ciclo.  
**RH-M09-FR-006.** Permitir simulação sem efeito oficial.  
**RH-M09-FR-007.** Bloquear operações incompatíveis com o estado.  
**RH-M09-FR-008.** Registrar responsáveis e alçadas.  
**RH-M09-FR-009.** Configurar checklists e gates.  
**RH-M09-FR-010.** Clonar configuração sem reutilizar versões históricas indevidamente.

### População e snapshots

**RH-M09-FR-011.** Formar população por regras versionadas.  
**RH-M09-FR-012.** Congelar população do ciclo.  
**RH-M09-FR-013.** Registrar motivo de inclusão e exclusão.  
**RH-M09-FR-014.** Congelar versões contratuais e cadastrais utilizadas.  
**RH-M09-FR-015.** Detectar vínculo duplicado ou inconsistente.  
**RH-M09-FR-016.** Incluir manualmente mediante permissão.  
**RH-M09-FR-017.** Excluir manualmente sem apagar candidatura.  
**RH-M09-FR-018.** Comparar população com competência anterior.  
**RH-M09-FR-019.** Reavaliar população antes do fechamento.  
**RH-M09-FR-020.** Exportar snapshot auditável.

### Rubricas e fórmulas

**RH-M09-FR-021.** Cadastrar rubrica com identidade estável.  
**RH-M09-FR-022.** Criar versões de rubrica por vigência.  
**RH-M09-FR-023.** Configurar tipo, natureza, unidade e exibição.  
**RH-M09-FR-024.** Configurar incidências e bases.  
**RH-M09-FR-025.** Configurar contas e rateios.  
**RH-M09-FR-026.** Mapear rubrica para tabelas externas por versão.  
**RH-M09-FR-027.** Criar fórmula declarativa.  
**RH-M09-FR-028.** Versionar e aprovar fórmula.  
**RH-M09-FR-029.** Validar dependências e ciclos.  
**RH-M09-FR-030.** Executar suíte de testes da fórmula.  
**RH-M09-FR-031.** Simular impacto antes da publicação.  
**RH-M09-FR-032.** Bloquear sobreposição de vigência.  
**RH-M09-FR-033.** Encerrar rubrica sem apagar histórico.  
**RH-M09-FR-034.** Configurar arredondamento por versão.  
**RH-M09-FR-035.** Comparar versões e demonstrar diferenças.

### Parâmetros

**RH-M09-FR-036.** Cadastrar conjuntos de parâmetros.  
**RH-M09-FR-037.** Versionar faixas, tetos, deduções e percentuais.  
**RH-M09-FR-038.** Registrar fonte e evidência oficial.  
**RH-M09-FR-039.** Aprovar vigência do parâmetro.  
**RH-M09-FR-040.** Bloquear cálculo oficial sem parâmetro obrigatório.  
**RH-M09-FR-041.** Simular troca de parâmetro.  
**RH-M09-FR-042.** Consultar parâmetro vigente em data passada.

### Entradas

**RH-M09-FR-043.** Receber entradas de contratos e remuneração.  
**RH-M09-FR-044.** Receber entradas de ponto e banco de horas.  
**RH-M09-FR-045.** Receber entradas de férias e afastamentos.  
**RH-M09-FR-046.** Receber entradas de benefícios, pensões e descontos.  
**RH-M09-FR-047.** Receber produção, comissão ou variável configurada.  
**RH-M09-FR-048.** Importar acumulados autorizados.  
**RH-M09-FR-049.** Importar lote com hash e idempotência.  
**RH-M09-FR-050.** Validar duplicidade e consistência.  
**RH-M09-FR-051.** Registrar reversão append-only.  
**RH-M09-FR-052.** Congelar entradas.  
**RH-M09-FR-053.** Detectar mudança na fonte após congelamento.  
**RH-M09-FR-054.** Permitir lançamento manual controlado.  
**RH-M09-FR-055.** Rastrear entrada até o fato originário.

### Cálculo e memória

**RH-M09-FR-056.** Executar cálculo individual.  
**RH-M09-FR-057.** Executar cálculo em lote.  
**RH-M09-FR-058.** Reprocessar subconjunto sem sobrescrever execução.  
**RH-M09-FR-059.** Preservar versão do motor.  
**RH-M09-FR-060.** Calcular linhas de provento, desconto, informativa e encargo.  
**RH-M09-FR-061.** Calcular bases separadas.  
**RH-M09-FR-062.** Aplicar faixas progressivas.  
**RH-M09-FR-063.** Aplicar tetos, pisos e limites.  
**RH-M09-FR-064.** Aplicar arredondamento explícito.  
**RH-M09-FR-065.** Calcular múltiplos vínculos e acumulados.  
**RH-M09-FR-066.** Calcular custo patronal.  
**RH-M09-FR-067.** Calcular rateios.  
**RH-M09-FR-068.** Gerar memória por linha.  
**RH-M09-FR-069.** Gerar explicação legível.  
**RH-M09-FR-070.** Gerar hash individual e global.  
**RH-M09-FR-071.** Registrar avisos e erros.  
**RH-M09-FR-072.** Impedir conclusão de cálculo parcial como completo.

### Especiais e retroatividade

**RH-M09-FR-073.** Calcular folha mensal.  
**RH-M09-FR-074.** Calcular adiantamento.  
**RH-M09-FR-075.** Calcular férias a partir de concessão aprovada.  
**RH-M09-FR-076.** Calcular décimo terceiro em processamentos próprios.  
**RH-M09-FR-077.** Criar folha complementar vinculada à originária.  
**RH-M09-FR-078.** Calcular diferenças retroativas por competência.  
**RH-M09-FR-079.** Preservar valores e eventos anteriores.  
**RH-M09-FR-080.** Simular impacto antes da reabertura.

### Ajustes, conferência e aprovação

**RH-M09-FR-081.** Criar ajuste manual com motivo e evidência.  
**RH-M09-FR-082.** Exigir aprovação por alçada.  
**RH-M09-FR-083.** Registrar estorno de ajuste.  
**RH-M09-FR-084.** Comparar resultado com competência anterior.  
**RH-M09-FR-085.** Detectar anomalias configuradas.  
**RH-M09-FR-086.** Criar tarefas de conferência.  
**RH-M09-FR-087.** Registrar comentários e evidências.  
**RH-M09-FR-088.** Aprovar hash exato da execução.  
**RH-M09-FR-089.** Invalidar aprovação após novo cálculo.  
**RH-M09-FR-090.** Aplicar segregação de funções.

### Fechamento, pagamento e integração

**RH-M09-FR-091.** Fechar ciclo de forma atômica.  
**RH-M09-FR-092.** Criar snapshot de fechamento.  
**RH-M09-FR-093.** Solicitar e aprovar reabertura.  
**RH-M09-FR-094.** Preservar versões fechadas anteriores.  
**RH-M09-FR-095.** Gerar demonstrativo versionado.  
**RH-M09-FR-096.** Disponibilizar demonstrativo no portal.  
**RH-M09-FR-097.** Criar ordens de pagamento idempotentes.  
**RH-M09-FR-098.** Importar retorno bancário.  
**RH-M09-FR-099.** Conciliar valor devido e pago.  
**RH-M09-FR-100.** Gerar lote contábil.  
**RH-M09-FR-101.** Gerar rateios por obra e centro de custo.  
**RH-M09-FR-102.** Projetar S-1010.  
**RH-M09-FR-103.** Projetar S-1200.  
**RH-M09-FR-104.** Projetar S-1210.  
**RH-M09-FR-105.** Projetar S-1298 e S-1299.  
**RH-M09-FR-106.** Preservar payload, hash e recibo.  
**RH-M09-FR-107.** Reconciliar totalizadores externos.  
**RH-M09-FR-108.** Integrar bases com FGTS Digital.  
**RH-M09-FR-109.** Registrar divergências e plano de correção.  
**RH-M09-FR-110.** Exportar dossiê auditável do ciclo.

---

## 31. Regras de negócio

**RH-M09-BR-001.** Competência e data de pagamento são tempos distintos.  
**RH-M09-BR-002.** População congelada não muda silenciosamente.  
**RH-M09-BR-003.** Inclusão manual exige motivo.  
**RH-M09-BR-004.** Rubrica publicada é imutável.  
**RH-M09-BR-005.** Mudança de incidência cria nova versão.  
**RH-M09-BR-006.** Vigências de uma rubrica não se sobrepõem.  
**RH-M09-BR-007.** Fórmula não executa código arbitrário.  
**RH-M09-BR-008.** Dependência cíclica bloqueia publicação.  
**RH-M09-BR-009.** Fórmula sem testes aprovados não entra em folha oficial.  
**RH-M09-BR-010.** Parâmetro sem fonte e vigência não é oficial.  
**RH-M09-BR-011.** Parâmetro histórico não será sobrescrito.  
**RH-M09-BR-012.** Entrada possui origem identificável.  
**RH-M09-BR-013.** Importação idempotente não duplica fato.  
**RH-M09-BR-014.** Reversão não apaga entrada.  
**RH-M09-BR-015.** Entrada rejeitada fica visível.  
**RH-M09-BR-016.** Mudança após congelamento gera divergência.  
**RH-M09-BR-017.** Execução de cálculo é imutável.  
**RH-M09-BR-018.** Novo cálculo cria nova execução.  
**RH-M09-BR-019.** Mesmas entradas e versões produzem mesmo resultado.  
**RH-M09-BR-020.** Arredondamento é explícito.  
**RH-M09-BR-021.** Linha calculada guarda memória.  
**RH-M09-BR-022.** Base identifica suas linhas componentes.  
**RH-M09-BR-023.** Custo patronal não é desconto do trabalhador.  
**RH-M09-BR-024.** Rateio não altera o líquido.  
**RH-M09-BR-025.** Rateio incompleto impede contabilização oficial.  
**RH-M09-BR-026.** Ajuste manual não altera fórmula.  
**RH-M09-BR-027.** Ajuste manual não altera fato original.  
**RH-M09-BR-028.** Autor não aprova ajuste sensível próprio.  
**RH-M09-BR-029.** Estorno é movimento compensatório.  
**RH-M09-BR-030.** Novo cálculo invalida aprovação anterior.  
**RH-M09-BR-031.** Aprovação referencia hash exato.  
**RH-M09-BR-032.** Folha parcial não pode ser fechada como completa.  
**RH-M09-BR-033.** Fechamento exige ausência de pendência impeditiva.  
**RH-M09-BR-034.** Fechamento é atômico.  
**RH-M09-BR-035.** Período fechado não recebe entrada.  
**RH-M09-BR-036.** Reabertura preserva fechamento anterior.  
**RH-M09-BR-037.** Reabertura não cancela pagamento automaticamente.  
**RH-M09-BR-038.** Folha complementar não sobrescreve a originária.  
**RH-M09-BR-039.** Diferença retroativa mantém competência de referência.  
**RH-M09-BR-040.** Valor devido e valor pago são objetos distintos.  
**RH-M09-BR-041.** Pagamento duplicado é bloqueado.  
**RH-M09-BR-042.** Retorno bancário não altera o cálculo.  
**RH-M09-BR-043.** Pagamento parcial gera pendência.  
**RH-M09-BR-044.** Demonstrativo publicado é versionado.  
**RH-M09-BR-045.** Dado bancário será mascarado fora dos perfis autorizados.  
**RH-M09-BR-046.** Evento externo é derivado de resultado aprovado.  
**RH-M09-BR-047.** Evento rejeitado não apaga cálculo.  
**RH-M09-BR-048.** Retificação preserva evento original.  
**RH-M09-BR-049.** Exclusão externa não exclui cálculo interno.  
**RH-M09-BR-050.** Fechamento externo não substitui fechamento interno.  
**RH-M09-BR-051.** Remuneração e pagamento usam objetos distintos.  
**RH-M09-BR-052.** Evento de pagamento referencia demonstrativo válido.  
**RH-M09-BR-053.** Totalizador externo será reconciliado.  
**RH-M09-BR-054.** Divergência externa não será ignorada.  
**RH-M09-BR-055.** Rubrica externa possui mapeamento versionado.  
**RH-M09-BR-056.** Código externo ausente pode bloquear transmissão sem bloquear memória interna.  
**RH-M09-BR-057.** Folha de férias usa concessão aprovada.  
**RH-M09-BR-058.** Programação de férias não é pagamento.  
**RH-M09-BR-059.** Décimo terceiro terá ciclo próprio.  
**RH-M09-BR-060.** Rescisão dependerá do módulo de desligamento.  
**RH-M09-BR-061.** Informação de múltiplos vínculos terá origem e período.  
**RH-M09-BR-062.** Acumulado importado será auditável.  
**RH-M09-BR-063.** Líquido negativo exige regra e tratamento.  
**RH-M09-BR-064.** Exportação salarial será auditada.  
**RH-M09-BR-065.** Gestor de obra não acessa salário individual por padrão.  
**RH-M09-BR-066.** Logs não expõem valores desnecessários.  
**RH-M09-BR-067.** Integrações usam idempotência e outbox.  
**RH-M09-BR-068.** Falha parcial não gera sucesso global.  
**RH-M09-BR-069.** Contabilização referencia fechamento e versão.  
**RH-M09-BR-070.** Reabertura gera contabilização compensatória.  
**RH-M09-BR-071.** Fatura ou pagamento financeiro não cria fato de folha.  
**RH-M09-BR-072.** Nenhum valor oficial de 2026 será regra eterna no código.  
**RH-M09-BR-073.** Alteração cadastral retroativa gera impacto explícito.  
**RH-M09-BR-074.** Resultado antigo permanece consultável.  
**RH-M09-BR-075.** Toda decisão sensível registra usuário, motivo e evidência.

---

## 32. Permissões

Permissões mínimas:

- `payroll.view_dashboard`;
- `payroll.manage_calendar`;
- `payroll.manage_cycles`;
- `payroll.manage_population`;
- `payroll.manage_rubrics`;
- `payroll.publish_rubrics`;
- `payroll.manage_formulas`;
- `payroll.publish_formulas`;
- `payroll.manage_parameters`;
- `payroll.import_inputs`;
- `payroll.create_manual_input`;
- `payroll.run_simulation`;
- `payroll.run_official_calculation`;
- `payroll.view_individual_values`;
- `payroll.view_aggregated_costs`;
- `payroll.create_adjustment`;
- `payroll.approve_adjustment`;
- `payroll.review_cycle`;
- `payroll.approve_cycle`;
- `payroll.close_cycle`;
- `payroll.request_reopening`;
- `payroll.approve_reopening`;
- `payroll.publish_payslips`;
- `payroll.create_payment_orders`;
- `payroll.reconcile_payments`;
- `payroll.generate_accounting`;
- `payroll.transmit_government_events`;
- `payroll.reconcile_external_totals`;
- `payroll.export_sensitive_data`;
- `payroll.audit`.

---

## 33. Relatórios e indicadores

### Operacionais

- ciclos por estado;
- entradas pendentes;
- cálculos com erro;
- trabalhadores com pendência;
- ajustes aguardando aprovação;
- fechamento por empresa;
- pagamentos rejeitados;
- eventos externos rejeitados.

### Comparativos

- variação de bruto, desconto, líquido e custo;
- headcount da folha;
- rubricas com maior variação;
- diferenças retroativas;
- folha complementar;
- custo por obra e centro de custo;
- encargos por competência.

### Auditoria

- rubricas e fórmulas alteradas;
- parâmetros publicados;
- ajustes manuais;
- reaberturas;
- pagamentos divergentes;
- eventos retificados;
- acessos e exportações salariais.

---

## 34. Alertas

- competência sem calendário;
- vínculo sem salário válido;
- rubrica sem versão;
- fórmula sem teste;
- parâmetro vencido ou ausente;
- entrada duplicada;
- fonte alterada após congelamento;
- ciclo de dependência;
- líquido negativo;
- variação acima do limite;
- ajuste sem aprovação;
- rateio incompleto;
- pagamento devolvido;
- evento externo rejeitado;
- totalizador divergente;
- fechamento próximo do prazo;
- reabertura com pagamento já executado.

---

## 35. Não funcionais

- isolamento por organização;
- autorização por linha e função;
- criptografia de dados sensíveis;
- processamento assíncrono;
- idempotência;
- determinismo;
- hashes de entradas e resultados;
- filas com retry controlado;
- observabilidade sem exposição salarial;
- suporte a grandes lotes;
- cálculo incremental seguro;
- recuperação de execução interrompida;
- retenção histórica;
- exportação controlada;
- acessibilidade;
- testes de concorrência;
- backups e recuperação de desastre;
- trilha imutável de fechamento;
- desempenho mensurável por população;
- versionamento do motor de cálculo.

---

## 36. Cenários pessimistas

1. contrato alterado depois do corte;
2. rubrica publicada com incidência incorreta;
3. parâmetro oficial ausente;
4. fórmula com ciclo;
5. entrada duplicada de ponto;
6. benefício descontado sem adesão;
7. pensão calculada sem ordem vigente;
8. múltiplos vínculos sem acumulado;
9. cálculo interrompido no meio do lote;
10. ajuste feito após aprovação;
11. aprovação sobre execução antiga;
12. fechamento com trabalhador pendente;
13. pagamento duplicado;
14. retorno bancário parcial;
15. evento S-1200 aceito e S-1210 rejeitado;
16. fechamento externo realizado antes da conciliação;
17. reabertura após pagamento;
18. rubrica externa sem mapeamento;
19. rateio não soma 100%;
20. exportação salarial por usuário indevido;
21. folha complementar sem referência;
22. retroatividade afeta várias competências;
23. totalizador externo diverge da base interna;
24. arredondamento muda entre versões;
25. alteração de parâmetro tenta recalcular período fechado.

Cada cenário deverá possuir prevenção, detecção, bloqueio, recuperação e auditoria.

---

## 37. Critérios de aceite

1. competência pode ser criada com calendário versionado;
2. população congelada permanece consultável;
3. inclusão manual mantém motivo;
4. versão nova de rubrica não altera folha antiga;
5. fórmula com ciclo é rejeitada;
6. fórmula sem testes não é publicada;
7. parâmetro vigente é selecionado pela data correta;
8. entrada duplicada é bloqueada;
9. reversão preserva entrada anterior;
10. mesma execução produz mesmo hash;
11. recálculo cria nova versão;
12. memória explica cada linha;
13. base identifica rubricas componentes;
14. custo patronal não aparece como desconto;
15. rateio não altera líquido;
16. ajuste manual aparece separado;
17. ajuste sensível exige segundo aprovador;
18. novo cálculo invalida aprovação;
19. ciclo parcial não pode ser fechado;
20. fechamento é atômico;
21. reabertura preserva fechamento anterior;
22. folha complementar aponta origem;
23. diferença retroativa aponta competência;
24. demonstrativo possui versão e hash;
25. trabalhador consulta apenas os próprios demonstrativos;
26. gestor de obra vê custo agregado sem salário individual;
27. ordem duplicada de pagamento é bloqueada;
28. pagamento parcial gera pendência;
29. retorno bancário não altera a folha;
30. contabilização referencia fechamento;
31. S-1200 deriva de remuneração aprovada;
32. S-1210 deriva de pagamento correlacionado;
33. S-1299 não substitui fechamento interno;
34. retificação preserva evento original;
35. totalizador externo é conciliado;
36. divergência de FGTS gera caso;
37. parâmetro de 2026 pode ser substituído por nova vigência sem alterar histórico;
38. usuário sem permissão não acessa valores;
39. exportação é auditada;
40. falha parcial não retorna ciclo como calculado;
41. férias usam concessão aprovada;
42. décimo terceiro possui ciclo próprio;
43. múltiplos vínculos usam acumulados auditáveis;
44. líquido negativo é bloqueado ou justificado;
45. variação anormal gera alerta;
46. entradas congeladas não mudam silenciosamente;
47. reabertura mostra impactos em pagamento e eventos;
48. auditor identifica todas as versões usadas;
49. totais individuais conciliam com totais da empresa;
50. dossiê do ciclo reproduz cálculo, aprovação, fechamento, pagamento e declaração.

---

## 38. Estratégia de testes

### Unitários

- fórmulas;
- faixas progressivas;
- arredondamentos;
- proporcionalidades;
- bases;
- limites;
- grafos de dependência;
- hashes;
- regras de vigência.

### Integração

- contratos;
- ponto;
- férias;
- afastamentos;
- benefícios;
- pensões;
- Financeiro;
- Contabilidade;
- eSocial;
- FGTS Digital.

### Segurança

- isolamento de organização;
- acesso individual;
- exportação;
- segregação de funções;
- fórmula maliciosa;
- manipulação de lote;
- vazamento em logs.

### Concorrência

- cálculo simultâneo;
- fechamento simultâneo;
- ajuste durante aprovação;
- importação duplicada;
- pagamento duplicado;
- reabertura concorrente.

### Ponta a ponta

- folha mensal completa;
- férias com pagamento separado;
- décimo terceiro;
- folha complementar;
- reabertura após evento externo;
- divergência bancária;
- rateio por múltiplas obras.

---

## 39. Sequência sugerida de implementação

1. autorização salarial e auditoria;
2. calendário, competência e ciclo;
3. catálogo e versões de rubricas;
4. linguagem e motor de fórmulas;
5. parâmetros e tabelas temporais;
6. população e snapshots;
7. contratos de entradas;
8. cálculo individual e memória;
9. cálculo em lote;
10. bases e encargos;
11. ajustes, conferência e aprovação;
12. fechamento e reabertura;
13. demonstrativos;
14. pagamentos e conciliação;
15. rateios e Contabilidade;
16. eSocial e FGTS Digital;
17. relatórios e portal;
18. homologação paralela com folha real controlada;
19. testes regressivos por competência;
20. liberação gradual.

---

## 40. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultadas fontes oficiais:

- eSocial S-1.3 consolidado até NT 06/2026;
- eventos S-1010, S-1200, S-1210, S-1298 e S-1299;
- regras oficiais de remuneração, pagamento, exclusão, fechamento e reabertura;
- tabelas previdenciárias vigentes desde janeiro de 2026;
- tabelas de imposto de renda de 2026;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- notas e documentação técnica correlata.

A documentação oficial diferencia tabela de rubricas, remuneração, pagamento e fechamento. A aceitação de exclusões e retificações pode depender de pagamentos e reabertura do período. Faixas, valores, códigos, prazos e incidências deverão ser revalidados antes da implementação, homologação e produção.

---

## 41. Estado honesto

Este arquivo é uma especificação funcional.

Não foram implementados:

- tabelas;
- migrations;
- políticas de autorização;
- motor de fórmulas;
- rubricas;
- parâmetros;
- cálculo;
- demonstrativos;
- pagamentos;
- contabilização;
- eventos governamentais;
- integrações;
- testes de produção.

A implementação dependerá de revisão arquitetural, trabalhista, previdenciária, tributária, contábil, financeira, de segurança e privacidade.
