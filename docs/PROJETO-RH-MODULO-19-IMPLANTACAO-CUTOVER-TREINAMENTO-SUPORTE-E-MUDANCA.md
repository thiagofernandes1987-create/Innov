# Projeto RH — Módulo 19 — Implantação, Cutover, Treinamento, Suporte e Gestão da Mudança

**Versão:** 0.1.0  
**Estado:** especificação operacional concluída; implantação não iniciada  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-019-CUTOVER-ATIVACAO-SUPORTE-E-GESTAO-DA-MUDANCA.md`  
**Anexo vinculante:** `PROJETO-RH-MODULO-19-ANEXO-A-CUTOVER-TREINAMENTO-SUPORTE-E-HYPERCARE.md`

---

## 1. Finalidade

Este módulo especifica a passagem controlada entre software homologado e operação oficial do Projeto RH.

Abrange:

- release e ativação;
- preparação de ambientes;
- migração e reconciliação de dados;
- cutover técnico e de negócio;
- decisão `GO`, `NO_GO` ou `CONDITIONAL_GO`;
- rollout por coortes;
- treinamento por persona;
- comunicação;
- suporte funcional e técnico;
- incidentes e escalonamento;
- hypercare;
- rollback, roll-forward e compensação;
- encerramento de sistema legado;
- critérios de estabilização.

Este documento não publica software, não executa migration, não agenda go-live e não comunica usuários reais.

---

## 2. Princípios

1. implantação é mudança operacional, não apenas deployment;
2. merge não autoriza produção;
3. produção técnica e processo oficial são estados distintos;
4. ativação será progressiva sempre que possível;
5. qualquer dado migrado deverá ser reconciliável;
6. cutover crítico deverá ser ensaiado;
7. rollback deverá ser testável antes da janela real;
8. fato irreversível será compensado, não apagado;
9. treinamento será orientado por tarefa e risco;
10. suporte receberá contexto observável sem dados sensíveis desnecessários;
11. decisão de go-live terá responsáveis explícitos;
12. hypercare terá critérios objetivos de saída;
13. sistema legado não será desligado antes de confirmação de retenção, consulta e reconciliação;
14. documentação implantada deverá corresponder ao commit efetivamente ativado.

---

## 3. Modelo de release

```text
Código aprovado
  → release candidate
    → homologação final
      → readiness operacional
        → ensaio de cutover
          → decisão de go-live
            → deployment
              → ativação restrita
                → cutover
                  → validação
                    → hypercare
                      → estabilização
```

### 3.1 Release candidate

Uma release candidate deverá fixar:

- commit;
- migrations;
- configuração esperada;
- feature flags;
- versões de adapters;
- regras e parâmetros;
- datasets de homologação;
- evidence packages aplicáveis;
- runbooks;
- materiais de treinamento compatíveis.

Qualquer mudança material após o congelamento cria nova release candidate ou exige revalidação explícita.

### 3.2 Manifesto de release

O manifesto deverá registrar, no mínimo:

```text
release_id
commit_sha
migration_range
config_version
feature_flags
rule_versions
adapter_versions
scope
approved_gates
evidence_manifest
cutover_runbook
rollback_runbook
training_version
support_version
```

---

## 4. Estratégia de rollout

### 4.1 Unidades possíveis

A ativação poderá ser limitada por:

- organização;
- empresa empregadora;
- estabelecimento;
- módulo;
- capability;
- papel;
- grupo piloto;
- competência;
- integração externa;
- portal self-service.

### 4.2 Ordem preferencial

```text
Homologação
  → produção restrita sem efeito oficial
    → operadores internos selecionados
      → empresa/estabelecimento piloto
        → coorte ampliada
          → demais empresas
            → disponibilidade geral
```

### 4.3 Blast radius

A primeira coorte deverá minimizar blast radius sem produzir uma validação artificialmente simples. Ela deverá representar processos reais suficientes para testar:

- volume;
- permissões;
- dados históricos;
- integração entre domínios;
- exceções;
- suporte;
- treinamento;
- contingência.

---

## 5. Cutover técnico

O cutover técnico poderá incluir:

1. congelamento da release candidate;
2. confirmação de backup e restore;
3. conferência do ledger;
4. execução de migrations aprovadas;
5. execução de backfills;
6. configuração de secrets e endpoints;
7. provisionamento de queues/workers;
8. warm-up quando necessário;
9. validação de RLS e capabilities;
10. verificação de health checks;
11. ativação de observabilidade;
12. smoke tests;
13. habilitação de flags da coorte;
14. reconciliação pós-ativação.

O banco não será alterado por comandos ad hoc fora do runbook sem registro de incidente ou decisão excepcional auditada.

---

## 6. Cutover de negócio

O cutover de negócio define quando o RH novo passa a ser a fonte oficial de determinado processo.

Exemplos:

- cadastro mestre;
- admissão;
- ponto;
- férias;
- SST;
- benefícios;
- folha;
- obrigações digitais;
- desligamentos;
- portal do trabalhador.

Cada domínio terá um marcador de transição explícito, incluindo a última referência oficial no sistema anterior e a primeira no novo sistema.

### 6.1 Dupla operação

Dupla operação só será usada quando o benefício de comparação superar o risco de divergência operacional.

Permitida, por exemplo, para:

- cálculo sombra de folha;
- relatórios de conferência;
- projeções de obrigações em produção restrita.

Evitar para:

- dois registros oficiais de ponto concorrentes;
- dois cadastros mestres editáveis;
- dois processos independentes de desligamento;
- duas fontes de saldo de banco de horas.

---

## 7. Migração de dados

### 7.1 Tipos

- dados mestres;
- históricos transacionais;
- saldos de abertura;
- documentos;
- parâmetros;
- vínculos com sistemas externos;
- dados de auditoria;
- dados que permanecerão apenas no legado.

### 7.2 Requisitos de migração

Toda carga deverá possuir:

- fonte identificada;
- mapa origem-destino;
- regra de transformação;
- chave de correlação;
- classificação de qualidade;
- dry-run;
- contagem pré e pós;
- hash ou somatório quando aplicável;
- relatório de exceções;
- tratamento de duplicidade;
- política de reexecução;
- checkpoint;
- reconciliação;
- aceite.

### 7.3 Saldos de abertura

Saldos de férias, banco de horas, benefícios financeiros e outras razões não poderão aparecer como números sem procedência.

O saldo inicial deverá possuir:

- data de corte;
- fonte;
- valor;
- memória ou extrato de origem;
- responsável pela conferência;
- movimento de abertura quando o modelo utilizar ledger.

---

## 8. Coexistência e legado

Antes do desligamento de um sistema legado deverão ser respondidas:

- quais dados ainda serão consultados;
- por quanto tempo;
- quem terá acesso;
- como serão atendidas auditorias;
- como serão tratados documentos;
- como serão respondidas solicitações de titulares;
- como será validada a retenção;
- como serão tratados dados duplicados;
- como será impedida edição após o corte;
- como será comprovada a integridade da exportação final.

O sistema legado poderá ser colocado em modo somente leitura antes da desativação definitiva.

---

## 9. Janelas e freezes

O calendário de mudança deverá respeitar ciclos críticos.

Janelas de restrição poderão incluir:

- fechamento de ponto;
- cálculo da folha;
- fechamento e pagamento;
- décimo terceiro;
- férias coletivas;
- transmissões periódicas;
- desligamentos em lote;
- campanhas admissionais;
- períodos de auditoria ou fiscalização.

Alterações emergenciais durante freeze exigirão avaliação Q3/Q4, aprovação específica e plano de contenção.

---

## 10. Checklist GO/NO_GO

A decisão será tomada com base em evidências, não em sensação de prontidão.

Categorias mínimas:

- produto e escopo;
- dados;
- segurança;
- qualidade;
- migrations;
- integrações;
- observabilidade;
- recuperação;
- suporte;
- treinamento;
- comunicação;
- disponibilidade de responsáveis;
- contingência;
- compliance;
- aceite funcional.

A ausência de um item obrigatório resulta em `NO_GO` ou adiamento, salvo condição formalmente classificada e permitida para `CONDITIONAL_GO`.

---

## 11. Treinamento por persona

### 11.1 Princípio

Treinar “o sistema” é insuficiente. O treinamento deverá reproduzir tarefas reais.

### 11.2 Trilhas

#### Administração de plataforma

- organização e empresa;
- módulos e capabilities;
- usuários e acessos;
- auditoria;
- feature flags;
- incidentes e break-glass.

#### RH operacional

- pessoa e trabalhador;
- admissão;
- contratos;
- férias e afastamentos;
- documentos;
- pendências e aprovações.

#### Folha

- competência;
- fatos e entradas;
- rubricas;
- cálculo;
- memória;
- divergências;
- aprovação;
- fechamento;
- reabertura;
- pagamentos e reconciliação.

#### SST e saúde ocupacional

- risco e exposição;
- exames;
- ASO;
- restrições operacionais;
- incidentes;
- EPI;
- segregação de dados clínicos.

#### Gestores e líderes

- aprovações;
- equipe e contexto;
- pendências;
- jornada;
- ausência;
- restrições sem diagnóstico;
- limites de acesso.

#### Trabalhador

- acesso ao portal;
- consulta de dados próprios;
- ponto;
- férias;
- documentos;
- demonstrativos;
- solicitações e contestação.

#### Suporte

- triagem;
- correlation ID;
- severidade;
- coleta segura de evidências;
- reproduções;
- escalonamento;
- comunicação de incidente.

---

## 12. Competência e evidência de treinamento

Para funções críticas, conclusão de treinamento poderá exigir:

- presença;
- exercício prático;
- cenário de erro;
- avaliação mínima definida posteriormente;
- aceite de responsabilidade;
- versão do material;
- data;
- instrutor ou plataforma;
- prazo de reciclagem quando aplicável.

Nenhuma nota mínima é inventada nesta fase.

Mudança material de fluxo, legislação, regra ou interface poderá invalidar parte do treinamento anterior.

---

## 13. Comunicação da mudança

O plano de comunicação será segmentado.

Públicos possíveis:

- direção;
- RH;
- gestores;
- líderes de obra;
- Financeiro;
- SST;
- suporte;
- trabalhadores;
- terceiros autorizados.

Tipos de comunicação:

- anúncio;
- preparação;
- janela de mudança;
- confirmação de ativação;
- indisponibilidade;
- incidente;
- retorno à normalidade;
- mudança de procedimento;
- descontinuação do legado.

A mensagem deverá dizer o que muda, quando, para quem, o que fazer e onde buscar ajuda.

---

## 14. Modelo de suporte

### 14.1 Níveis

```text
L0 — conhecimento e autosserviço
L1 — triagem operacional
L2F — especialista funcional
L2T — especialista técnico
L3 — engenharia / dados / segurança
L4 — fornecedor / jurídico / órgão externo
```

### 14.2 Entrada única

Quando aplicável, o SAC existente poderá atuar como porta de entrada, mas tickets do RH terão classificação e controles próprios.

Não deverá ser incluído em chamado comum:

- prontuário;
- diagnóstico;
- documento judicial integral;
- chave privada;
- token;
- senha;
- payload governamental integral;
- arquivo bancário completo sem necessidade e canal protegido.

### 14.3 Correlação

Chamados técnicos deverão aceitar correlation IDs de:

- operação;
- job;
- transmissão;
- cálculo;
- auditoria;
- upload;
- integração.

---

## 15. Severidade e incidentes

### SEV-0

Risco amplo de segurança, confidencialidade ou integridade que exige contenção imediata.

### SEV-1

Processo oficial crítico indisponível ou resultado Q4 com risco material.

### SEV-2

Degradação relevante com workaround controlado.

### SEV-3

Defeito localizado ou impacto baixo.

### SEV-4

Dúvida, solicitação, melhoria ou cosmético.

O tempo-alvo de resposta será definido antes do piloto e condicionado à capacidade real de suporte.

---

## 16. Operação assistida — hypercare

### 16.1 Objetivos

- detectar falhas precocemente;
- reduzir tempo de diagnóstico;
- apoiar usuários;
- medir adoção;
- identificar gaps de treinamento;
- acompanhar reconciliações;
- evitar normalizar workarounds ruins.

### 16.2 Sala operacional

Para ondas críticas poderá existir war room temporária com representantes de:

- produto/RH;
- engenharia;
- banco/dados;
- segurança;
- suporte;
- folha;
- SST ou compliance quando aplicável.

A war room não substitui tickets, incidentes e trilhas formais.

### 16.3 Saída

Critérios de saída do hypercare deverão incluir:

- ausência de incidente crítico aberto;
- filas e jobs estáveis;
- reconciliações dentro da tolerância;
- suporte em volume administrável;
- documentação atualizada;
- usuários-chave capazes de operar;
- backlog residual classificado;
- responsáveis de operação normal confirmados.

---

## 17. Rollback e roll-forward

### 17.1 Matriz de decisão

| Situação | Estratégia preferencial |
|---|---|
| bug de UI sem mudança de estado | rollback ou flag off |
| regra errada antes de fatos oficiais | flag off e rollback/roll-forward |
| migration aditiva compatível | rollback de app ou roll-forward |
| migration transformou dados | roll-forward e restauração seletiva se necessária |
| pagamento realizado | compensação financeira |
| folha fechada incorretamente | reabertura controlada e nova execução |
| evento oficial aceito | retificação/exclusão conforme regra aplicável |
| movimento em ledger | movimento compensatório |

Rollback não será um `git revert` simbólico quando banco e fatos já evoluíram.

---

## 18. Validação pós-cutover

Imediatamente após a transição serão verificados, conforme a onda:

- autenticação;
- autorização;
- tenant correto;
- contagens de registros;
- checksums/somatórios;
- saldos;
- documentos;
- jobs;
- filas;
- integrações;
- dashboards operacionais;
- portal;
- auditoria;
- alertas;
- backups;
- performance inicial;
- capacidade de suporte.

Validação funcional deverá ser realizada por representante do negócio, não apenas pela equipe técnica.

---

## 19. Métricas de adoção e mudança

Sem transformar comportamento individual em ranking, poderão ser observadas métricas agregadas como:

- taxa de conclusão de treinamento;
- volume de tickets por categoria;
- taxa de sucesso de fluxos;
- retrabalho por processo;
- abandono de formulário;
- divergências em cálculo sombra;
- operações realizadas em contingência;
- tempo de reconciliação;
- utilização do sistema legado após cutover;
- dúvidas recorrentes.

Não será criado score individual de empregado ou gestor para “adoção”.

---

## 20. Requisitos de implantação — 120

### Release e governança

- **RH-M19-RQ001:** toda onda deverá possuir release ID.
- **RH-M19-RQ002:** o release deverá referenciar commit imutável.
- **RH-M19-RQ003:** migrations incluídas deverão ser listadas no manifesto.
- **RH-M19-RQ004:** configuração relevante deverá possuir versão ou snapshot.
- **RH-M19-RQ005:** flags deverão possuir estado esperado por ambiente.
- **RH-M19-RQ006:** adapters externos deverão possuir versão identificada.
- **RH-M19-RQ007:** regras de negócio usadas no release deverão ser identificáveis.
- **RH-M19-RQ008:** evidence packages obrigatórios deverão ser vinculados ao release.
- **RH-M19-RQ009:** runbook de cutover deverá ser versionado.
- **RH-M19-RQ010:** runbook de rollback/roll-forward deverá ser versionado.

### Readiness e GO/NO_GO

- **RH-M19-RQ011:** cada go-live deverá possuir decisão registrada.
- **RH-M19-RQ012:** a decisão deverá identificar responsáveis.
- **RH-M19-RQ013:** bloqueios obrigatórios deverão ser listados.
- **RH-M19-RQ014:** condição de `CONDITIONAL_GO` deverá possuir owner.
- **RH-M19-RQ015:** `CONDITIONAL_GO` deverá possuir condição de saída.
- **RH-M19-RQ016:** falha Q4 não poderá ser aceita apenas por prazo de projeto.
- **RH-M19-RQ017:** responsável técnico e funcional deverão revisar ondas críticas.
- **RH-M19-RQ018:** disponibilidade de suporte deverá ser confirmada.
- **RH-M19-RQ019:** disponibilidade dos responsáveis de rollback deverá ser confirmada.
- **RH-M19-RQ020:** dependências externas críticas deverão ter health conhecido.

### Ambientes e configuração

- **RH-M19-RQ021:** secrets deverão vir de cofre ou mecanismo equivalente.
- **RH-M19-RQ022:** credenciais de homologação e produção deverão ser segregadas.
- **RH-M19-RQ023:** endpoints de produção deverão ser confirmados fora do código hardcoded.
- **RH-M19-RQ024:** configuração deverá ser comparável entre release candidate e produção.
- **RH-M19-RQ025:** feature flags deverão poder ser auditadas.
- **RH-M19-RQ026:** flag não poderá conceder autorização.
- **RH-M19-RQ027:** jobs críticos deverão ter workers provisionados antes da ativação.
- **RH-M19-RQ028:** filas deverão possuir observabilidade antes do go-live.
- **RH-M19-RQ029:** health checks mínimos deverão estar ativos.
- **RH-M19-RQ030:** logs e alertas deverão estar sanitizados antes da primeira coorte.

### Dados e migração

- **RH-M19-RQ031:** toda fonte de migração deverá ser inventariada.
- **RH-M19-RQ032:** cada campo migrado deverá possuir mapeamento quando não for trivial.
- **RH-M19-RQ033:** transformação de dados deverá ser versionada.
- **RH-M19-RQ034:** dry-run deverá anteceder carga crítica.
- **RH-M19-RQ035:** cargas deverão possuir idempotência ou estratégia explícita de reexecução.
- **RH-M19-RQ036:** lotes deverão possuir checkpoint quando o volume justificar.
- **RH-M19-RQ037:** duplicidades deverão possuir regra de decisão.
- **RH-M19-RQ038:** registros ambíguos deverão ser segregados para revisão.
- **RH-M19-RQ039:** contagens origem/destino deverão ser reconciliadas.
- **RH-M19-RQ040:** somatórios financeiros deverão ser reconciliados quando aplicável.
- **RH-M19-RQ041:** documentos migrados deverão preservar hash ou evidência equivalente.
- **RH-M19-RQ042:** dados sensíveis deverão manter classificação durante a migração.
- **RH-M19-RQ043:** erros de importação deverão produzir relatório sanitizado.
- **RH-M19-RQ044:** carga não deverá inventar informação ausente.
- **RH-M19-RQ045:** saldos de abertura deverão possuir data de corte e fonte.
- **RH-M19-RQ046:** movimentos de abertura deverão ser auditáveis.
- **RH-M19-RQ047:** dados não migrados deverão possuir política de consulta no legado.
- **RH-M19-RQ048:** retenção do legado deverá ser documentada.
- **RH-M19-RQ049:** origem congelada deverá impedir edição quando for retirada de operação.
- **RH-M19-RQ050:** exportação final do legado deverá possuir evidência de integridade.

### Cutover técnico

- **RH-M19-RQ051:** pré-condições deverão ser verificadas antes do primeiro passo mutável.
- **RH-M19-RQ052:** backup aplicável deverá existir antes de mudança destrutiva.
- **RH-M19-RQ053:** restore deverá ter evidência válida para a onda.
- **RH-M19-RQ054:** migration deverá ser comparada ao manifesto.
- **RH-M19-RQ055:** migrations aplicadas não poderão ser editadas.
- **RH-M19-RQ056:** backfill deverá emitir resultado e reconciliação.
- **RH-M19-RQ057:** cada passo mutável deverá possuir owner.
- **RH-M19-RQ058:** passos dependentes deverão possuir ordem explícita.
- **RH-M19-RQ059:** pontos de abortar deverão ser conhecidos antes da janela.
- **RH-M19-RQ060:** smoke tests deverão ocorrer após mudanças estruturais.

### Cutover de negócio

- **RH-M19-RQ061:** cada processo deverá identificar a data ou marcador de corte.
- **RH-M19-RQ062:** a última operação oficial no legado deverá ser identificável.
- **RH-M19-RQ063:** a primeira operação oficial no novo sistema deverá ser identificável.
- **RH-M19-RQ064:** dupla operação deverá possuir finalidade e prazo.
- **RH-M19-RQ065:** cálculo sombra não poderá virar pagamento automaticamente.
- **RH-M19-RQ066:** produção restrita não poderá ser confundida com declaração oficial.
- **RH-M19-RQ067:** processo oficial não deverá permanecer gravável em duas fontes sem controle explícito.
- **RH-M19-RQ068:** freeze de negócio deverá ser comunicado.
- **RH-M19-RQ069:** exceções durante freeze deverão ser auditadas.
- **RH-M19-RQ070:** validação pós-cutover deverá incluir representante funcional.

### Treinamento

- **RH-M19-RQ071:** cada persona deverá possuir trilha compatível com suas tarefas.
- **RH-M19-RQ072:** material deverá possuir versão.
- **RH-M19-RQ073:** material deverá indicar ambiente ou versão da interface quando relevante.
- **RH-M19-RQ074:** treinamento crítico deverá incluir cenário de erro.
- **RH-M19-RQ075:** treinamento deverá explicar limites de autorização.
- **RH-M19-RQ076:** treinamento com dados sensíveis deverá usar dados artificiais ou minimizados.
- **RH-M19-RQ077:** conclusão deverá ser registrável quando for requisito de gate.
- **RH-M19-RQ078:** reciclagem deverá ser possível após mudança material.
- **RH-M19-RQ079:** trabalhador deverá receber orientação específica de self-service.
- **RH-M19-RQ080:** suporte deverá receber treinamento de triagem e correlação.

### Comunicação

- **RH-M19-RQ081:** mudança relevante deverá possuir público-alvo.
- **RH-M19-RQ082:** mensagem deverá explicar impacto e ação necessária.
- **RH-M19-RQ083:** janela deverá ser comunicada quando houver indisponibilidade.
- **RH-M19-RQ084:** canal de suporte deverá ser informado.
- **RH-M19-RQ085:** comunicação não deverá expor detalhes de segurança desnecessários.
- **RH-M19-RQ086:** retorno à normalidade deverá ser comunicado em incidente relevante.
- **RH-M19-RQ087:** descontinuação de legado deverá ser comunicada antes do corte.
- **RH-M19-RQ088:** materiais antigos deverão ser marcados ou retirados quando se tornarem incompatíveis.
- **RH-M19-RQ089:** comunicação de mudança legal deverá referenciar a vigência da regra.
- **RH-M19-RQ090:** comunicação não substituirá treinamento obrigatório.

### Suporte e incidentes

- **RH-M19-RQ091:** tickets deverão aceitar classificação de severidade.
- **RH-M19-RQ092:** tickets técnicos deverão aceitar correlation ID.
- **RH-M19-RQ093:** suporte deverá distinguir incidente, dúvida, problema e solicitação.
- **RH-M19-RQ094:** coleta de evidência deverá ser sanitizada.
- **RH-M19-RQ095:** suporte comum não deverá receber prontuário integral.
- **RH-M19-RQ096:** escalonamento deverá distinguir funcional e técnico.
- **RH-M19-RQ097:** incidentes críticos deverão possuir owner.
- **RH-M19-RQ098:** workaround deverá ser registrado quando aplicado.
- **RH-M19-RQ099:** resolução deverá registrar causa conhecida ou estado de investigação.
- **RH-M19-RQ100:** incidente com impacto de segurança deverá seguir procedimento específico.

### Hypercare e estabilização

- **RH-M19-RQ101:** cada onda produtiva deverá definir período ou condição de hypercare.
- **RH-M19-RQ102:** indicadores de hypercare deverão ser definidos antes da ativação.
- **RH-M19-RQ103:** incidentes abertos deverão ser classificados na saída.
- **RH-M19-RQ104:** backlog residual deverá possuir owner.
- **RH-M19-RQ105:** volume de suporte deverá ser analisado.
- **RH-M19-RQ106:** divergências de reconciliação deverão ser encerradas ou formalmente aceitas.
- **RH-M19-RQ107:** filas e jobs deverão estar em condição operacional aceitável.
- **RH-M19-RQ108:** usuários-chave deverão confirmar capacidade operacional.
- **RH-M19-RQ109:** documentação final deverá corresponder ao release ativo.
- **RH-M19-RQ110:** transferência para operação normal deverá ser explícita.

### Rollback, continuidade e encerramento

- **RH-M19-RQ111:** cada onda crítica deverá possuir estratégia de rollback ou roll-forward.
- **RH-M19-RQ112:** estratégia deverá considerar compatibilidade de banco.
- **RH-M19-RQ113:** fatos de negócio irreversíveis deverão possuir compensação definida.
- **RH-M19-RQ114:** rollback ensaiado deverá registrar resultado.
- **RH-M19-RQ115:** restauração não deverá misturar dados de tenants.
- **RH-M19-RQ116:** reativação de legado deverá ser avaliada antes de ser usada como contingência.
- **RH-M19-RQ117:** fila externa em estado incerto deverá ser reconciliada antes de reenvio.
- **RH-M19-RQ118:** encerramento do cutover deverá produzir relatório.
- **RH-M19-RQ119:** lições e incidentes deverão alimentar backlog e runbooks.
- **RH-M19-RQ120:** go-live não encerrará automaticamente o projeto ou a responsabilidade de estabilização.

---

## 21. Regras operacionais — 80

- **RH-M19-RN001:** não publicar release sem manifesto.
- **RH-M19-RN002:** não mudar commit após aprovação sem invalidar evidências afetadas.
- **RH-M19-RN003:** não aplicar migration fora do conjunto aprovado sem change record.
- **RH-M19-RN004:** não considerar preview como produção.
- **RH-M19-RN005:** não considerar deployment como ativação.
- **RH-M19-RN006:** não usar flag como autorização.
- **RH-M19-RN007:** não ativar para todos quando uma coorte menor for suficiente.
- **RH-M19-RN008:** não expandir rollout com incidente crítico aberto.
- **RH-M19-RN009:** não usar `CONDITIONAL_GO` para contornar falha Q4.
- **RH-M19-RN010:** não decidir go-live sem representante funcional.
- **RH-M19-RN011:** não executar cutover crítico sem runbook.
- **RH-M19-RN012:** não iniciar passo mutável sem pré-condições verificadas.
- **RH-M19-RN013:** não depender de comando lembrado fora do runbook.
- **RH-M19-RN014:** não editar migration aplicada.
- **RH-M19-RN015:** não transformar dado sem regra versionada.
- **RH-M19-RN016:** não descartar exceção de migração silenciosamente.
- **RH-M19-RN017:** não reconciliar apenas por contagem quando valores também importam.
- **RH-M19-RN018:** não inferir vínculo por nome semelhante.
- **RH-M19-RN019:** não inventar CPF, matrícula, dependente ou rubrica ausente.
- **RH-M19-RN020:** não considerar carga concluída sem relatório de erros.
- **RH-M19-RN021:** não criar saldo inicial sem fonte e data de corte.
- **RH-M19-RN022:** não desligar legado antes de estratégia de consulta histórica.
- **RH-M19-RN023:** não manter legado editável após corte sem justificativa.
- **RH-M19-RN024:** não migrar conteúdo clínico por pipeline comum sem proteção equivalente.
- **RH-M19-RN025:** não usar produção real para ensaio quando ambiente seguro puder reproduzir o fluxo.
- **RH-M19-RN026:** não executar treino com dados pessoais reais desnecessários.
- **RH-M19-RN027:** não conceder permissão apenas porque houve treinamento.
- **RH-M19-RN028:** não liberar função crítica apenas porque o usuário possui permissão se treinamento for gate aprovado.
- **RH-M19-RN029:** não usar manual de versão antiga sem aviso.
- **RH-M19-RN030:** não treinar somente navegação de menus.
- **RH-M19-RN031:** não omitir cenários de erro das trilhas críticas.
- **RH-M19-RN032:** não divulgar arquitetura sensível em comunicado geral.
- **RH-M19-RN033:** não enviar dados pessoais em comunicação de manutenção.
- **RH-M19-RN034:** não abrir ticket com senha ou token.
- **RH-M19-RN035:** não incluir prontuário integral em ticket L1.
- **RH-M19-RN036:** não encerrar incidente sem estado final registrado.
- **RH-M19-RN037:** não confundir workaround com correção definitiva.
- **RH-M19-RN038:** não classificar severidade pelo cargo de quem reportou.
- **RH-M19-RN039:** não ocultar incidente para preservar indicador.
- **RH-M19-RN040:** não permitir que suporte execute decisão jurídica sem responsável competente.
- **RH-M19-RN041:** não permitir que suporte altere folha fechada por SQL ad hoc.
- **RH-M19-RN042:** não reenviar operação externa incerta antes de reconciliar.
- **RH-M19-RN043:** não apagar evento aceito para simular rollback.
- **RH-M19-RN044:** não apagar pagamento para corrigir pagamento.
- **RH-M19-RN045:** não editar ledger imutável para ajustar saldo.
- **RH-M19-RN046:** não usar `git revert` como única estratégia de rollback de mudança com banco.
- **RH-M19-RN047:** não restaurar backup sem avaliar dados produzidos após o ponto restaurado.
- **RH-M19-RN048:** não restaurar tenant A sobre tenant B.
- **RH-M19-RN049:** não considerar backup válido sem restore ensaiado conforme gate.
- **RH-M19-RN050:** não mudar freeze sem comunicar operadores afetados.
- **RH-M19-RN051:** não realizar alteração não emergencial durante janela crítica bloqueada.
- **RH-M19-RN052:** não ativar folha oficial antes de shadow aprovado.
- **RH-M19-RN053:** não ativar integração governamental oficial antes de produção restrita aprovada.
- **RH-M19-RN054:** não usar dupla operação indefinidamente.
- **RH-M19-RN055:** não manter duas fontes oficiais editáveis do mesmo fato sem contrato explícito.
- **RH-M19-RN056:** não expandir coorte sem revisar telemetria e tickets da anterior.
- **RH-M19-RN057:** não sair de hypercare com SEV-0/SEV-1 aberto.
- **RH-M19-RN058:** não sair de hypercare com reconciliação crítica desconhecida.
- **RH-M19-RN059:** não encerrar war room sem transferir responsabilidades.
- **RH-M19-RN060:** não tratar war room como substituta do sistema de tickets.
- **RH-M19-RN061:** não alterar material de treinamento sem versionar.
- **RH-M19-RN062:** não medir adoção por ranking individual de empregado.
- **RH-M19-RN063:** não usar tickets como fonte canônica do estado de negócio.
- **RH-M19-RN064:** não usar observabilidade como substituta da auditoria.
- **RH-M19-RN065:** não declarar estabilização apenas por ausência de tickets.
- **RH-M19-RN066:** não declarar estabilização sem observar jobs e integrações.
- **RH-M19-RN067:** não desativar alertas críticos para reduzir ruído sem avaliação.
- **RH-M19-RN068:** não alterar thresholds de alerta durante incidente sem registrar a mudança.
- **RH-M19-RN069:** não comunicar prazo exato de recuperação sem base operacional.
- **RH-M19-RN070:** não mascarar rollback falho como sucesso parcial.
- **RH-M19-RN071:** não destruir exportação final de legado antes do prazo aprovado.
- **RH-M19-RN072:** não permitir acesso legado além do necessário após corte.
- **RH-M19-RN073:** não reusar senha de homologação em produção.
- **RH-M19-RN074:** não versionar secrets em runbook.
- **RH-M19-RN075:** não colocar dados reais em artifacts de CI de treinamento/cutover.
- **RH-M19-RN076:** não considerar checklist marcado sem evidência quando o item exigir execução.
- **RH-M19-RN077:** não aprovar o próprio gate crítico sem revisão independente definida.
- **RH-M19-RN078:** não confundir aceitação de risco com eliminação de risco.
- **RH-M19-RN079:** não encerrar a implantação antes de registrar lições e pendências.
- **RH-M19-RN080:** não iniciar produção do RH antes dos gates de fundação, qualidade e operação aplicáveis.

---

## 22. Critérios de aceite — 55

- **RH-M19-CA001:** existe modelo de manifesto de release.
- **RH-M19-CA002:** deployment e ativação estão documentados como estados diferentes.
- **RH-M19-CA003:** rollout por coorte está definido.
- **RH-M19-CA004:** existe regra para blast radius.
- **RH-M19-CA005:** existe decisão formal GO/NO_GO/CONDITIONAL_GO.
- **RH-M19-CA006:** `CONDITIONAL_GO` possui limites explícitos.
- **RH-M19-CA007:** cutover técnico possui checklist mínimo.
- **RH-M19-CA008:** cutover de negócio possui marcador de corte.
- **RH-M19-CA009:** rollback técnico está separado de reversão de negócio.
- **RH-M19-CA010:** roll-forward está previsto para migrations incompatíveis com retorno.
- **RH-M19-CA011:** compensação está prevista para fatos irreversíveis.
- **RH-M19-CA012:** estratégia de freeze está documentada.
- **RH-M19-CA013:** alterações emergenciais em freeze exigem aprovação.
- **RH-M19-CA014:** migração possui mapa origem-destino.
- **RH-M19-CA015:** migração possui dry-run.
- **RH-M19-CA016:** migração possui reconciliação.
- **RH-M19-CA017:** saldos de abertura possuem procedência.
- **RH-M19-CA018:** ambiguidades de migração não são resolvidas automaticamente por aproximação insegura.
- **RH-M19-CA019:** coexistência com legado possui estratégia.
- **RH-M19-CA020:** desligamento de legado possui critérios.
- **RH-M19-CA021:** trilhas de treinamento são orientadas por persona.
- **RH-M19-CA022:** trilhas críticas incluem erro e contingência.
- **RH-M19-CA023:** treinamento não concede autorização automaticamente.
- **RH-M19-CA024:** material de treinamento é versionável.
- **RH-M19-CA025:** portal do trabalhador possui trilha própria.
- **RH-M19-CA026:** suporte possui níveis L0–L4.
- **RH-M19-CA027:** suporte distingue funcional de técnico.
- **RH-M19-CA028:** tickets aceitam correlation ID.
- **RH-M19-CA029:** conteúdo sensível é excluído do ticket comum.
- **RH-M19-CA030:** severidades SEV-0 a SEV-4 estão definidas.
- **RH-M19-CA031:** severidade não possui SLA numérico inventado.
- **RH-M19-CA032:** incidentes críticos possuem owner.
- **RH-M19-CA033:** comunicação de mudança possui público e ação esperada.
- **RH-M19-CA034:** comunicação de incidente preserva segurança e privacidade.
- **RH-M19-CA035:** hypercare possui objetivo e critérios de saída.
- **RH-M19-CA036:** war room, quando usada, não substitui ticket e auditoria.
- **RH-M19-CA037:** saída do hypercare exige reconciliações críticas conhecidas.
- **RH-M19-CA038:** transferência para operação normal é explícita.
- **RH-M19-CA039:** métricas de adoção não criam ranking individual.
- **RH-M19-CA040:** validação pós-cutover inclui negócio e técnica.
- **RH-M19-CA041:** backup é condição distinta de restore comprovado.
- **RH-M19-CA042:** runbook possui critérios de abortar.
- **RH-M19-CA043:** resposta externa incerta exige reconciliação.
- **RH-M19-CA044:** folha sombra precede folha oficial.
- **RH-M19-CA045:** produção restrita precede integração governamental oficial.
- **RH-M19-CA046:** coorte seguinte depende de revisão da anterior.
- **RH-M19-CA047:** release candidate identifica rules/config/adapters.
- **RH-M19-CA048:** mudança material após freeze invalida evidências afetadas.
- **RH-M19-CA049:** secrets não aparecem no manifesto ou runbook.
- **RH-M19-CA050:** dados reais não são requisito para treinamento.
- **RH-M19-CA051:** encerramento do cutover produz relatório.
- **RH-M19-CA052:** incidentes e lições alimentam backlog.
- **RH-M19-CA053:** documentação final referencia o release ativo.
- **RH-M19-CA054:** go-live não equivale a estabilização.
- **RH-M19-CA055:** nenhum item deste módulo é declarado executado apenas por estar especificado.

---

## 23. Ondas de preparação operacional

```text
OPS-0 — governança de release e ambientes
OPS-1 — dados, legado e rehearsal
OPS-2 — treinamento e comunicação
OPS-3 — suporte, runbooks e incidentes
OPS-4 — piloto e cutover controlado
OPS-5 — hypercare, expansão e estabilização
```

A execução só poderá ocorrer após autorização e gates anteriores aplicáveis.

---

## 24. Estado atual e gaps

O repositório já possui:

- disciplina de produção bloqueada até evidências;
- decisão `GO/NO_GO/CONDITIONAL_GO` na Etapa 20;
- testes de backup/restore em ambiente isolado;
- observabilidade e auditoria da Etapa 19;
- SAC que poderá apoiar a entrada de suporte;
- documentação de recuperação;
- migrations append-only e validadores.

Entretanto, para o RH ainda não existem:

- release manifest próprio;
- runbooks de cutover;
- rehearsal do RH;
- mapa de legado;
- plano de treinamento executado;
- base de conhecimento do RH;
- matriz operacional de suporte;
- escala real de responsáveis;
- SLA/SLO aprovado;
- war room;
- hypercare;
- decisão de go-live;
- rollback ensaiado;
- coorte piloto.

A documentação de recuperação do repositório registra ainda que o replay completo de migrations não estava reproduzível na verificação de 25 de julho de 2026. Essa condição pertence à fundação/Sprint 00 e deverá ser reavaliada antes de qualquer cutover do RH.

---

## 25. Resultado esperado

Quando implementado, o modelo deverá permitir responder com evidência:

- qual release está ativa;
- em quais empresas e coortes;
- qual foi o corte de dados;
- quais registros vieram do legado;
- quais reconciliações passaram;
- quem aprovou o go-live;
- quem foi treinado;
- como obter suporte;
- quais incidentes ocorreram;
- qual rollback ou compensação é possível;
- quando a onda saiu de hypercare;
- quais pendências permanecem.

Até que essas evidências existam, este módulo permanece especificação operacional, não implantação realizada.
