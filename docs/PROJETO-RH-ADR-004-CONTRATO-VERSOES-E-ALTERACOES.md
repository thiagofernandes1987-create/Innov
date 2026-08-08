# ADR-004 — Contrato, Versões Contratuais, Alterações e Evidências

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O Projeto RH já definiu as separações entre:

- pessoa, usuário, trabalhador e vínculo;
- organização da plataforma, empresa empregadora e estabelecimento;
- caso de admissão, registro preliminar, admissão completa e vínculo ativo.

O próximo problema é preservar corretamente as condições do contrato ao longo do tempo.

Uma implementação ingênua manteria salário, cargo, função, jornada, local, duração e demais condições em colunas mutáveis do vínculo. Essa abordagem produziria perdas de histórico e impossibilitaria responder perguntas essenciais:

- quais condições estavam vigentes em determinada data;
- quando a alteração foi informada ao sistema;
- quem propôs, conferiu e aprovou a mudança;
- qual documento sustentou a alteração;
- qual versão foi enviada a um sistema externo;
- qual versão foi usada no cálculo de uma competência;
- se a mudança foi contratual, cadastral, corretiva ou apenas operacional;
- se a alteração futura já estava aprovada quando um cálculo foi realizado;
- se uma alteração retroativa exige recálculo ou retificação.

Também é necessário distinguir conceitos que frequentemente são tratados como sinônimos:

- vínculo;
- contrato;
- versão contratual;
- solicitação de alteração;
- aditivo ou instrumento documental;
- correção de informação incorreta;
- alteração com novo fato gerador;
- projeção para evento governamental;
- evidência de ciência ou assinatura.

---

## 2. Baseline normativa e operacional verificada

Em 6 de agosto de 2026 foram consultadas fontes oficiais vigentes.

### 2.1 Consolidação das Leis do Trabalho

A baseline consultada registra, entre outros pontos:

- contrato individual como acordo correspondente à relação de emprego;
- possibilidade de contrato tácito ou expresso, verbal ou escrito, por prazo determinado, indeterminado ou intermitente;
- limites próprios para contratos por prazo determinado e de experiência;
- exigência de mútuo consentimento e ausência de prejuízo para alterações contratuais, ressalvadas hipóteses legais;
- regras específicas para mudança de localidade;
- necessidade de instrumento contratual para teletrabalho e de aditivo em determinadas mudanças de regime.

Esta ADR não transforma o software em consultoria jurídica. A implementação deverá permitir parametrização, revisão e aprovação por responsáveis habilitados.

### 2.2 eSocial

A documentação oficial consultada mantém eventos distintos para:

- admissão ou cadastramento inicial do vínculo;
- alteração cadastral do trabalhador;
- alteração de contrato de trabalho;
- alteração de trabalhador sem vínculo, quando aplicável.

O Manual WEB Geral informa que a alteração contratual registra mudanças como remuneração, periodicidade, duração, local, cargo, função e jornada. Também diferencia alteração de contrato de retificação de informação incorreta enviada anteriormente.

A implementação deverá verificar novamente leiautes, regras, prazos e ambientes oficiais no momento da homologação e produção.

---

## 3. Decisão

O Projeto RH adotará um modelo temporal e auditável em que o vínculo é a raiz estável e as condições contratuais são representadas por versões imutáveis.

```text
Vínculo
  └─ Contrato
       ├─ Versão contratual 1
       ├─ Versão contratual 2
       └─ Versão contratual N

Solicitação de alteração
  ├─ proposta
  ├─ diferenças
  ├─ validações
  ├─ aprovações
  ├─ documentos
  └─ aplicação
       └─ nova versão contratual
```

### 3.1 Vínculo

Representará a relação jurídica ou contratual estável entre trabalhador e empresa empregadora.

O vínculo possuirá identificadores, matrícula, categoria, situação e datas estruturais. Não concentrará todas as condições mutáveis.

### 3.2 Contrato

Representará o instrumento lógico que organiza as condições aplicáveis ao vínculo.

Um vínculo poderá possuir um contrato principal e, futuramente, instrumentos complementares conforme a categoria e o modelo funcional aprovado.

### 3.3 Versão contratual

Representará um retrato completo das condições contratuais aplicáveis em determinado período.

Cada versão deverá conter:

- início de vigência;
- fim de vigência, quando houver;
- instante de registro;
- motivo e origem;
- referência à versão anterior;
- condições completas ou snapshot determinístico;
- autor da aplicação;
- solicitação de alteração de origem;
- documentos e evidências associados;
- estado de aprovação;
- identificador estável e hash de conteúdo quando aplicável.

Versão aplicada não será editada. Correções ocorrerão por procedimento controlado que gere nova versão ou retificação explícita, preservando o registro anterior.

### 3.4 Solicitação de alteração contratual

Representará o processo de propor, analisar, aprovar, documentar e aplicar uma mudança.

A solicitação será separada da versão resultante porque poderá:

- ser rejeitada;
- ser cancelada;
- expirar;
- exigir complementação;
- ser agendada para data futura;
- produzir mais de uma consequência;
- depender de assinatura ou ciência;
- exigir evento externo;
- ser substituída antes da aplicação.

### 3.5 Documento contratual

Documento será artefato associado ao contrato ou à alteração, e não a própria fonte exclusiva do estado.

O sistema deverá guardar dados estruturados suficientes para reconstruir as condições, mesmo que o documento seja indisponível temporariamente. O documento permanecerá evidência importante, com versão, hash, modelo utilizado, signatários e estado de assinatura.

### 3.6 Projeção para integração externa

Eventos de integração serão projeções das entidades internas aprovadas.

O evento externo não será usado como cadastro mestre. O sistema deverá guardar correlação entre:

- vínculo;
- versão contratual;
- solicitação de alteração;
- payload preparado;
- versão do leiaute;
- lote;
- protocolo;
- recibo;
- retorno;
- retificação ou exclusão posterior.

---

## 4. Dois tempos obrigatórios

O modelo deverá distinguir pelo menos dois tempos.

### 4.1 Tempo de vigência

Indica quando a condição produz efeitos no domínio trabalhista e operacional.

Exemplo: salário com vigência a partir de 1º de setembro.

### 4.2 Tempo de registro

Indica quando a informação foi efetivamente cadastrada, aprovada ou aplicada no sistema.

Exemplo: alteração com vigência em 1º de setembro registrada em 5 de setembro.

Essa separação permite identificar:

- registros atrasados;
- alterações retroativas;
- impacto em folha já calculada;
- necessidade de retificação;
- versão conhecida em determinado instante;
- reconstrução de auditoria.

A arquitetura poderá evoluir para tratamento bitemporal completo, mas a implementação inicial não poderá colapsar vigência e registro em um único campo.

---

## 5. Alteração, correção e retificação

### 5.1 Alteração

Representa um fato novo que muda condições a partir de determinada data.

Exemplos:

- promoção;
- reajuste salarial;
- mudança de jornada;
- transferência;
- alteração de função;
- prorrogação de prazo;
- mudança de regime de trabalho.

### 5.2 Correção

Representa ajuste de dado que já estava errado na origem, sem criar necessariamente um novo fato contratual.

A correção deverá preservar:

- valor anterior incorreto;
- valor corrigido;
- justificativa;
- responsável;
- evidência;
- impacto em integrações e cálculos.

### 5.3 Retificação externa

Representa procedimento perante sistema externo para substituir ou corrigir informação transmitida.

Uma correção interna poderá exigir retificação externa, mas não são o mesmo objeto.

### 5.4 Reprocessamento

Representa consequência operacional da mudança sobre folha, benefícios, provisões, ponto, relatórios ou integrações.

Reprocessamento não deverá alterar silenciosamente o contrato nem a solicitação original.

---

## 6. Regras obrigatórias

1. O vínculo não armazenará como colunas mutáveis toda a condição contratual histórica.
2. Cada período deverá possuir versão determinística consultável.
3. Versão aplicada será imutável.
4. Alteração futura não substituirá a versão atualmente vigente antes da data efetiva.
5. Alteração retroativa será explicitamente identificada.
6. Não poderá haver sobreposição contratual incompatível para o mesmo vínculo e dimensão.
7. Correção não será registrada como alteração sem análise do caso.
8. Alteração não será utilizada para apagar erro anterior.
9. Documento assinado não será sobrescrito por nova geração.
10. Nova versão documental deverá referenciar a anterior.
11. Mudança relevante exigirá motivo e responsável.
12. Campos sensíveis obedecerão capacidades específicas.
13. O gestor de obra não receberá salário por consultar cargo ou alocação.
14. A aplicação de alteração deverá ser idempotente.
15. Duas aplicações concorrentes não poderão criar versões conflitantes.
16. A versão usada por folha fechada permanecerá referenciável.
17. A versão usada por evento transmitido permanecerá referenciável.
18. Exclusão lógica não apagará histórico aplicado.
19. Cancelamento de solicitação não apagará documentos e decisões anteriores.
20. Toda dispensa de etapa obrigatória exigirá permissão e justificativa.
21. Alteração de empresa empregadora não será tratada automaticamente como simples mudança de campo.
22. Mudança de estabelecimento, unidade ou obra terá classificação própria.
23. Centro de custo e rateio não serão confundidos com local contratual.
24. Cargo, função e posição permanecerão conceitos distintos.
25. Mudança de função não alterará cargo silenciosamente.
26. Mudança operacional de equipe não alterará contrato automaticamente.
27. Datas de início e fim serão validadas no calendário do vínculo.
28. Estados externos não serão reduzidos a um booleano `enviado`.
29. Alterações com impacto financeiro gerarão marca de impacto para análise da folha.
30. Alterações com impacto documental gerarão necessidade de nova emissão ou aditivo conforme configuração.

---

## 7. Aplicação transacional

A aplicação de uma alteração aprovada deverá ocorrer em operação transacional que, no mínimo:

1. confirme o estado da solicitação;
2. confirme permissões e alçadas;
3. bloqueie concorrência relevante;
4. leia a versão vigente ou futura afetada;
5. valide conflitos e sobreposições;
6. encerre ou ajuste a vigência anterior quando aplicável;
7. crie a nova versão imutável;
8. registre diferenças estruturadas;
9. associe documentos e aprovações;
10. crie impactos derivados;
11. prepare pendências de integração;
12. registre auditoria;
13. devolva o mesmo resultado em repetição idempotente.

Falha em qualquer etapa deverá impedir aplicação parcial.

---

## 8. Impactos derivados

A nova versão poderá gerar impactos para:

- folha de pagamento;
- ponto e jornada;
- benefícios;
- férias;
- provisões;
- medicina e segurança;
- alocação organizacional;
- centros de custo e rateios;
- documentos;
- assinatura;
- obrigações digitais;
- notificações;
- relatórios;
- integrações contábeis e financeiras.

Impacto será registrado como item tratável, não como efeito silencioso disperso.

---

## 9. Consequências positivas

- reconstrução histórica;
- previsibilidade temporal;
- suporte a alterações futuras e retroativas;
- separação entre intenção e aplicação;
- auditoria de decisões;
- integração governamental rastreável;
- folha reproduzível;
- documentos versionados;
- menor risco de sobrescrever condições antigas;
- melhor controle de concorrência.

---

## 10. Custos e impactos

- maior número de entidades;
- necessidade de consultas por data de vigência;
- validação de sobreposição;
- gestão de alterações retroativas;
- necessidade de fila de impactos;
- maior complexidade de interface;
- necessidade de treinamento dos usuários;
- migração de dados existentes quando houver implementação.

Esses custos são aceitos porque a alternativa compromete histórico, auditoria e cálculo.

---

## 11. Alternativas rejeitadas

### Manter apenas o estado atual no vínculo

Rejeitada porque apaga o passado e inviabiliza reconstrução.

### Guardar somente um log de mudanças

Rejeitada porque log textual não substitui uma versão completa, validável e consultável.

### Tratar documento PDF como fonte canônica

Rejeitada porque cálculos e integrações precisam de dados estruturados.

### Criar uma linha por campo alterado sem snapshot

Rejeitada como modelo exclusivo porque aumenta a dificuldade de reconstruir o conjunto vigente e de validar consistência. Diferenças por campo poderão existir como complemento.

### Alterar diretamente e depois emitir aditivo

Rejeitada porque permite estado aplicado sem aprovação ou evidência correspondente.

### Usar o evento externo como versão do contrato

Rejeitada porque o evento é uma projeção parcial e dependente de leiaute externo.

---

## 12. Critérios de aceite da futura implementação

- consultar uma data devolve a versão contratual vigente naquela data;
- consultar o instante de registro identifica quando a mudança entrou no sistema;
- uma alteração futura não afeta cálculo anterior à vigência;
- uma alteração retroativa gera impacto explícito;
- versão aplicada não pode ser editada;
- correção preserva o valor incorreto anterior;
- solicitação rejeitada não produz nova versão;
- aplicação repetida não duplica versão;
- aplicações concorrentes não criam sobreposição;
- documento anterior permanece acessível após novo aditivo;
- folha fechada referencia a versão utilizada;
- evento externo referencia a versão de origem;
- gestor sem permissão salarial não recebe remuneração por API, tela ou exportação;
- alteração de equipe não muda contrato;
- auditoria identifica proposta, aprovação, aplicação e eventual reversão.

---

## 13. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md`;
- `docs/PROJETO-RH-ADR-002-TENANT-EMPRESA-ESTABELECIMENTO.md`;
- `docs/PROJETO-RH-ADR-003-ADMISSAO-CASO-AUDITAVEL.md`;
- `docs/PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md`;
- `docs/PROJETO-RH-MODULO-02-ESTRUTURA-ORGANIZACIONAL.md`;
- `docs/PROJETO-RH-MODULO-03-ADMISSAO-PRE-ADMISSAO.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
