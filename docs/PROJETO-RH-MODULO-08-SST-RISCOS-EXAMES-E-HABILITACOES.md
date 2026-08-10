# Projeto RH — Módulo 08 — Segurança e Saúde no Trabalho, Riscos, Exames, CAT, EPIs e Habilitações

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Objetivo

Definir o contexto funcional de Segurança e Saúde no Trabalho da Innovar Platform para suportar:

- Gerenciamento de Riscos Ocupacionais;
- Programa de Gerenciamento de Riscos;
- inventário de perigos e riscos;
- plano de ação preventivo;
- perfis de exposição por ambiente, função e trabalhador;
- Programa de Controle Médico de Saúde Ocupacional;
- convocações, exames ocupacionais e ASOs;
- acidentes, incidentes, quase acidentes e CAT;
- equipamentos de proteção individual;
- treinamentos, certificados e qualificações;
- permissões de trabalho e habilitações operacionais;
- eventos de SST do eSocial;
- integração com obras, equipes, tarefas, ponto, afastamentos e folha;
- proteção reforçada de dados médicos.

O módulo deverá permitir que a empresa responda, com evidências reproduzíveis:

1. quais perigos existiam em cada ambiente e período;
2. quais riscos foram avaliados;
3. quais trabalhadores estiveram expostos;
4. quais medidas foram planejadas e executadas;
5. quais exames eram exigidos e foram realizados;
6. qual era a aptidão vigente de cada trabalhador;
7. quais EPIs foram selecionados, entregues e substituídos;
8. quais treinamentos e habilitações estavam válidos;
9. quais incidentes ocorreram e como foram tratados;
10. quais eventos externos foram enviados e aceitos.

---

## 2. Escopo

### 2.1 Incluído no MVP funcional

- catálogo de perigos, agentes, medidas e tipos de ocorrência;
- contextos de trabalho por estabelecimento, obra, setor e frente;
- inventário de riscos versionado;
- avaliações qualitativas e quantitativas;
- grupos de exposição e perfis individuais;
- plano de ação de SST;
- requisitos médicos derivados de risco e função;
- convocação, agendamento e controle de exames;
- ASO e conclusão operacional;
- segregação de dados clínicos;
- incidentes, acidentes e quase acidentes;
- investigação e ações corretivas;
- processo de CAT e evento S-2210;
- monitoramento da saúde e evento S-2220;
- condições ambientais e evento S-2240;
- catálogo, estoque e entrega de EPI;
- controle de CA, validade, lote, troca e devolução;
- treinamentos, turmas, presença, avaliação e certificados;
- matriz de requisitos por atividade;
- habilitações e bloqueios operacionais;
- alertas, relatórios, auditoria e integrações.

### 2.2 Fora do primeiro corte técnico

- diagnóstico médico automatizado;
- prescrição clínica;
- integração direta com equipamentos médicos;
- reconhecimento biométrico para aptidão;
- emissão automática de laudos legais sem responsável técnico;
- substituição de sistemas oficiais de CA;
- cálculo automático de adicional de insalubridade ou periculosidade sem módulo e validação próprios;
- inteligência artificial tomando decisão clínica ou de aptidão;
- automação irrestrita de CAT;
- envio real ao eSocial antes de homologação formal.

---

## 3. Princípios do módulo

1. Prevenção, saúde ocupacional e habilitação operacional são trilhas distintas.
2. Risco será avaliado no contexto real do trabalho.
3. Exposição individual terá vigência.
4. Histórico não será reescrito.
5. Documento anexado não equivale a documento validado.
6. Dados clínicos terão acesso segregado.
7. Gestor operacional receberá apenas a informação necessária.
8. EPI não substituirá automaticamente medida coletiva.
9. Treinamento não será sinônimo de autorização.
10. CAT dependerá de decisão e validação explícitas.
11. Eventos externos terão estados e idempotência.
12. Obras e tarefas fornecerão contexto operacional, não substituirão o módulo de SST.
13. Requisitos legais e técnicos serão versionados e configuráveis.
14. Toda decisão impeditiva deverá possuir fundamento e evidência.
15. Nenhuma ausência de cadastro será interpretada como ausência de risco.

---

## 4. Perfis de usuário

### 4.1 Administrador de SST

- configura catálogos e políticas;
- administra contextos, riscos e programas;
- acompanha vencimentos;
- gerencia permissões e integrações.

### 4.2 Engenheiro de Segurança

- identifica perigos;
- avalia riscos;
- define medidas;
- aprova inventários e planos;
- investiga incidentes;
- valida requisitos operacionais.

### 4.3 Técnico de Segurança

- realiza inspeções;
- registra evidências;
- acompanha ações;
- gerencia EPIs e treinamentos;
- abre e trata ocorrências.

### 4.4 Médico do Trabalho

- configura o programa médico;
- define exames aplicáveis;
- analisa dados clínicos;
- emite ou valida ASO;
- registra aptidão e restrições.

### 4.5 Clínica ou prestador ocupacional

- recebe agenda autorizada;
- confirma atendimento;
- envia documentos por canal seguro;
- não acessa dados fora do contrato e finalidade.

### 4.6 RH e Departamento Pessoal

- acompanha pendências de admissão, periódico, mudança, retorno e demissão;
- consulta aptidão operacional;
- não acessa prontuário clínico sem autorização específica.

### 4.7 Gestor de obra

- consulta habilitação para atividades;
- acompanha treinamentos e EPIs necessários;
- registra ocorrência e evidências;
- não acessa diagnóstico ou resultado clínico detalhado.

### 4.8 Almoxarife ou responsável por EPI

- recebe, entrega, devolve e substitui itens;
- controla lotes, tamanhos, validade e estoque;
- não altera avaliações de risco.

### 4.9 Trabalhador

- consulta convocações, ASOs liberados, treinamentos, certificados e entregas;
- confirma ciência;
- reporta condição insegura ou incidente;
- solicita correção cadastral sem alterar evidência original.

### 4.10 Auditor

- consulta histórico, versões, acessos, transmissões e evidências;
- não recebe acesso clínico por padrão.

---

## 5. Rotas e telas previstas

```text
/app/rh/sst
/app/rh/sst/painel
/app/rh/sst/contextos
/app/rh/sst/contextos/[id]
/app/rh/sst/perigos
/app/rh/sst/inventarios
/app/rh/sst/inventarios/[id]
/app/rh/sst/avaliacoes/[id]
/app/rh/sst/planos-de-acao
/app/rh/sst/grupos-de-exposicao
/app/rh/sst/exposicoes
/app/rh/sst/pcmso
/app/rh/sst/exames
/app/rh/sst/exames/[id]
/app/rh/sst/aso/[id]
/app/rh/sst/incidentes
/app/rh/sst/incidentes/[id]
/app/rh/sst/cat/[id]
/app/rh/sst/epis
/app/rh/sst/epis/estoque
/app/rh/sst/epis/entregas
/app/rh/sst/treinamentos
/app/rh/sst/treinamentos/turmas
/app/rh/sst/habilitacoes
/app/rh/sst/permissoes-de-trabalho
/app/rh/sst/eventos-digitais
/app/rh/sst/relatorios
/app/rh/sst/configuracoes
/app/trabalhador/saude-e-seguranca
```

---

## 6. Entidades conceituais

Os nomes técnicos são provisórios.

### 6.1 Contexto e risco

- `sst_work_contexts`;
- `sst_hazards`;
- `sst_risk_assessments`;
- `sst_risk_assessment_versions`;
- `sst_control_measures`;
- `sst_action_plans`;
- `sst_action_items`;
- `sst_inspections`;
- `sst_measurements`;
- `sst_exposure_groups`;
- `sst_exposure_group_versions`;
- `sst_worker_exposure_assignments`.

### 6.2 Saúde ocupacional

- `occupational_health_programs`;
- `occupational_health_requirements`;
- `occupational_exam_cases`;
- `occupational_exam_appointments`;
- `occupational_exam_results`;
- `occupational_health_certificates`;
- `occupational_restrictions`;
- `clinical_documents`;
- `medical_access_logs`.

### 6.3 Incidentes e CAT

- `sst_incidents`;
- `sst_incident_people`;
- `sst_incident_evidence`;
- `sst_investigations`;
- `sst_root_causes`;
- `sst_corrective_actions`;
- `work_accident_communications`;
- `government_sst_events`.

### 6.4 EPI

- `ppe_types`;
- `ppe_products`;
- `ppe_approval_certificates`;
- `ppe_inventory_items`;
- `ppe_stock_movements`;
- `ppe_assignments`;
- `ppe_assignment_acknowledgements`;
- `ppe_inspections`;
- `ppe_maintenance_events`.

### 6.5 Treinamentos e habilitações

- `sst_training_requirements`;
- `sst_training_courses`;
- `sst_training_course_versions`;
- `sst_training_sessions`;
- `sst_training_enrollments`;
- `sst_training_attendance`;
- `sst_training_assessments`;
- `sst_training_certificates`;
- `sst_operational_qualifications`;
- `sst_work_authorizations`;
- `sst_work_permits`.

---

## 7. Contextos de trabalho

Um contexto poderá representar:

- empresa;
- estabelecimento;
- obra;
- setor;
- canteiro;
- frente de serviço;
- área temporária;
- equipamento;
- processo;
- atividade;
- posto de trabalho.

Campos mínimos:

- organização;
- empresa e estabelecimento;
- obra quando aplicável;
- contexto pai;
- código e nome;
- tipo;
- localização;
- responsável;
- vigência;
- situação;
- fontes documentais;
- versão atual do inventário;
- restrições de acesso.

### Regras

- obra não será convertida automaticamente em estabelecimento;
- contexto encerrado permanecerá referenciável;
- mudança de layout poderá gerar nova versão;
- contexto temporário poderá ter vigência curta;
- risco poderá ser herdado e complementado, mas a origem deverá permanecer identificada.

---

## 8. Inventário de riscos

### 8.1 Estados

```text
RASCUNHO
  → EM_LEVANTAMENTO
  → EM_AVALIACAO
  → EM_REVISAO_TECNICA
  → APROVADO
  → VIGENTE
  → SUBSTITUIDO
  → ENCERRADO
  → CANCELADO
```

### 8.2 Conteúdo mínimo

- contexto;
- versão;
- período de vigência;
- responsáveis técnicos;
- metodologia;
- fontes e inspeções;
- perigos;
- trabalhadores ou grupos potencialmente expostos;
- avaliações;
- medidas existentes;
- medidas propostas;
- plano de ação;
- anexos e evidências;
- aprovação e assinatura;
- histórico de revisões.

### 8.3 Gatilhos de revisão

- abertura ou encerramento de obra;
- mudança de processo;
- novo equipamento;
- alteração de produto químico;
- mudança de layout;
- acidente ou quase acidente relevante;
- resultado de inspeção;
- mudança normativa;
- alteração de função ou atividade;
- vencimento periódico configurado;
- solicitação técnica.

---

## 9. Perigos e avaliações

### 9.1 Categorias configuráveis

- físicos;
- químicos;
- biológicos;
- ergonômicos;
- acidentes e mecânicos;
- psicossociais;
- outros definidos pela organização ou norma.

### 9.2 Avaliação

A avaliação deverá registrar:

- perigo;
- fonte ou circunstância;
- pessoas expostas;
- atividade;
- frequência e duração;
- controles existentes;
- metodologia;
- severidade;
- probabilidade;
- nível inicial;
- nível residual;
- aceitabilidade;
- necessidade de medição;
- responsável;
- data;
- anexos;
- revisão e aprovação.

### 9.3 Medições

- tipo de medição;
- instrumento;
- identificação e calibração;
- unidade;
- procedimento;
- pontos e duração;
- resultado;
- incerteza quando aplicável;
- responsável;
- laudo;
- validade e condições da medição.

Nenhum resultado quantitativo será alterado após aprovação. Correção exigirá nova versão ou retificação rastreada.

---

## 10. Medidas de prevenção e plano de ação

### 10.1 Hierarquia

O sistema deverá classificar a medida, sem presumir equivalência entre categorias:

1. eliminação;
2. substituição;
3. controles de engenharia ou coletivos;
4. controles administrativos e organização do trabalho;
5. EPI.

### 10.2 Item de ação

Campos:

- risco relacionado;
- descrição;
- categoria;
- prioridade;
- responsável;
- aprovador;
- prazo;
- orçamento estimado;
- obra, projeto ou centro de custo;
- estado;
- evidências;
- validação de eficácia;
- impedimentos;
- data de conclusão;
- reaberturas.

### 10.3 Estados

```text
PROPOSTA
  → APROVADA
  → PLANEJADA
  → EM_EXECUCAO
  → AGUARDANDO_EVIDENCIA
  → EM_VALIDACAO
  → EFICAZ
  → INEFICAZ
  → REABERTA
  → CANCELADA
```

Conclusão administrativa não será igual a eficácia comprovada.

---

## 11. Grupos e perfis de exposição

### 11.1 Grupo de exposição

Campos:

- contexto;
- nome e código;
- funções e atividades elegíveis;
- perigos e agentes;
- controles;
- requisitos médicos;
- EPIs;
- treinamentos;
- vigência;
- responsável técnico;
- versão.

### 11.2 Associação individual

Campos:

- vínculo;
- grupo;
- contexto;
- início e fim;
- origem;
- atividade efetiva;
- exceções individuais;
- responsável;
- evidência;
- versão contratual e lotação relacionadas.

### 11.3 Regras

- transferência encerra a associação anterior;
- mudança de função pode gerar novo perfil;
- alocação curta em atividade crítica poderá gerar exposição temporária;
- exposição não será inferida apenas pelo título do cargo;
- exceção individual deverá ser explícita;
- trabalhador sem exposição registrada será tratado como pendência, não como “sem risco”.

---

## 12. Programa de saúde ocupacional

### 12.1 Estrutura

O programa deverá relacionar:

- empresa e estabelecimento;
- riscos e grupos de exposição;
- médico responsável;
- prestadores;
- exames clínicos;
- exames complementares;
- periodicidades;
- critérios de convocação;
- protocolos;
- relatórios analíticos;
- vigência;
- versão e aprovação.

### 12.2 Tipos de exame configuráveis

- admissional;
- periódico;
- retorno ao trabalho;
- mudança de risco ocupacional;
- demissional;
- específico por norma ou função;
- complementar;
- extraordinário autorizado.

### 12.3 Geração de necessidade

Uma necessidade de exame poderá surgir de:

- admissão;
- vencimento periódico;
- mudança de função ou risco;
- retorno de afastamento;
- desligamento;
- exposição específica;
- resultado anterior;
- decisão médica;
- exigência normativa ou coletiva.

A geração será idempotente e manterá a regra e versão que a originaram.

---

## 13. Caso de exame ocupacional

### 13.1 Estados

```text
NECESSIDADE_IDENTIFICADA
  → CONVOCACAO_PENDENTE
  → CONVOCADO
  → AGENDADO
  → EM_ATENDIMENTO
  → AGUARDANDO_RESULTADOS
  → EM_ANALISE_MEDICA
  → ASO_EMITIDO
  → CONCLUIDO
```

Estados alternativos:

```text
NAO_COMPARECEU
REMARCADO
CANCELADO
IMPEDIDO
DOCUMENTO_REJEITADO
VENCIDO
```

### 13.2 Dados

- trabalhador e vínculo;
- empresa e estabelecimento;
- contexto e risco;
- tipo de exame;
- motivo;
- regra de origem;
- prazo;
- prestador;
- agendamento;
- comparecimento;
- exames previstos e realizados;
- documentos;
- ASO;
- conclusão;
- restrições;
- evento externo relacionado;
- custos e centro de custo;
- auditoria.

### 13.3 Convocação

- canal;
- data e hora;
- local;
- instruções;
- confirmação de recebimento;
- lembretes;
- reagendamento;
- justificativa de ausência.

---

## 14. ASO e conclusão operacional

### 14.1 Conteúdo estruturado

- tipo do exame;
- data;
- médico e registro profissional;
- riscos relacionados;
- exames realizados;
- conclusão de aptidão;
- restrições funcionais;
- validade operacional;
- documento assinado;
- versão;
- origem;
- evento externo.

### 14.2 Conclusões configuráveis

- apto;
- inapto;
- apto com restrições;
- pendente de complementação;
- inconclusivo;
- cancelado.

### 14.3 Restrição operacional

A restrição deverá conter:

- categoria operacional;
- atividade impedida ou condicionada;
- período;
- necessidade de adaptação;
- responsável pela comunicação;
- confirmação de ciência;
- nível de confidencialidade.

Não deverá conter diagnóstico em campos exibidos a gestores.

---

## 15. Proteção de dados médicos

### 15.1 Compartimentos de acesso

- cadastro operacional;
- conclusão do ASO;
- restrições operacionais;
- documentos médicos;
- resultados clínicos;
- relatórios epidemiológicos agregados;
- dados para evento externo.

### 15.2 Controles

- autorização por função e finalidade;
- registro de acesso;
- justificativa para acesso excepcional;
- criptografia e armazenamento protegido;
- expiração de links;
- proibição de URL pública;
- marca d’água ou identificação em exportações sensíveis;
- bloqueio de exportação massiva por padrão;
- retenção configurável e suspensão de descarte por obrigação legal;
- ocultação de diagnóstico em notificações.

### 15.3 Auditoria

Cada acesso sensível deverá registrar:

- usuário;
- pessoa e documento acessado;
- finalidade;
- data e hora;
- contexto;
- ação realizada;
- exportação ou compartilhamento;
- resultado.

---

## 16. Incidentes, acidentes e quase acidentes

### 16.1 Tipos

- acidente com lesão;
- acidente sem afastamento;
- acidente com afastamento;
- acidente fatal;
- acidente de trajeto quando aplicável;
- doença ou suspeita ocupacional;
- quase acidente;
- condição insegura;
- dano material;
- evento ambiental relacionado;
- ocorrência com terceiro.

### 16.2 Estados

```text
RELATO_RECEBIDO
  → TRIAGEM
  → CONTENCAO_IMEDIATA
  → EM_INVESTIGACAO
  → CAUSAS_IDENTIFICADAS
  → PLANO_CORRETIVO
  → EM_ACOMPANHAMENTO
  → ENCERRADO
```

Estados alternativos:

```text
DUPLICADO
DESCARTADO_COM_JUSTIFICATIVA
REABERTO
SOB_ANALISE_JURIDICA
```

### 16.3 Dados

- data e hora do fato e registro;
- contexto e local;
- pessoas envolvidas;
- testemunhas;
- atividade;
- tarefa e equipe;
- descrição inicial;
- lesão aparente sem diagnóstico indevido;
- atendimento emergencial;
- afastamento relacionado;
- evidências;
- equipamentos e EPIs;
- condições ambientais;
- responsáveis;
- classificação;
- potencial e gravidade;
- necessidade de CAT;
- comunicação às partes;
- ações imediatas.

---

## 17. Investigação

### 17.1 Elementos

- equipe investigadora;
- metodologia;
- linha do tempo;
- barreiras previstas;
- barreiras ausentes ou falhas;
- causas imediatas;
- causas contribuintes;
- causas sistêmicas;
- evidências;
- conclusões;
- recomendações;
- aprovações.

### 17.2 Regras

- relato original será preservado;
- conclusão não alterará evidência;
- fotografia e arquivo terão hash;
- depoimento terá autor, data e ciência;
- alteração de classificação será auditada;
- ação corretiva será vinculada ao risco e plano;
- encerramento exigirá validação das ações impeditivas.

---

## 18. CAT e S-2210

### 18.1 Caso de CAT

Campos:

- incidente de origem;
- tipo da comunicação;
- trabalhador;
- empregador e estabelecimento;
- data do acidente;
- local;
- agente causador;
- situação geradora;
- partes atingidas quando aplicável;
- atendimento;
- afastamento;
- óbito quando aplicável;
- emitente e autorizador;
- documentos;
- estado externo;
- recibo e versões.

### 18.2 Estados

```text
NAO_AVALIADA
  → EM_ANALISE
  → OBRIGATORIA
  → EM_PREPARACAO
  → PRONTA_PARA_ENVIO
  → TRANSMITINDO
  → ACEITA
```

Estados alternativos:

```text
NAO_APLICAVEL_JUSTIFICADA
REJEITADA
RETIFICACAO_PENDENTE
RETIFICADA
EXCLUSAO_PENDENTE
EXCLUIDA
```

### 18.3 Regras

- incidente não gerará CAT sem decisão;
- decisão negativa exigirá justificativa e permissão;
- prazo será calculado por regra versionada;
- morte ou gravidade poderão elevar prioridade e escalonamento;
- transmissão será idempotente;
- retificação manterá vínculo com evento original;
- exclusão não apagará o caso interno;
- afastamento relacionado será conciliado com o Módulo 06.

---

## 19. Monitoramento da saúde e S-2220

O evento deverá ser projetado a partir de dados aprovados e autorizados:

- trabalhador e vínculo;
- tipo do exame;
- data;
- médico responsável;
- procedimentos realizados conforme leiaute vigente;
- ASO correspondente;
- origem e versão;
- payload, hash, recibo e retorno.

O evento externo não substituirá o caso interno de exame nem o documento médico.

---

## 20. Condições ambientais e S-2240

A projeção deverá considerar:

- vínculo;
- ambiente e estabelecimento ou obra;
- período de exposição;
- atividades;
- agentes nocivos aplicáveis;
- intensidade ou concentração quando exigida;
- técnica de avaliação;
- medidas de proteção;
- responsável pelos registros ambientais;
- grupo e perfil individual;
- versões e retificações.

### Regras

- alteração de ambiente poderá encerrar um período e criar outro;
- dados históricos não serão sobrescritos;
- agente interno será mapeado para tabela externa por versão;
- ausência de mapeamento bloqueará a transmissão, não apagará o agente;
- exposição eventual ou temporária deverá ser representável;
- PPP eletrônico futuro ou relatório equivalente deverá referenciar as mesmas fontes históricas.

---

## 21. Catálogo de EPI

### 21.1 Tipo de EPI

- categoria;
- parte protegida;
- riscos atendidos;
- requisitos de seleção;
- tamanhos e variantes;
- periodicidade de inspeção;
- critérios de descarte;
- treinamentos relacionados.

### 21.2 Produto

- fabricante;
- modelo;
- descrição;
- CA;
- situação do CA;
- datas de validade e consulta;
- riscos e limitações;
- documentos;
- fornecedor;
- custo;
- código de estoque.

### 21.3 Regras

- produto sem CA válido ou condição aceita não será liberado quando CA for obrigatório;
- mudança do CA não apagará entregas anteriores;
- validade do CA e vida útil do item serão conceitos distintos;
- item vencido, danificado ou bloqueado não poderá ser entregue;
- equivalência entre produtos exigirá aprovação técnica.

---

## 22. Estoque e movimentação de EPI

### 22.1 Estados do item

```text
EM_ESTOQUE
RESERVADO
ENTREGUE
EM_USO
EM_INSPECAO
EM_MANUTENCAO
DEVOLVIDO
HIGIENIZACAO
BLOQUEADO
DESCARTADO
PERDIDO
```

### 22.2 Movimentos

- entrada;
- transferência;
- reserva;
- entrega;
- devolução;
- substituição;
- manutenção;
- higienização;
- perda;
- descarte;
- ajuste inventariado e aprovado.

Movimentos serão append-only. Correções serão compensatórias.

---

## 23. Entrega de EPI

Campos:

- trabalhador e vínculo;
- produto e item ou lote;
- CA vigente na data;
- tamanho;
- quantidade;
- data e hora;
- contexto e obra;
- risco e requisito de origem;
- motivo da entrega;
- responsável;
- orientação fornecida;
- treinamento relacionado;
- ciência do trabalhador;
- previsão de inspeção ou troca;
- devolução ou substituição.

### Regras

- entrega em massa exigirá lote auditável;
- ciência poderá ser digital, mas a ausência de assinatura não apagará o movimento;
- recusa será registrada e escalonada;
- substituição manterá vínculo entre itens;
- gestor verá pendência sem acesso a dados médicos;
- desligamento gerará fluxo de devolução quando aplicável.

---

## 24. Inspeção e manutenção de EPI

- calendário por tipo e produto;
- checklist versionado;
- inspeção pelo trabalhador e responsável;
- resultado;
- anomalia;
- bloqueio;
- manutenção;
- higienização;
- liberação;
- descarte;
- evidências.

Item reprovado ficará indisponível até decisão válida.

---

## 25. Treinamentos

### 25.1 Requisito

Campos:

- atividade, função, risco ou equipamento;
- norma ou fundamento;
- modalidade;
- carga horária;
- conteúdo mínimo;
- parte prática;
- instrutor elegível;
- avaliação;
- validade;
- periodicidade;
- reciclagem;
- equivalências;
- vigência da regra.

### 25.2 Curso e versão

- título;
- ementa;
- materiais;
- duração;
- modalidade;
- recursos;
- avaliação;
- certificado;
- versão e aprovação técnica.

### 25.3 Turma

- curso e versão;
- datas e horários;
- local;
- instrutores;
- participantes;
- presença;
- avaliações;
- evidências;
- resultado;
- certificados.

---

## 26. Certificados

Campos:

- trabalhador;
- curso e versão;
- turma;
- carga horária;
- período;
- instrutor;
- resultado;
- emissão;
- validade;
- documento;
- assinatura ou prova de integridade;
- origem externa;
- validação;
- substituição ou revogação.

### Estados

```text
PENDENTE_VALIDACAO
VALIDO
A_VENCER
VENCIDO
REVOGADO
SUBSTITUIDO
REJEITADO
```

Certificado externo não produzirá habilitação antes da validação.

---

## 27. Habilitação operacional

### 27.1 Requisito composto

Uma habilitação poderá depender de:

- vínculo ativo;
- lotação válida;
- função ou atividade;
- treinamento válido;
- avaliação aprovada;
- ASO compatível;
- ausência de restrição;
- EPI entregue e válido;
- autorização profissional;
- experiência ou supervisão;
- permissão de trabalho;
- inspeção de equipamento;
- documentos adicionais.

### 27.2 Estados

```text
NAO_AVALIADA
PENDENTE
HABILITADA
HABILITADA_COM_CONDICOES
A_VENCER
SUSPENSA
BLOQUEADA
REVOGADA
EXPIRADA
```

### 27.3 Regras

- estado será derivado de evidências e regra versionada;
- mudança de requisito recalculará habilitações impactadas;
- bloqueio informará a pendência sem diagnóstico;
- override exigirá permissão, justificativa, prazo e aprovador;
- override não poderá ignorar requisito legal classificado como não dispensável;
- expiração de certificado ou ASO suspenderá a habilitação conforme política;
- reativação exigirá nova avaliação.

---

## 28. Permissão de trabalho

Para atividades críticas, o sistema deverá suportar:

- tipo de permissão;
- atividade e local;
- equipe;
- riscos específicos;
- medidas e isolamentos;
- equipamentos;
- EPIs;
- habilitações verificadas;
- condições ambientais;
- responsáveis e autorizadores;
- validade curta;
- inspeção inicial;
- suspensão e encerramento;
- evidências.

A permissão não substitui treinamento, ASO ou inventário de risco.

---

## 29. Integração com Obras

### 29.1 Fontes consumidas

- obras e estabelecimentos;
- frentes de serviço;
- equipes;
- tarefas;
- equipamentos;
- locais;
- responsáveis;
- cronograma;
- Diário de Obras;
- documentos técnicos.

### 29.2 Informações fornecidas

- riscos vigentes;
- atividades bloqueadas;
- trabalhadores habilitados;
- treinamentos e EPIs pendentes;
- ações preventivas;
- ocorrências;
- indicadores agregados.

### 29.3 Limites

- Diário de Obras não será prontuário;
- tarefa concluída não comprovará habilitação;
- presença na obra não provará exposição sem contexto;
- gestor não acessará resultado clínico;
- exclusão de equipe não apagará histórico de SST.

---

## 30. Integração com Admissão e Contratos

### Admissão

- identificar exames admissionais;
- validar aptidão antes da ativação quando impeditiva;
- solicitar treinamentos e EPIs iniciais;
- preparar perfil de exposição;
- impedir duplicação de trabalhador.

### Alterações contratuais

- mudança de função ou local poderá gerar:
  - nova avaliação de exposição;
  - exame de mudança de risco;
  - novos treinamentos;
  - novos EPIs;
  - atualização de evento externo;
  - suspensão temporária de habilitação.

Alteração contratual não aplicará automaticamente aptidão ou treinamento.

---

## 31. Integração com Ponto e Afastamentos

- incidente poderá originar ausência ou afastamento;
- afastamento não será criado somente por CAT;
- retorno poderá exigir exame;
- trabalhador inapto ou afastado será bloqueado para escala operacional;
- marcação de ponto durante bloqueio gerará alerta, não será apagada;
- reprocessamentos preservarão a origem e competência.

---

## 32. Integração com Folha e Financeiro

### Folha

- eventos de adicionais somente serão gerados por módulo específico e política aprovada;
- SST fornecerá exposição, período e evidência, não cálculo final automático no MVP;
- afastamentos e retornos serão conciliados;
- custo de treinamento, exame e EPI poderá ser classificado.

### Financeiro

- fornecedores de clínica, laboratório, treinamento e EPI;
- pedidos e pagamentos;
- centros de custo;
- obra e projeto;
- conciliação de faturas;
- rateios.

Nenhuma fatura de fornecedor criará exame, treinamento ou entrega sem conciliação.

---

## 33. Eventos e notificações

Eventos internos previstos:

- `sst.risk_inventory.approved`;
- `sst.risk_assessment.changed`;
- `sst.action.overdue`;
- `sst.worker.exposure.started`;
- `sst.worker.exposure.ended`;
- `sst.exam.required`;
- `sst.exam.scheduled`;
- `sst.aso.issued`;
- `sst.fitness.changed`;
- `sst.incident.created`;
- `sst.cat.required`;
- `sst.cat.accepted`;
- `sst.ppe.assigned`;
- `sst.ppe.expiring`;
- `sst.training.expiring`;
- `sst.qualification.blocked`;
- `sst.work_permit.suspended`.

Notificações deverão respeitar confidencialidade e não incluir diagnóstico.

---

## 34. Requisitos funcionais

### Governança e configuração

**RH-M08-FR-001.** Permitir configurar catálogos de perigos, riscos, controles, ocorrências e documentos por vigência.  
**RH-M08-FR-002.** Permitir relacionar fundamento normativo sem codificar regra legal fixa.  
**RH-M08-FR-003.** Permitir configurar metodologias e matrizes de risco versionadas.  
**RH-M08-FR-004.** Permitir configurar requisitos de aprovação por tipo de documento ou processo.  
**RH-M08-FR-005.** Permitir definir retenção, classificação e acesso por categoria de dado.

### Contextos, riscos e ações

**RH-M08-FR-006.** Cadastrar contextos hierárquicos de trabalho.  
**RH-M08-FR-007.** Vincular contexto a estabelecimento, obra, setor, frente, atividade ou equipamento.  
**RH-M08-FR-008.** Criar inventários versionados com vigência.  
**RH-M08-FR-009.** Registrar perigos e fontes.  
**RH-M08-FR-010.** Avaliar risco inicial e residual.  
**RH-M08-FR-011.** Registrar controles existentes.  
**RH-M08-FR-012.** Registrar medições e instrumentos.  
**RH-M08-FR-013.** Criar plano de ação com responsáveis e prazos.  
**RH-M08-FR-014.** Validar eficácia da ação separadamente da conclusão.  
**RH-M08-FR-015.** Revisar inventário sem apagar a versão anterior.  
**RH-M08-FR-016.** Gerar alertas de ação vencida e risco crítico.

### Exposição

**RH-M08-FR-017.** Cadastrar grupos de exposição por versão.  
**RH-M08-FR-018.** Relacionar perigos, exames, EPIs e treinamentos ao grupo.  
**RH-M08-FR-019.** Associar trabalhador ao grupo por vigência.  
**RH-M08-FR-020.** Permitir exposição individual temporária.  
**RH-M08-FR-021.** Encerrar exposição em transferência.  
**RH-M08-FR-022.** Consultar perfil vigente em qualquer data.  
**RH-M08-FR-023.** Detectar vínculo ativo sem perfil avaliado.

### Saúde ocupacional

**RH-M08-FR-024.** Cadastrar programa médico por empresa e vigência.  
**RH-M08-FR-025.** Configurar exames por risco, função e evento contratual.  
**RH-M08-FR-026.** Gerar necessidades de exame idempotentes.  
**RH-M08-FR-027.** Convocar e agendar trabalhador.  
**RH-M08-FR-028.** Controlar comparecimento e reagendamento.  
**RH-M08-FR-029.** Receber documentos médicos em área protegida.  
**RH-M08-FR-030.** Registrar exames complementares.  
**RH-M08-FR-031.** Emitir ou anexar ASO versionado.  
**RH-M08-FR-032.** Registrar aptidão e restrições operacionais.  
**RH-M08-FR-033.** Ocultar diagnóstico de perfis operacionais.  
**RH-M08-FR-034.** Controlar validade e vencimento.  
**RH-M08-FR-035.** Gerar necessidade de exame de retorno ou mudança de risco.  
**RH-M08-FR-036.** Projetar evento S-2220 por estado e versão.

### Incidentes e CAT

**RH-M08-FR-037.** Permitir relato de acidente, quase acidente e condição insegura.  
**RH-M08-FR-038.** Preservar relato e evidências originais.  
**RH-M08-FR-039.** Registrar pessoas, contexto, tarefa, equipamento e EPI.  
**RH-M08-FR-040.** Executar triagem e contenção.  
**RH-M08-FR-041.** Conduzir investigação com linha do tempo e causas.  
**RH-M08-FR-042.** Gerar ações corretivas.  
**RH-M08-FR-043.** Avaliar necessidade de CAT.  
**RH-M08-FR-044.** Criar caso de CAT sem envio automático.  
**RH-M08-FR-045.** Projetar S-2210 com idempotência.  
**RH-M08-FR-046.** Registrar recibo, rejeição, retificação e exclusão.  
**RH-M08-FR-047.** Correlacionar CAT, afastamento e retorno.  
**RH-M08-FR-048.** Escalonar incidentes graves por regra.

### EPI

**RH-M08-FR-049.** Cadastrar tipos e produtos de EPI.  
**RH-M08-FR-050.** Controlar CA e histórico de consultas.  
**RH-M08-FR-051.** Controlar estoque, lote, tamanho e condição.  
**RH-M08-FR-052.** Registrar movimentos append-only.  
**RH-M08-FR-053.** Entregar EPI ao trabalhador com origem no risco.  
**RH-M08-FR-054.** Registrar ciência, recusa e orientação.  
**RH-M08-FR-055.** Controlar troca, devolução e perda.  
**RH-M08-FR-056.** Executar inspeção, manutenção e higienização.  
**RH-M08-FR-057.** Bloquear produto ou item inválido.  
**RH-M08-FR-058.** Gerar alertas de vencimento e reposição.

### Treinamento e habilitação

**RH-M08-FR-059.** Configurar requisitos de treinamento por atividade e risco.  
**RH-M08-FR-060.** Versionar curso, conteúdo e avaliação.  
**RH-M08-FR-061.** Criar turmas, instrutores e participantes.  
**RH-M08-FR-062.** Registrar presença e avaliação.  
**RH-M08-FR-063.** Emitir certificado íntegro e rastreável.  
**RH-M08-FR-064.** Validar certificado externo.  
**RH-M08-FR-065.** Controlar validade, reciclagem e revogação.  
**RH-M08-FR-066.** Calcular habilitação por requisitos compostos.  
**RH-M08-FR-067.** Suspender habilitação com requisito vencido.  
**RH-M08-FR-068.** Permitir override controlado quando legalmente admitido.  
**RH-M08-FR-069.** Criar permissão de trabalho com validade limitada.  
**RH-M08-FR-070.** Bloquear atividade quando requisito impeditivo estiver pendente.

### Integrações, relatórios e auditoria

**RH-M08-FR-071.** Projetar S-2240 a partir de exposição aprovada.  
**RH-M08-FR-072.** Integrar mudanças de função, obra e risco.  
**RH-M08-FR-073.** Integrar incidentes com afastamentos.  
**RH-M08-FR-074.** Integrar habilitação com equipes e tarefas.  
**RH-M08-FR-075.** Integrar custos com Financeiro e centros de custo.  
**RH-M08-FR-076.** Disponibilizar portal do trabalhador.  
**RH-M08-FR-077.** Gerar indicadores sem expor dados clínicos individuais.  
**RH-M08-FR-078.** Auditar acessos a documentos médicos.  
**RH-M08-FR-079.** Exportar dossiê auditável por contexto ou trabalhador autorizado.  
**RH-M08-FR-080.** Preservar versão de regra, documento e payload usados em cada decisão.

---

## 35. Regras de negócio

**RH-M08-BR-001.** Inventário aprovado é imutável; revisão cria nova versão.  
**RH-M08-BR-002.** Risco sem avaliação completa permanece pendente.  
**RH-M08-BR-003.** Ação concluída não é automaticamente eficaz.  
**RH-M08-BR-004.** EPI não elimina o registro do perigo.  
**RH-M08-BR-005.** Produto com condição inválida não será entregue quando impeditivo.  
**RH-M08-BR-006.** Movimento de estoque não será apagado.  
**RH-M08-BR-007.** Entrega e ciência são eventos distintos.  
**RH-M08-BR-008.** Recusa de EPI exige tratamento e escalonamento.  
**RH-M08-BR-009.** Exposição individual possui início e fim.  
**RH-M08-BR-010.** Transferência não altera retroativamente a exposição anterior.  
**RH-M08-BR-011.** Cargo não define sozinho a exposição.  
**RH-M08-BR-012.** Ausência de perfil gera pendência.  
**RH-M08-BR-013.** Necessidade de exame guarda regra de origem.  
**RH-M08-BR-014.** ASO não contém prontuário completo.  
**RH-M08-BR-015.** Diagnóstico não será exibido ao gestor.  
**RH-M08-BR-016.** Restrição operacional terá validade.  
**RH-M08-BR-017.** Exame vencido poderá bloquear atividade conforme política.  
**RH-M08-BR-018.** Documento recebido não é documento validado.  
**RH-M08-BR-019.** Incidente não produz CAT automática.  
**RH-M08-BR-020.** Decisão de não emitir CAT será justificada.  
**RH-M08-BR-021.** Retificação preserva evento anterior.  
**RH-M08-BR-022.** Exclusão externa não exclui o caso interno.  
**RH-M08-BR-023.** Relato original de incidente é imutável.  
**RH-M08-BR-024.** Evidência substituída permanece no histórico.  
**RH-M08-BR-025.** Ação corretiva vencida gera alerta.  
**RH-M08-BR-026.** Certificado externo exige validação.  
**RH-M08-BR-027.** Treinamento concluído não garante habilitação.  
**RH-M08-BR-028.** Certificado vencido suspende requisitos relacionados conforme política.  
**RH-M08-BR-029.** Habilitação é derivada e versionada.  
**RH-M08-BR-030.** Override possui prazo e aprovador.  
**RH-M08-BR-031.** Requisito não dispensável não aceita override.  
**RH-M08-BR-032.** Permissão de trabalho tem validade limitada.  
**RH-M08-BR-033.** Permissão suspensa impede execução autorizada.  
**RH-M08-BR-034.** Tarefa não comprova treinamento ou aptidão.  
**RH-M08-BR-035.** Diário de Obras é evidência complementar.  
**RH-M08-BR-036.** Evento externo usa payload versionado e hash.  
**RH-M08-BR-037.** Reenvio idempotente não duplica evento.  
**RH-M08-BR-038.** Mapeamento externo ausente bloqueia transmissão.  
**RH-M08-BR-039.** Dado clínico só será acessado por permissão e finalidade.  
**RH-M08-BR-040.** Exportação médica será auditada.  
**RH-M08-BR-041.** Notificação não conterá diagnóstico.  
**RH-M08-BR-042.** Alteração retroativa gera impactos explícitos.  
**RH-M08-BR-043.** Período fechado só muda por reabertura controlada.  
**RH-M08-BR-044.** Fatura de fornecedor não cria fato de SST.  
**RH-M08-BR-045.** Integrações preservam origem e versão.

---

## 36. Permissões

Permissões mínimas previstas:

- `sst.view_dashboard`;
- `sst.manage_configuration`;
- `sst.view_risks`;
- `sst.edit_risks`;
- `sst.approve_risk_inventory`;
- `sst.manage_actions`;
- `sst.manage_exposures`;
- `sst.view_exam_status`;
- `sst.schedule_exams`;
- `sst.view_aso`;
- `sst.view_clinical_data`;
- `sst.issue_aso`;
- `sst.manage_incidents`;
- `sst.investigate_incidents`;
- `sst.approve_cat`;
- `sst.transmit_government_events`;
- `sst.manage_ppe_catalog`;
- `sst.manage_ppe_stock`;
- `sst.assign_ppe`;
- `sst.manage_training`;
- `sst.validate_external_certificate`;
- `sst.manage_qualifications`;
- `sst.override_block`;
- `sst.manage_work_permits`;
- `sst.export_sensitive_data`;
- `sst.audit_access`.

Permissões clínicas não serão herdadas de permissões gerais de RH.

---

## 37. Relatórios e indicadores

### Riscos e ações

- riscos por contexto e nível;
- riscos críticos sem controle;
- plano de ação por prazo e responsável;
- eficácia de medidas;
- inventários vencidos ou em revisão;
- trabalhadores sem perfil de exposição.

### Saúde ocupacional

- exames a vencer e vencidos;
- absenteísmo de convocação;
- ASOs por situação;
- aptidões e restrições somente no nível autorizado;
- cobertura do programa médico;
- indicadores agregados sem diagnóstico individual.

### Incidentes

- frequência e gravidade;
- quase acidentes;
- causas recorrentes;
- ações corretivas;
- CAT por estado;
- tempo entre fato, triagem, decisão e envio.

### EPI

- estoque e consumo;
- itens vencidos ou bloqueados;
- entregas por risco e obra;
- recusas;
- substituições;
- custos por centro de custo.

### Treinamentos

- validade por trabalhador;
- cobertura por atividade;
- habilitações suspensas;
- turmas e aproveitamento;
- vencimentos futuros;
- trabalhadores alocados sem habilitação.

---

## 38. Alertas

- risco crítico sem ação;
- ação vencida;
- inventário próximo da revisão;
- exposição sem exame correspondente;
- exame a vencer;
- ASO pendente;
- trabalhador agendado que não compareceu;
- restrição incompatível com escala;
- incidente grave sem triagem;
- CAT pendente de decisão;
- evento externo rejeitado;
- CA ou produto bloqueado;
- estoque mínimo de EPI;
- entrega vencida para inspeção;
- treinamento a vencer;
- certificado rejeitado;
- habilitação suspensa;
- permissão de trabalho expirada;
- trabalhador escalado em atividade não autorizada.

---

## 39. Não funcionais

- isolamento por organização;
- políticas de linha e autorização no banco;
- criptografia de dados clínicos;
- armazenamento privado de arquivos;
- trilha de acesso sensível;
- idempotência de integrações;
- processamento assíncrono com outbox;
- consistência temporal;
- suporte a fuso por contexto;
- hashes de documentos e payloads;
- paginação e filtros em inventários extensos;
- exportação controlada;
- recuperação de desastre;
- retenção configurável;
- observabilidade sem registrar conteúdo clínico em logs;
- testes de autorização negativa;
- acessibilidade das telas;
- operação móvel e offline controlada para inspeções e ocorrências.

---

## 40. Cenários pessimistas

1. trabalhador transferido sem novo perfil de exposição;
2. inventário aprovado com ação crítica pendente;
3. exame realizado, mas documento não recebido;
4. ASO anexado para trabalhador incorreto;
5. resultado clínico enviado a gestor por engano;
6. CAT preparada duas vezes;
7. retificação altera data e conflita com afastamento;
8. entrega duplicada de EPI por sincronização offline;
9. produto com CA vencido em estoque;
10. certificado falso ou adulterado;
11. instrutor sem qualificação válida;
12. trabalhador escalado após expiração do treinamento;
13. override sem prazo;
14. incidente grave sem responsável;
15. evidência removida;
16. obra encerrada com ações abertas;
17. evento S-2240 sem mapeamento de agente;
18. prestador envia arquivo de outra organização;
19. usuário acessa prontuário sem finalidade;
20. mudança normativa invalida regra em produção.

Cada cenário deverá ter prevenção, alerta, auditoria e recuperação definidas.

---

## 41. Critérios de aceite

1. inventário vigente pode ser consultado por data;
2. nova versão não apaga a anterior;
3. risco crítico sem ação é sinalizado;
4. conclusão de ação não marca eficácia automaticamente;
5. trabalhador transferido mantém exposição anterior;
6. vínculo sem perfil aparece como pendência;
7. exame é criado uma única vez por gatilho;
8. convocação possui comprovação;
9. ASO mantém versão e documento;
10. gestor não acessa diagnóstico;
11. restrição operacional é exibida sem dado clínico;
12. exame vencido recalcula habilitação;
13. relato original de incidente não pode ser editado silenciosamente;
14. quase acidente não exige CAT automática;
15. decisão de CAT é auditada;
16. transmissão duplicada é impedida;
17. retificação mantém recibo original;
18. afastamento é correlacionado sem ser criado automaticamente;
19. produto de EPI mantém histórico de CA;
20. item bloqueado não pode ser entregue;
21. entrega registra trabalhador, item, risco e ciência;
22. substituição preserva entrega anterior;
23. estoque é derivado de movimentos;
24. certificado externo exige validação;
25. treinamento vencido suspende habilitação;
26. aptidão médica não substitui treinamento;
27. treinamento não substitui EPI;
28. permissão de trabalho verifica requisitos;
29. override registra aprovador e expiração;
30. tarefa crítica bloqueada informa pendência operacional;
31. evento S-2220 referencia exame e ASO aprovados;
32. evento S-2240 referencia exposição e versão;
33. agente sem mapeamento bloqueia envio;
34. acesso médico é registrado;
35. exportação sensível exige permissão;
36. notificação não expõe diagnóstico;
37. fatura não cria exame ou entrega;
38. custos podem ser rateados sem expor dados clínicos;
39. auditor consegue reconstruir a condição vigente na data de um acidente;
40. trabalhador consulta documentos liberados no portal.

---

## 42. Estratégia de testes

### Unitários

- classificação de risco;
- vigência de exposição;
- geração idempotente de exame;
- vencimentos;
- cálculo de habilitação;
- estados de CAT;
- movimentos de estoque;
- equivalência de certificados;
- autorização e bloqueio.

### Integração

- mudança contratual para exposição;
- exame para ASO e S-2220;
- incidente para CAT e afastamento;
- risco para EPI e treinamento;
- habilitação para equipe e tarefa;
- custos para Financeiro;
- evento S-2240.

### Segurança

- acesso cruzado entre organizações;
- gestor tentando acessar prontuário;
- exportação sem permissão;
- URL de arquivo expirado;
- logs contendo dado clínico;
- prestador acessando trabalhador fora do escopo.

### Concorrência

- dois usuários aprovando inventário;
- dupla entrega de EPI;
- dois agendamentos para o mesmo exame;
- envio simultâneo do mesmo evento;
- suspensão e reativação simultânea da habilitação.

### Ponta a ponta

- admissão com exame, EPI, treinamento e habilitação;
- mudança de função com novo risco;
- acidente com investigação, CAT, afastamento e retorno;
- treinamento vencido bloqueando atividade;
- transferência entre obras com histórico preservado.

---

## 43. Sequência sugerida de implementação

1. autorização e compartimentos de dados;
2. contextos de trabalho;
3. catálogos e matriz de risco;
4. inventário e plano de ação;
5. grupos e exposições;
6. programa médico e casos de exame;
7. ASO e proteção clínica;
8. incidentes e investigação;
9. CAT e eventos externos;
10. catálogo e estoque de EPI;
11. entregas, inspeções e substituições;
12. treinamentos e certificados;
13. habilitações e permissões;
14. integrações com Obras e RH;
15. relatórios e portal;
16. homologação jurídica, médica, técnica e do eSocial.

Nenhuma transmissão real deverá ser liberada antes dos testes de contrato, homologação externa e aprovação formal dos responsáveis.

---

## 44. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultadas fontes oficiais:

- página de Normas Regulamentadoras vigentes do Ministério do Trabalho e Emprego;
- NR-1 e materiais oficiais de GRO/PGR;
- NR-6, CA e orientações oficiais de EPI;
- NR-7 e PCMSO;
- NR-18 atualizada em 2026 para a indústria da construção;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- Manual WEB Geral de SST;
- eventos S-2210, S-2220 e S-2240.

A baseline oficial confirma que o PGR deve materializar o gerenciamento de riscos com inventário e plano de ação; a NR-6 exige EPI adequado e aprovado quando aplicável; e o eSocial mantém eventos distintos para CAT, monitoramento da saúde e condições ambientais.

Campos, prazos, tabelas, códigos, cargas horárias, requisitos profissionais e interpretações deverão ser conferidos novamente no momento da implementação, homologação e produção.

---

## 45. Estado honesto

Este documento é uma especificação funcional.

Não foram implementados:

- tabelas;
- migrations;
- políticas de acesso;
- componentes;
- motor de risco;
- prontuário;
- agenda de exames;
- estoque de EPI;
- treinamento;
- habilitação;
- CAT;
- eventos de SST;
- integrações com clínica, eSocial ou CAEPI;
- testes de produção.

A implementação dependerá de revisão arquitetural, jurídica, médica, de segurança do trabalho, privacidade e integração.
