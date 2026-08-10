# Projeto RH — Módulo 03: Admissão, Pré-admissão, Conferência Documental e Ativação do Vínculo

**Versão:** 0.1.0  
**Data:** 6 de agosto de 2026  
**Estado:** especificação funcional inicial concluída; validação de produto, jurídica e operacional pendente  
**Implementação:** não iniciada

---

## 1. Finalidade

O Módulo 03 administrará o processo completo entre a decisão de contratar e a ativação segura do vínculo.

Sua função não será apenas cadastrar um empregado. O módulo deverá coordenar:

- abertura do caso de admissão;
- reutilização da pessoa e do trabalhador canônicos;
- coleta segura de informações;
- solicitação e conferência de documentos;
- definição das condições iniciais;
- aprovações internas;
- verificações ocupacionais ou administrativas aplicáveis;
- geração de documentos;
- preparação de eventos digitais;
- ativação transacional do vínculo;
- cancelamento, rejeição ou expiração sem perda de histórico.

A decisão arquitetural vinculante está em `PROJETO-RH-ADR-003-ADMISSAO-CASO-AUDITAVEL.md`.

---

## 2. Princípios funcionais

1. Pré-admissão não será vínculo ativo.
2. Registro preliminar externo não será confundido com admissão completa.
3. Pessoa, trabalhador, caso de admissão e vínculo serão entidades distintas.
4. O trabalhador poderá preencher dados sem receber acesso amplo à plataforma.
5. Checklists serão versionados por empresa, categoria, estabelecimento e vigência.
6. Documento recebido não será considerado automaticamente conferido.
7. Pendência impeditiva bloqueará ativação.
8. Dispensa de requisito exigirá autoridade, justificativa e auditoria.
9. Ativação será explícita, transacional e idempotente.
10. Prazos e regras externas serão versionados e vinculados a fontes oficiais.
11. Nenhum dado será solicitado sem finalidade funcional registrada.
12. Dados médicos ou ocupacionais permanecerão segregados dos dados cadastrais comuns.

---

## 3. Escopo

### 3.1 Incluído nesta especificação

- abertura manual ou originada por recrutamento;
- convite seguro ao trabalhador;
- coleta de dados pessoais e contratuais necessários;
- reaproveitamento de dados já existentes;
- checklist documental versionado;
- upload, classificação e conferência;
- solicitações de correção;
- montagem das condições propostas;
- aprovações por alçada;
- pendências e exceções;
- geração de documentos a partir da biblioteca de modelos;
- assinatura quando disponível;
- preparação e acompanhamento de registro preliminar ou admissão completa;
- ativação do vínculo;
- cancelamento e reabertura controlada;
- alertas, relatórios e auditoria.

### 3.2 Fora deste corte

- implementação real de integração governamental;
- assinatura jurídica com provedor real;
- validação automática de toda regra legal;
- medicina ocupacional completa;
- cálculo de folha;
- pagamento;
- integração bancária;
- decisão automática de contratação por inteligência artificial.

---

## 4. Usuários e responsabilidades

| Perfil | Responsabilidade |
|---|---|
| Gestor de RH | iniciar, acompanhar, aprovar exceções autorizadas e analisar indicadores |
| Analista de RH | coletar dados, solicitar documentos e tratar correções |
| Gestor de DP | revisar condições, aprovar ativação e acompanhar obrigações |
| Analista de DP | conferir cadastro, documentos, lotação, jornada e parâmetros iniciais |
| Medicina e Segurança | registrar somente aptidão, restrições ou evidências ocupacionais autorizadas |
| Gestor requisitante | confirmar necessidade, posição, lotação e data planejada sem acessar dados indevidos |
| Financeiro/Controladoria | validar centro de custo e rateio quando exigido |
| Administrador | configurar checklists, alçadas, modelos e permissões |
| Auditor | consultar estados, responsáveis, decisões, protocolos e evidências |
| Trabalhador | preencher seus dados, anexar documentos e responder solicitações |

---

## 5. Origem do processo

O caso de admissão poderá ser criado a partir de:

- candidato aprovado em recrutamento;
- requisição de contratação aprovada;
- cadastro manual autorizado;
- importação controlada;
- transferência ou sucessão tratada por fluxo específico;
- reintegração ou recontratação, quando funcionalmente aplicável;
- integração externa confiável.

Toda origem deverá guardar:

- tipo;
- identificador de origem;
- organização;
- empresa empregadora;
- responsável;
- data;
- correlação;
- dados herdados;
- eventuais divergências encontradas.

---

## 6. Estados do processo

| Estado | Significado | Operações permitidas principais |
|---|---|---|
| `DRAFT` | caso criado sem submissão | editar dados iniciais, cancelar |
| `INVITED` | convite enviado | reenviar, revogar, acompanhar expiração |
| `DATA_COLLECTION` | trabalhador ou analista preenchendo | salvar rascunho, solicitar suporte |
| `DOCUMENT_REVIEW` | informações submetidas | conferir, aprovar, rejeitar ou solicitar correção |
| `PENDING_REQUIREMENTS` | existem pendências | resolver, dispensar quando permitido, cancelar |
| `PENDING_APPROVAL` | pronto para alçada | aprovar, rejeitar, devolver |
| `PRELIMINARY_RECORDED` | registro preliminar confirmado quando aplicável | completar admissão, retificar ou cancelar conforme regra |
| `READY_TO_ACTIVATE` | gates internos concluídos | ativar ou devolver |
| `ACTIVE` | vínculo ativado | consultar vínculo e histórico |
| `REJECTED` | processo recusado | consultar, reabrir quando permitido |
| `CANCELED` | processo encerrado | consultar e iniciar novo caso relacionado |
| `EXPIRED` | prazo configurado ultrapassado | renovar convite ou encerrar |

Transições críticas deverão ocorrer por comando transacional, nunca por edição direta do campo de estado.

---

## 7. Telas

### 7.1 Painel de admissões

Rota sugerida: `/app/departamento-pessoal/admissoes`

Elementos:

- contagem por estado;
- admissões previstas para os próximos dias;
- processos atrasados;
- pendências impeditivas;
- documentos aguardando conferência;
- convites expirados;
- eventos externos rejeitados;
- casos prontos para aprovação;
- filtros por empresa, estabelecimento, categoria, responsável, origem, cargo, obra e período;
- lista com ações permitidas por perfil;
- exportação restrita e auditada.

### 7.2 Nova admissão

Rota sugerida: `/app/departamento-pessoal/admissoes/nova`

Etapas:

1. origem e requisição;
2. pessoa ou candidato;
3. empresa e estabelecimento;
4. posição, cargo, função e lotação;
5. data planejada;
6. categoria e tipo de relação;
7. responsável e aprovadores;
8. checklist aplicável;
9. revisão;
10. criação do caso.

Antes de criar nova pessoa, o sistema deverá pesquisar possíveis correspondências no cadastro mestre.

### 7.3 Detalhe da admissão

Rota sugerida: `/app/departamento-pessoal/admissoes/[id]`

Seções:

- resumo e linha do tempo;
- pessoa e trabalhador;
- origem;
- dados coletados;
- checklist;
- documentos;
- solicitações de correção;
- condições propostas;
- aprovações;
- medicina e segurança, em área segregada;
- documentos gerados e assinaturas;
- eventos externos;
- pendências;
- auditoria;
- decisão de ativação.

### 7.4 Portal de pré-admissão

Rota sugerida: `/pre-admissao/[token]`

Características:

- token armazenado apenas por hash;
- expiração configurável;
- escopo exclusivo do caso;
- verificação adicional quando aplicável;
- salvamento progressivo;
- linguagem simples;
- indicação de finalidade dos dados;
- exibição apenas dos itens aplicáveis;
- upload seguro;
- confirmação de submissão;
- possibilidade de corrigir enquanto permitido;
- acessibilidade e responsividade.

O token não concederá sessão administrativa nem acesso a outros módulos.

### 7.5 Conferência documental

Rota sugerida: `/app/departamento-pessoal/admissoes/[id]/conferencia`

A tela deverá apresentar:

- documento solicitado;
- arquivo recebido;
- metadados técnicos;
- categoria e finalidade;
- validade quando aplicável;
- situação da análise;
- divergências;
- responsável;
- histórico;
- ação de aprovar, rejeitar ou solicitar substituição;
- restrição de visualização por classe documental.

### 7.6 Aprovação e ativação

Rota sugerida: `/app/departamento-pessoal/admissoes/[id]/ativacao`

A tela deverá mostrar gates objetivos:

- identidade confirmada;
- pessoa canônica resolvida;
- dados contratuais completos;
- lotação e rateio válidos;
- documentos impeditivos aprovados;
- aprovações concluídas;
- verificações ocupacionais aplicáveis;
- evento preliminar ou completo em estado esperado, quando exigido;
- contratos e termos gerados;
- pendências remanescentes classificadas.

O botão de ativação deverá informar exatamente o que será criado e não aparecer para usuário sem capacidade.

---

## 8. Convites e coleta externa

### 8.1 Convite

O convite deverá conter:

- nome da empresa de forma identificável;
- finalidade;
- prazo;
- canal de suporte;
- link temporário;
- aviso para não compartilhar o link;
- referência do caso sem revelar dados sensíveis.

### 8.2 Segurança

- token aleatório de alta entropia;
- valor persistido somente como hash;
- expiração;
- revogação;
- limite de tentativas;
- proteção contra enumeração;
- correlação de acessos;
- logs sem documento pessoal integral;
- upload em quarentena quando a infraestrutura estiver disponível;
- bloqueio fail-closed para arquivos não aprovados.

### 8.3 Salvamento e submissão

O trabalhador poderá salvar rascunho. A submissão deverá:

- executar validações;
- registrar versão dos dados enviados;
- congelar a versão submetida para conferência;
- permitir nova versão apenas por devolução ou correção autorizada;
- registrar aceite de declarações aplicáveis sem tratar consentimento como fundamento universal para toda operação.

---

## 9. Checklist versionado

### 9.1 Aplicabilidade

O checklist poderá variar por:

- empresa;
- estabelecimento;
- categoria;
- tipo de relação;
- cargo ou função;
- posição;
- modalidade de trabalho;
- existência de alocação em obra;
- faixa etária ou condição aplicável;
- vigência;
- regra externa configurada.

### 9.2 Item de checklist

Cada item deverá possuir:

- código estável;
- nome;
- descrição em linguagem operacional;
- finalidade;
- classe de dado;
- obrigatoriedade;
- condição de aplicabilidade;
- se impede submissão;
- se impede aprovação;
- se impede ativação;
- se admite dispensa;
- capacidade necessária para dispensa;
- evidência esperada;
- data de validade quando aplicável;
- responsável pela conferência;
- SLA operacional;
- versão e vigência;
- origem da regra.

### 9.3 Resultado

Estados sugeridos:

- não aplicável;
- pendente;
- recebido;
- em análise;
- aprovado;
- rejeitado;
- substituição solicitada;
- dispensado;
- vencido.

---

## 10. Documentos

### 10.1 Classes iniciais

- identificação civil;
- endereço;
- dados bancários;
- formação e qualificação;
- habilitação profissional;
- dependentes;
- contrato e termos;
- benefícios;
- medicina e segurança;
- autorizações específicas;
- outros documentos configurados.

### 10.2 Metadados

- nome original;
- nome seguro;
- MIME declarado;
- MIME detectado;
- tamanho;
- hash SHA-256;
- storage path;
- classe documental;
- finalidade;
- data de emissão;
- validade;
- emissor;
- situação de segurança;
- situação de conferência;
- responsável pela análise;
- retenção;
- origem;
- data de recebimento.

### 10.3 Segregação

Documento médico não ficará no mesmo conjunto de permissões dos documentos cadastrais. O gestor de obra não receberá acesso ao arquivo médico; quando necessário, verá apenas informação operacional mínima, como aptidão ou restrição autorizada.

---

## 11. Condições propostas

Antes da ativação, o caso deverá manter uma versão proposta de:

- empresa;
- estabelecimento;
- categoria;
- matrícula planejada;
- data de admissão;
- cargo;
- função;
- posição;
- unidade organizacional;
- centro de custo;
- rateio;
- obra inicial, quando houver;
- jornada;
- modalidade de trabalho;
- salário contratual;
- prazo contratual, quando aplicável;
- sindicato ou enquadramento;
- benefícios iniciais;
- responsável hierárquico;
- condições adicionais.

Essas condições não deverão aparecer como vigentes no cadastro do vínculo antes da ativação.

---

## 12. Aprovações

A matriz poderá exigir aprovações por:

- RH;
- Departamento Pessoal;
- gestor requisitante;
- direção;
- financeiro/controladoria;
- medicina e segurança;
- outra alçada configurada.

Cada aprovação deverá guardar:

- etapa;
- responsável ou grupo elegível;
- decisão;
- data;
- comentário;
- versão dos dados analisados;
- hash ou referência do pacote de evidências;
- delegação, quando permitida;
- correlação.

Alteração material após aprovação deverá invalidar ou reabrir as aprovações afetadas.

---

## 13. Integrações digitais

### 13.1 Eventos previstos

A arquitetura deverá suportar futuramente:

- registro preliminar;
- admissão completa;
- retificação;
- exclusão ou cancelamento quando admitido;
- consulta de protocolo;
- consulta de processamento;
- recibo;
- rejeição;
- advertência.

### 13.2 Estados técnicos

- `NOT_REQUIRED`;
- `DRAFT`;
- `VALIDATING`;
- `READY`;
- `QUEUED`;
- `TRANSMITTING`;
- `PROTOCOL_RECEIVED`;
- `PROCESSING`;
- `ACCEPTED`;
- `ACCEPTED_WITH_WARNINGS`;
- `REJECTED`;
- `RETRYABLE_ERROR`;
- `PERMANENT_ERROR`;
- `RECTIFIED`;
- `CANCELED`.

### 13.3 Evidências

Cada evento deverá guardar:

- tipo;
- versão do leiaute;
- ambiente;
- empresa e estabelecimento;
- trabalhador e caso;
- payload versionado ou referência protegida;
- hash;
- chave de idempotência;
- protocolo;
- recibo;
- retornos;
- erros estruturados;
- tentativas;
- datas;
- responsável técnico;
- correlação.

### 13.4 Baseline oficial em 06/08/2026

A documentação oficial consultada mantém o S-2190 como registro preliminar opcional e o S-2200 como evento de cadastramento inicial/admissão. Quando houver S-2190, o evento completo correspondente deverá preservar a relação e as informações essenciais exigidas pela regra vigente. A implementação deverá consultar novamente os leiautes e regras oficiais antes da homologação.

---

## 14. Fluxo principal

1. O gestor ou RH inicia uma requisição de admissão.
2. O sistema localiza pessoa existente ou cria caso para novo cadastro.
3. Empresa, estabelecimento, posição, cargo, lotação, data e responsáveis são definidos.
4. O sistema seleciona a versão aplicável do checklist.
5. Um convite seguro é enviado, quando a coleta externa for utilizada.
6. O trabalhador preenche dados e envia documentos.
7. O sistema valida formato, completude e possíveis duplicidades.
8. RH e DP conferem dados e documentos.
9. Itens rejeitados voltam ao trabalhador com instruções específicas.
10. Condições propostas são completadas.
11. Aprovações são solicitadas conforme alçada.
12. Verificações ocupacionais aplicáveis são registradas de forma segregada.
13. Documentos contratuais são gerados e assinados quando o fluxo exigir.
14. Eventos digitais são preparados ou transmitidos conforme a configuração.
15. O sistema executa o gate de ativação.
16. Usuário autorizado confirma a ativação.
17. Uma operação transacional cria o vínculo e as condições iniciais.
18. O caso passa a `ACTIVE`, apontando para o vínculo criado.
19. Notificações e tarefas posteriores são geradas.

---

## 15. Fluxos alternativos

### 15.1 Pessoa já existente

O sistema reutiliza a pessoa canônica e apresenta divergências entre os dados existentes e os informados. Nenhuma informação sensível será sobrescrita automaticamente.

### 15.2 Recontratação

Um novo caso poderá referenciar vínculo anterior encerrado. Histórico e identificadores anteriores serão preservados, e a nova relação seguirá regras próprias.

### 15.3 Desistência antes da admissão

O caso será cancelado com motivo. Convites e tokens serão revogados. Documentos seguirão política de retenção apropriada.

### 15.4 Data alterada

Mudança de data poderá invalidar checklist, aprovações, documentos ou eventos externos. O sistema deverá recalcular os gates afetados.

### 15.5 Evento externo rejeitado

O vínculo não será ativado quando a política configurada exigir aceitação externa. O erro deverá ser traduzido para ação operacional, sem apagar o retorno técnico.

### 15.6 Pendência aceita excepcionalmente

Somente item configurado como dispensável poderá ser liberado, por pessoa autorizada, com justificativa e prazo de regularização quando aplicável.

### 15.7 Convite comprometido

O token será revogado e novo convite emitido. O histórico do acesso suspeito permanecerá auditável.

---

## 16. Requisitos funcionais

### RF-ADM-001 — Abrir caso de admissão

Criar caso associado à organização, empresa, responsável e origem, sem ativar vínculo.

### RF-ADM-002 — Reutilizar pessoa existente

Pesquisar correspondências e permitir associação controlada, evitando duplicidade.

### RF-ADM-003 — Criar convite seguro

Gerar token temporário com hash persistido, escopo único e expiração.

### RF-ADM-004 — Revogar convite

Invalidar imediatamente o token sem apagar o caso.

### RF-ADM-005 — Salvar preenchimento parcial

Permitir rascunho sem considerar os dados submetidos para conferência.

### RF-ADM-006 — Submeter dados

Criar versão imutável do pacote submetido e iniciar conferência.

### RF-ADM-007 — Selecionar checklist aplicável

Resolver regras por empresa, categoria, estabelecimento e vigência, registrando a versão usada.

### RF-ADM-008 — Solicitar documento

Criar item com finalidade, obrigatoriedade, prazo e classe de acesso.

### RF-ADM-009 — Receber arquivo com segurança

Validar tipo, tamanho, assinatura dos bytes, hash e política antimalware disponível.

### RF-ADM-010 — Conferir documento

Registrar decisão, responsável, data, divergências e versão analisada.

### RF-ADM-011 — Solicitar substituição

Devolver item com motivo objetivo, mantendo versões anteriores.

### RF-ADM-012 — Controlar validade

Alertar documento vencido ou que vencerá antes da data relevante.

### RF-ADM-013 — Dispensar requisito autorizado

Exigir capacidade, justificativa e evidência quando configurada.

### RF-ADM-014 — Manter condições propostas

Guardar dados contratuais ainda não vigentes separados do vínculo ativo.

### RF-ADM-015 — Validar posição e lotação

Impedir uso de estrutura inativa ou fora de vigência.

### RF-ADM-016 — Validar centro de custo e rateio

Exigir total configurado e dimensões válidas sem duplicar o catálogo financeiro.

### RF-ADM-017 — Definir matrícula planejada

Reservar ou validar matrícula no escopo configurado sem gerar duplicidade.

### RF-ADM-018 — Solicitar aprovação

Criar decisões por alçada sobre uma versão identificável dos dados.

### RF-ADM-019 — Invalidar aprovação afetada

Reabrir somente aprovações impactadas por alteração material.

### RF-ADM-020 — Registrar aptidão operacional mínima

Permitir que área autorizada informe resultado necessário sem expor conteúdo médico indevido.

### RF-ADM-021 — Gerar documentos contratuais

Resolver modelo versionado e guardar documento emitido, versão e hash.

### RF-ADM-022 — Acompanhar assinatura

Manter estados, signatários e evidências sem alegar validade jurídica antes de provider homologado.

### RF-ADM-023 — Preparar registro preliminar

Gerar evento versionado e validado quando aplicável, sem ativar vínculo.

### RF-ADM-024 — Relacionar evento completo ao preliminar

Preservar recibo, referência e consistência exigida pela versão oficial configurada.

### RF-ADM-025 — Tratar rejeição externa

Registrar retorno estruturado e ação necessária.

### RF-ADM-026 — Executar gate de ativação

Apresentar cada condição aprovada, pendente, dispensada ou não aplicável.

### RF-ADM-027 — Ativar vínculo

Criar vínculo e condições iniciais de forma transacional e idempotente.

### RF-ADM-028 — Cancelar admissão

Encerrar processo, revogar tokens e preservar histórico.

### RF-ADM-029 — Reabrir caso

Exigir autorização e motivo, sem reusar evento ou aprovação inválida.

### RF-ADM-030 — Gerar notificações

Avisar trabalhador e responsáveis sobre pendências, devoluções, prazos e decisões.

### RF-ADM-031 — Auditar acesso externo

Registrar acessos relevantes sem armazenar segredos ou documento integral em log.

### RF-ADM-032 — Exportar relação de admissões

Restringir colunas sensíveis por capacidade e auditar a exportação.

### RF-ADM-033 — Medir tempo por etapa

Calcular duração de coleta, conferência, aprovação e ativação.

### RF-ADM-034 — Detectar duplicidade de processo

Alertar caso aberto para a mesma pessoa, empresa e período configurado.

### RF-ADM-035 — Manter correlação ponta a ponta

Relacionar requisição, pessoa, trabalhador, caso, documentos, aprovações, eventos e vínculo.

---

## 17. Regras de negócio

### RN-ADM-001

Caso de admissão não comprova vínculo ativo.

### RN-ADM-002

Um caso ativado deverá referenciar exatamente um vínculo criado ou associado pela operação aprovada.

### RN-ADM-003

A mesma chave de ativação não poderá produzir dois vínculos.

### RN-ADM-004

Documento recebido não equivale a documento aprovado.

### RN-ADM-005

Alteração de dado material depois da conferência deverá indicar quais análises foram invalidadas.

### RN-ADM-006

Item impeditivo pendente bloqueará ativação.

### RN-ADM-007

Somente item explicitamente dispensável poderá ser dispensado.

### RN-ADM-008

Gestor requisitante não visualizará salário ou documento pessoal sem capacidade específica.

### RN-ADM-009

Conteúdo médico permanecerá em domínio segregado; outros módulos receberão apenas informação mínima autorizada.

### RN-ADM-010

Evento preliminar aceito não ativará vínculo automaticamente.

### RN-ADM-011

Quando houver registro preliminar, o sistema deverá manter sua referência na admissão completa correspondente.

### RN-ADM-012

Prazos legais serão versionados e vinculados a fonte e vigência.

### RN-ADM-013

Mudança de empresa ou estabelecimento após evento externo poderá exigir retificação ou novo fluxo, conforme regra vigente.

### RN-ADM-014

Processo cancelado não será apagado e não poderá ser ativado sem reabertura formal.

### RN-ADM-015

Dados coletados sem necessidade posterior deverão obedecer à política de retenção e minimização aprovada.

---

## 18. Alertas

- convite próximo da expiração;
- trabalhador não iniciou preenchimento;
- preenchimento parado;
- documento obrigatório ausente;
- documento rejeitado sem substituição;
- documento vencido;
- conferência acima do SLA;
- data planejada próxima com pendência impeditiva;
- aprovação pendente;
- posição ou centro de custo inativo;
- evento preliminar pendente de complementação;
- evento externo rejeitado;
- vínculo pronto para ativar;
- processo duplicado provável;
- admissão cancelada com evento externo ainda aberto;
- pendência pós-ativação autorizada próxima do prazo.

Alertas deverão possuir responsável, severidade, prazo, reconhecimento e resolução auditáveis quando críticos.

---

## 19. Relatórios e indicadores

- admissões por período, empresa e estabelecimento;
- tempo médio total;
- tempo por etapa;
- taxa de devolução documental;
- documentos mais rejeitados;
- admissões canceladas e motivos;
- convites expirados;
- processos com exceção;
- admissões por origem;
- admissões por cargo e unidade;
- aderência ao prazo interno;
- eventos externos por estado;
- rejeições por código ou causa;
- admissões preliminares aguardando complementação;
- ativações próximas da data planejada;
- pendências pós-ativação.

Relatórios deverão respeitar mascaramento e capacidade por coluna.

---

## 20. Segurança e LGPD

- finalidade registrada por campo e documento;
- negação por padrão;
- separação entre dados cadastrais, salariais e médicos;
- RLS por organização e empresa conforme o modelo aprovado;
- links temporários;
- storage privado;
- trilha de visualização e exportação sensível;
- sanitização de logs;
- retenção por classe documental;
- atendimento a solicitações de correção sem sobrescrever histórico;
- proteção contra enumeração de convites;
- bloqueio de token revogado ou expirado;
- antimalware fail-closed quando o provider for requisito do fluxo;
- nenhuma Service Role no cliente;
- nenhuma aprovação crítica apenas na interface.

---

## 21. Modelo conceitual inicial

Nomes provisórios:

```text
admission_cases
admission_case_versions
admission_invitations
admission_checklist_templates
admission_checklist_template_versions
admission_checklist_items
admission_case_items
admission_documents
admission_document_reviews
admission_correction_requests
admission_proposed_terms
admission_approvals
admission_exceptions
admission_external_events
admission_communications
admission_events
```

Relações principais:

```text
admission_cases
  ├─ person_id
  ├─ worker_id
  ├─ employer_company_id
  ├─ establishment_id
  ├─ source_type / source_id
  ├─ checklist_version_id
  └─ activated_relationship_id
```

A futura migration deverá considerar índices, RLS, imutabilidade, retenção, idempotência e integração com os catálogos existentes.

---

## 22. Critérios de aceite do módulo

1. Iniciar admissão não cria vínculo ativo.
2. Pessoa existente pode ser reutilizada sem duplicação.
3. Trabalhador sem login consegue preencher por convite seguro.
4. Token expirado ou revogado não funciona.
5. Dados submetidos possuem versão identificável.
6. Checklist aplicado mantém a versão usada.
7. Documento recebido passa por estado de conferência.
8. Documento rejeitado não é apagado ao receber substituição.
9. Item impeditivo bloqueia ativação.
10. Dispensa exige autorização e justificativa.
11. Alteração material invalida aprovações afetadas.
12. Dados médicos não aparecem para gestor de obra.
13. Registro preliminar aceito não ativa o vínculo.
14. Evento completo mantém correlação com o preliminar quando existente.
15. Rejeição externa é apresentada com ação operacional.
16. Ativação cria vínculo e condições iniciais em transação única.
17. Repetição da ativação não duplica vínculo.
18. Cancelamento revoga convites e preserva histórico.
19. Exportação sensível é restrita e auditada.
20. Linha do tempo mostra responsáveis, decisões, documentos e eventos.

---

## 23. Casos de teste futuros

### Positivos

- admissão manual completa;
- admissão originada de candidato;
- pessoa existente com novo vínculo;
- documento rejeitado e substituído;
- aprovação em múltiplas alçadas;
- registro preliminar seguido de admissão completa;
- ativação com alocação inicial em obra;
- ativação idempotente.

### Negativos

- token expirado;
- tentativa de enumerar casos;
- upload com extensão válida e assinatura inválida;
- usuário sem permissão lendo salário;
- gestor lendo documento médico;
- ativação com checklist impeditivo;
- ativação com empresa inativa;
- ativação com rateio inválido;
- evento completo sem correlação requerida;
- dupla ativação concorrente;
- edição direta do estado;
- exclusão de histórico cancelado.

### Concorrência

- dois analistas conferindo o mesmo documento;
- aprovação simultânea com alteração do pacote;
- duas requisições de ativação;
- reenvio simultâneo do mesmo evento externo;
- revogação de convite durante submissão.

---

## 24. Dependências

- Módulo 01 — Cadastro Mestre;
- Módulo 02 — Estrutura Organizacional;
- Administração e autorização;
- Documentos e Storage privado;
- Biblioteca de modelos;
- Assinaturas;
- Auditoria e observabilidade;
- notificações;
- segurança de arquivos;
- worker/outbox para integrações;
- política de retenção;
- revisão jurídica, trabalhista e de proteção de dados.

---

## 25. Fontes oficiais verificadas

Consulta em 6 de agosto de 2026:

- Portal eSocial — Leiautes da versão S-1.3, Nota Técnica 06/2026;
- Portal eSocial — Regras da versão S-1.3, incluindo validações de admissão e registro preliminar;
- Portal eSocial — Manual WEB Geral, capítulos do S-2190 e S-2200.

A especificação usa essas fontes apenas como baseline de arquitetura. Prazos, campos e obrigatoriedades deverão ser verificados novamente antes de implementação, testes de homologação e produção.

---

## 26. Próximo bloco lógico

**Módulo 04 — Contratos de Trabalho, Alterações Contratuais, Histórico por Vigência e Documentos do Vínculo.**
