# ADR-008 — Separação entre Riscos Ocupacionais, Saúde Ocupacional, Acidente, EPI, Treinamento e Habilitação

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O domínio de Segurança e Saúde no Trabalho reúne informações com finalidades diferentes e níveis de sensibilidade distintos:

- perigos existentes no ambiente;
- avaliações de risco;
- medidas de prevenção;
- exposições de grupos e trabalhadores;
- programas de saúde ocupacional;
- exames e ASOs;
- acidentes, incidentes e quase acidentes;
- comunicações oficiais;
- equipamentos de proteção;
- treinamentos e qualificações;
- permissões e autorizações operacionais;
- restrições e aptidão para determinadas atividades.

Tratar tudo como um único cadastro de “SST do funcionário” produziria erros graves:

- o resultado clínico poderia ser exposto a gestores operacionais;
- entrega de EPI poderia ser confundida com eliminação do risco;
- treinamento concluído poderia ser confundido com autorização vigente;
- ASO apto poderia ser usado como prova de competência técnica;
- acidente poderia ser criado automaticamente por uma ausência no ponto;
- informação enviada ao eSocial poderia substituir a evidência interna;
- alteração no ambiente poderia reescrever exposições históricas;
- trabalhador transferido de obra perderia a rastreabilidade das exposições anteriores;
- certificado vencido poderia continuar liberando uma atividade crítica;
- documento anexado poderia ser interpretado como validação técnica.

A arquitetura deve preservar a diferença entre prevenção, monitoramento médico, resposta a eventos, fornecimento de proteção e habilitação para trabalho.

---

## 2. Decisão

O Projeto RH adotará objetos canônicos separados e conectados.

### 2.1 Ambiente e contexto de trabalho

Representa estabelecimento, obra, frente de serviço, setor, área, processo ou local em que perigos e medidas de prevenção são avaliados.

### 2.2 Perigo

Representa a fonte, situação ou condição com potencial de causar lesão ou agravo à saúde.

### 2.3 Avaliação de risco

Representa uma avaliação versionada do perigo em determinado contexto, com critérios, severidade, probabilidade, nível de risco, evidências e responsável técnico.

### 2.4 Medida de prevenção

Representa ação planejada ou implementada para eliminar, reduzir ou controlar risco, respeitando a hierarquia de controles.

### 2.5 Grupo de exposição

Representa trabalhadores ou funções com perfil de exposição semelhante para determinada vigência. O grupo não substitui a alocação individual nem o histórico de cada trabalhador.

### 2.6 Perfil individual de exposição

Representa as exposições aplicáveis a um vínculo em determinado período, derivadas do ambiente, função, atividades e exceções individuais.

### 2.7 Programa de saúde ocupacional

Representa a política e o plano de monitoramento médico associados aos riscos identificados, sem armazenar resultados clínicos em tabelas operacionais.

### 2.8 Exame ocupacional

Representa convocação, agendamento, realização, exames complementares, prestador, documentos e estados do processo.

### 2.9 ASO

Representa o atestado ocupacional emitido e sua conclusão de aptidão ou restrição. O ASO não será a fonte dos resultados clínicos completos.

### 2.10 Prontuário ou dado clínico

Representa informação médica protegida, acessível somente por profissionais e perfis autorizados. Gestores operacionais receberão apenas a conclusão necessária à gestão do trabalho.

### 2.11 Incidente de SST

Representa acidente, quase acidente, condição insegura ou ocorrência investigável. Nem todo incidente gera CAT.

### 2.12 CAT

Representa uma comunicação oficial vinculada a um incidente e gerenciada como evento auditável, com estados de preparação, transmissão, aceite, retificação e exclusão quando aplicável.

### 2.13 EPI

Representa o tipo de proteção, o produto aprovado, o item físico ou lote, sua validade documental, entrega, devolução, higienização, inspeção e substituição.

### 2.14 Treinamento

Representa requisito de capacitação, turma, conteúdo, instrutor, presença, avaliação e certificado.

### 2.15 Habilitação ou autorização operacional

Representa a liberação para executar determinada atividade, derivada de condições como:

- treinamento válido;
- ASO compatível;
- EPI disponível;
- requisito documental;
- vínculo e lotação válidos;
- supervisão necessária;
- permissão de trabalho;
- ausência de bloqueio.

A autorização operacional será uma conclusão própria e nunca mera cópia do certificado de treinamento.

---

## 3. Modelo conceitual

```text
Contexto de trabalho
  ├─ perigos
  │    └─ avaliações de risco versionadas
  │          ├─ medidas de prevenção
  │          ├─ plano de ação
  │          └─ grupos de exposição
  │                └─ perfis individuais por vigência
  │
  ├─ programa de saúde ocupacional
  │    └─ exames ocupacionais
  │          ├─ documentos clínicos protegidos
  │          └─ ASO e conclusão operacional
  │
  ├─ incidentes de SST
  │    ├─ investigação
  │    ├─ ações corretivas
  │    └─ CAT / S-2210 quando aplicável
  │
  ├─ EPIs
  │    ├─ catálogo e CA
  │    ├─ estoque e lotes
  │    └─ entregas, trocas e devoluções
  │
  └─ treinamentos
       ├─ requisitos
       ├─ turmas e certificados
       └─ habilitações operacionais
```

```text
Risco identificado
  ≠ exposição individual
  ≠ exame realizado
  ≠ ASO apto
  ≠ EPI entregue
  ≠ treinamento concluído
  ≠ autorização para executar atividade
```

---

## 4. Princípios obrigatórios

1. O inventário de riscos será versionado por vigência.
2. Alterar uma avaliação não reescreverá exposições históricas.
3. Medida de prevenção terá responsável, prazo, estado e evidência.
4. EPI será tratado como medida complementar, não como substituição automática de controles coletivos.
5. Entrega de EPI não comprovará uso correto ou eficácia do controle.
6. O Certificado de Aprovação será validado e historizado, sem ser codificado de forma fixa.
7. Resultado clínico não será visível a gestor de obra ou RH operacional sem base e permissão específicas.
8. O gestor receberá apenas aptidão, restrição funcional, validade e instruções operacionais necessárias.
9. ASO não substituirá prontuário médico.
10. Treinamento concluído não produzirá autorização automática sem verificar todos os requisitos.
11. Certificado vencido suspenderá a habilitação correspondente, conforme política.
12. Acidente, incidente e quase acidente serão objetos distintos.
13. Abertura de incidente não enviará CAT automaticamente.
14. CAT transmitida manterá payload, recibo, versão e correlação.
15. Retificação externa não apagará o evento originalmente enviado.
16. Alteração retroativa de exposição produzirá impactos explícitos.
17. O vínculo entre trabalhador e grupo de exposição terá vigência.
18. Transferência de obra encerrará a exposição anterior e criará nova vinculação quando aplicável.
19. A ausência de dado não será interpretada como ausência de risco.
20. Dados de saúde terão segregação lógica, autorização granular e auditoria reforçada.
21. Documentos anexados terão estados de recebido, conferido, rejeitado, vencido ou substituído.
22. Sistemas externos não serão tratados como fonte única do fato interno.
23. Autorização para atividade crítica poderá ser bloqueada por risco, exame, treinamento, EPI ou permissão pendente.
24. Bloqueios operacionais deverão indicar fundamento sem expor diagnóstico.
25. Reabertura de período fechado criará nova versão e trilha de auditoria.

---

## 5. Eventos externos

O domínio deverá suportar, sem acoplamento rígido, ao menos os seguintes tipos de evento:

- comunicação de acidente de trabalho;
- monitoramento da saúde do trabalhador;
- condições ambientais e exposição a agentes nocivos;
- exames específicos quando exigidos;
- afastamentos correlatos;
- exclusões e retificações permitidas.

Para cada evento externo deverão existir:

- origem interna;
- tipo e versão do leiaute;
- data do fato;
- data de preparação;
- payload canônico;
- hash do payload;
- identificador idempotente;
- estado de transmissão;
- recibo ou protocolo;
- mensagens de retorno;
- relação com evento anterior;
- retificações e exclusões;
- evidência de quem autorizou o envio.

---

## 6. Privacidade e acesso

### 6.1 Dados operacionais

Podem ser acessados, conforme função, por RH, SST, gestores e responsáveis de obra:

- validade de treinamento;
- apto, inapto ou apto com restrições operacionais;
- necessidade de EPI;
- autorização ou bloqueio para atividade;
- vencimentos e pendências;
- ações preventivas;
- ocorrências e investigação no nível autorizado.

### 6.2 Dados clínicos

Devem permanecer restritos:

- diagnóstico;
- anamnese;
- resultados detalhados;
- laudos médicos;
- exames complementares;
- observações clínicas;
- histórico médico;
- dados que permitam inferir condição de saúde além do necessário.

### 6.3 Dados de acidente

Informações de acidente terão acesso por necessidade funcional, preservando testemunhos, imagens, dados médicos e documentos oficiais.

---

## 7. Consequências positivas

- prevenção baseada em risco e histórico;
- integração real com obras e atividades;
- proteção de dados de saúde;
- rastreabilidade de exames e ASOs;
- gestão confiável de CAT;
- controle de validade de EPI e treinamentos;
- bloqueio preventivo de atividades críticas;
- geração reproduzível de eventos de SST;
- redução de duplicidade entre RH, Obras e SST;
- suporte a auditorias e fiscalizações;
- melhor gestão de contratados e trabalhadores sem login.

---

## 8. Custos e impactos

- criação de entidades especializadas;
- necessidade de perfis de acesso adicionais;
- armazenamento protegido para documentos clínicos;
- integração com prestadores de medicina ocupacional;
- reconciliação de trabalhadores, obras, funções e ambientes;
- motor de validade e habilitação;
- catálogo versionado de requisitos por atividade;
- fluxos de investigação e ações corretivas;
- integração futura com eSocial, CAEPI e fornecedores;
- necessidade de revisão jurídica, médica e técnica antes da produção.

---

## 9. Alternativas rejeitadas

### Usar documentos PDF como única fonte

Rejeitada porque documentos não permitem consultas temporais, validações, alertas, integração e autorização operacional confiáveis.

### Colocar resultados médicos no cadastro do trabalhador

Rejeitada por ampliar exposição e misturar identidade, vínculo e prontuário clínico.

### Considerar ASO apto como autorização universal

Rejeitada porque aptidão médica não comprova treinamento, experiência, EPI, supervisão ou permissão de trabalho.

### Considerar entrega de EPI como risco controlado

Rejeitada porque a prevenção exige análise e hierarquia de controles, além de seleção, orientação, manutenção e acompanhamento.

### Usar Diário de Obras como sistema de SST

Rejeitada porque o diário pode fornecer evidência operacional, mas não substitui inventário de riscos, prontuário, CAT, entrega de EPI ou treinamento.

### Sobrescrever avaliações e certificados

Rejeitada porque destruiria a capacidade de provar qual condição estava vigente na data do fato.

---

## 10. Critérios de aceite da futura implementação

- é possível consultar os riscos vigentes de uma obra em uma data passada;
- mudança de função encerra e cria perfis de exposição sem apagar o anterior;
- gestor visualiza aptidão operacional sem acessar diagnóstico;
- exame vencido gera alerta e bloqueio conforme política;
- treinamento vencido revoga a habilitação correspondente;
- entrega de EPI mantém produto, CA, lote, data e ciência;
- substituição de EPI não apaga a entrega anterior;
- incidente pode existir sem CAT;
- CAT mantém todas as versões e recibos;
- ação corretiva possui responsável, prazo e evidência;
- evento externo pode ser reenviado sem duplicação indevida;
- retificação preserva o evento original;
- trabalhador transferido mantém histórico de exposições por obra;
- tarefa crítica não é liberada quando requisito impeditivo está vencido;
- auditoria identifica quem consultou ou alterou dado clínico protegido.

---

## 11. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas fontes oficiais vigentes ou consolidadas:

- Normas Regulamentadoras do Ministério do Trabalho e Emprego;
- NR-1 e orientações de GRO/PGR;
- NR-6 e informações oficiais de EPI e Certificado de Aprovação;
- NR-7 e PCMSO;
- NR-18 aplicável à indústria da construção, incluindo atualização de 2026;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- eventos S-2210, S-2220 e S-2240.

A implementação deverá verificar novamente textos consolidados, campos, tabelas, prazos, códigos e interpretações antes da homologação e produção.

---

## 12. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md`;
- `docs/PROJETO-RH-MODULO-02-ESTRUTURA-ORGANIZACIONAL.md`;
- `docs/PROJETO-RH-MODULO-03-ADMISSAO-PRE-ADMISSAO.md`;
- `docs/PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md`;
- `docs/PROJETO-RH-MODULO-05-JORNADAS-PONTO-E-BANCO-DE-HORAS.md`;
- `docs/PROJETO-RH-MODULO-06-FERIAS-AFASTAMENTOS-E-LICENCAS.md`;
- `docs/PROJETO-RH-MODULO-08-SST-RISCOS-EXAMES-E-HABILITACOES.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/PERSONAS-E-ROTINAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
