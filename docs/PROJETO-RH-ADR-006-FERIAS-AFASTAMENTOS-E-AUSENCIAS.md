# ADR-006 — Separação entre Direito de Férias, Programação, Ausência, Afastamento, Benefício e Retorno

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O domínio de férias, ausências e afastamentos reúne fatos com naturezas diferentes:

- direito de férias adquirido ao longo do contrato;
- programação futura de descanso;
- concessão formal e pagamento;
- ausência identificada pelo ponto;
- licença remunerada ou não remunerada;
- afastamento por motivo de saúde;
- afastamento decorrente de acidente de trabalho;
- maternidade, adoção, guarda e outras hipóteses protegidas;
- benefício reconhecido ou analisado por órgão externo;
- retorno ao trabalho;
- impacto em folha, jornada, benefícios, obra e obrigações digitais.

Tratar todos esses fatos em uma única tabela de “afastamentos” produziria ambiguidades críticas.

Exemplos:

- uma falta ainda não justificada não é um afastamento aprovado;
- um atestado recebido não equivale a benefício concedido;
- férias programadas não são férias efetivamente gozadas;
- férias pagas não devem desaparecer se forem canceladas ou remarcadas;
- data final prevista não comprova retorno quando há exigência de avaliação ocupacional;
- evento enviado ao eSocial não substitui o caso interno;
- um benefício externo não pode sobrescrever silenciosamente o período informado pela empresa;
- a ausência no ponto deve ser reconciliada com o afastamento, sem perder a marcação original.

---

## 2. Decisão

O Projeto RH adotará objetos canônicos separados e relacionados.

### 2.1 Período aquisitivo de férias

Representará a formação do direito vinculada a um vínculo e a um intervalo de aquisição.

Deverá armazenar, entre outros elementos:

- vínculo;
- início e fim do período aquisitivo;
- regra aplicada e sua versão;
- quantidade de dias potencial;
- faltas ou eventos relevantes considerados;
- suspensões, interrupções ou reinícios;
- quantidade adquirida;
- quantidade concedida;
- quantidade gozada;
- quantidade convertida em abono;
- quantidade cancelada ou devolvida;
- situação;
- memória de cálculo;
- fonte dos dados utilizados.

O saldo de férias será derivado dos movimentos e concessões, não de um único campo livremente editável.

### 2.2 Programação ou concessão de férias

Representará a decisão de conceder um ou mais períodos de gozo.

Será separada do período aquisitivo e poderá conter:

- um ou mais períodos aquisitivos de origem;
- datas planejadas;
- fracionamento;
- pedido de abono;
- aprovações;
- aviso;
- ciência;
- cálculo preliminar;
- pagamento;
- evento externo;
- gozo efetivo;
- cancelamento, remarcação ou interrupção;
- documentos e evidências.

### 2.3 Ocorrência de ausência

Representará o fato operacional de que havia trabalho esperado e não houve presença suficiente segundo a apuração de jornada.

A ocorrência poderá nascer do Módulo 05, mas não decidirá sozinha:

- se a ausência é justificada;
- se há remuneração;
- se existe afastamento;
- se há impacto previdenciário;
- se afeta o período aquisitivo;
- se deve ser enviada a sistema externo.

### 2.4 Caso de afastamento ou licença

Representará o processo administrativo interno que investiga, classifica, aprova, acompanha e encerra uma ausência prolongada ou juridicamente qualificada.

O caso conterá:

- motivo interno;
- motivo legal ou externo quando aplicável;
- vínculo;
- períodos;
- documentos;
- responsável;
- validações;
- decisões;
- situação previdenciária;
- impactos derivados;
- comunicações;
- retorno;
- trilha de auditoria.

### 2.5 Documento comprobatório

Atestado, declaração, certidão, decisão, comunicação, termo ou outro documento será evidência versionada.

O documento não será considerado, por si só, decisão automática sobre:

- legitimidade;
- duração reconhecida;
- remuneração;
- benefício;
- nexo ocupacional;
- retorno;
- estabilidade;
- impacto em férias.

### 2.6 Benefício ou decisão externa

Protocolo, requerimento, concessão, indeferimento, cessação ou prorrogação perante órgão externo será objeto separado.

O estado externo poderá divergir temporariamente do estado interno. Essa divergência deverá ser visível e reconciliável.

### 2.7 Evento governamental

Eventos como afastamento temporário ou comunicação de acidente serão projeções auditáveis do estado interno.

Cada envio deverá manter:

- tipo e versão do leiaute;
- conteúdo projetado;
- chave de idempotência;
- recibo ou protocolo;
- estado de transmissão;
- rejeições;
- retificações;
- exclusões;
- correlação com o caso e o período interno.

### 2.8 Retorno ao trabalho

O retorno será um ato explícito.

Conforme o tipo de afastamento, poderá exigir:

- data efetiva;
- confirmação do trabalhador;
- ciência do gestor;
- documento de alta;
- avaliação ocupacional;
- restrições temporárias;
- alteração de função ou ambiente;
- reativação de jornada, escala, benefícios e alocações.

A simples chegada da data final prevista não encerrará automaticamente todos os efeitos.

---

## 3. Modelo conceitual

```text
employment_relationship
  ├─ vacation_entitlement_periods
  │    ├─ vacation_entitlement_movements
  │    └─ vacation_grants
  │         ├─ vacation_grant_periods
  │         ├─ vacation_notices
  │         ├─ vacation_payments
  │         └─ vacation_documents
  │
  ├─ absence_occurrences
  │    └─ absence_resolution_links
  │
  └─ leave_cases
       ├─ leave_periods
       ├─ leave_documents
       ├─ leave_reviews
       ├─ external_benefit_cases
       ├─ government_event_projections
       ├─ return_to_work_actions
       └─ derived_impacts
```

Os nomes são provisórios. Esta ADR define fronteiras e invariantes, não autoriza migrations.

---

## 4. Invariantes obrigatórios

1. Período aquisitivo não será a mesma entidade que concessão de férias.
2. Programação não será tratada como gozo efetivo.
3. Pagamento não será tratado como prova isolada de gozo.
4. Ausência detectada no ponto não será automaticamente convertida em afastamento.
5. Documento recebido não será automaticamente aprovado.
6. Atestado médico não será benefício previdenciário.
7. Motivo interno, motivo legal e motivo do eSocial poderão ser mapeados, mas não serão o mesmo campo.
8. Caso de afastamento poderá possuir mais de um período ou prorrogação.
9. Períodos sobrepostos deverão ser bloqueados ou resolvidos por matriz de precedência explícita.
10. Férias não poderão coexistir silenciosamente com afastamento impeditivo.
11. Cancelamento ou remarcação não apagará aviso, pagamento, evento ou versão anterior.
12. Retorno será explícito quando houver requisito de validação.
13. Reabertura preservará o encerramento anterior e sua justificativa.
14. Alterações retroativas produzirão impactos derivados e fila de reprocessamento.
15. Cada vínculo da mesma pessoa será processado separadamente quando a obrigação assim exigir.
16. Dados médicos terão autorização e retenção segregadas.
17. CID e outros dados clínicos serão minimizados e exibidos apenas a perfis autorizados.
18. Gestor operacional verá disponibilidade e restrições necessárias, não o diagnóstico.
19. Evento governamental não será fonte única do estado interno.
20. Decisão externa não apagará o período inicialmente informado.
21. Saldo de férias será reproduzível por movimentos e regras versionadas.
22. Regra legal, coletiva ou interna utilizada será registrada com vigência.
23. Fechamentos de folha e ponto referenciarão a versão do afastamento ou concessão considerada.
24. Exclusão física de casos, documentos aprovados, concessões e eventos transmitidos será proibida.
25. Toda dispensa de requisito terá responsável, justificativa, permissão e auditoria.

---

## 5. Resolução de sobreposições

A implementação deverá possuir uma matriz versionada de precedência.

Exemplo conceitual:

```text
Afastamento médico ativo
  + férias programadas
    → bloquear início das férias
    → abrir decisão de cancelamento ou remarcação
    → preservar aviso, cálculo e pagamento já existentes

Férias em gozo
  + novo documento médico
    → registrar documento
    → não alterar automaticamente a concessão
    → encaminhar para análise conforme regra aplicável

Licença aprovada
  + ausência do ponto
    → reconciliar a ausência com a licença
    → preservar as marcações e a ocorrência original

Retorno previsto
  + avaliação ocupacional pendente
    → manter retorno bloqueado quando a regra exigir
    → impedir escala operacional incompatível
```

A matriz deverá considerar:

- tipo de ausência;
- categoria do trabalhador;
- empresa e estabelecimento;
- instrumento coletivo;
- período;
- existência de pagamento;
- folha aberta ou fechada;
- evento externo enviado;
- necessidade de avaliação ocupacional;
- decisão judicial ou administrativa.

---

## 6. Consequências positivas

- férias calculadas e auditáveis por período aquisitivo;
- ausência operacional sem julgamento jurídico automático;
- documentos preservados sem substituir decisões;
- integração segura com ponto e folha;
- tratamento de prorrogações e retornos;
- suporte a decisões externas assíncronas;
- menor exposição de dados de saúde;
- reprocessamento controlado;
- relatórios de risco de férias vencidas;
- rastreabilidade de eventos governamentais;
- manutenção do histórico em cancelamentos e retificações.

---

## 7. Custos e impactos

- necessidade de múltiplas entidades e máquinas de estado;
- motor de regras por vigência;
- matriz de sobreposição;
- versionamento de cálculos e documentos;
- integração com folha, ponto, benefícios, SST e eSocial;
- filas de reprocessamento;
- permissões sensíveis;
- migração cuidadosa de ausências históricas;
- reconciliação entre eventos internos e externos.

---

## 8. Alternativas rejeitadas

### 8.1 Uma tabela única de afastamentos

Rejeitada porque mistura ausência, férias, benefício, documento, retorno e evento externo.

### 8.2 Editar diretamente o saldo de férias

Rejeitada porque impede reconstrução, auditoria e identificação da regra aplicada.

### 8.3 Usar o ponto como fonte do afastamento

Rejeitada porque o ponto identifica presença ou ausência, não decide a natureza jurídica.

### 8.4 Usar o evento S-2230 como cadastro interno

Rejeitada porque o evento é uma obrigação externa e não cobre todas as decisões, documentos e estados internos.

### 8.5 Encerrar automaticamente na data prevista

Rejeitada porque alguns retornos dependem de alta, avaliação, decisão externa ou restrição operacional.

### 8.6 Armazenar diagnóstico em campos amplamente visíveis

Rejeitada por violar minimização e segregação de dados sensíveis.

---

## 9. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultados:

- Consolidação das Leis do Trabalho em texto compilado, especialmente regras de férias, ausências justificadas, maternidade e suspensão contratual;
- Portal do Ministério do Trabalho e Emprego, orientações gerais sobre férias;
- documentação técnica do eSocial S-1.3 até a Nota Técnica 06/2026;
- Manual WEB Geral do eSocial, seção do evento S-2230;
- orientações oficiais sobre a importância do registro de afastamentos para análise de benefícios.

A baseline vigente registra, entre outros pontos:

- aquisição anual de férias vinculada ao contrato;
- concessão dentro do período subsequente aplicável;
- possibilidade de fracionamento conforme condições vigentes;
- aviso formal antecipado;
- pagamento anterior ao início do gozo;
- férias e afastamentos como fatos distintos;
- utilização do S-2230 para afastamentos temporários e férias, conforme motivo aplicável;
- necessidade de informar alterações, prorrogações e términos conforme regras do leiaute;
- relevância do registro correto para benefícios por incapacidade.

A implementação deverá consultar novamente as fontes oficiais, instrumentos coletivos e assessoria especializada antes de homologação e produção.

---

## 10. Critérios de aceite da futura implementação

- o sistema calcula um período aquisitivo sem editar manualmente seu saldo final;
- uma concessão pode consumir um ou mais saldos permitidos sem apagar a origem;
- férias programadas permanecem distintas de férias gozadas;
- ausência do ponto pode ser reconciliada com licença sem alterar a marcação bruta;
- documento médico recebido permanece pendente até análise autorizada;
- gestor consulta indisponibilidade sem acessar diagnóstico;
- prorrogação cria novo período ou versão vinculada;
- decisão externa divergente gera pendência de reconciliação;
- cancelamento de férias pagas preserva pagamento e cria tratamento financeiro;
- retorno bloqueado por avaliação pendente não gera escala operacional automática;
- alteração retroativa gera impactos para ponto, folha e eventos;
- cada transmissão externa mantém payload, recibo e correlação;
- férias vencidas são detectadas por regra versionada;
- sobreposição é bloqueada ou resolvida explicitamente;
- auditoria identifica cada decisão, dispensa, reabertura e retificação.

---

## 11. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md`;
- `docs/PROJETO-RH-ADR-004-CONTRATO-VERSOES-E-ALTERACOES.md`;
- `docs/PROJETO-RH-ADR-005-JORNADA-MARCACAO-TRATAMENTO-E-BANCO.md`;
- `docs/PROJETO-RH-MODULO-05-JORNADAS-PONTO-E-BANCO-DE-HORAS.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
