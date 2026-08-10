# Projeto RH — Módulo 04: Contratos de Trabalho, Alterações e Histórico por Vigência

**Versão:** 0.1.0  
**Data:** 6 de agosto de 2026  
**Estado:** especificação funcional inicial concluída; validação de produto, jurídica e contábil pendente  
**Implementação:** não iniciada  

---

## 1. Finalidade

O Módulo 04 administrará as condições contratuais do vínculo desde a ativação até seu encerramento, preservando versões, vigências, documentos, aprovações, impactos e integrações.

O módulo deverá responder de forma confiável:

- quais condições estão vigentes hoje;
- quais condições vigorarão no futuro;
- quais condições estavam vigentes em uma data passada;
- quais alterações estão pendentes;
- quais alterações foram rejeitadas ou canceladas;
- quais documentos sustentam cada condição;
- quais mudanças impactam folha, ponto, benefícios ou obrigações;
- quais eventos externos foram preparados, transmitidos ou retificados;
- quem propôs, aprovou e aplicou cada mudança.

A implementação seguirá a ADR-004: versões aplicadas serão imutáveis e a alteração será um caso auditável separado da versão resultante.

---

## 2. Escopo

### 2.1 Incluído

- contrato lógico do vínculo;
- versão contratual inicial;
- versões futuras e históricas;
- alteração de remuneração;
- alteração de periodicidade de pagamento;
- alteração de cargo;
- alteração de função;
- alteração de posição;
- alteração de unidade e lotação;
- alteração de estabelecimento;
- alteração de local contratual;
- alteração de jornada ou referência de jornada;
- alteração de modalidade de trabalho;
- teletrabalho e retorno ao presencial;
- alteração de duração ou termo;
- prorrogação de contrato por prazo determinado;
- conversão conforme fluxo autorizado;
- alteração de sindicato ou enquadramento;
- alteração de centro de custo e rateio quando contratualmente relevante;
- adicionais e condições recorrentes contratuais;
- observações e cláusulas configuráveis;
- solicitação, conferência, aprovação e aplicação;
- aditivos e documentos;
- ciência e assinatura;
- impacto em folha e integrações;
- correção e retificação controladas;
- relatórios e auditoria.

### 2.2 Fora deste módulo

- marcação diária de ponto;
- cálculo de horas;
- folha completa;
- desligamento;
- medicina ocupacional completa;
- gestão de benefícios completa;
- transmissão real ao eSocial nesta fase documental;
- interpretação automática e definitiva da legislação;
- assinatura digital real sem definição de provedor e controles de produção.

---

## 3. Princípios funcionais

1. vínculo é raiz estável;
2. contrato organiza as condições do vínculo;
3. versão contratual é snapshot imutável;
4. alteração é fluxo separado;
5. vigência e registro são tempos distintos;
6. documento é evidência, não única fonte canônica;
7. correção e alteração não são sinônimos;
8. impacto será registrado e tratado;
9. aplicação será transacional e idempotente;
10. integração externa será projeção rastreável.

---

## 4. Perfis e responsabilidades

| Perfil | Responsabilidades principais |
|---|---|
| Gestor de DP | propor, revisar, aprovar e aplicar alterações dentro da alçada |
| Analista de DP | preparar alterações, documentos e conferências |
| Gestor de RH | propor mudanças de cargo, função, unidade e estrutura |
| Gestor de Folha | avaliar impacto financeiro e de competência |
| Analista de Folha | conferir repercussões e pendências de cálculo |
| Gestor da área | solicitar alterações organizacionais autorizadas |
| Jurídico | revisar cláusulas e exceções conforme necessidade |
| Contabilidade | consultar impactos de centro de custo e contabilização permitidos |
| Empregado | consultar condições liberadas, documentos e solicitações de ciência |
| Auditor | consultar versões, diferenças, decisões e evidências |
| Administrador | configurar tipos, alçadas, modelos e permissões, sem aprovar automaticamente |

---

## 5. Objetos funcionais

### 5.1 Contrato

Campos conceituais:

- identificador;
- vínculo;
- tipo;
- situação;
- data de início;
- data de término quando aplicável;
- versão atual;
- versão futura mais próxima;
- origem;
- responsável;
- criado em;
- encerrado em;
- motivo de encerramento.

### 5.2 Versão contratual

Cada versão deverá conter snapshot das condições relevantes:

- empresa empregadora;
- estabelecimento;
- unidade organizacional;
- posição;
- cargo;
- função;
- responsável hierárquico quando aplicável;
- local contratual;
- modalidade de trabalho;
- tipo e duração do contrato;
- início e fim previstos;
- remuneração contratual;
- unidade e periodicidade de pagamento;
- jornada contratual ou referência versionada;
- sindicato e enquadramento;
- centro de custo;
- rateio quando aplicável;
- categoria e condições adicionais;
- cláusulas estruturadas;
- observações autorizadas;
- início e fim da vigência;
- registrado em;
- motivo;
- origem;
- versão anterior;
- solicitação de origem;
- hash ou assinatura de conteúdo quando aplicável.

### 5.3 Solicitação de alteração

Campos:

- identificador;
- contrato e vínculo;
- tipo de alteração;
- motivo;
- justificativa;
- data efetiva proposta;
- urgência;
- origem;
- solicitante;
- responsável atual;
- estado;
- diferenças propostas;
- documentos;
- aprovações;
- impactos;
- exceções;
- aplicado em;
- cancelado em;
- rejeitado em;
- chave de idempotência.

### 5.4 Diferença estruturada

Cada mudança deverá identificar:

- campo ou dimensão;
- valor anterior;
- valor proposto;
- valor normalizado;
- classificação;
- sensibilidade;
- impacto potencial;
- necessidade de documento;
- necessidade de ciência;
- necessidade de integração externa.

### 5.5 Impacto

Tipos iniciais:

- `PAYROLL_RECALCULATION`;
- `PAYROLL_FUTURE_EFFECT`;
- `TIME_CONFIGURATION`;
- `BENEFIT_REVIEW`;
- `DOCUMENT_REISSUE`;
- `SIGNATURE_REQUIRED`;
- `GOVERNMENT_EVENT`;
- `ACCOUNTING_REVIEW`;
- `PROJECT_ALLOCATION_REVIEW`;
- `ACCESS_REVIEW`;
- `NOTIFICATION`;
- `MANUAL_REVIEW`.

---

## 6. Estados

### 6.1 Contrato

```text
DRAFT
  → ACTIVE
  → SUSPENDED
  → ENDED
  → CANCELED
```

`CANCELED` será reservado a registro inválido que não produziu efeitos, conforme permissão e análise. Contrato que produziu efeitos deverá ser encerrado, não cancelado para apagar o histórico.

### 6.2 Versão contratual

```text
PROPOSED
  → APPROVED
  → SCHEDULED
  → EFFECTIVE
  → SUPERSEDED
  → VOIDED_BY_CONTROLLED_CORRECTION
```

Versões aplicadas não retornarão a rascunho.

### 6.3 Solicitação de alteração

```text
DRAFT
  → IN_COMPLETION
  → READY_FOR_REVIEW
  → IN_REVIEW
  → PENDING_APPROVAL
  → APPROVED
  → SCHEDULED
  → APPLYING
  → APPLIED
```

Saídas alternativas:

```text
DRAFT / IN_COMPLETION / IN_REVIEW
  → CANCELED

IN_REVIEW / PENDING_APPROVAL
  → REJECTED

READY_FOR_REVIEW / IN_REVIEW / PENDING_APPROVAL
  → NEEDS_CORRECTION

APPROVED / SCHEDULED
  → REVOKED_BEFORE_EFFECT

APPLIED
  → CORRECTION_REQUIRED
  → RECTIFICATION_IN_PROGRESS
  → RECTIFIED
```

### 6.4 Impactos

```text
PENDING
  → IN_PROGRESS
  → RESOLVED
  → WAIVED
  → FAILED
  → SUPERSEDED
```

Dispensa exigirá permissão, justificativa e evidência.

---

## 7. Telas e rotas sugeridas

### 7.1 Contratos

Rota: `/app/departamento-pessoal/contratos`

Elementos:

- busca por pessoa, matrícula e contrato;
- filtros por empresa, estabelecimento, tipo, situação, unidade e cargo;
- indicador de alteração futura;
- indicador de alteração retroativa;
- indicador de impacto pendente;
- indicador de documento ou assinatura pendente;
- ações conforme permissão.

### 7.2 Detalhe do contrato

Rota: `/app/departamento-pessoal/contratos/[id]`

Abas:

- resumo atual;
- linha do tempo;
- versões;
- alterações;
- documentos;
- assinaturas e ciências;
- impactos;
- eventos externos;
- auditoria.

O resumo deverá mostrar explicitamente a data de referência usada na consulta.

### 7.3 Consultar contrato em uma data

Componente no detalhe:

- seletor de data;
- versão vigente;
- origem da versão;
- diferenças para hoje;
- documentos válidos naquela data;
- eventos e cálculos relacionados.

### 7.4 Nova alteração

Rota: `/app/departamento-pessoal/contratos/[id]/alteracoes/nova`

Etapas:

1. escolher tipo;
2. informar data efetiva;
3. carregar versão-base;
4. editar somente dimensões permitidas;
5. exibir diferenças;
6. avaliar impactos;
7. anexar ou gerar documentos;
8. definir ciência e assinatura;
9. revisar validações;
10. enviar para conferência.

### 7.5 Detalhe da alteração

Rota: `/app/departamento-pessoal/alteracoes-contratuais/[id]`

Seções:

- estado;
- contrato e trabalhador;
- versão-base;
- data efetiva;
- diferenças;
- motivo;
- documentos;
- aprovações;
- impactos;
- integração externa;
- histórico.

### 7.6 Agenda de alterações

Rota: `/app/departamento-pessoal/alteracoes-contratuais/agenda`

Visões:

- futuras por data efetiva;
- retroativas ainda não tratadas;
- aprovadas aguardando aplicação;
- falhas de aplicação;
- impactos pendentes;
- prazos de integração.

### 7.7 Modelos e cláusulas

Rota: `/app/departamento-pessoal/configuracoes/contratos`

Configurações:

- tipos de contrato;
- tipos de alteração;
- regras de aprovação;
- campos obrigatórios;
- modelos documentais;
- cláusulas;
- tipos de assinatura;
- prazos internos;
- impactos padrão;
- validações configuráveis.

---

## 8. Tipos iniciais de contrato

O catálogo será configurável e versionado. Tipos iniciais de referência:

- prazo indeterminado;
- prazo determinado;
- experiência;
- intermitente;
- aprendiz;
- teletrabalho como modalidade contratual;
- contrato ou relação específica configurada;
- trabalhador sem vínculo tratado em domínio próprio quando aplicável.

O sistema não deverá presumir que todos os tipos seguem as mesmas regras.

---

## 9. Tipos iniciais de alteração

- remuneração;
- periodicidade ou unidade de pagamento;
- cargo;
- função;
- posição;
- unidade organizacional;
- estabelecimento;
- local de trabalho;
- modalidade presencial, híbrida ou remota;
- jornada;
- horário ou escala de referência;
- duração;
- prorrogação;
- conversão;
- sindicato ou enquadramento;
- centro de custo;
- rateio;
- responsabilidade hierárquica;
- cláusula adicional;
- condição recorrente;
- correção cadastral relacionada;
- correção contratual controlada;
- alteração múltipla.

Alteração múltipla deverá manter diferenças por dimensão e impactos individualizados.

---

## 10. Fluxo principal: alteração com vigência futura

1. Usuário autorizado abre o contrato.
2. Seleciona `Nova alteração`.
3. Define tipo e data efetiva futura.
4. Sistema carrega a versão aplicável imediatamente antes da data.
5. Usuário informa novas condições.
6. Sistema valida estrutura, vigência e conflitos.
7. Sistema mostra diferenças e impactos.
8. Usuário anexa ou gera documentos.
9. Solicitação é enviada para conferência.
10. Conferente revisa dados e evidências.
11. Aprovadores decidem conforme alçada.
12. Solicitação aprovada fica `SCHEDULED`.
13. Na data ou rotina prevista, aplicação transacional cria nova versão.
14. Versão anterior é encerrada no instante correto.
15. Impactos são criados.
16. Integrações são preparadas.
17. Auditoria é registrada.

---

## 11. Fluxo: alteração com vigência imediata

O fluxo seguirá as mesmas etapas, mas poderá aplicar após aprovação quando a data efetiva for igual à data corrente e todas as dependências estiverem resolvidas.

Não será permitido pular conferência ou aprovação apenas por urgência. O sistema poderá oferecer fluxo emergencial configurado com alçada superior e justificativa reforçada.

---

## 12. Fluxo: alteração retroativa

1. Usuário informa data efetiva anterior à data corrente.
2. Sistema classifica como retroativa.
3. Sistema identifica competências, cálculos, eventos e documentos afetados.
4. Sistema exige justificativa e evidência.
5. Sistema verifica se existe folha fechada no período.
6. Sistema verifica versões posteriores incompatíveis.
7. Conferente analisa a linha temporal resultante.
8. Aprovador decide conforme alçada especial.
9. Aplicação cria ou corrige a linha temporal sem apagar versões.
10. Impactos de recálculo, retificação e documento são gerados.
11. Nenhum cálculo fechado é alterado silenciosamente.

### Regra de conflito

Se a alteração retroativa afetar versões posteriores, o sistema deverá:

- simular a linha do tempo;
- exigir revisão de cada versão dependente;
- reconstituir versões futuras quando permitido;
- ou bloquear e exigir tratamento manual.

---

## 13. Fluxo: correção de informação incorreta

1. Usuário seleciona `Corrigir informação`.
2. Sistema exige classificar por que o dado original estava incorreto.
3. Sistema mostra eventos, folhas e documentos dependentes.
4. Usuário informa valor correto e evidência.
5. Conferente decide se é correção ou fato novo.
6. Aprovador autoriza o procedimento.
7. Sistema preserva versão incorreta e registra sua invalidação controlada.
8. Nova versão ou retificação interna é criada.
9. Impactos externos são gerados.

O sistema deverá impedir que correção seja usada para ocultar decisão anterior legítima.

---

## 14. Fluxo: prorrogação de prazo

- identificar contrato por prazo determinado;
- validar prazo atual;
- informar novo término;
- validar limites e regras configuradas;
- exigir documento quando aplicável;
- calcular prazo interno de processamento;
- preparar impacto externo;
- aplicar nova versão;
- manter o termo anterior na linha do tempo.

Prazos legais não serão fixados sem versão e fonte. O sistema deverá permitir atualização parametrizada e bloqueio por regra validada.

---

## 15. Fluxo: mudança de modalidade de trabalho

Para presencial, híbrido e teletrabalho:

- registrar modalidade anterior e nova;
- definir data efetiva;
- indicar local contratual;
- registrar atividades e responsabilidades quando exigidas;
- registrar equipamentos, infraestrutura e reembolsos em módulo ou cláusula apropriada;
- gerar aditivo quando configurado;
- registrar ciência ou assinatura;
- registrar prazo de transição quando aplicável;
- avaliar impacto em jornada, segurança, benefícios e tributação territorial.

---

## 16. Fluxo: transferência

O sistema distinguirá:

- mudança de obra;
- mudança de equipe;
- mudança de unidade organizacional;
- mudança de estabelecimento;
- mudança de localidade contratual;
- transferência entre empresas;
- sucessão ou cenário especial.

Mudança de obra ou equipe poderá ser apenas operacional. Mudança de empresa empregadora não será simples alteração de contrato sem procedimento específico aprovado.

Quando houver mudança de localidade, o sistema deverá exigir classificação, consentimento ou fundamento, despesas e adicionais quando aplicáveis à regra configurada.

---

## 17. Documentos

### 17.1 Tipos

- contrato inicial;
- aditivo;
- termo de alteração;
- comunicado;
- termo de ciência;
- termo de responsabilidade;
- documento de transferência;
- documento de promoção;
- documento de reajuste;
- instrumento coletivo;
- decisão administrativa ou judicial;
- evidência complementar.

### 17.2 Metadados obrigatórios

- tipo;
- versão;
- vínculo;
- contrato;
- solicitação de alteração;
- modelo utilizado;
- hash;
- arquivo privado;
- criado em;
- emitido em;
- vigência;
- signatários;
- estado de assinatura;
- documento anterior substituído, se houver;
- retenção;
- classificação de sensibilidade.

### 17.3 Regras

- documento emitido não será sobrescrito;
- nova emissão será nova versão;
- documento cancelado permanecerá auditável;
- download exigirá autorização;
- link temporário não substituirá autorização;
- documento salarial não será exposto a perfil operacional;
- documento médico não será armazenado neste conjunto contratual genérico sem segregação apropriada.

---

## 18. Ciência e assinatura

Estados sugeridos:

```text
NOT_REQUIRED
PENDING_GENERATION
PENDING_SEND
SENT
VIEWED
ACKNOWLEDGED
PARTIALLY_SIGNED
SIGNED
DECLINED
EXPIRED
CANCELED
FAILED
```

O sistema deverá diferenciar:

- visualização;
- ciência;
- aceite;
- assinatura eletrônica;
- assinatura digital qualificada;
- confirmação interna;
- ausência de manifestação.

Nenhum estado será inferido somente pelo envio de e-mail ou mensagem.

---

## 19. Integração com eventos externos

### 19.1 Classificação

A implementação deverá distinguir pelo menos:

- alteração cadastral do trabalhador;
- alteração contratual do empregado;
- alteração contratual de trabalhador sem vínculo;
- retificação de admissão;
- evento de desligamento ou outro evento posterior;
- alteração interna sem evento externo.

### 19.2 Regra de projeção

A versão contratual aprovada produzirá uma projeção conforme:

- categoria;
- tipo de vínculo;
- data efetiva;
- campos alterados;
- versão do leiaute;
- histórico externo já aceito;
- regras oficiais vigentes.

### 19.3 Estados

```text
NOT_REQUIRED
PENDING_VALIDATION
VALIDATED
PENDING_SIGNATURE
QUEUED
TRANSMITTED
PROTOCOL_RECEIVED
ACCEPTED
ACCEPTED_WITH_WARNING
REJECTED
CORRECTION_REQUIRED
RECTIFICATION_QUEUED
RECTIFIED
EXCLUSION_QUEUED
EXCLUDED
```

### 19.4 Baseline consultada

A documentação oficial vigente em 6 de agosto de 2026 identifica o S-2206 como evento de alteração de contrato e registra mudanças como remuneração, duração, local, cargo, função e jornada. Também orienta que erro no evento de admissão seja tratado por retificação do evento correspondente, não por alteração contratual fictícia.

A baseline deverá ser verificada novamente antes da implementação real.

---

## 20. Validações

### 20.1 Temporais

- data efetiva não anterior ao início do vínculo, salvo procedimento especial;
- término não anterior ao início;
- versão sem sobreposição incompatível;
- versão futura coerente com outras versões agendadas;
- prorrogação posterior ao término atual;
- data de registro preservada;
- alteração após desligamento bloqueada ou tratada por fluxo especial;
- alteração retroativa com impactos identificados.

### 20.2 Estruturais

- empresa pertence ao tenant;
- estabelecimento pertence à empresa;
- unidade pertence à estrutura válida;
- cargo e função estão ativos na vigência;
- posição pertence ao escopo correto;
- centro de custo é canônico;
- jornada referenciada existe e está vigente;
- modelo documental é compatível;
- categoria permite o tipo de alteração.

### 20.3 Remuneração

- moeda e unidade válidas;
- valor dentro dos controles configurados;
- redução ou mudança sensível exige alçada e análise;
- periodicidade coerente;
- adicionais não duplicados;
- valor não exposto a usuário sem permissão;
- impacto em folha identificado.

### 20.4 Contratos a prazo

- tipo compatível;
- termo definido;
- limites parametrizados;
- prorrogação validada;
- alertas de vencimento;
- conversão não silenciosa.

### 20.5 Documentais

- tipo obrigatório presente;
- arquivo válido;
- hash calculado;
- versão preservada;
- signatários definidos;
- estado de assinatura consistente;
- ausência de documento impeditivo bloqueia aplicação quando configurado.

---

## 21. Pendências impeditivas e não impeditivas

### Impeditivas possíveis

- ausência de aprovação obrigatória;
- conflito temporal;
- campo contratual obrigatório ausente;
- empresa ou estabelecimento inválido;
- redução salarial sem fluxo autorizado;
- documento obrigatório ausente;
- assinatura obrigatória pendente;
- regra de prazo violada;
- folha fechada afetada sem tratamento definido;
- evento externo anterior incompatível;
- alteração concorrente no mesmo período.

### Não impeditivas possíveis

- comunicação interna pendente;
- documento complementar;
- atualização de organograma sem efeito contratual imediato;
- confirmação de rateio futuro;
- alerta de prazo externo ainda não vencido.

Pendência não impeditiva permanecerá atribuída após aplicação.

---

## 22. Aprovações e alçadas

A regra poderá considerar:

- tipo de alteração;
- empresa;
- estabelecimento;
- unidade;
- cargo;
- valor anterior e novo;
- percentual de mudança;
- retroatividade;
- impacto em folha fechada;
- mudança de localidade;
- mudança de empresa;
- exceção jurídica;
- assinatura necessária;
- vínculo sensível.

Aprovador não poderá aprovar alteração própria quando a segregação exigir outro responsável.

---

## 23. Permissões

Capacidades sugeridas:

- `view_employment_contract`;
- `view_contract_history`;
- `view_salary`;
- `propose_contract_change`;
- `review_contract_change`;
- `approve_contract_change`;
- `apply_contract_change`;
- `schedule_contract_change`;
- `manage_retroactive_change`;
- `correct_contract_data`;
- `manage_contract_documents`;
- `request_contract_signature`;
- `view_contract_signature`;
- `waive_contract_requirement`;
- `view_contract_impacts`;
- `resolve_contract_impacts`;
- `prepare_government_change_event`;
- `transmit_government_change_event`;
- `rectify_government_change_event`;
- `export_contract_data`.

Negação deverá ocorrer também no servidor, banco, função e exportação.

---

## 24. Alertas

- contrato a prazo próximo do vencimento;
- experiência próxima do limite configurado;
- alteração futura prestes a vigorar;
- alteração aprovada não aplicada;
- falha de aplicação;
- alteração retroativa;
- folha fechada afetada;
- documento pendente;
- assinatura pendente ou expirada;
- evento externo pendente;
- rejeição externa;
- impacto sem responsável;
- versões futuras conflitantes;
- alteração sensível sem segunda aprovação;
- mudança de localidade com análise pendente.

---

## 25. Relatórios

- contratos ativos;
- contratos por tipo;
- contratos a vencer;
- experiência a vencer;
- condições vigentes em uma data;
- histórico de alterações por vínculo;
- alterações futuras;
- alterações retroativas;
- alterações por tipo e motivo;
- alterações rejeitadas;
- alterações aplicadas fora do prazo interno;
- impactos pendentes;
- documentos e assinaturas pendentes;
- eventos externos por estado;
- evolução salarial restrita;
- movimentações de cargo e função;
- transferências;
- alterações por solicitante e aprovador;
- dispensas e exceções.

Exportações respeitarão minimização e capacidade específica.

---

## 26. Requisitos funcionais

### RF-CTR-001 — Criar contrato inicial

Criar contrato a partir da admissão ativada, preservando a versão inicial aprovada.

### RF-CTR-002 — Consultar condição vigente

Consultar o snapshot completo vigente em uma data informada.

### RF-CTR-003 — Consultar linha do tempo

Exibir versões passadas, atual e futuras sem misturá-las.

### RF-CTR-004 — Criar solicitação de alteração

Criar caso auditável vinculado ao contrato.

### RF-CTR-005 — Selecionar versão-base

Determinar automaticamente a versão que antecede a data efetiva.

### RF-CTR-006 — Registrar diferenças

Persistir diferenças estruturadas entre versão-base e proposta.

### RF-CTR-007 — Alterar remuneração

Propor remuneração com vigência, motivo, alçada e impacto.

### RF-CTR-008 — Alterar cargo

Propor cargo válido sem alterar função silenciosamente.

### RF-CTR-009 — Alterar função

Propor função válida sem alterar cargo silenciosamente.

### RF-CTR-010 — Alterar posição

Associar posição vigente e controlar ocupação.

### RF-CTR-011 — Alterar unidade organizacional

Transferir lotação organizacional por vigência.

### RF-CTR-012 — Alterar estabelecimento

Registrar mudança com validações empresariais e externas.

### RF-CTR-013 — Alterar local contratual

Distinguir localidade contratual de obra ou equipe.

### RF-CTR-014 — Alterar jornada

Associar nova jornada versionada e criar impacto de ponto.

### RF-CTR-015 — Alterar modalidade de trabalho

Administrar presencial, híbrido e teletrabalho conforme configuração.

### RF-CTR-016 — Prorrogar contrato

Registrar novo termo com validação e documento.

### RF-CTR-017 — Converter tipo de contrato

Executar conversão somente por fluxo permitido.

### RF-CTR-018 — Alterar sindicato ou enquadramento

Registrar vigência e impacto em folha e benefícios.

### RF-CTR-019 — Alterar centro de custo

Usar centro de custo canônico compartilhado.

### RF-CTR-020 — Alterar rateio

Registrar percentuais com vigência e soma validada.

### RF-CTR-021 — Gerar documento

Gerar documento por modelo versionado e dados estruturados.

### RF-CTR-022 — Anexar documento externo

Associar artefato privado com metadados e hash.

### RF-CTR-023 — Solicitar ciência

Registrar solicitação e resultado sem confundir envio com ciência.

### RF-CTR-024 — Solicitar assinatura

Criar processo de assinatura rastreável.

### RF-CTR-025 — Conferir alteração

Executar revisão com checklist e observações.

### RF-CTR-026 — Aprovar por alçada

Exigir aprovadores conforme regras vigentes.

### RF-CTR-027 — Rejeitar alteração

Registrar motivo e impedir aplicação.

### RF-CTR-028 — Agendar alteração

Manter alteração aprovada até a data efetiva.

### RF-CTR-029 — Aplicar alteração

Criar nova versão de forma transacional e idempotente.

### RF-CTR-030 — Detectar retroatividade

Classificar e identificar impactos em períodos anteriores.

### RF-CTR-031 — Corrigir dado contratual

Preservar o valor incorreto e o procedimento corretivo.

### RF-CTR-032 — Gerar impactos

Criar itens derivados para módulos afetados.

### RF-CTR-033 — Resolver impacto

Registrar responsável, ação e evidência de resolução.

### RF-CTR-034 — Dispensar impacto

Permitir somente com capacidade, justificativa e auditoria.

### RF-CTR-035 — Preparar evento externo

Projetar dados aprovados para o leiaute configurado.

### RF-CTR-036 — Correlacionar protocolo e recibo

Associar retornos à alteração e versão de origem.

### RF-CTR-037 — Retificar evento externo

Criar novo fluxo sem sobrescrever transmissão anterior.

### RF-CTR-038 — Controlar concorrência

Impedir duas aplicações conflitantes.

### RF-CTR-039 — Exportar histórico

Gerar exportação autorizada com data de referência.

### RF-CTR-040 — Auditar acesso sensível

Registrar consulta e exportação salarial conforme política.

### RF-CTR-041 — Cancelar solicitação

Cancelar processo não aplicado preservando histórico.

### RF-CTR-042 — Revogar alteração futura

Revogar alteração aprovada antes da vigência com justificativa.

### RF-CTR-043 — Simular linha temporal

Mostrar resultado antes de aplicar alteração retroativa ou múltipla.

### RF-CTR-044 — Comparar versões

Exibir diferenças entre quaisquer duas versões autorizadas.

### RF-CTR-045 — Reemitir documento

Criar nova versão documental sem apagar a anterior.

---

## 27. Regras de negócio

### RN-CTR-001

Versão aplicada é imutável.

### RN-CTR-002

Vigência e registro são campos distintos.

### RN-CTR-003

Alteração futura não modifica a condição atual antes da data efetiva.

### RN-CTR-004

Alteração retroativa exige análise de impacto.

### RN-CTR-005

Correção não apaga versão incorreta.

### RN-CTR-006

Solicitação rejeitada não cria versão.

### RN-CTR-007

Aplicação repetida com a mesma chave retorna o mesmo resultado.

### RN-CTR-008

Não haverá sobreposição incompatível de versões.

### RN-CTR-009

Documento emitido não será sobrescrito.

### RN-CTR-010

Mudança de obra não altera contrato automaticamente.

### RN-CTR-011

Mudança de equipe não altera salário ou jornada.

### RN-CTR-012

Cargo e função são dimensões independentes.

### RN-CTR-013

Centro de custo será canônico e compartilhado.

### RN-CTR-014

Rateio deverá somar o total configurado para o período quando obrigatório.

### RN-CTR-015

Alteração com salário exige `view_salary` e capacidade de gestão correspondente.

### RN-CTR-016

Acesso ao Financeiro não concede acesso contratual irrestrito.

### RN-CTR-017

Aprovação não implica aplicação imediata quando a vigência é futura.

### RN-CTR-018

Aplicação parcial é proibida.

### RN-CTR-019

Falha de integração externa não reverte silenciosamente a versão interna.

### RN-CTR-020

Divergência externa será tratada por impacto e reconciliação.

### RN-CTR-021

Folha fechada não será recalculada silenciosamente.

### RN-CTR-022

Alteração de empresa exige fluxo específico.

### RN-CTR-023

Contrato que produziu efeitos não será apagado.

### RN-CTR-024

Cancelamento preserva decisões e documentos.

### RN-CTR-025

Dispensa exige justificativa e responsável.

### RN-CTR-026

Assinatura não será inferida por visualização.

### RN-CTR-027

Ciência não será inferida por entrega de mensagem.

### RN-CTR-028

Modelo de documento será versionado.

### RN-CTR-029

Regra de prazo será parametrizada com fonte e vigência.

### RN-CTR-030

Implementação verificará baseline oficial antes da produção.

---

## 28. Requisitos não funcionais

### RNF-CTR-001 — Consistência temporal

Consultas por data deverão ser determinísticas.

### RNF-CTR-002 — Idempotência

Aplicação, geração documental e integração não poderão duplicar efeitos.

### RNF-CTR-003 — Concorrência

Operações conflitantes deverão usar bloqueio ou controle otimista verificável.

### RNF-CTR-004 — Auditoria

Proposta, revisão, aprovação, aplicação, consulta sensível e exportação serão auditáveis.

### RNF-CTR-005 — Segurança

Dados salariais e documentos privados não serão enviados a clientes sem autorização.

### RNF-CTR-006 — Reprodutibilidade

A versão usada por cálculo ou evento permanecerá referenciável.

### RNF-CTR-007 — Desempenho

Consulta da condição vigente deverá usar índices temporais adequados sem varrer todo o histórico.

### RNF-CTR-008 — Observabilidade

Falhas de aplicação e integração produzirão eventos e métricas sem dados pessoais indevidos.

### RNF-CTR-009 — Privacidade

Logs não conterão salário, identificação completa ou conteúdo documental desnecessário.

### RNF-CTR-010 — Acessibilidade

Diferenças, estados e erros deverão ser compreensíveis sem depender apenas de cor.

---

## 29. Entidades conceituais propostas

Nomes provisórios, sem autorização de migration:

```text
employment_contracts
employment_contract_versions
employment_contract_change_cases
employment_contract_change_items
employment_contract_approvals
employment_contract_documents
employment_contract_acknowledgements
employment_contract_signatures
employment_contract_impacts
employment_contract_external_events
employment_contract_event_returns
employment_contract_audit_events
```

Relações esperadas:

```text
employment_relationship
  └─ employment_contract
       ├─ contract_versions
       ├─ change_cases
       │    ├─ change_items
       │    ├─ approvals
       │    ├─ documents
       │    └─ impacts
       └─ external_events
```

---

## 30. Critérios de aceite

1. O sistema consulta a condição vigente em qualquer data válida.
2. A consulta mostra a data de referência.
3. Versão futura não substitui a atual antes da vigência.
4. Versão aplicada não pode ser editada.
5. Alteração rejeitada não cria versão.
6. Alteração cancelada preserva histórico.
7. Aplicação repetida não duplica versão.
8. Aplicações concorrentes não geram sobreposição.
9. Alteração retroativa mostra impactos antes da aprovação.
10. Folha fechada afetada gera pendência explícita.
11. Correção preserva o valor incorreto anterior.
12. Comparação mostra diferenças por campo.
13. Documento reemitido não apaga o anterior.
14. Assinatura e ciência têm estados distintos.
15. Usuário sem `view_salary` não recebe remuneração.
16. Gestor de obra não altera contrato por editar equipe.
17. Mudança de cargo não muda função automaticamente.
18. Mudança de função não muda cargo automaticamente.
19. Centro de custo usa catálogo compartilhado.
20. Alteração múltipla mantém diferenças individualizadas.
21. Impactos possuem responsável e estado.
22. Dispensa registra justificativa e autor.
23. Evento externo referencia a versão de origem.
24. Retificação não sobrescreve transmissão anterior.
25. Relatório histórico reproduz a linha temporal.
26. Download de documento exige autorização.
27. Logs não expõem conteúdo salarial indevido.
28. Alteração de empresa é bloqueada no fluxo genérico.
29. Mudança operacional de obra não produz aditivo automaticamente.
30. Auditor identifica solicitante, conferente, aprovador e aplicador.

---

## 31. Cenários de teste

### Positivos

- reajuste futuro aprovado e aplicado na data;
- promoção com cargo e função válidos;
- prorrogação com documento assinado;
- teletrabalho com aditivo;
- transferência organizacional sem mudança de localidade;
- alteração retroativa com impactos resolvidos;
- comparação entre versões;
- consulta histórica;
- retificação externa correlacionada.

### Negativos

- sobreposição de versões;
- aplicação sem aprovação;
- alteração salarial por usuário sem permissão;
- alteração de empresa pelo fluxo genérico;
- documento obrigatório ausente;
- contrato a prazo fora da regra configurada;
- data efetiva anterior à admissão;
- alteração após desligamento sem fluxo especial;
- função inativa;
- centro de custo de outro tenant;
- assinatura marcada apenas porque o e-mail foi enviado.

### Concorrência

- dois aprovadores aplicando a mesma alteração;
- duas alterações no mesmo campo e data;
- aplicação simultânea com fechamento de folha;
- revogação simultânea à aplicação;
- reemissão documental concorrente.

### Segurança

- leitura salarial sem capacidade;
- exportação contratual por gestor de obra;
- acesso direto a arquivo privado;
- manipulação de identificador de outro tenant;
- resposta de erro contendo dados pessoais;
- tentativa de alterar estado pela interface sem autorização no servidor.

---

## 32. Alertas de implementação

- não usar apenas `updated_at` como histórico;
- não armazenar somente JSON opaco sem validação de campos críticos;
- não copiar integralmente salário para tabelas de obra;
- não tratar S-2206 como correção universal;
- não aplicar alteração futura antecipadamente;
- não apagar versão por retificação;
- não confiar apenas em ocultação de componente;
- não gerar documento antes de congelar os dados de origem;
- não usar GitHub Actions para operação trabalhista;
- não transmitir evento governamental dentro da requisição web sem fila e idempotência;
- não registrar token, documento ou salário em log;
- não declarar conformidade jurídica sem validação responsável.

---

## 33. Dependências

- Módulo 01 — Cadastro Mestre;
- Módulo 02 — Estrutura Organizacional;
- Módulo 03 — Admissão;
- autorização granular;
- documentos privados;
- modelos versionados;
- auditoria;
- fila e outbox futuras;
- folha para resolução de impactos financeiros;
- ponto para impactos de jornada;
- integrações governamentais futuras.

---

## 34. Próximo módulo lógico

**Módulo 05 — Jornadas, Horários, Escalas, Controle de Ponto e Banco de Horas.**

O próximo módulo deverá distinguir:

- jornada contratual;
- horário planejado;
- escala;
- marcação;
- apuração;
- ocorrência;
- autorização;
- banco de horas;
- reflexo em folha.

Nenhuma marcação operacional deverá reescrever o contrato, e nenhuma alteração contratual de jornada deverá apagar o histórico de escalas e apurações.

---

## 35. Controle de versão

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 06/08/2026 | especificação inicial do Módulo 04 |
