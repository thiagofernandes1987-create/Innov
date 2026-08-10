# ADR-007 — Separação entre Benefício, Plano, Adesão, Pessoa Coberta, Dependente, Alimentando e Desconto

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O domínio de benefícios e descontos costuma ser implementado como um conjunto de campos diretamente no cadastro do empregado ou como rubricas fixas da folha. Essa abordagem é insuficiente para a Innovar Platform porque mistura conceitos diferentes:

- a política que concede o benefício;
- o plano comercial contratado com fornecedor;
- a adesão do trabalhador;
- as pessoas efetivamente cobertas;
- o dependente para uma finalidade específica;
- o beneficiário de seguro ou auxílio;
- o alimentando indicado em ordem judicial;
- a cobrança recebida do fornecedor;
- o subsídio da empresa;
- a coparticipação do trabalhador;
- a instrução de desconto enviada à folha;
- o desconto efetivamente processado;
- o pagamento realizado a terceiro.

A mesma pessoa pode exercer papéis diferentes ao longo do tempo. Um filho pode ser dependente para plano de saúde, não ser dependente para imposto de renda e ser beneficiário de seguro. Um ex-cônjuge pode ser alimentando sem ser dependente cadastral. Um plano pode incluir o titular e pessoas cobertas que não produzem dedução tributária.

Também existem fontes jurídicas distintas para descontos:

- lei;
- ordem judicial;
- acordo homologado;
- instrumento coletivo;
- adesão ou autorização do trabalhador;
- ressarcimento ou coparticipação prevista na política;
- contrato de empréstimo ou consignação;
- ajuste decorrente de conciliação com fornecedor.

Transformar tudo em uma rubrica recorrente sem origem, vigência, memória de cálculo e evidência produziria riscos de desconto indevido, duplicidade, exposição de dados familiares e impossibilidade de reconstruir a folha.

---

## 2. Decisão

O Projeto RH adotará entidades e responsabilidades separadas.

```text
Catálogo de benefício
  → Política de elegibilidade
    → Plano e condições comerciais
      → Adesão do trabalhador
        → Pessoas cobertas
          → Movimentos de cobertura

Pessoa relacionada
  → Papéis por finalidade
      ├─ dependente cadastral
      ├─ dependente para IRRF
      ├─ dependente para salário-família
      ├─ pessoa coberta em benefício
      ├─ beneficiário de seguro
      ├─ contato de emergência
      └─ alimentando

Fonte de obrigação ou autorização
  → Regra de cálculo
    → Instrução recorrente
      → Evento por competência
        → Resultado da folha
          → pagamento, repasse ou conciliação
```

### 2.1 Catálogo de benefício

Representará a natureza funcional do benefício, por exemplo:

- transporte;
- alimentação;
- refeição;
- assistência médica;
- assistência odontológica;
- seguro de vida;
- auxílio-creche;
- previdência complementar;
- empréstimo ou consignação;
- benefício flexível;
- auxílio específico configurado pela organização.

O catálogo não conterá a adesão individual nem substituirá a rubrica da folha.

### 2.2 Política de benefício

Representará as regras versionadas de:

- elegibilidade;
- obrigatoriedade ou opcionalidade;
- carência;
- data de início e encerramento;
- suspensão durante afastamentos;
- manutenção após desligamento, quando aplicável;
- subsídio da empresa;
- participação do trabalhador;
- limites;
- dependentes permitidos;
- documentos necessários;
- aprovações;
- reflexos em folha;
- instrumentos coletivos ou normas de origem.

### 2.3 Plano e contrato com fornecedor

Representará a oferta operacional ou comercial contratada pela empresa. Um benefício poderá possuir mais de um plano por empresa, estabelecimento, região, categoria ou vigência.

O plano poderá referenciar fornecedor, operadora, produto, rede, tabela de preços, faixas, datas de reajuste, regras de faturamento e arquivos de integração. Essa estrutura não será duplicada como adesão individual.

### 2.4 Adesão

Representará a decisão e o estado do trabalhador em relação a um benefício ou plano.

Estados mínimos:

- proposta;
- pendente de documentos;
- pendente de aprovação;
- aguardando fornecedor;
- ativa;
- suspensa;
- encerrada;
- rejeitada;
- cancelada;
- em divergência.

A adesão possuirá vigência própria e não será inferida apenas pela existência de desconto em folha.

### 2.5 Pessoa coberta

Representará cada pessoa incluída em um plano ou benefício. Titular e dependentes serão coberturas distintas, com identificadores e vigências próprias.

A exclusão de uma pessoa coberta não excluirá a pessoa do cadastro mestre nem apagará coberturas anteriores.

### 2.6 Pessoa relacionada e papéis por finalidade

A relação familiar ou jurídica será cadastrada uma vez, mas seus efeitos serão declarados por finalidade e vigência.

Exemplo:

```text
Pessoa relacionada: Maria
Relação: filha
Papéis:
  - plano de saúde: sim, 01/2026 em diante
  - IRRF: sim, 01/2026 a 12/2026
  - salário-família: não
  - seguro de vida: beneficiária em 40%
  - contato de emergência: não
```

Nenhum papel será automaticamente inferido de outro.

### 2.7 Beneficiário

Representará a pessoa ou entidade destinatária de cobertura, indenização, auxílio ou repasse. Beneficiário não será sinônimo de dependente.

Percentuais de beneficiários deverão ser validados por vigência, finalidade e total aplicável.

### 2.8 Alimentando

Representará a pessoa beneficiária de obrigação alimentar vinculada a uma ordem, acordo homologado ou outro título válido.

Alimentando não será cadastrado automaticamente como dependente do trabalhador.

### 2.9 Ordem ou obrigação de desconto

Representará a fonte jurídica ou autorizativa de um desconto. Conterá:

- tipo e origem;
- processo ou referência;
- autoridade ou parte emissora;
- datas de vigência;
- destinatários;
- fórmula;
- bases de cálculo;
- incidência sobre salário, férias, décimo terceiro, participação, verbas rescisórias ou outras bases configuradas;
- valor mínimo, máximo ou fixo, quando aplicável;
- prioridade;
- dados de repasse;
- documentos e evidências;
- situação e histórico.

### 2.10 Instrução recorrente

Representará a regra operacional enviada à folha em cada competência. Será derivada da obrigação, adesão ou política vigente.

A instrução não será o resultado financeiro final. Ela poderá ser:

- projetada;
- validada;
- enviada;
- processada;
- parcialmente atendida;
- não atendida por insuficiência ou regra de limite;
- estornada;
- substituída por nova versão.

### 2.11 Evento de cobrança ou concessão

Cada competência produzirá eventos imutáveis de:

- benefício concedido;
- custo da empresa;
- contribuição do trabalhador;
- coparticipação;
- ajuste;
- crédito;
- desconto;
- estorno;
- repasse;
- reembolso.

O saldo ou valor acumulado será derivado desses movimentos.

### 2.12 Cobrança e conciliação do fornecedor

A fatura ou arquivo do fornecedor será importado como evidência financeira independente da adesão. O sistema reconciliará:

- titular e pessoa coberta;
- plano;
- competência;
- período de cobertura;
- valor contratado;
- valor cobrado;
- custo da empresa;
- valor do trabalhador;
- eventos da folha;
- centro de custo;
- divergências.

Cobrança do fornecedor não criará adesão automaticamente.

---

## 3. Modelo conceitual inicial

```text
benefit_catalogs
  └─ benefit_policies
       └─ benefit_plans
            ├─ benefit_enrollments
            │    └─ benefit_coverages
            │         └─ coverage_movements
            ├─ benefit_price_versions
            └─ provider_billing_items

people
  └─ person_relationships
       └─ relationship_roles
            ├─ tax_dependent_roles
            ├─ family_allowance_roles
            ├─ benefit_coverage_roles
            ├─ insurance_beneficiary_roles
            └─ emergency_contact_roles

support_obligations
  ├─ support_beneficiaries
  ├─ support_formula_versions
  ├─ support_payment_destinations
  └─ recurring_payroll_instructions

recurring_deduction_authorizations
  ├─ deduction_rule_versions
  └─ recurring_payroll_instructions

benefit_financial_movements
  ├─ payroll_result_links
  ├─ provider_billing_links
  ├─ finance_payment_links
  └─ cost_center_allocations
```

Os nomes são provisórios. Esta ADR define fronteiras funcionais e não autoriza migrations antes da revisão do modelo físico.

---

## 4. Regras obrigatórias

1. Dependente não será um campo simples no vínculo.
2. Relação familiar e finalidade de dependência serão objetos distintos.
3. Pessoa coberta não será automaticamente dependente tributário.
4. Alimentando não será automaticamente dependente.
5. Beneficiário de seguro não será automaticamente pessoa coberta em plano de saúde.
6. Adesão não será inferida apenas por desconto em folha.
7. Cobrança de fornecedor não criará adesão ou dependente automaticamente.
8. Rubrica de folha não substituirá a política de benefício.
9. Todo desconto recorrente possuirá fonte jurídica, coletiva, contratual ou autorizativa identificada.
10. Autorizações possuirão versão, vigência, prova e possibilidade de revogação conforme a natureza aplicável.
11. Ordem judicial ou obrigação alimentar não será apagada; será encerrada, substituída ou retificada com histórico.
12. Fórmulas de pensão ou descontos judiciais serão versionadas e reproduzíveis.
13. Alteração retroativa criará diferenças e reprocessamentos explícitos.
14. Resultado de folha será relacionado à instrução que o originou.
15. Valor não descontado não será silenciosamente considerado quitado.
16. Insuficiência de margem, limite ou base produzirá ocorrência explícita.
17. Estorno será novo movimento, não exclusão do movimento original.
18. Custos da empresa e do trabalhador serão registrados separadamente.
19. Coparticipação será distinta da mensalidade ou contribuição fixa.
20. Reajustes de plano possuirão vigência e não reescreverão competências anteriores.
21. Exclusão de dependente preservará histórico de cobertura, cobrança e desconto.
22. Dados médicos detalhados não serão armazenados no domínio de benefícios.
23. Gestores operacionais não visualizarão documentos familiares, ordens judiciais ou valores individuais.
24. CPF e demais identificadores serão exigidos apenas quando necessários à finalidade configurada.
25. Parâmetros legais, tributários e de incidência serão versionados, nunca constantes fixas no código.
26. Centro de custo não será duplicado dentro do módulo de benefícios.
27. Arquivos de fornecedor e folha terão hash, origem, competência e trilha de processamento.
28. Importações serão idempotentes.
29. Duplicidades serão bloqueadas por chaves funcionais e não apenas por nome.
30. Relatórios agregados aplicarão minimização e controle de acesso.

---

## 5. Tratamento temporal

O domínio adotará, no mínimo:

- vigência da política;
- vigência do plano;
- vigência da tabela de preços;
- vigência da elegibilidade;
- vigência da adesão;
- vigência da cobertura individual;
- competência de concessão;
- competência de desconto;
- data de cobrança;
- data de pagamento;
- instante de registro;
- instante de processamento;
- instante de conciliação.

Esses tempos não serão colapsados em uma única data.

---

## 6. Descontos e prioridades

O sistema deverá suportar uma fila configurável de descontos, respeitando a natureza e as regras aplicáveis.

A ordem de processamento não será uma lista global fixa. Será resolvida por:

- tipo de obrigação;
- norma de origem;
- instrumento coletivo;
- decisão judicial;
- competência;
- limite ou margem disponível;
- prioridade configurada;
- coexistência com outras obrigações;
- regra da folha vigente.

Quando duas instruções conflitarem, o sistema não escolherá silenciosamente. Criará bloqueio ou decisão auditável.

---

## 7. Integração com eSocial, folha e fiscal

O sistema deverá ser capaz de representar sem acoplamento rígido:

- tipos de dependente vigentes nas tabelas oficiais;
- indicação de dependência para IRRF;
- indicação para salário-família;
- identificação de beneficiários de pensão alimentícia;
- plano de saúde coletivo e pessoas relacionadas;
- rubricas de benefícios e descontos;
- valores efetivamente pagos ou descontados;
- eventos e retificações por competência.

O código oficial não substituirá o motivo interno. O mapeamento possuirá versão e vigência.

---

## 8. Privacidade e segurança

O domínio contém dados de alto impacto:

- composição familiar;
- filiação e guarda;
- decisões judiciais;
- valores de pensão;
- dados bancários de beneficiários;
- adesões a planos;
- pessoas cobertas;
- descontos e dívidas;
- documentos comprobatórios.

Serão exigidos:

- permissões granulares;
- segregação entre RH, folha, jurídico, financeiro e gestor;
- criptografia de dados sensíveis;
- mascaramento em listagens;
- trilha de acesso a documentos;
- retenção por finalidade;
- exportação controlada;
- proibição de exposição em logs técnicos;
- auditoria de consulta e alteração.

---

## 9. Alternativas rejeitadas

### Colocar todos os benefícios em colunas do empregado

Rejeitada porque não suporta planos, dependentes, reajustes, períodos, fornecedores, coparticipação ou histórico.

### Usar rubricas da folha como cadastro de benefício

Rejeitada porque rubrica representa tratamento remuneratório, não elegibilidade, cobertura ou contrato com fornecedor.

### Criar uma tabela única de dependentes

Rejeitada porque mistura relação familiar, finalidade tributária, cobertura, beneficiário e alimentando.

### Considerar fatura do fornecedor como verdade da adesão

Rejeitada porque faturas podem conter atrasos, erros, duplicidades e cobranças após exclusão.

### Permitir edição direta de desconto em folha

Rejeitada porque elimina a origem, autorização, fórmula, vigência e trilha de aprovação.

### Guardar apenas o saldo de desconto ou benefício

Rejeitada porque impede reconstrução, estorno, conciliação e auditoria.

---

## 10. Consequências positivas

- dependentes com múltiplas finalidades sem duplicação;
- benefícios versionados e auditáveis;
- suporte a múltiplos fornecedores e planos;
- cálculo reproduzível de contribuições e descontos;
- conciliação entre adesão, folha, fornecedor e financeiro;
- preservação de ordens judiciais e beneficiários;
- integração futura com eSocial e fiscal sem acoplamento estrutural;
- menor exposição de dados familiares;
- rastreabilidade de valores não descontados, diferenças e estornos.

---

## 11. Custos e impactos

- criação de novas entidades e permissões;
- necessidade de catálogo e políticas versionadas;
- integração futura com folha e contas a pagar;
- tratamento de arquivos heterogêneos de fornecedores;
- reconciliação de cadastros legados;
- necessidade de revisão jurídica e trabalhista por tipo de desconto;
- testes extensos de retroatividade e concorrência;
- governança de documentos sensíveis.

---

## 12. Critérios de aceite da futura implementação

- uma pessoa relacionada pode possuir papéis diferentes por finalidade e vigência;
- trabalhador pode aderir a plano sem transformar pessoa coberta em dependente tributário;
- ordem de pensão pode possuir mais de um beneficiário e fórmula versionada;
- alteração de fórmula não muda cálculos históricos;
- desconto processado referencia a instrução e a obrigação de origem;
- valor não descontado gera ocorrência e não desaparece;
- fatura do fornecedor é conciliada sem criar adesão automaticamente;
- exclusão de cobertura preserva cobrança e folha anteriores;
- gestor de obra não visualiza valores ou documentos familiares;
- relatório de custo distingue empresa, trabalhador, fornecedor e centro de custo;
- reprocessamento retroativo produz movimentos compensatórios e trilha completa;
- importação repetida do mesmo arquivo não duplica cobranças ou descontos.

---

## 13. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas fontes oficiais vigentes:

- documentação técnica do eSocial S-1.3 consolidada até a NT 06/2026 e notas orientativas publicadas;
- Tabela 07 de tipos de dependente;
- grupos de dependentes, plano de saúde e pensão alimentícia nos eventos de remuneração e pagamento;
- Tabela 03 de naturezas de rubricas, incluindo benefícios e descontos;
- tabela de tributação de 2026 da Receita Federal;
- Lei nº 7.418/1985 e regulamentação do vale-transporte;
- Lei nº 6.321/1976 e regulamentação vigente do Programa de Alimentação do Trabalhador;
- texto compilado da CLT para regras gerais de desconto salarial.

A implementação deverá verificar novamente normas, leiautes, limites, incidências, instrumentos coletivos e decisões aplicáveis antes da homologação e produção.

---

## 14. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md`;
- `docs/PROJETO-RH-MODULO-03-ADMISSAO-PRE-ADMISSAO.md`;
- `docs/PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md`;
- `docs/PROJETO-RH-MODULO-06-FERIAS-AFASTAMENTOS-E-LICENCAS.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/PERSONAS-E-ROTINAS.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
