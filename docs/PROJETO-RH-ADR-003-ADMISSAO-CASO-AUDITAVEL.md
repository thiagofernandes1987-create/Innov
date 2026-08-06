# ADR-003 — Admissão como Caso Auditável e Separação entre Pré-admissão, Registro Preliminar e Vínculo Ativo

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`

---

## 1. Contexto

A admissão de um trabalhador não é uma única gravação de cadastro. Ela combina coleta de dados, conferência documental, definição das condições contratuais, aprovações, exames ou verificações aplicáveis, preparação de documentos, comunicação com o trabalhador e cumprimento das obrigações digitais pertinentes.

Representar todo esse processo com um campo como `status = ACTIVE` criaria riscos graves:

- ativação antes da conferência dos dados;
- admissão sem empresa, estabelecimento, lotação, cargo, jornada ou salário vigentes;
- perda do responsável por cada verificação;
- ausência de evidência sobre pendências aceitas;
- confusão entre registro preliminar e admissão completa;
- repetição ou perda de eventos de integração;
- impossibilidade de cancelar um processo sem apagar o histórico;
- dificuldade para distinguir desistência, reprovação, erro cadastral e contratação futura.

A documentação técnica oficial do eSocial vigente na data desta ADR mantém eventos distintos para registro preliminar e admissão completa. O S-2190 é opcional e, quando utilizado, permanece pendente até sua complementação por evento completo correspondente. A relação entre o registro preliminar e o evento completo deve ser rastreada sem que o sistema trate a simples preparação ou transmissão preliminar como ativação automática do vínculo.

---

## 2. Decisão

O processo de admissão será representado por um **caso auditável próprio**, separado da pessoa, do trabalhador e do vínculo definitivo.

Modelo conceitual:

```text
Pessoa
  └─ Trabalhador
       └─ Caso de admissão
            ├─ dados coletados
            ├─ checklist versionado
            ├─ documentos e conferências
            ├─ condições propostas
            ├─ aprovações
            ├─ eventos de integração
            ├─ comunicações
            └─ decisão de ativação
                  └─ Vínculo ativo
```

A admissão poderá reutilizar uma pessoa e um trabalhador existentes, mas não modificará silenciosamente vínculos anteriores.

---

## 3. Estados do caso de admissão

O conjunto definitivo poderá ser refinado, porém deverá distinguir no mínimo:

- `DRAFT` — processo iniciado sem convite ou submissão;
- `INVITED` — trabalhador convidado a preencher dados;
- `DATA_COLLECTION` — dados em preenchimento;
- `DOCUMENT_REVIEW` — documentos em conferência;
- `PENDING_REQUIREMENTS` — existem pendências impeditivas ou condicionais;
- `PENDING_APPROVAL` — pronto para decisão de responsáveis;
- `PRELIMINARY_RECORDED` — registro preliminar aplicável foi confirmado;
- `READY_TO_ACTIVATE` — gates internos concluídos;
- `ACTIVE` — vínculo ativado por operação explícita e auditada;
- `REJECTED` — processo recusado com motivo;
- `CANCELED` — processo encerrado antes da ativação;
- `EXPIRED` — convite ou processo expirou conforme configuração.

Os nomes físicos poderão mudar, mas os significados não deverão ser colapsados em um único estado genérico.

---

## 4. Registro preliminar não é vínculo ativo

Quando a organização utilizar uma integração de registro preliminar:

1. o sistema preparará um evento versionado;
2. validará os campos mínimos conforme a versão oficial configurada;
3. enviará por fila ou integração durável;
4. guardará payload sanitizado, hash, protocolo, recibo, retorno e versão;
5. associará o evento ao caso de admissão;
6. manterá o caso como pendente até a admissão completa ou cancelamento aplicável;
7. não ativará automaticamente o vínculo apenas porque o registro preliminar foi aceito.

A ativação do vínculo dependerá dos gates internos e da política de integração configurada.

---

## 5. Ativação explícita

A operação de ativação deverá:

- exigir capacidade específica;
- validar pessoa e trabalhador canônicos;
- validar empresa e estabelecimento vigentes;
- validar matrícula no escopo configurado;
- validar cargo, função, lotação, jornada, salário e demais condições obrigatórias;
- verificar checklist e pendências impeditivas;
- verificar aprovações requeridas;
- verificar o estado das obrigações digitais quando a integração estiver habilitada;
- criar o vínculo e suas condições iniciais em operação transacional;
- registrar correlação entre caso, vínculo, documentos e eventos;
- produzir auditoria nominal;
- ser idempotente.

A repetição da mesma solicitação de ativação não poderá criar dois vínculos.

---

## 6. Pendências impeditivas e não impeditivas

Cada item de checklist deverá declarar:

- finalidade;
- aplicabilidade;
- obrigatoriedade;
- se impede ativação;
- se admite dispensa;
- quem pode dispensar;
- justificativa mínima;
- documento ou evidência esperada;
- prazo;
- versão da regra;
- origem da exigência.

A dispensa de item obrigatório não será uma simples marcação. Exigirá autorização, justificativa e auditoria, e não poderá contrariar uma validação legal impeditiva configurada.

---

## 7. Regras de temporalidade

Datas e prazos legais não serão fixados permanentemente no código sem versão.

O sistema deverá manter:

- versão do leiaute ou regra externa;
- data de vigência;
- data de publicação ou referência;
- fonte oficial;
- configuração efetiva por empresa;
- histórico das regras utilizadas em cada admissão.

Alertas operacionais poderão ser parametrizados, mas não substituirão validação jurídica ou contábil responsável.

---

## 8. Consequências positivas

- processo rastreável do início à ativação;
- trabalhador pode preencher dados sem receber acesso amplo ao ERP;
- pendências permanecem visíveis;
- registro preliminar e admissão completa não são confundidos;
- cancelamento preserva evidências;
- múltiplas tentativas não duplicam vínculos;
- regras e checklists podem variar por empresa, categoria e vigência;
- integração futura com eSocial possui estados e correlação adequados;
- relatórios conseguem distinguir tempo de coleta, conferência e aprovação.

---

## 9. Custos e impactos

- criação de entidade de processo adicional;
- necessidade de máquina de estados;
- necessidade de checklists versionados;
- portal ou fluxo seguro de coleta externa;
- armazenamento privado de documentos;
- notificações e expiração de convites;
- integração com modelos, assinatura, auditoria e obrigações digitais;
- desenho de operação transacional para ativação.

---

## 10. Alternativas rejeitadas

### Criar o vínculo no primeiro passo

Rejeitada porque produziria vínculos incompletos tratados como ativos e misturaria rascunho com relação efetiva.

### Usar somente tarefas genéricas

Rejeitada porque tarefas não representam estados legais, documentos, regras aplicáveis, eventos externos ou decisão transacional de ativação.

### Tratar S-2190 aceito como admissão concluída

Rejeitada porque o registro preliminar é uma etapa distinta e deve ser complementado conforme o fluxo aplicável.

### Apagar processos cancelados

Rejeitada porque elimina rastreabilidade, dificulta defesa, auditoria e análise de falhas do processo.

---

## 11. Critérios de aceite da futura implementação

- caso de admissão existe sem vínculo ativo;
- trabalhador pode corrigir dados solicitados sem acessar dados de terceiros;
- cada documento possui situação de conferência e responsável;
- checklist aplicado registra sua versão;
- pendência impeditiva bloqueia ativação;
- dispensa autorizada exige justificativa e gera auditoria;
- S-2190 aceito não ativa o vínculo automaticamente;
- ativação repetida com a mesma chave não duplica vínculo;
- cancelamento preserva histórico e impede ativação posterior sem reabertura formal;
- vínculo ativo aponta para o caso de admissão que o originou;
- eventos externos guardam protocolo, recibo, retorno e correlação.

---

## 12. Referências oficiais verificadas

Consulta realizada em 6 de agosto de 2026:

- Portal eSocial — Leiautes da versão S-1.3, Nota Técnica 06/2026;
- Portal eSocial — Regras da versão S-1.3;
- Portal eSocial — Manual WEB Geral, capítulos de S-2190 e S-2200.

As fontes deverão ser consultadas novamente antes da implementação e de qualquer homologação produtiva.
