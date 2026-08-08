# Projeto RH — Módulo 06: Férias, Afastamentos, Ausências e Licenças

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Objetivo

Especificar o domínio responsável por:

- formação e controle de direitos de férias;
- programação, aprovação, aviso, pagamento e gozo;
- férias individuais e coletivas;
- ausências identificadas pelo ponto;
- justificativas e licenças de curta duração;
- afastamentos temporários;
- documentos comprobatórios;
- benefícios e decisões externas;
- eventos governamentais;
- retorno ao trabalho;
- impactos em jornada, folha, benefícios, obras e obrigações digitais.

O módulo deverá permitir reconstruir, para qualquer data:

- qual direito de férias existia;
- qual regra foi aplicada;
- quais períodos foram concedidos;
- quais documentos e aprovações existiam;
- qual afastamento estava vigente;
- qual situação foi transmitida externamente;
- quais impactos foram gerados;
- quem tomou cada decisão.

---

## 2. Princípio central

```text
Direito de férias
  ≠ programação
  ≠ aviso
  ≠ pagamento
  ≠ gozo

Ausência no ponto
  ≠ licença
  ≠ afastamento
  ≠ benefício
  ≠ evento externo
  ≠ retorno
```

Nenhuma dessas etapas poderá sobrescrever silenciosamente as demais.

---

## 3. Escopo

### 3.1 Incluído no MVP funcional

- catálogo versionado de motivos;
- políticas por empresa, categoria e vigência;
- períodos aquisitivos;
- movimentos e saldos reproduzíveis;
- programação individual;
- fracionamento;
- abono pecuniário como solicitação separada;
- aviso e ciência;
- integração com cálculo de férias;
- acompanhamento do pagamento;
- gozo, conclusão, cancelamento e remarcação;
- férias coletivas;
- ocorrências de ausência;
- justificativas;
- casos de afastamento e licença;
- atestados e documentos;
- prorrogações;
- decisão externa e benefício;
- retorno ao trabalho;
- restrições de retorno;
- integração com ponto, folha, SST, obras e eSocial;
- relatórios, alertas, auditoria e permissões.

### 3.2 Fora do escopo imediato

- motor completo de folha;
- decisão médica automatizada;
- prontuário clínico;
- concessão de benefício pelo INSS;
- emissão automática de parecer jurídico;
- gestão integral de saúde ocupacional;
- cálculo definitivo de estabilidade;
- interpretação automática de convenções coletivas sem revisão;
- substituição do sistema oficial do eSocial;
- assinatura eletrônica avançada, salvo integração futura;
- gestão de viagens, folgas operacionais ou banco de horas já cobertos por outros módulos.

---

## 4. Usuários e responsabilidades

### 4.1 Trabalhador

- consultar direitos e programações permitidas;
- solicitar férias;
- solicitar abono quando aplicável;
- anexar documentos;
- acompanhar pendências;
- confirmar ciência;
- consultar períodos ativos e históricos;
- contestar informação conforme fluxo autorizado.

### 4.2 Gestor

- consultar disponibilidade da equipe;
- analisar impacto operacional;
- aprovar, rejeitar ou sugerir remarcação;
- acompanhar retornos;
- receber apenas informações necessárias à operação;
- não acessar diagnóstico ou documento médico sem autorização específica.

### 4.3 RH e Departamento Pessoal

- configurar políticas;
- revisar períodos aquisitivos;
- conduzir concessões;
- emitir avisos;
- analisar licenças e afastamentos;
- validar documentos conforme competência;
- preparar impactos de folha;
- transmitir ou acompanhar eventos externos;
- controlar retorno e encerramento.

### 4.4 Medicina e Segurança do Trabalho

- consultar apenas casos sob sua competência;
- registrar avaliação ocupacional;
- informar aptidão, inaptidão ou restrição funcional;
- correlacionar acidente e afastamento quando aplicável;
- não alterar saldo de férias ou decisão financeira.

### 4.5 Folha de pagamento

- consumir versões aprovadas;
- registrar cálculo e pagamento;
- sinalizar competências fechadas;
- receber reprocessamentos;
- não alterar diretamente o caso de afastamento.

### 4.6 Auditor e administrador

- consultar trilhas, versões, decisões e integrações;
- acessar dados sensíveis somente quando a função e a permissão exigirem;
- não utilizar privilégio administrativo como autorização médica automática.

---

## 5. Modelo conceitual inicial

```text
employment_relationships
  ├─ leave_policies
  ├─ leave_reason_catalog
  │
  ├─ vacation_entitlement_periods
  │    ├─ vacation_entitlement_movements
  │    ├─ vacation_balance_snapshots
  │    └─ vacation_grants
  │         ├─ vacation_grant_periods
  │         ├─ vacation_approvals
  │         ├─ vacation_notices
  │         ├─ vacation_acknowledgements
  │         ├─ vacation_bonus_requests
  │         ├─ vacation_payroll_projections
  │         ├─ vacation_payments
  │         └─ vacation_documents
  │
  ├─ collective_vacation_plans
  │    ├─ collective_vacation_scopes
  │    ├─ collective_vacation_workers
  │    └─ collective_vacation_communications
  │
  ├─ absence_occurrences
  │    ├─ absence_justifications
  │    └─ absence_resolution_links
  │
  └─ leave_cases
       ├─ leave_periods
       ├─ leave_documents
       ├─ leave_reviews
       ├─ leave_approvals
       ├─ external_benefit_cases
       ├─ government_event_projections
       ├─ return_to_work_actions
       ├─ work_restrictions
       └─ derived_impacts
```

Todos os nomes são provisórios.

---

## 6. Políticas e catálogos

### 6.1 Política de férias e afastamentos

A política deverá ser versionada por:

- organização;
- empresa empregadora;
- estabelecimento quando necessário;
- categoria de vínculo;
- categoria sindical ou instrumento coletivo;
- vigência;
- prioridade;
- origem normativa;
- situação.

### 6.2 Catálogo de motivos

Cada motivo deverá possuir:

- código interno estável;
- descrição operacional;
- categoria: férias, ausência, licença, afastamento, suspensão ou retorno;
- natureza remunerada, não remunerada, variável ou pendente;
- necessidade de documento;
- tipos de documentos aceitos;
- prazo interno de entrega;
- necessidade de avaliação médica;
- necessidade de aprovação;
- possibilidade de prorrogação;
- necessidade de evento externo;
- motivo externo correlato e versão;
- comportamento no ponto;
- comportamento na folha;
- comportamento em benefícios;
- comportamento em férias;
- comportamento em alocação de obra;
- regras de retorno;
- classificação de sensibilidade;
- vigência.

### 6.3 Hierarquia de regra

A avaliação deverá considerar, em ordem configurada:

```text
norma obrigatória
  → decisão judicial ou administrativa aplicável
    → instrumento coletivo
      → contrato ou política mais favorável validada
        → política interna
          → regra padrão do produto
```

A aplicação deverá registrar qual regra venceu e por quê.

---

## 7. Períodos aquisitivos de férias

### 7.1 Formação

O sistema deverá gerar períodos aquisitivos a partir do vínculo e da regra vigente.

O período possuirá:

- data inicial;
- data final planejada;
- data efetiva de conclusão;
- quantidade potencial;
- quantidade adquirida;
- limite de concessão;
- situação;
- regra aplicada;
- eventos que alteram a aquisição;
- memória de cálculo;
- versão de cálculo.

### 7.2 Estados do período aquisitivo

```text
EM_FORMACAO
  → ADQUIRIDO
  → PARCIALMENTE_CONCEDIDO
  → TOTALMENTE_CONCEDIDO
  → TOTALMENTE_GOZADO
  → INDENIZADO
  → ENCERRADO
```

Estados adicionais:

- `SUSPENSO`;
- `REINICIADO`;
- `EM_REVISAO`;
- `COM_DIVERGENCIA`;
- `CANCELADO_POR_CORRECAO`, apenas com substituto explícito.

### 7.3 Movimentos

O saldo será formado por movimentos, como:

- aquisição;
- ajuste decorrente de regra;
- concessão;
- cancelamento de concessão;
- gozo;
- devolução por cancelamento válido;
- abono;
- indenização;
- perda ou reinício conforme regra aplicável;
- correção auditada;
- migração histórica.

Movimento não poderá ser editado após confirmado. Correção ocorrerá por estorno e novo movimento.

### 7.4 Memória de cálculo

Deverá registrar:

- datas consideradas;
- faltas consideradas e desconsideradas;
- afastamentos considerados;
- regra de proporcionalidade;
- frações;
- arredondamentos;
- quantidade final;
- fonte de cada fato;
- versão do algoritmo.

---

## 8. Programação de férias individuais

### 8.1 Fluxo principal

```text
Direito disponível
  → Solicitação ou proposta
  → Validação de datas e saldo
  → Análise operacional
  → Análise de RH
  → Projeção financeira
  → Aprovação
  → Aviso e ciência
  → Cálculo e pagamento
  → Evento externo
  → Gozo
  → Conclusão
```

### 8.2 Estados

```text
RASCUNHO
  → SOLICITADA
  → EM_ANALISE_GESTOR
  → EM_ANALISE_RH
  → EM_VALIDACAO_FOLHA
  → APROVADA
  → AVISO_EMITIDO
  → CIENCIA_CONFIRMADA
  → PROGRAMADA
  → PAGA
  → EM_GOZO
  → CONCLUIDA
```

Estados alternativos:

- `COM_PENDENCIA`;
- `DEVOLVIDA_PARA_AJUSTE`;
- `REJEITADA`;
- `REMARCACAO_SOLICITADA`;
- `CANCELAMENTO_SOLICITADO`;
- `CANCELADA`;
- `INTERROMPIDA`;
- `EM_RECONCILIACAO`.

### 8.3 Dados da solicitação

- vínculo;
- período aquisitivo de origem;
- datas pretendidas;
- quantidade de dias;
- fracionamento;
- preferência do trabalhador;
- solicitação de abono;
- justificativa;
- substituto operacional sugerido;
- impacto em obra ou equipe;
- responsável pela decisão;
- anexos;
- regra aplicada;
- risco de vencimento.

### 8.4 Validações

- vínculo ativo ou situação compatível;
- direito disponível;
- datas dentro do período permitido;
- quantidade suficiente;
- limites de fracionamento;
- concordância necessária;
- antecedência de aviso;
- vedação de início em datas proibidas;
- conflito com afastamento;
- conflito com outra concessão;
- conflito com término contratual conhecido;
- conflito com folha fechada;
- conflito operacional não impeditivo ou impeditivo conforme política;
- existência de regra coletiva específica;
- pagamento possível antes do início;
- evento externo compatível.

### 8.5 Fracionamento

Cada fração será um período próprio, vinculado à mesma concessão ou a concessões relacionadas.

O sistema deverá:

- validar quantidade e limites;
- registrar concordância;
- impedir soma superior ao direito;
- preservar o período maior exigido pela regra;
- registrar remanescentes;
- alertar risco de vencimento;
- impedir fracionamento por edição retroativa sem revisão.

### 8.6 Abono pecuniário

A solicitação de abono será objeto separado, contendo:

- data do pedido;
- quantidade solicitada;
- prazo aplicável;
- regra utilizada;
- decisão;
- cálculo;
- reflexo no saldo;
- documento;
- situação de pagamento.

O abono não será inferido apenas por diferença entre dias adquiridos e dias programados.

---

## 9. Aviso, ciência, cálculo e pagamento

### 9.1 Aviso

O aviso deverá conter:

- vínculo e trabalhador;
- empresa;
- período aquisitivo;
- datas de gozo;
- quantidade;
- abono;
- data de emissão;
- regra aplicada;
- canal de entrega;
- versão do documento;
- responsável.

### 9.2 Ciência

A ciência poderá ocorrer por:

- assinatura eletrônica;
- aceite autenticado;
- registro presencial;
- outro meio aprovado.

A ciência registrará:

- identidade;
- data e hora;
- método;
- hash do documento;
- evidência técnica;
- ressalva ou recusa.

Recusa de ciência não apagará o aviso. Gerará ocorrência para tratamento.

### 9.3 Projeção para folha

O módulo enviará à folha:

- concessão aprovada;
- período aquisitivo;
- datas;
- remuneração de referência;
- médias necessárias;
- adicionais relevantes;
- abono;
- antecipações permitidas;
- regra e versão;
- centros de custo;
- competência;
- identificador idempotente.

### 9.4 Pagamento

O módulo não calculará definitivamente a folha no MVP, mas deverá armazenar:

- cálculo recebido;
- versão;
- rubricas;
- valor bruto;
- descontos;
- líquido;
- data prevista;
- data efetiva;
- comprovante;
- situação;
- divergências.

Pagamento efetuado não poderá ser apagado. Cancelamento posterior gerará tratamento financeiro.

---

## 10. Gozo, conclusão, cancelamento e remarcação

### 10.1 Início do gozo

O início poderá ser confirmado por job de data, desde que não existam bloqueios novos.

O sistema deverá revalidar:

- afastamento superveniente;
- cancelamento autorizado;
- término contratual;
- erro de pagamento;
- decisão judicial ou administrativa;
- conflito de data.

### 10.2 Conclusão

Ao final, deverá:

- confirmar período gozado;
- gerar movimento de consumo;
- encerrar indisponibilidade;
- liberar escalas futuras;
- manter documentos e cálculo;
- reconciliar evento externo;
- atualizar saldo.

### 10.3 Remarcação

Remarcação após aviso ou pagamento exigirá:

- motivo;
- análise de impacto;
- nova aprovação;
- novo aviso;
- tratamento do evento externo;
- tratamento financeiro;
- preservação da programação anterior.

### 10.4 Cancelamento

O cancelamento deverá distinguir:

- antes da aprovação;
- após aprovação;
- após aviso;
- após pagamento;
- após transmissão;
- durante o gozo.

Cada estágio terá permissões e consequências próprias.

---

## 11. Férias coletivas

### 11.1 Plano coletivo

O plano deverá conter:

- empresa;
- estabelecimentos e setores abrangidos;
- datas;
- períodos;
- justificativa;
- regra vigente;
- comunicações exigidas;
- trabalhadores afetados;
- exceções;
- impacto operacional;
- aprovação;
- documentos;
- situação.

### 11.2 Simulação

Antes da aprovação, o sistema deverá simular:

- empregados com direito integral;
- empregados com direito proporcional;
- reinício de período aquisitivo quando aplicável;
- conflitos com afastamentos;
- contratos que terminam no período;
- aprendizes, estagiários e categorias distintas;
- impacto financeiro;
- comunicações e prazos;
- cobertura mínima das obras.

### 11.3 Aplicação em lote

A aplicação deverá ser:

- transacional por trabalhador;
- retomável;
- idempotente;
- auditável;
- capaz de registrar exceções sem ocultar falhas parciais.

---

## 12. Ocorrências de ausência

### 12.1 Origem

A ocorrência poderá nascer de:

- apuração de ponto;
- escala sem marcação suficiente;
- lançamento autorizado;
- importação histórica;
- integração externa.

### 12.2 Estados

```text
DETECTADA
  → AGUARDANDO_JUSTIFICATIVA
  → EM_ANALISE
  → JUSTIFICADA
  → PARCIALMENTE_JUSTIFICADA
  → NAO_JUSTIFICADA
  → VINCULADA_A_AFASTAMENTO
  → ENCERRADA
```

### 12.3 Justificativa

A justificativa deverá conter:

- motivo declarado;
- período;
- documento;
- data de envio;
- responsável;
- decisão;
- quantidade justificada;
- impacto no ponto;
- impacto em folha;
- vínculo com caso de afastamento.

### 12.4 Regra de preservação

A resolução da ausência não alterará:

- marcações originais;
- escala original;
- apuração anterior;
- documento enviado;
- decisão anterior.

Uma nova apuração será gerada quando necessário.

---

## 13. Casos de afastamento e licença

### 13.1 Abertura

O caso poderá ser aberto por:

- trabalhador;
- RH;
- gestor, com dados limitados;
- medicina ocupacional;
- integração de ponto;
- CAT;
- decisão administrativa;
- importação.

### 13.2 Estados

```text
RASCUNHO
  → RECEBIDO
  → EM_TRIAGEM
  → AGUARDANDO_DOCUMENTO
  → EM_ANALISE
  → APROVADO
  → ATIVO
  → AGUARDANDO_DECISAO_EXTERNA
  → PRORROGACAO_EM_ANALISE
  → RETORNO_EM_ANALISE
  → ENCERRADO
```

Estados alternativos:

- `REJEITADO`;
- `CANCELADO`;
- `COM_DIVERGENCIA`;
- `EM_RETIFICACAO`;
- `REABERTO`;
- `AGUARDANDO_AVALIACAO_OCUPACIONAL`.

### 13.3 Dados do caso

- vínculo;
- pessoa;
- empresa e estabelecimento;
- motivo interno;
- categoria;
- origem;
- data de conhecimento;
- data inicial declarada;
- data inicial reconhecida;
- data final prevista;
- data final reconhecida;
- último dia trabalhado;
- responsável;
- sensibilidade;
- documento principal;
- relação com acidente;
- relação com gestação ou adoção quando aplicável;
- decisão de remuneração;
- necessidade de benefício;
- necessidade de evento externo;
- situação de retorno;
- impactos.

### 13.4 Períodos e prorrogações

O caso poderá possuir vários períodos relacionados.

Cada período deverá registrar:

- início e fim;
- origem;
- documento;
- motivo;
- relação com período anterior;
- mesmo motivo ou motivo distinto;
- decisão interna;
- decisão externa;
- evento transmitido;
- competência afetada.

Prorrogação não editará o fim do período anterior sem histórico.

---

## 14. Documentos e dados de saúde

### 14.1 Tipos

- atestado;
- declaração de comparecimento;
- relatório;
- certidão;
- termo judicial;
- decisão administrativa;
- protocolo;
- comunicado;
- avaliação de retorno;
- documento de adoção ou guarda;
- documento de licença;
- documento de férias.

### 14.2 Metadados

- emissor;
- registro profissional quando aplicável;
- data de emissão;
- período declarado;
- quantidade de dias;
- tipo;
- hash;
- versão;
- classificação de sensibilidade;
- validade;
- situação de conferência;
- motivo de rejeição;
- substituições.

### 14.3 Minimização

O sistema deverá:

- evitar exigir diagnóstico quando não necessário;
- separar dado clínico de dado operacional;
- mascarar informação para gestores;
- registrar acesso a documento sensível;
- impedir download em massa sem permissão especial;
- aplicar retenção específica;
- impedir uso de documento médico para finalidade incompatível;
- permitir relatório operacional sem revelar conteúdo clínico.

### 14.4 Conferência

Estados:

```text
RECEBIDO
  → EM_CONFERENCIA
  → ACEITO
  → ACEITO_COM_RESSALVA
  → SUBSTITUICAO_SOLICITADA
  → REJEITADO
  → EXPIRADO
```

A rejeição exigirá motivo padronizado e comentário adequado, sem diagnóstico desnecessário.

---

## 15. Benefícios e decisões externas

### 15.1 Caso externo

Deverá armazenar:

- órgão;
- protocolo;
- benefício solicitado;
- data do requerimento;
- estado;
- período reconhecido;
- decisão;
- data da decisão;
- cessação;
- prorrogação;
- recurso;
- documentos;
- divergência com estado interno.

### 15.2 Estados

- `NAO_NECESSARIO`;
- `A_PREPARAR`;
- `REQUERIDO`;
- `EM_ANALISE`;
- `CONCEDIDO`;
- `INDEFERIDO`;
- `PRORROGADO`;
- `CESSADO`;
- `EM_RECURSO`;
- `CANCELADO`;
- `COM_DIVERGENCIA`.

### 15.3 Reconciliação

O sistema deverá comparar:

- período informado pela empresa;
- período requerido;
- período reconhecido;
- retorno interno;
- folha paga;
- ponto tratado;
- benefício concedido.

Divergência gerará caso de reconciliação, não alteração silenciosa.

---

## 16. Eventos governamentais e SST

### 16.1 Projeções

O módulo deverá preparar estados para:

- afastamento temporário;
- término ou alteração do afastamento;
- férias;
- evento relacionado a acidente quando aplicável;
- retificação;
- exclusão;
- correlação com recibos anteriores.

### 16.2 Estados da transmissão

```text
NAO_APLICAVEL
  → A_PREPARAR
  → VALIDANDO
  → PRONTO
  → ENFILEIRADO
  → TRANSMITIDO
  → PROCESSANDO
  → ACEITO
```

Alternativas:

- `REJEITADO`;
- `BLOQUEADO`;
- `RETIFICACAO_NECESSARIA`;
- `EXCLUSAO_NECESSARIA`;
- `CANCELADO`.

### 16.3 Requisitos de integração

- payload versionado;
- schema correspondente;
- chave idempotente;
- ordem causal;
- recibo;
- erros legíveis;
- tentativa e retentativa;
- fila de intervenção;
- impossibilidade de alterar payload aceito;
- nova projeção para retificação.

### 16.4 Relação com CAT

O afastamento decorrente de acidente poderá exigir correlação com CAT, mas:

- CAT e afastamento serão objetos distintos;
- um poderá existir antes do outro;
- recibos serão correlacionados;
- gestor não terá acesso a dados clínicos;
- SST manterá responsabilidade sobre o evento de acidente;
- RH manterá responsabilidade sobre efeitos do afastamento.

---

## 17. Retorno ao trabalho

### 17.1 Fluxo

```text
Fim previsto ou alta
  → Conferência documental
  → Avaliação ocupacional quando aplicável
  → Definição de aptidão e restrições
  → Confirmação da data efetiva
  → Encerramento do afastamento
  → Reativação operacional
  → Reconciliação de ponto, folha e eventos
```

### 17.2 Estados

- `NAO_INICIADO`;
- `PREVISTO`;
- `DOCUMENTO_PENDENTE`;
- `AVALIACAO_PENDENTE`;
- `APTO`;
- `APTO_COM_RESTRICAO`;
- `INAPTO`;
- `RETORNO_CONFIRMADO`;
- `CANCELADO`;
- `REAGENDADO`.

### 17.3 Restrições

Uma restrição deverá possuir:

- descrição operacional minimizada;
- data inicial e final;
- atividades vedadas;
- condições necessárias;
- responsável técnico;
- documento restrito;
- impacto em cargo, função, obra, escala e segurança;
- revisão.

O gestor receberá somente a restrição necessária à alocação, sem diagnóstico.

---

## 18. Matriz de sobreposição

O sistema deverá avaliar conflitos entre:

- férias;
- afastamento médico;
- licença maternidade ou adoção;
- acidente de trabalho;
- suspensão contratual;
- ausência de curta duração;
- aviso prévio;
- desligamento;
- alteração contratual;
- férias coletivas;
- retorno com restrição;
- banco de horas e folga compensatória.

### 18.1 Resultados possíveis

- permitido;
- permitido com alerta;
- bloqueado;
- requer aprovação especial;
- requer cancelamento do evento anterior;
- requer remarcação;
- requer tratamento financeiro;
- requer retificação externa;
- requer avaliação jurídica ou médica.

### 18.2 Evidência

Cada decisão armazenará:

- regras avaliadas;
- versão;
- fatos;
- resultado;
- exceção aplicada;
- aprovador;
- data.

---

## 19. Integrações

### 19.1 Cadastro Mestre

- vínculo;
- pessoa;
- documentos comuns;
- contatos;
- dependentes quando necessários.

### 19.2 Contratos

- vigência;
- modalidade;
- categoria;
- remuneração;
- término previsto;
- alterações futuras;
- suspensão e retorno.

### 19.3 Jornada e ponto

- expectativa de trabalho;
- ausência detectada;
- bloqueio de escala;
- tratamento de ocorrências;
- reprocessamento;
- retorno.

### 19.4 Folha

- férias;
- abono;
- afastamentos remunerados e não remunerados;
- responsabilidade de pagamento;
- diferenças retroativas;
- competência;
- fechamento e reabertura.

### 19.5 Benefícios

- manutenção, suspensão ou alteração;
- elegibilidade;
- coparticipação;
- retorno.

### 19.6 Obras e equipes

- indisponibilidade;
- previsão de retorno;
- necessidade de substituição;
- restrição operacional;
- custo projetado;
- sem exposição de diagnóstico.

### 19.7 SST

- CAT;
- avaliação de retorno;
- restrições;
- exames ocupacionais;
- ambiente e risco.

### 19.8 Documentos, notificações e auditoria

- armazenamento protegido;
- geração de documentos;
- avisos;
- lembretes;
- eventos auditáveis;
- retenção.

---

## 20. Telas e rotas previstas

### 20.1 Férias

- `/app/departamento-pessoal/ferias`;
- `/app/departamento-pessoal/ferias/calendario`;
- `/app/departamento-pessoal/ferias/periodos-aquisitivos`;
- `/app/departamento-pessoal/ferias/solicitacoes`;
- `/app/departamento-pessoal/ferias/solicitacoes/nova`;
- `/app/departamento-pessoal/ferias/solicitacoes/[id]`;
- `/app/departamento-pessoal/ferias/coletivas`;
- `/app/departamento-pessoal/ferias/coletivas/[id]`;
- `/app/departamento-pessoal/ferias/riscos`;
- `/app/departamento-pessoal/ferias/configuracoes`.

### 20.2 Ausências e afastamentos

- `/app/departamento-pessoal/ausencias`;
- `/app/departamento-pessoal/ausencias/[id]`;
- `/app/departamento-pessoal/afastamentos`;
- `/app/departamento-pessoal/afastamentos/novo`;
- `/app/departamento-pessoal/afastamentos/[id]`;
- `/app/departamento-pessoal/afastamentos/[id]/documentos`;
- `/app/departamento-pessoal/afastamentos/[id]/beneficio`;
- `/app/departamento-pessoal/afastamentos/[id]/eventos`;
- `/app/departamento-pessoal/afastamentos/[id]/retorno`;
- `/app/departamento-pessoal/afastamentos/retornos`;
- `/app/departamento-pessoal/afastamentos/configuracoes`.

### 20.3 Portal do trabalhador

- `/app/meus-dados/ferias`;
- `/app/meus-dados/ferias/solicitar`;
- `/app/meus-dados/ausencias`;
- `/app/meus-dados/documentos-de-afastamento`;
- `/app/meus-dados/afastamentos`;
- `/app/meus-dados/retorno`.

---

## 21. Painéis

### 21.1 Painel de férias

- direitos em formação;
- direitos adquiridos;
- vencimento próximo;
- férias vencidas;
- solicitações pendentes;
- avisos a emitir;
- pagamentos pendentes;
- férias em gozo;
- conflitos;
- cobertura por equipe e obra;
- custo projetado.

### 21.2 Painel de afastamentos

- casos recebidos;
- documentos pendentes;
- casos ativos;
- prorrogações;
- benefícios aguardando decisão;
- eventos externos rejeitados;
- retornos próximos;
- avaliações pendentes;
- divergências com ponto e folha;
- casos por empresa, estabelecimento e motivo.

---

## 22. Permissões

Permissões sugeridas:

- `view_vacation_entitlements`;
- `manage_vacation_entitlements`;
- `request_vacation`;
- `approve_vacation_operationally`;
- `approve_vacation_hr`;
- `issue_vacation_notice`;
- `view_vacation_payroll_values`;
- `manage_collective_vacation`;
- `cancel_paid_vacation`;
- `view_absence_occurrences`;
- `submit_absence_justification`;
- `review_absence_justification`;
- `create_leave_case`;
- `view_leave_case`;
- `manage_leave_case`;
- `view_sensitive_leave_documents`;
- `review_medical_document`;
- `manage_external_benefit_case`;
- `transmit_leave_event`;
- `approve_return_to_work`;
- `record_work_restriction`;
- `reopen_leave_case`;
- `override_overlap_rule`;
- `export_leave_data`;
- `audit_leave_data`.

Permissão ampla de RH não implicará acesso automático a documentos clínicos.

---

## 23. Auditoria

Eventos mínimos:

- período aquisitivo criado ou recalculado;
- movimento de férias registrado;
- solicitação criada;
- datas alteradas;
- aprovação concedida ou revogada;
- aviso emitido;
- ciência registrada;
- cálculo recebido;
- pagamento registrado;
- férias iniciadas ou concluídas;
- cancelamento ou remarcação;
- plano coletivo criado e aplicado;
- ausência detectada;
- justificativa enviada e decidida;
- caso de afastamento aberto;
- documento acessado, recebido, aceito ou rejeitado;
- período prorrogado;
- benefício atualizado;
- evento externo preparado, transmitido, aceito ou rejeitado;
- retorno aprovado;
- restrição criada ou encerrada;
- caso reaberto;
- sobreposição dispensada;
- exportação de dado sensível.

A auditoria deverá registrar antes e depois quando aplicável, sem copiar diagnóstico para logs gerais.

---

## 24. Alertas e notificações

- período aquisitivo prestes a concluir;
- limite de concessão próximo;
- férias vencidas;
- prazo de aviso em risco;
- pagamento em risco;
- conflito com feriado ou repouso;
- saldo insuficiente;
- sobreposição com afastamento;
- cobertura insuficiente de obra;
- documento pendente;
- prazo interno de entrega vencido;
- afastamento sem evento externo;
- evento rejeitado;
- retorno previsto;
- avaliação de retorno pendente;
- benefício sem decisão;
- divergência de período;
- competência de folha impactada;
- restrição prestes a vencer;
- caso ativo sem atualização.

Notificações de saúde não deverão conter diagnóstico em assunto ou mensagem não protegida.

---

## 25. Relatórios

### 25.1 Férias

- posição de férias por data;
- períodos aquisitivos;
- direitos adquiridos;
- direitos vencidos;
- saldo por vínculo;
- concessões por período;
- férias programadas;
- férias coletivas;
- abonos;
- cancelamentos e remarcações;
- pagamentos;
- cobertura de equipes;
- provisão e custo projetado;
- divergências de cálculo;
- trilha de concessão.

### 25.2 Ausências e afastamentos

- ausências por status;
- justificativas pendentes;
- afastamentos ativos;
- duração por motivo;
- prorrogações;
- benefícios externos;
- eventos rejeitados;
- retornos;
- restrições operacionais;
- divergências com ponto;
- impactos de folha;
- reincidências configuradas;
- casos por vínculo, empresa e estabelecimento.

Relatórios gerenciais deverão anonimizar ou agregar dados de saúde quando possível.

---

## 26. Requisitos funcionais

### RH-M06-FR-001 — Configurar políticas por vigência

O sistema deverá permitir políticas diferentes por empresa, categoria e instrumento coletivo, preservando versões históricas.

### RH-M06-FR-002 — Manter catálogo versionado de motivos

Cada motivo deverá possuir regras de documento, remuneração, ponto, folha, retorno e integração externa.

### RH-M06-FR-003 — Gerar períodos aquisitivos

O sistema deverá gerar períodos a partir do vínculo e recalcular somente por processo auditado.

### RH-M06-FR-004 — Registrar movimentos de férias

Aquisição, concessão, gozo, abono, estorno e indenização deverão ser movimentos imutáveis.

### RH-M06-FR-005 — Exibir memória de cálculo

Usuário autorizado deverá visualizar fatos, regras, faltas e versão utilizados.

### RH-M06-FR-006 — Detectar riscos de vencimento

O sistema deverá classificar períodos por risco e prazo restante.

### RH-M06-FR-007 — Criar solicitação individual

Trabalhador ou usuário autorizado poderá propor datas e fracionamento.

### RH-M06-FR-008 — Validar saldo e origem

Cada concessão deverá indicar os períodos aquisitivos consumidos.

### RH-M06-FR-009 — Validar fracionamento

A validação deverá considerar regra vigente e concordância necessária.

### RH-M06-FR-010 — Registrar pedido de abono

O pedido deverá possuir prazo, decisão e impacto próprios.

### RH-M06-FR-011 — Avaliar conflito operacional

O gestor deverá consultar cobertura sem acessar valores ou dados médicos.

### RH-M06-FR-012 — Aprovar por etapas

Aprovação operacional, de RH e de folha poderão ser configuradas separadamente.

### RH-M06-FR-013 — Emitir aviso versionado

O aviso deverá possuir hash, datas, regra e canal de entrega.

### RH-M06-FR-014 — Registrar ciência

O sistema deverá registrar aceite, recusa ou ausência de ciência.

### RH-M06-FR-015 — Projetar cálculo para folha

A projeção deverá ser idempotente e referenciar a concessão.

### RH-M06-FR-016 — Receber cálculo e pagamento

O módulo deverá armazenar versão, rubricas, valores e comprovante.

### RH-M06-FR-017 — Iniciar e concluir gozo

O processo deverá revalidar bloqueios antes do início e gerar movimentos ao concluir.

### RH-M06-FR-018 — Remarcar férias

A remarcação deverá preservar aviso, cálculo, evento e decisão anteriores.

### RH-M06-FR-019 — Cancelar com impactos

Cancelamento deverá gerar tarefas financeiras e externas quando aplicável.

### RH-M06-FR-020 — Planejar férias coletivas

O sistema deverá definir escopo, datas, trabalhadores e comunicações.

### RH-M06-FR-021 — Simular férias coletivas

A simulação deverá identificar direitos proporcionais, reinícios e conflitos.

### RH-M06-FR-022 — Aplicar plano coletivo em lote

O processamento deverá ser retomável e reportar falhas por trabalhador.

### RH-M06-FR-023 — Importar ausências do ponto

Ocorrências deverão manter referência à apuração e marcações originais.

### RH-M06-FR-024 — Receber justificativa

O trabalhador poderá enviar motivo e documento conforme política.

### RH-M06-FR-025 — Decidir justificativa

A decisão deverá indicar quantidade justificada e efeito derivado.

### RH-M06-FR-026 — Vincular ausência a afastamento

A vinculação não deverá apagar a ocorrência de origem.

### RH-M06-FR-027 — Abrir caso de afastamento

O caso deverá aceitar diferentes origens e manter data de conhecimento.

### RH-M06-FR-028 — Classificar motivo interno e externo

O sistema deverá manter mapeamento versionado, sem tratar códigos como equivalentes absolutos.

### RH-M06-FR-029 — Manter vários períodos

Um caso poderá conter início, prorrogações, interrupções e retorno.

### RH-M06-FR-030 — Receber documentos sensíveis

Upload deverá aplicar classificação, criptografia e autorização.

### RH-M06-FR-031 — Conferir documentos

Documento poderá ser aceito, recusado ou substituído sem apagar versões.

### RH-M06-FR-032 — Minimizar dados médicos

Telas operacionais não deverão exibir diagnóstico.

### RH-M06-FR-033 — Registrar decisão de remuneração

O caso deverá indicar responsabilidade de pagamento por período e fonte da regra.

### RH-M06-FR-034 — Registrar caso de benefício externo

Protocolo, decisão, período e recurso deverão ser rastreados.

### RH-M06-FR-035 — Reconciliar período externo

Divergências deverão gerar pendência e impactos explícitos.

### RH-M06-FR-036 — Preparar evento governamental

O payload deverá ser derivado do estado aprovado e versionado.

### RH-M06-FR-037 — Transmitir com idempotência

Retentativas não deverão duplicar evento aceito.

### RH-M06-FR-038 — Tratar rejeições

O erro deverá ser traduzido em pendência acionável sem alterar o caso aprovado.

### RH-M06-FR-039 — Retificar ou excluir evento

A operação deverá manter correlação, autorização e histórico.

### RH-M06-FR-040 — Correlacionar CAT

Quando aplicável, recibos e períodos deverão ser relacionados sem unir os objetos.

### RH-M06-FR-041 — Planejar retorno

O sistema deverá iniciar fluxo antes do fim previsto conforme política.

### RH-M06-FR-042 — Exigir avaliação quando aplicável

Escala e alocação poderão permanecer bloqueadas até decisão autorizada.

### RH-M06-FR-043 — Registrar aptidão e restrições

A informação operacional deverá ser separada do documento clínico.

### RH-M06-FR-044 — Confirmar retorno efetivo

A data efetiva deverá encerrar efeitos e iniciar reconciliações.

### RH-M06-FR-045 — Reabrir caso

Reabertura deverá preservar encerramento e exigir justificativa.

### RH-M06-FR-046 — Avaliar sobreposições

O sistema deverá executar matriz versionada antes de aprovar ou aplicar períodos.

### RH-M06-FR-047 — Autorizar exceção

Exceção exigirá permissão especial, justificativa e prazo.

### RH-M06-FR-048 — Integrar com escala

Férias e afastamentos aprovados deverão bloquear ou ajustar escalas futuras.

### RH-M06-FR-049 — Integrar com obras

Gestores receberão indisponibilidade, retorno e restrições operacionais necessárias.

### RH-M06-FR-050 — Integrar com benefícios

O módulo deverá produzir eventos de manutenção, suspensão e retomada.

### RH-M06-FR-051 — Integrar com folha fechada

Alteração retroativa deverá gerar solicitação de reprocessamento, não mutação silenciosa.

### RH-M06-FR-052 — Versionar impactos derivados

Ponto, folha, benefícios, obras e eventos deverão referenciar a versão consumida.

### RH-M06-FR-053 — Fornecer portal do trabalhador

O trabalhador deverá consultar solicitações, documentos e decisões permitidas.

### RH-M06-FR-054 — Fornecer calendário gerencial

Calendário deverá exibir disponibilidade sem revelar motivo sensível.

### RH-M06-FR-055 — Gerar alertas legais e operacionais

Alertas deverão considerar vigência, empresa e categoria.

### RH-M06-FR-056 — Gerar relatórios auditáveis

Relatórios deverão indicar data de referência e versão da regra.

### RH-M06-FR-057 — Registrar acesso a dado sensível

Visualização e download de documento médico deverão ser auditados.

### RH-M06-FR-058 — Impedir exclusão física

Casos e concessões utilizados por cálculo, evento ou histórico não poderão ser apagados.

### RH-M06-FR-059 — Suportar migração histórica

Importação deverá distinguir dado confirmado, estimado e não comprovado.

### RH-M06-FR-060 — Reproduzir estado em qualquer data

Consulta temporal deverá reconstruir direito, concessão, afastamento e impactos válidos.

---

## 27. Regras de negócio

### RH-M06-BR-001

Saldo de férias não poderá ser alterado diretamente.

### RH-M06-BR-002

Movimento confirmado será imutável; correção ocorrerá por estorno.

### RH-M06-BR-003

Programação não consumirá definitivamente o direito antes da etapa definida pela política.

### RH-M06-BR-004

Gozo concluído deverá gerar consumo rastreável.

### RH-M06-BR-005

Concessão deverá apontar a origem do saldo.

### RH-M06-BR-006

Fracionamento dependerá da regra vigente na data relevante.

### RH-M06-BR-007

Concordância necessária deverá ser comprovável.

### RH-M06-BR-008

Aviso deverá possuir antecedência validada pela política aplicável.

### RH-M06-BR-009

Início em data vedada será bloqueado.

### RH-M06-BR-010

Pagamento pendente poderá bloquear início conforme política.

### RH-M06-BR-011

Férias pagas não poderão ser canceladas sem tratamento financeiro.

### RH-M06-BR-012

Remarcação criará nova versão de datas.

### RH-M06-BR-013

Plano coletivo não será aplicado sem simulação registrada.

### RH-M06-BR-014

Falha de um trabalhador em lote não ocultará resultados dos demais.

### RH-M06-BR-015

Ausência detectada não será considerada injustificada antes do fluxo previsto.

### RH-M06-BR-016

Justificativa não editará marcação de ponto.

### RH-M06-BR-017

Documento recebido não significa documento aceito.

### RH-M06-BR-018

Atestado não significa benefício concedido.

### RH-M06-BR-019

Um caso poderá possuir períodos sucessivos e correlatos.

### RH-M06-BR-020

Prorrogação preservará o período anterior.

### RH-M06-BR-021

Motivo interno e código externo serão campos distintos.

### RH-M06-BR-022

Dados médicos serão ocultados de perfis operacionais.

### RH-M06-BR-023

Acesso administrativo não concederá automaticamente acesso clínico.

### RH-M06-BR-024

Evento aceito externamente não terá payload alterado.

### RH-M06-BR-025

Retificação criará nova projeção vinculada.

### RH-M06-BR-026

Decisão externa divergente não sobrescreverá o estado interno.

### RH-M06-BR-027

Retorno poderá depender de avaliação ocupacional.

### RH-M06-BR-028

Data final prevista não será sempre retorno efetivo.

### RH-M06-BR-029

Restrição operacional não deverá revelar diagnóstico.

### RH-M06-BR-030

Sobreposição deverá ser resolvida antes da aplicação.

### RH-M06-BR-031

Exceção terá validade e responsável.

### RH-M06-BR-032

Alteração retroativa sinalizará competências afetadas.

### RH-M06-BR-033

Folha fechada não será reaberta automaticamente pelo módulo.

### RH-M06-BR-034

Ponto fechado não será reescrito; será criada nova versão.

### RH-M06-BR-035

Cada vínculo será tratado separadamente.

### RH-M06-BR-036

Término de vínculo bloqueará novas concessões incompatíveis.

### RH-M06-BR-037

Alteração contratual futura será considerada nas validações de período.

### RH-M06-BR-038

Documento substituído permanecerá armazenado conforme retenção.

### RH-M06-BR-039

Download em lote de documentos sensíveis será restrito.

### RH-M06-BR-040

Relatório gerencial deverá minimizar dados pessoais.

### RH-M06-BR-041

Job automático não poderá aprovar exceção.

### RH-M06-BR-042

Migração histórica deverá registrar nível de confiança.

### RH-M06-BR-043

Toda regra aplicada terá identificador e versão.

### RH-M06-BR-044

Toda integração derivada terá chave idempotente.

### RH-M06-BR-045

Exclusão física de registro utilizado será proibida.

---

## 28. Cenários de exceção

### 28.1 Afastamento começa antes das férias programadas

- registrar o afastamento;
- sinalizar conflito;
- bloquear início automático;
- abrir remarcação ou cancelamento;
- preservar aviso e pagamento;
- preparar retificação externa e financeira.

### 28.2 Documento chega após fechamento da folha

- registrar data real de conhecimento;
- analisar o caso;
- preservar folha fechada;
- gerar impacto retroativo;
- solicitar reprocessamento autorizado.

### 28.3 Trabalhador retorna antes da data prevista

- exigir evidência e aprovação conforme motivo;
- avaliar necessidade ocupacional;
- registrar nova data efetiva;
- retificar eventos;
- recalcular impactos.

### 28.4 Benefício é indeferido

- manter decisão externa;
- abrir reconciliação;
- revisar responsabilidade financeira;
- gerar diferenças;
- não apagar o afastamento informado.

### 28.5 Férias coletivas incluem admitido recente

- simular direito proporcional;
- aplicar regra vigente;
- registrar reinício quando cabível;
- demonstrar impacto ao RH antes da aplicação.

### 28.6 Gestor tenta abrir atestado

- negar acesso;
- registrar tentativa quando relevante;
- exibir somente período de indisponibilidade.

### 28.7 Duplo clique na aplicação

- mesma chave idempotente retorna o resultado anterior;
- não duplica movimentos, eventos ou pagamentos.

### 28.8 Documento contém período divergente

- manter período declarado e período reconhecido;
- exigir decisão explícita;
- registrar justificativa.

### 28.9 Evento externo aceito e caso interno corrigido

- preservar payload aceito;
- preparar retificação ou exclusão conforme regra;
- impedir mutação do recibo anterior.

### 28.10 Retorno com restrição incompatível com obra

- bloquear alocação incompatível;
- sugerir atividade permitida;
- notificar RH, SST e gestor sem expor diagnóstico.

---

## 29. Critérios de aceite

1. Um vínculo ativo gera período aquisitivo conforme política vigente.
2. O saldo pode ser reconstruído por movimentos.
3. Edição direta do saldo é bloqueada.
4. Solicitação superior ao saldo é rejeitada.
5. Fracionamento inválido é bloqueado.
6. Concordância fica registrada.
7. Data de início proibida é sinalizada.
8. Aviso recebe versão e hash.
9. Recusa de ciência não apaga o aviso.
10. Pagamento é vinculado à concessão.
11. Cancelamento após pagamento cria impacto financeiro.
12. Remarcação preserva as datas anteriores.
13. Férias coletivas geram simulação por trabalhador.
14. Processamento em lote é retomável.
15. Ausência do ponto mantém a marcação original.
16. Justificativa parcial trata apenas parte do período.
17. Documento recebido permanece pendente até conferência.
18. Documento substituído continua auditável.
19. Gestor não visualiza diagnóstico.
20. Caso suporta prorrogações.
21. Motivo interno permanece distinto do externo.
22. Benefício externo possui estado independente.
23. Divergência externa gera reconciliação.
24. Evento transmitido possui payload e recibo.
25. Retentativa não duplica evento.
26. Retificação preserva evento anterior.
27. Retorno pode ser bloqueado por avaliação.
28. Restrição operacional é exibida sem diagnóstico.
29. Sobreposição é bloqueada ou autorizada explicitamente.
30. Alteração retroativa gera impactos de ponto e folha.
31. Competência fechada não é alterada silenciosamente.
32. Cada vínculo da mesma pessoa é processado separadamente.
33. Calendário gerencial exibe ausência sem motivo sensível.
34. Acesso a documento médico é auditado.
35. Exportação sensível exige permissão especial.
36. Regra utilizada aparece na memória de cálculo.
37. Consulta por data reconstrói a situação histórica.
38. Registro utilizado não pode ser excluído fisicamente.
39. Migração histórica informa nível de confiança.
40. Falha de integração não perde o estado interno aprovado.

---

## 30. Estratégia de testes

### 30.1 Testes unitários

- formação de períodos aquisitivos;
- movimentos e saldos;
- fracionamento;
- validação de datas;
- matriz de sobreposição;
- mapeamento de motivos;
- regras de retorno;
- cálculo de risco;
- idempotência.

### 30.2 Testes de integração

- contrato e férias;
- ponto e ausência;
- afastamento e folha;
- afastamento e benefícios;
- SST e CAT;
- eventos externos;
- obras e indisponibilidade;
- documentos e permissões.

### 30.3 Testes de concorrência

- duas aprovações simultâneas;
- duas concessões consumindo o mesmo saldo;
- prorrogação concorrente com retorno;
- cancelamento concorrente com pagamento;
- retentativa de evento;
- lote coletivo executado duas vezes.

### 30.4 Testes de segurança

- isolamento entre organizações;
- tentativa de acesso clínico por gestor;
- download por URL expirado;
- exportação sem permissão;
- log sem diagnóstico;
- revogação de acesso;
- auditoria de leitura.

### 30.5 Testes ponta a ponta

- férias individuais completas;
- férias fracionadas;
- abono;
- férias coletivas;
- ausência justificada;
- afastamento médico com prorrogação;
- acidente com CAT correlata;
- benefício divergente;
- retorno com restrição;
- cancelamento de férias pagas.

---

## 31. Requisitos não funcionais

- isolamento por organização e empresa;
- operações críticas transacionais;
- idempotência em lote e integrações;
- trilha de auditoria inviolável;
- criptografia de documentos;
- autorização por finalidade;
- consultas temporais;
- reprocessamento determinístico;
- filas duráveis;
- observabilidade sem dados clínicos;
- exportação controlada;
- retenção configurável;
- recuperação de desastre;
- acessibilidade nas telas;
- suporte a fuso e datas locais;
- desempenho para processamento coletivo.

---

## 32. MVP e evolução

### 32.1 MVP

- políticas básicas;
- período aquisitivo;
- saldo por movimentos;
- férias individuais;
- aviso;
- integração inicial com folha;
- ausências do ponto;
- casos de afastamento;
- documentos;
- S-2230 por estados;
- retorno;
- permissões;
- alertas e relatórios principais.

### 32.2 Evolução

- férias coletivas avançadas;
- assinatura eletrônica integrada;
- leitura assistida de documentos;
- integração automática com benefícios;
- motor de instrumentos coletivos;
- planejamento inteligente de cobertura;
- portal móvel;
- integração ampliada com medicina ocupacional;
- analytics de absenteísmo com privacidade;
- previsão de risco e custo;
- automação de reconciliações com supervisão humana.

---

## 33. Sequência recomendada de implementação

1. catálogo e políticas;
2. períodos aquisitivos e movimentos;
3. consulta de saldo e memória;
4. solicitações de férias;
5. aprovações, aviso e ciência;
6. integração com folha;
7. gozo, conclusão, cancelamento e remarcação;
8. ocorrências de ausência;
9. casos de afastamento e documentos;
10. benefícios externos;
11. eventos governamentais;
12. retorno e restrições;
13. matriz de sobreposição;
14. férias coletivas;
15. relatórios e migração;
16. testes de segurança e concorrência;
17. homologação jurídica, contábil e operacional.

Nenhuma etapa deverá avançar para produção sem políticas oficiais e coletivas revisadas.

---

## 34. Riscos

- regra desatualizada;
- convenção coletiva não cadastrada;
- saldo histórico incorreto;
- documentos excessivamente expostos;
- sobreposição não resolvida;
- pagamento sem remarcação correta;
- evento externo fora de ordem;
- benefício divergente;
- retorno sem avaliação necessária;
- folha reprocessada sem controle;
- gestor inferir diagnóstico por relatório;
- lote coletivo parcialmente aplicado;
- integração de obra tratar ausência como desligamento;
- automação decidir matéria médica ou jurídica.

Mitigações:

- versionamento;
- revisão humana;
- permissões segregadas;
- simulação;
- memória de cálculo;
- idempotência;
- filas de reconciliação;
- auditoria;
- testes negativos;
- revalidação oficial antes da produção.

---

## 35. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultados:

- CLT compilada, especialmente artigos sobre aquisição, concessão, fracionamento, aviso, férias coletivas, abono, pagamento, ausências justificadas, maternidade e suspensão;
- orientações do Ministério do Trabalho e Emprego sobre férias;
- documentação técnica do eSocial S-1.3 até a Nota Técnica 06/2026;
- Manual WEB Geral do eSocial, seção S-2230;
- orientações oficiais sobre afastamentos e benefícios por incapacidade.

A baseline atual indica que:

- férias são direito anual vinculado ao período de serviço;
- a concessão possui prazo e formalização próprios;
- o fracionamento depende das condições legais vigentes;
- aviso e pagamento são etapas distintas;
- férias coletivas possuem regras e comunicações próprias;
- ausências legalmente justificadas não devem ser tratadas como faltas comuns;
- afastamentos temporários são informados pelo S-2230 conforme motivos e regras do leiaute;
- prorrogações, términos e afastamentos relacionados exigem continuidade e correlação;
- ausência de informação de afastamento pode prejudicar análise de benefício.

Campos, prazos, motivos, documentos e interpretações deverão ser verificados novamente antes da implementação, homologação e produção.

---

## 36. Estado honesto

Este documento é uma especificação funcional.

Ainda não foram implementados ou testados:

- tabelas;
- migrations;
- RLS;
- rotas;
- telas;
- cálculos;
- documentos;
- integrações de folha;
- eventos do eSocial;
- integração com INSS;
- fluxo médico;
- migração de saldos;
- matriz de sobreposição;
- testes automatizados.

A implementação dependerá de revisão técnica, contábil, trabalhista, previdenciária, de privacidade e de segurança.
