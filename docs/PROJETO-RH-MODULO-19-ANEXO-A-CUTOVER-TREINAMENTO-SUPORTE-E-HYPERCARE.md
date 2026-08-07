# Projeto RH — Módulo 19 — Anexo A — Cutover, Treinamento, Suporte e Hypercare

**Versão:** 0.1.0  
**Estado:** matriz operacional inicial concluída; execução não iniciada  
**Data:** 7 de agosto de 2026  
**Documento principal:** `PROJETO-RH-MODULO-19-IMPLANTACAO-CUTOVER-TREINAMENTO-SUPORTE-E-MUDANCA.md`

---

## 1. Finalidade

Este anexo transforma a estratégia do Módulo 19 em uma matriz operacional revisável para:

- rehearsal;
- cutover;
- decisão de go-live;
- treinamento;
- comunicação;
- suporte;
- hypercare;
- estabilização.

Nenhum item abaixo está executado por estar marcado como parte da matriz. Evidência real será adicionada somente durante as ondas de implantação.

---

## 2. Estados de execução

Cada atividade futura deverá utilizar um estado explícito:

```text
NOT_PLANNED
PLANNED
READY
RUNNING
PASSED
PASSED_WITH_CONDITION
FAILED
ABORTED
NOT_APPLICABLE
```

`PASSED` exige evidência quando a atividade for verificável. `NOT_APPLICABLE` exige justificativa.

---

## 3. Matriz de cutover — 72 atividades

### Fase C0 — Identidade do release

| ID | Atividade | Evidência esperada |
|---|---|---|
| C001 | fixar release ID | manifesto |
| C002 | fixar commit SHA | manifesto/Git |
| C003 | listar migrations | manifesto |
| C004 | listar versões de regras | manifesto |
| C005 | listar adapters | manifesto |
| C006 | congelar configuração | snapshot |
| C007 | congelar feature flags esperadas | snapshot |
| C008 | vincular evidence packages | índice de evidências |
| C009 | registrar owners | matriz RACI |

### Fase C1 — Readiness de ambiente

| ID | Atividade | Evidência esperada |
|---|---|---|
| C010 | confirmar ambiente alvo | checklist |
| C011 | confirmar secrets por cofre | confirmação sem valor do segredo |
| C012 | confirmar credenciais segregadas | checklist |
| C013 | confirmar endpoints externos | health report |
| C014 | confirmar workers | health report |
| C015 | confirmar filas | métricas/health |
| C016 | confirmar observabilidade | painel/teste |
| C017 | confirmar alertas críticos | teste controlado |
| C018 | confirmar suporte e responsáveis | escala operacional |

### Fase C2 — Dados e legado

| ID | Atividade | Evidência esperada |
|---|---|---|
| C019 | congelar inventário de fontes | inventário |
| C020 | aprovar mapa origem-destino | mapping |
| C021 | executar dry-run | relatório |
| C022 | revisar duplicidades | relatório de decisão |
| C023 | revisar ambiguidades | fila de exceções |
| C024 | validar saldos de abertura | reconciliação |
| C025 | validar documentos e hashes | relatório |
| C026 | definir marcador de corte | cutover plan |
| C027 | confirmar estratégia de legado | decisão registrada |

### Fase C3 — Recuperação e ensaio

| ID | Atividade | Evidência esperada |
|---|---|---|
| C028 | confirmar backup aplicável | registro de backup |
| C029 | validar restore recente | relatório de restore |
| C030 | executar replay aplicável | relatório |
| C031 | ensaiar migrations | rehearsal |
| C032 | ensaiar backfills | rehearsal |
| C033 | ensaiar rollback/roll-forward | relatório |
| C034 | ensaiar reconciliação | relatório |
| C035 | ensaiar comunicação de abort | template validado |
| C036 | registrar tempo e gaps do rehearsal | relatório de ensaio |

### Fase C4 — Pessoas, treinamento e comunicação

| ID | Atividade | Evidência esperada |
|---|---|---|
| C037 | confirmar usuários da coorte | lista autorizada |
| C038 | confirmar acessos | matriz de capability |
| C039 | concluir treinamento obrigatório | registro de conclusão |
| C040 | validar usuários-chave | aceite operacional |
| C041 | publicar material compatível | versão do material |
| C042 | comunicar janela | comunicação registrada |
| C043 | comunicar freeze | comunicação registrada |
| C044 | confirmar canal de suporte | checklist |
| C045 | confirmar war room quando aplicável | escala/canal |

### Fase C5 — Execução do cutover

| ID | Atividade | Evidência esperada |
|---|---|---|
| C046 | abrir change/cutover record | registro |
| C047 | confirmar critérios GO | checklist assinado |
| C048 | aplicar migrations aprovadas | log sanitizado |
| C049 | executar backfills | relatório |
| C050 | executar reconciliação imediata | relatório |
| C051 | executar smoke tests | relatório |
| C052 | habilitar flags da coorte | audit trail |
| C053 | confirmar health pós-ativação | snapshot |
| C054 | registrar primeira operação oficial | marcador de negócio |

### Fase C6 — Validação pós-cutover

| ID | Atividade | Evidência esperada |
|---|---|---|
| C055 | validar autenticação e acesso | teste |
| C056 | validar isolamento tenant | teste |
| C057 | validar contagens | reconciliação |
| C058 | validar somatórios | reconciliação |
| C059 | validar jobs e filas | painel |
| C060 | validar integrações | contratos/health |
| C061 | validar auditoria | evento correlacionado |
| C062 | validar portal/coorte | smoke funcional |
| C063 | obter aceite funcional pós-corte | registro de aceite |

### Fase C7 — Hypercare e encerramento

| ID | Atividade | Evidência esperada |
|---|---|---|
| C064 | iniciar hypercare | registro |
| C065 | revisar tickets e incidentes | relatório |
| C066 | revisar divergências | reconciliação |
| C067 | revisar métricas operacionais | snapshot |
| C068 | revisar gaps de treinamento | relatório |
| C069 | classificar backlog residual | backlog |
| C070 | confirmar critérios de saída | checklist |
| C071 | transferir ownership à operação | aceite |
| C072 | emitir relatório de encerramento | relatório final |

---

## 4. Critérios imediatos de ABORT

O cutover deverá ser interrompido ou não iniciado quando ocorrer condição crítica como:

- release diferente do manifesto;
- migration divergente;
- restore necessário não comprovado;
- erro de tenant ou RLS;
- falha de integridade referencial;
- reconciliação financeira fora do limite aprovado;
- contagem crítica inexplicável;
- secret ou certificado inválido;
- provider crítico indisponível sem contingência aprovada;
- observabilidade indisponível;
- responsável obrigatório ausente;
- operação externa em estado incerto fora de controle;
- treinamento crítico incompleto para a coorte;
- incidente de segurança ativo;
- mudança de escopo não avaliada.

O critério exato por onda será definido no runbook específico.

---

## 5. Matriz GO/NO_GO

| Dimensão | Pergunta |
|---|---|
| Código | o release candidate é exatamente o revisado? |
| Banco | migrations e ledger estão coerentes? |
| Dados | migração e saldos estão reconciliados? |
| Segurança | RLS, capability, secrets e uploads estão aprovados? |
| Integrações | providers e contingências estão conhecidos? |
| Qualidade | gates QG aplicáveis possuem evidência aceita? |
| Recuperação | rollback/roll-forward/restore são praticáveis? |
| Observabilidade | logs, métricas, alertas e correlation IDs funcionam? |
| Treinamento | operadores críticos estão preparados? |
| Suporte | triagem, escalonamento e owners estão disponíveis? |
| Comunicação | usuários sabem o que muda e onde pedir ajuda? |
| Negócio | responsável funcional aceita o corte? |
| Compliance | obrigações legais aplicáveis foram revalidadas? |
| Operação | a janela é compatível com competência e freeze? |

---

## 6. Trilhas de treinamento — 12 personas

### T01 — Administrador de plataforma

Objetivos:

- módulos e flags;
- perfis e capabilities;
- tenant e empresa;
- auditoria;
- incidentes;
- break-glass e revogação.

Prática mínima: ativar/desativar acesso em ambiente de treino e localizar evidência de auditoria.

### T02 — Administrador de RH

- cadastro mestre;
- estrutura;
- vínculo;
- casos e pendências;
- documentos;
- aprovações e histórico.

### T03 — Analista de admissão e contratos

- pré-admissão;
- checklist;
- conferência;
- ativação;
- alteração contratual;
- conflito de versão;
- documentos e evidências.

### T04 — Analista de jornada

- escala;
- marcações;
- tratamento;
- inconsistências;
- banco de horas;
- fechamento e reabertura.

### T05 — Analista de férias e afastamentos

- direitos;
- programação;
- sobreposições;
- documentos;
- benefícios externos;
- retorno e restrições.

### T06 — Analista de benefícios

- políticas;
- planos;
- adesões;
- dependentes por finalidade;
- cobranças;
- conciliação e descontos.

### T07 — SST / saúde ocupacional

- riscos e exposição;
- exames;
- ASO;
- prontuário segregado;
- incidentes;
- CAT;
- EPI;
- treinamentos e habilitações.

### T08 — Folha

- competência;
- fatos;
- rubricas;
- parâmetros;
- memória;
- cálculo sombra;
- divergência;
- fechamento;
- reabertura;
- pagamento e contabilização.

### T09 — Obrigações digitais

- projeções;
- validação;
- produção restrita;
- tentativas;
- recibos;
- totalizadores;
- estado incerto;
- retificação;
- reconciliação.

### T10 — Gestor / líder de obra

- equipe;
- aprovações;
- jornada;
- pendências;
- afastamento operacional;
- restrições sem diagnóstico;
- limites de visualização.

### T11 — Suporte funcional/técnico

- classificação de ticket;
- severidade;
- correlation ID;
- evidência segura;
- reprodução;
- escalonamento;
- incidentes e comunicação.

### T12 — Trabalhador self-service

- login;
- dados próprios;
- ponto;
- férias;
- benefícios;
- demonstrativos;
- documentos;
- solicitações;
- contestação.

---

## 7. Estrutura de uma sessão de treinamento

Cada sessão crítica deverá ser capaz de registrar:

```text
training_id
training_version
persona
release_compatibility
learning_objectives
prerequisites
scenarios
error_scenarios
privacy_notes
trainer_or_platform
participant
completed_at
assessment_reference
result
retraining_due_if_any
```

Valores mínimos de nota ou validade serão definidos somente quando houver política e capacidade operacional aprovadas.

---

## 8. Base de conhecimento

A base de conhecimento do RH deverá separar:

- procedimento operacional;
- FAQ;
- troubleshooting;
- runbook técnico;
- regra de negócio;
- regra legal parametrizada;
- tutorial de self-service;
- comunicação de mudança;
- incidente conhecido;
- workaround temporário.

Cada artigo deverá possuir versão, owner e data de revisão quando o conteúdo puder envelhecer.

---

## 9. Modelo de suporte

### L0 — Autosserviço

- ajuda contextual;
- FAQ;
- tutoriais;
- status conhecido;
- documentação do trabalhador.

### L1 — Triagem

Responsável por:

- identificar organização e capacidade;
- confirmar impacto;
- coletar correlation ID;
- classificar severidade inicial;
- aplicar procedimento simples aprovado;
- encaminhar corretamente.

Não pode:

- acessar prontuário sem papel apropriado;
- alterar banco;
- mudar regra de folha;
- reenviar transmissão incerta;
- alterar permissão crítica fora do processo.

### L2F — Especialista funcional

Exemplos:

- folha;
- ponto;
- SST;
- benefícios;
- admissão;
- compliance.

### L2T — Especialista técnico

- configuração;
- jobs;
- integrações;
- logs;
- storage;
- performance.

### L3 — Engenharia, dados e segurança

- bug de aplicação;
- migration;
- RLS;
- corrupção/integridade;
- incidente de segurança;
- recovery.

### L4 — Externo

- fornecedor;
- banco;
- clínica;
- assinatura;
- jurídico;
- órgão governamental.

---

## 10. Runbooks mínimos — 16

- **RB01:** login/autorização indisponível;
- **RB02:** erro de tenant ou exposição indevida;
- **RB03:** job preso ou fila crescente;
- **RB04:** integração externa indisponível;
- **RB05:** resposta externa incerta;
- **RB06:** falha no fechamento de ponto;
- **RB07:** divergência de cálculo de folha;
- **RB08:** falha de pagamento/arquivo bancário;
- **RB09:** transmissão governamental rejeitada;
- **RB10:** transmissão sem resposta conclusiva;
- **RB11:** arquivo suspeito ou scanner indisponível;
- **RB12:** indisponibilidade de documentos/Storage;
- **RB13:** falha de migration ou backfill;
- **RB14:** necessidade de rollback/roll-forward;
- **RB15:** incidente de privacidade/segurança;
- **RB16:** restore e continuidade do RH.

Cada runbook deverá conter trigger, impacto, diagnóstico, contenção, passos seguros, proibições, escalonamento, evidências, comunicação e encerramento.

---

## 11. Matriz de comunicação

| Momento | Público | Conteúdo mínimo |
|---|---|---|
| preparação | operadores | mudança, treinamento, janela |
| pré-cutover | afetados | freeze, indisponibilidade, suporte |
| GO | coorte | ativação e primeiros passos |
| incidente | afetados | impacto conhecido, contingência, canal |
| recuperação | afetados | retorno e verificações necessárias |
| expansão | nova coorte | mudança, treinamento e diferenças |
| legado read-only | usuários antigos | nova fonte oficial e consulta histórica |
| desativação | responsáveis | data, retenção e acesso futuro |

---

## 12. Indicadores de hypercare

Sem metas numéricas inventadas, o hypercare deverá observar pelo menos:

- sessões e usuários ativos da coorte;
- sucesso/falha de comandos críticos;
- jobs pendentes e idade da fila;
- integrações por estado;
- incidentes por severidade;
- tickets por domínio;
- dúvidas recorrentes;
- reconciliações pendentes;
- divergências financeiras;
- falhas de RLS/autorização;
- falhas de upload e documentos;
- tempo de processamento de folha;
- uso de contingência;
- acessos ao legado após corte;
- retrabalho pós-migração.

Os indicadores serão agregados e não formarão ranking comportamental de trabalhadores.

---

## 13. Checklist de saída do hypercare

- [ ] nenhum SEV-0 aberto;
- [ ] nenhum SEV-1 aberto sem contenção formal aceitável;
- [ ] reconciliações críticas concluídas;
- [ ] cálculos oficiais sem divergência desconhecida;
- [ ] filas críticas estáveis;
- [ ] integrações críticas observáveis;
- [ ] suporte possui capacidade normal;
- [ ] usuários-chave confirmaram operação;
- [ ] materiais e FAQ atualizados;
- [ ] backlog residual classificado;
- [ ] workarounds temporários possuem owner;
- [ ] legado está no estado previsto;
- [ ] ownership transferido;
- [ ] relatório de estabilização emitido.

---

## 14. Evidências mínimas da implantação

Um dossiê de implantação futura poderá conter:

1. release manifest;
2. decisão GO/NO_GO;
3. rehearsal report;
4. backup/restore evidence;
5. migration report;
6. backfill report;
7. reconciliation report;
8. smoke test report;
9. security/readiness report;
10. training completion summary;
11. communication record;
12. support readiness record;
13. activation audit trail;
14. post-cutover validation;
15. incident register;
16. hypercare dashboard snapshot;
17. stabilization sign-off;
18. legacy transition record.

---

## 15. Estado honesto

Até a data deste anexo:

- as 72 atividades são apenas uma matriz;
- as 12 trilhas são apenas desenho de treinamento;
- os 16 runbooks são apenas catálogo mínimo;
- nenhum participante foi treinado;
- nenhuma coorte foi criada;
- nenhuma janela foi marcada;
- nenhum cutover foi ensaiado para o RH;
- nenhuma decisão GO/NO_GO foi tomada;
- nenhum hypercare foi iniciado;
- nenhum sistema legado do RH foi desativado.
