# ADR-009 — Folha como Cálculo Reproduzível, Rubricas Versionadas e Fechamento Auditável

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

A folha de pagamento combina fatos de diversos domínios:

- vínculo, contrato e remuneração vigente;
- jornada, ponto, horas extras e banco de horas;
- férias, afastamentos, ausências e retornos;
- benefícios, coparticipações, pensões e descontos;
- adicionais e exposições ocupacionais quando formalmente aplicáveis;
- decisões judiciais, acordos e processos;
- parâmetros previdenciários, tributários e fundiários;
- pagamentos, provisões, contabilização e obrigações digitais.

Tratar a folha como uma tabela mutável de proventos e descontos produziria riscos graves:

- um recálculo poderia apagar o resultado originalmente conferido;
- uma mudança de contrato poderia alterar retroativamente folhas fechadas;
- um valor pago poderia ser confundido com valor devido;
- um evento enviado ao eSocial poderia substituir a memória interna;
- uma rubrica poderia mudar de incidência sem preservar a versão anterior;
- ajustes manuais poderiam esconder a causa real;
- parâmetros legais poderiam ficar codificados de forma fixa;
- arredondamentos diferentes poderiam gerar resultados não reproduzíveis;
- fechamento, reabertura e retificação poderiam perder rastreabilidade;
- custos por obra e centro de custo poderiam divergir do demonstrativo do trabalhador.

A arquitetura precisa provar como cada centavo foi calculado, com quais fatos, versões, parâmetros, fórmulas, aprovações e eventos externos.

---

## 2. Decisão

O Projeto RH adotará a folha como um processo de cálculo versionado, determinístico, reproduzível e auditável.

### 2.1 Competência de folha

Representa o período de apuração e o tipo de processamento, por empresa empregadora, estabelecimento ou grupo autorizado.

### 2.2 Ciclo de folha

Representa o processo operacional da competência, incluindo população, entradas, cálculos, conferência, aprovação, fechamento, reabertura e integrações.

### 2.3 População congelada

Representa os vínculos incluídos ou excluídos do ciclo, com motivo, versão cadastral e instante de corte. A população não será reconstruída silenciosamente a cada consulta.

### 2.4 Fato de origem

Representa o evento de negócio que pode produzir efeito financeiro, como:

- salário contratual;
- horas extras apuradas;
- ausência;
- férias;
- afastamento;
- benefício;
- pensão;
- desconto autorizado;
- ajuste retroativo;
- decisão judicial;
- prêmio, comissão ou produção;
- lançamento autorizado.

O fato não será a rubrica nem o resultado calculado.

### 2.5 Entrada de cálculo

Representa a projeção imutável de um fato para uma competência e ciclo específicos, com origem, quantidade, unidade, valor-base, período de referência e versão da fonte.

### 2.6 Rubrica

Representa o conceito econômico e funcional do lançamento. A rubrica possuirá identidade estável e versões por vigência.

### 2.7 Versão de rubrica

Representa, para determinado período:

- natureza;
- tipo de lançamento;
- fórmula;
- incidências;
- bases afetadas;
- prioridade;
- arredondamento;
- classificação contábil;
- mapeamentos externos;
- regras de exibição e rateio.

Alterar uma versão não reescreverá folhas anteriores.

### 2.8 Fórmula

Representa expressão controlada, validada e versionada, executada por motor determinístico. Fórmulas não executarão código arbitrário nem acessarão dados sem contrato explícito.

### 2.9 Parâmetro

Representa valor, faixa, limite, dedução, percentual, teto, piso, calendário ou regra aplicável por vigência, fonte e jurisdição. Parâmetros oficiais não serão constantes fixas no código.

### 2.10 Execução de cálculo

Representa uma tentativa imutável de calcular um ciclo ou subconjunto, com versão do motor, entradas, dependências, resultados, avisos, erros e hash.

### 2.11 Demonstrativo calculado

Representa o resultado por trabalhador e vínculo, composto por linhas, bases, encargos, bruto, descontos, líquido e memória de cálculo.

### 2.12 Linha calculada

Representa o resultado de uma rubrica para uma origem, fórmula e versão específicas. A linha manterá quantidade, base, taxa, valor, arredondamento, incidências e explicação.

### 2.13 Base e incidência

Representam agregações próprias e rastreáveis. Uma rubrica poderá compor bases diferentes por versões e regras distintas.

### 2.14 Ajuste manual

Representa uma intervenção explícita, separada do cálculo automático, com motivo, evidência, competência, rubrica, aprovador e efeito. Ajuste não alterará o fato original nem a fórmula.

### 2.15 Resultado aprovado

Representa a versão do demonstrativo aceita para fechamento. Aprovação não será inferida da ausência de erros.

### 2.16 Pagamento

Representa o fato financeiro de disponibilização ou transferência de valor. Valor devido e valor pago permanecerão separados.

### 2.17 Evento externo

Representa projeção autorizada para eSocial, FGTS Digital, DCTFWeb, Financeiro ou Contabilidade. O evento externo não será a fonte única da memória de cálculo.

### 2.18 Fechamento

Representa o congelamento auditável de uma versão da competência, seus demonstrativos, totais, eventos e reconciliações.

### 2.19 Reabertura

Representa processo explícito que preserva o fechamento anterior, registra motivo e cria nova versão operacional. Reabertura não apaga a história.

---

## 3. Modelo conceitual

```text
Competência
  → ciclo de folha
    → população congelada
      → fatos de origem
        → entradas versionadas
          → rubricas e fórmulas vigentes
            → execução determinística
              → demonstrativos e linhas
                → conferência e aprovação
                  → fechamento
                    → pagamentos, contabilidade e eventos externos
```

```text
Fato gerador
  ≠ entrada de cálculo
  ≠ rubrica
  ≠ fórmula
  ≠ linha calculada
  ≠ ajuste manual
  ≠ valor devido
  ≠ pagamento efetivo
  ≠ evento enviado
```

```text
Fechamento v1
  → reabertura justificada
    → novo cálculo
      → fechamento v2

v1 permanece imutável e consultável
```

---

## 4. Princípios obrigatórios

1. Toda competência terá empresa, período, tipo e calendário explícitos.
2. A população do ciclo será congelada e auditável.
3. Toda entrada possuirá origem, versão e período de referência.
4. Nenhuma rubrica será usada sem versão vigente e aprovada.
5. Fórmulas serão determinísticas, versionadas e testáveis.
6. Parâmetros legais e convencionais serão versionados por vigência.
7. O motor não executará código arbitrário cadastrado por usuário.
8. A mesma entrada, versão de fórmula e parâmetros deverá produzir o mesmo resultado.
9. Arredondamento será explícito por etapa e versão.
10. Ordem de cálculo e dependências serão validadas como grafo acíclico.
11. Ciclos entre rubricas serão rejeitados antes da execução.
12. Resultado calculado não será sobrescrito; novo cálculo cria nova execução.
13. Ajuste manual será separado do cálculo automático.
14. Ajuste exigirá motivo, evidência e permissão.
15. Aprovação será explícita e segregada da edição.
16. Valor devido não será confundido com valor pago.
17. Remuneração informada externamente não substituirá o demonstrativo interno.
18. Pagamento não poderá ser ligado a demonstrativo inexistente ou não aprovado.
19. Bases de INSS, IRRF, FGTS e outras serão calculadas e explicadas separadamente.
20. Incidências externas serão mapeadas por versão, não codificadas na identidade da rubrica.
21. Múltiplos vínculos e remunerações externas serão representáveis quando necessários ao cálculo.
22. Folha mensal, décimo terceiro, férias, rescisão, adiantamento, complementar e diferenças serão tipos distintos.
23. Processamento complementar não editará a folha originária.
24. Retroatividade gerará diferenças explícitas por competência de referência.
25. Período fechado somente mudará por reabertura controlada.
26. Reabertura preservará fechamento, eventos, aprovações e recibos anteriores.
27. Evento retificado manterá relação com o evento original.
28. Exclusão externa não excluirá o fato nem o cálculo interno.
29. Totais por trabalhador, empresa, estabelecimento, lotação, obra e centro de custo deverão reconciliar.
30. Rateio contábil não modificará o líquido do trabalhador.
31. Custo patronal será separado de provento e desconto do trabalhador.
32. Provisão será separada de obrigação vencida e pagamento.
33. Demonstrativo exibirá memória compreensível, não apenas fórmula técnica.
34. Dados salariais terão autorização granular e auditoria reforçada.
35. Exportações massivas serão controladas e auditadas.
36. Logs técnicos não registrarão valores e dados pessoais desnecessários.
37. Integrações usarão outbox, idempotência e correlação.
38. Erros parciais não produzirão fechamento parcial silencioso.
39. Divergências com sistemas externos serão registradas e reconciliadas.
40. Nenhuma taxa ou faixa vigente em 2026 será fixada como regra eterna no código.

---

## 5. Tipos de processamento

O modelo deverá suportar, por configuração e vigência:

- folha mensal;
- adiantamento salarial;
- folha de férias;
- décimo terceiro — adiantamento e quitação;
- folha rescisória;
- folha complementar;
- diferença retroativa;
- participação, prêmio ou campanha autorizada;
- pagamento fora da folha com tratamento próprio;
- processamento de trabalhador sem vínculo quando aplicável;
- reprocessamento técnico sem mudança de fato;
- simulação sem efeito oficial.

Cada tipo terá calendário, regras de população, fontes, rubricas permitidas, aprovações e integrações próprias.

---

## 6. Motor de fórmulas

### 6.1 Características

- linguagem declarativa restrita;
- tipagem de valores, quantidades, datas e percentuais;
- funções matemáticas aprovadas;
- acesso somente a variáveis contratadas;
- ausência de rede, sistema de arquivos e execução dinâmica;
- limites de tempo e memória;
- validação de dependências;
- versão do compilador ou interpretador;
- suíte de testes por fórmula;
- simulação antes da publicação;
- assinatura e aprovação da versão.

### 6.2 Entradas permitidas

- dados congelados do vínculo e contrato;
- quantidade apurada;
- bases acumuladas do próprio cálculo;
- parâmetros vigentes;
- resultados de rubricas predecessoras autorizadas;
- acumulados anteriores formalmente importados;
- indicadores de tipo de folha e período.

### 6.3 Saídas

- valor calculado;
- quantidade e unidade;
- bases impactadas;
- incidências;
- memória intermediária;
- avisos e validações;
- justificativa legível.

---

## 7. Tempos distintos

O domínio reconhecerá ao menos:

- competência de apuração;
- período de referência do fato;
- data de vigência da regra;
- instante de captura da entrada;
- instante da execução;
- data de aprovação;
- data de fechamento;
- data prevista de pagamento;
- data efetiva de pagamento;
- período de apuração externo;
- data de transmissão e aceite.

Esses tempos não serão colapsados em uma única coluna de data.

---

## 8. Eventos externos e reconciliação

O domínio deverá projetar, conforme versão oficial vigente e autorização:

- tabela de rubricas;
- remunerações;
- pagamentos;
- fechamento e reabertura de eventos periódicos;
- totalizadores e retornos;
- informações para FGTS Digital;
- informações para apuração previdenciária e tributária;
- ordens de pagamento;
- lançamentos contábeis;
- provisões e custos.

Cada projeção deverá preservar:

- origem interna;
- ciclo, execução e demonstrativo;
- tipo e versão do leiaute;
- payload canônico;
- hash;
- identificador idempotente;
- estado;
- protocolo ou recibo;
- mensagens de retorno;
- relação com evento anterior;
- autorização de envio;
- reconciliação posterior.

---

## 9. Consequências positivas

- cálculo reproduzível por competência;
- explicação de cada linha do demonstrativo;
- segurança para recálculos e retroatividades;
- integração confiável com eSocial, FGTS Digital e Financeiro;
- preservação de versões de rubricas e parâmetros;
- melhor auditoria tributária, trabalhista e contábil;
- separação entre devido, pago e declarado;
- testes determinísticos do motor;
- conciliação por obra e centro de custo;
- redução de ajustes manuais invisíveis.

---

## 10. Custos e impactos

- motor de fórmulas seguro e versionado;
- catálogos temporais de parâmetros e rubricas;
- grande volume de entradas e resultados imutáveis;
- necessidade de snapshots e hashes;
- processamento assíncrono e filas;
- segregação de funções e acesso salarial;
- reconciliação com múltiplos sistemas externos;
- homologação contábil, fiscal, previdenciária e trabalhista;
- testes de regressão por competência e categoria;
- migração cuidadosa de históricos quando existentes.

---

## 11. Alternativas rejeitadas

### Usar planilha como motor oficial

Rejeitada porque planilhas não oferecem governança suficiente de versões, concorrência, autorização, integridade, idempotência e auditoria sistêmica.

### Atualizar o mesmo demonstrativo em cada recálculo

Rejeitada porque elimina a prova do resultado anteriormente conferido e fechado.

### Usar o S-1200 como folha canônica

Rejeitada porque o evento externo é uma declaração projetada e não contém toda a memória interna, aprovações, rateios, ajustes e explicações.

### Tratar pagamento como fechamento

Rejeitada porque cálculo, aprovação, declaração e transferência financeira possuem tempos e falhas diferentes.

### Codificar alíquotas diretamente nas fórmulas

Rejeitada porque parâmetros mudam por vigência e precisam de fonte, aprovação, simulação e histórico.

### Permitir JavaScript ou SQL livre em rubricas

Rejeitada por risco de segurança, não determinismo, acesso indevido e impossibilidade de governança.

### Alterar rubrica histórica

Rejeitada porque destruiria a reprodução de folhas anteriores.

---

## 12. Critérios de aceite da futura implementação

- uma folha fechada pode ser reproduzida com o mesmo hash;
- cada linha identifica fato, rubrica, fórmula, parâmetro e arredondamento;
- nova versão de rubrica não altera competência anterior;
- recálculo cria nova execução sem sobrescrever a anterior;
- ajuste manual aparece separado e possui aprovador;
- valor pago pode diferir do devido e a divergência é visível;
- folha complementar aponta a competência e o fato originário;
- reabertura preserva o fechamento anterior;
- evento externo rejeitado não apaga o cálculo aprovado;
- reconciliação demonstra diferenças entre cálculo, pagamento e declaração;
- usuário sem permissão salarial não acessa valores;
- exportação sensível fica registrada;
- ciclo entre fórmulas é bloqueado;
- parâmetro sem vigência válida impede cálculo oficial;
- totais por trabalhador reconciliam com totais da empresa;
- rateio por obra não altera o líquido;
- pagamento duplicado é impedido por idempotência;
- execução parcial não pode ser fechada como completa;
- demonstrativo explica valores em linguagem operacional;
- auditor consegue identificar quem calculou, ajustou, aprovou, fechou, reabriu e transmitiu.

---

## 13. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas fontes oficiais vigentes:

- documentação técnica do eSocial S-1.3 consolidada até NT 06/2026;
- eventos S-1010, S-1200, S-1210, S-1298 e S-1299;
- regras de remuneração, pagamento, exclusão, fechamento e reabertura;
- tabelas de contribuição previdenciária vigentes a partir de janeiro de 2026;
- tabelas de tributação do imposto de renda de 2026;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- notas orientativas e documentação oficial correlata.

A baseline diferencia rubrica, remuneração, pagamento e fechamento. Valores, faixas, códigos, prazos, incidências e interpretações deverão ser conferidos novamente antes da implementação, homologação e produção.

---

## 14. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md`;
- `docs/PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md`;
- `docs/PROJETO-RH-MODULO-05-JORNADAS-PONTO-E-BANCO-DE-HORAS.md`;
- `docs/PROJETO-RH-MODULO-06-FERIAS-AFASTAMENTOS-E-LICENCAS.md`;
- `docs/PROJETO-RH-MODULO-07-BENEFICIOS-DEPENDENTES-E-DESCONTOS.md`;
- `docs/PROJETO-RH-MODULO-08-SST-RISCOS-EXAMES-E-HABILITACOES.md`;
- `docs/PROJETO-RH-MODULO-09-FOLHA-RUBRICAS-CALCULO-E-FECHAMENTO.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`.
