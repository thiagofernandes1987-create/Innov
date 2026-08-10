# Projeto RH — Módulo 08 — Anexo de Construção, Riscos Críticos, Emergência e Fatores Psicossociais

**Versão:** 0.1.0  
**Estado:** complemento vinculante da especificação funcional; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Documento principal:** `PROJETO-RH-MODULO-08-SST-RISCOS-EXAMES-E-HABILITACOES.md`  

---

## 1. Finalidade

Este anexo complementa o Módulo 08 nos pontos que exigem tratamento específico para uma empresa de construção civil:

- fases e frentes de obra mutáveis;
- riscos críticos de execução;
- trabalhadores próprios e terceiros;
- análise de risco e permissão de trabalho;
- trabalho em altura;
- espaços confinados;
- instalações e serviços elétricos;
- máquinas, equipamentos, içamento e movimentação;
- escavações, demolições, estruturas e proteções coletivas;
- preparação e resposta a emergências;
- fatores de risco psicossociais relacionados ao trabalho;
- participação dos trabalhadores e governança de SST.

Este documento não substitui as Normas Regulamentadoras nem autoriza a implementação sem validação técnica. Ele define a arquitetura funcional necessária para manter regras, evidências, vigências e bloqueios de forma auditável.

---

## 2. Baseline oficial verificada em 6 de agosto de 2026

Foram consideradas as fontes oficiais vigentes do Ministério do Trabalho e Emprego e do eSocial, incluindo:

- NR-1 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais, com redação vigente desde 26 de maio de 2026;
- materiais oficiais de interpretação do GRO/PGR publicados em 2026;
- inclusão dos fatores de riscos psicossociais relacionados ao trabalho no gerenciamento de riscos;
- NR-6 — Equipamento de Proteção Individual;
- NR-7 — Programa de Controle Médico de Saúde Ocupacional;
- NR-10 — Segurança em Instalações e Serviços em Eletricidade;
- NR-12 — Segurança no Trabalho em Máquinas e Equipamentos;
- NR-17 — Ergonomia;
- NR-18 — Segurança e Saúde no Trabalho na Indústria da Construção, alterada pela Portaria MTE nº 836, de 13 de maio de 2026;
- NR-33 — Segurança e Saúde no Trabalho em Espaços Confinados;
- NR-35 — Trabalho em Altura, alterada pela Portaria MTE nº 1.259, de 15 de junho de 2026;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- eventos S-2210, S-2220, S-2221 e S-2240.

Regras, cargas horárias, periodicidades, documentos, critérios profissionais, prazos, tabelas e códigos deverão ser verificados novamente antes da implementação, homologação e produção.

---

## 3. Decisões complementares

### 3.1 A obra será um contexto de risco mutável

Uma obra não possuirá um único perfil de risco estático. O sistema deverá representar:

```text
Obra
  → fase executiva
    → frente de serviço
      → atividade
        → condição específica do dia ou período
```

Mudanças de fase, método, equipamento, proteção, equipe ou condição ambiental poderão exigir:

- revisão de perigo e risco;
- nova análise de risco;
- nova permissão de trabalho;
- alteração de grupo de exposição;
- novos EPIs ou EPCs;
- treinamento ou reciclagem;
- plano de emergência específico;
- bloqueio temporário da atividade.

### 3.2 PGR corporativo e PGR da obra serão relacionados, não confundidos

O sistema deverá permitir um PGR corporativo ou por estabelecimento e inventários específicos por obra, frente, atividade ou fase.

A herança de perigos e controles deverá manter a origem. A obra poderá complementar ou endurecer requisitos, mas não apagar o fundamento corporativo.

### 3.3 Terceiro não será convertido em empregado para acessar SST

Prestadores, subcontratados, autônomos e visitantes poderão possuir registros operacionais de SST sem criar vínculo trabalhista fictício.

O sistema deverá separar:

- pessoa;
- empresa contratada;
- contrato ou ordem de serviço;
- trabalhador próprio da contratada;
- documentos e habilitações fornecidos pela contratada;
- validação pela contratante;
- autorização de acesso ou atividade;
- responsabilidade pela evidência.

### 3.4 AR, APR, PT e PET serão objetos distintos

O módulo deverá suportar diferentes instrumentos de controle:

- análise de risco da atividade;
- análise preliminar de risco;
- permissão de trabalho;
- permissão de entrada e trabalho em espaço confinado;
- checklist de liberação;
- ordem de bloqueio ou interdição interna.

A nomenclatura e aplicabilidade serão configuradas por norma, política e atividade. Nenhum desses objetos substituirá o inventário de riscos, o treinamento, o ASO ou a habilitação.

### 3.5 Risco psicossocial será tratado como risco organizacional

O sistema não deverá converter avaliação psicossocial em diagnóstico individual ou ranking de saúde mental.

A gestão deverá considerar fatores relacionados ao trabalho, tais como:

- organização e conteúdo do trabalho;
- exigências incompatíveis com recursos e tempo;
- jornadas e pausas;
- comunicação e clareza de papéis;
- suporte da liderança;
- conflitos, violência, assédio e discriminação;
- isolamento;
- mudanças organizacionais;
- exposição a eventos traumáticos;
- autonomia e participação;
- reconhecimento e previsibilidade;
- condições de alojamento, deslocamento ou permanência quando relacionadas ao trabalho.

Resultados individuais de saúde não serão utilizados como substitutos da avaliação do ambiente e da organização do trabalho.

### 3.6 Emergência e resgate serão requisitos prévios

Atividade crítica poderá depender de plano de emergência ou resgate válido, equipe designada, meios disponíveis, comunicação testada e simulado realizado.

A existência de EPI ou treinamento não liberará uma atividade quando o resgate exigido estiver indisponível.

---

## 4. Fases e frentes de obra

### 4.1 Fase executiva

Exemplos configuráveis:

- implantação do canteiro;
- demolição;
- escavação e contenção;
- fundações;
- estrutura;
- alvenaria e vedação;
- cobertura;
- instalações;
- fachada;
- impermeabilização;
- acabamento;
- comissionamento;
- desmobilização.

### 4.2 Frente de serviço

Campos mínimos:

- obra;
- fase;
- área ou localização;
- responsável;
- datas previstas e reais;
- método executivo;
- equipe própria e terceiros;
- equipamentos principais;
- riscos herdados;
- riscos específicos;
- EPCs;
- atividades críticas;
- plano de emergência aplicável;
- estado de liberação.

### 4.3 Estados

```text
PLANEJADA
  → EM_AVALIACAO
  → LIBERADA_COM_REQUISITOS
  → ATIVA
  → SUSPENSA
  → BLOQUEADA
  → ENCERRADA
```

A ativação dependerá das validações classificadas como impeditivas.

---

## 5. Matriz de atividades críticas

O sistema deverá permitir cadastrar e versionar requisitos para atividades como:

- trabalho em altura;
- montagem, alteração e desmontagem de andaimes;
- uso de escadas como acesso ou posto de trabalho;
- acesso por corda;
- espaços confinados;
- serviços em instalações elétricas;
- operação de máquinas e equipamentos;
- movimentação e içamento de cargas;
- escavações e valas;
- demolição;
- trabalho a quente;
- impermeabilização com produtos perigosos;
- aplicação de produtos químicos;
- trabalho próximo a bordas, aberturas ou redes energizadas;
- operação em áreas com tráfego de veículos e equipamentos móveis;
- atividades definidas pela análise de risco da obra.

Cada regra poderá exigir:

- treinamento e reciclagem;
- qualificação profissional;
- autorização formal;
- ASO compatível;
- avaliação de aptidão específica;
- EPI e EPC;
- inspeção de equipamento;
- análise de risco;
- permissão de trabalho;
- supervisão;
- vigia ou observador;
- plano de emergência e resgate;
- condição climática ou ambiental aceitável;
- comunicação e isolamento;
- documentos da empresa contratada.

---

## 6. Trabalho em altura

### 6.1 Caso operacional

O caso de trabalho em altura deverá registrar:

- atividade e local;
- data e janela de execução;
- equipe;
- responsável e supervisor;
- análise de risco;
- método de acesso;
- sistema de proteção contra quedas;
- pontos de ancoragem ou estrutura aplicável;
- inspeções;
- condições meteorológicas;
- isolamento da área inferior;
- ferramentas e materiais;
- plano de emergência e resgate;
- habilitações verificadas;
- permissão quando exigida;
- suspensão, interrupção e encerramento.

### 6.2 Regras

- alteração relevante da condição exigirá reavaliação;
- trabalhador sem habilitação válida não será incluído na equipe autorizada;
- sistema de proteção reprovado bloqueará a atividade;
- plano de resgate indisponível bloqueará a liberação quando exigido;
- suspensão por clima ou mudança de cenário preservará o histórico;
- retomada exigirá nova confirmação das condições.

---

## 7. Espaços confinados

### 7.1 Cadastro do espaço

- obra e localização;
- identificação estável;
- características de acesso;
- perigos conhecidos;
- possibilidade de atmosfera perigosa;
- energias e materiais presentes;
- isolamento e bloqueio;
- ventilação;
- monitoramento;
- resgate;
- responsáveis;
- vigência e estado.

### 7.2 Permissão de Entrada e Trabalho

A PET deverá registrar:

- espaço;
- atividade;
- data e validade;
- supervisor de entrada;
- vigia;
- trabalhadores autorizados;
- resultados das avaliações atmosféricas;
- instrumentos e calibração;
- isolamentos;
- ventilação;
- comunicação;
- EPIs e equipamentos;
- plano e equipe de resgate;
- condições de entrada;
- suspensões;
- encerramento;
- assinaturas e evidências.

A PET não poderá ser reutilizada fora da sua validade ou para condição diferente da aprovada.

---

## 8. Energia, máquinas e bloqueios

O módulo deverá suportar procedimentos de bloqueio, etiquetagem e impedimento de energização, sem presumir um único padrão técnico.

Campos previstos:

- fonte de energia;
- equipamento ou circuito;
- atividade;
- responsáveis;
- pontos de isolamento;
- dispositivos aplicados;
- teste de ausência ou condição segura;
- trabalhadores protegidos;
- transferência de turno;
- liberação;
- remoção excepcional;
- evidências.

A liberação operacional deverá verificar qualificação, autorização, treinamento, condição do equipamento e procedimento aplicável.

---

## 9. Içamento, escavação, demolição e proteções coletivas

### 9.1 Içamento e movimentação

- plano ou procedimento;
- carga;
- peso e centro de gravidade quando aplicável;
- equipamento;
- acessórios;
- inspeções;
- operador e sinaleiro;
- raio de operação;
- isolamento;
- interferências;
- condição climática;
- comunicação;
- autorização.

### 9.2 Escavação e contenção

- localização e geometria;
- interferências;
- redes existentes;
- método de contenção;
- acesso e saída;
- estabilidade;
- inspeções;
- água e atmosfera;
- equipamentos próximos;
- isolamento;
- liberação e bloqueio.

### 9.3 Demolição

- plano;
- sequência;
- estabilidade;
- desligamento de utilidades;
- isolamento;
- poeiras e materiais perigosos;
- equipamentos;
- destinação de resíduos;
- responsáveis e liberações.

### 9.4 EPC

Proteções coletivas deverão possuir:

- tipo;
- local;
- risco controlado;
- projeto ou especificação;
- instalação;
- inspeção;
- manutenção;
- alteração;
- retirada autorizada;
- responsável;
- evidências.

Retirada temporária de EPC exigirá controle compensatório e autorização.

---

## 10. Gestão de terceiros

### 10.1 Empresa contratada

- dados cadastrais;
- contrato relacionado;
- escopo;
- obras autorizadas;
- responsáveis de SST;
- documentos corporativos;
- validade;
- avaliação e bloqueios.

### 10.2 Trabalhador terceiro

- pessoa;
- empresa de origem;
- função e atividade;
- período de mobilização;
- documentos;
- ASO ou evidência operacional permitida;
- treinamentos;
- certificados;
- EPIs sob responsabilidade definida;
- habilitações;
- acesso às obras;
- desmobilização.

### 10.3 Regras

- documento declarado pela contratada terá origem e responsável;
- validação pela contratante será evento separado;
- certificado rejeitado não será considerado válido;
- vencimento poderá bloquear acesso ou atividade;
- transferência entre contratadas não reutilizará autorização sem nova validação;
- dados clínicos do terceiro não serão copiados sem necessidade e base autorizada;
- responsabilidade contratual não será inferida apenas pela posse do documento.

---

## 11. Fatores de riscos psicossociais

### 11.1 Unidade de avaliação

A avaliação deverá priorizar:

- organização;
- estabelecimento;
- obra;
- setor;
- equipe;
- processo;
- atividade;
- grupo de exposição;
- período.

O sistema não produzirá pontuação individual de “risco psicológico” para decisão de emprego.

### 11.2 Fontes de evidência

- observação do trabalho;
- entrevistas técnicas;
- grupos de discussão;
- participação dos trabalhadores;
- indicadores agregados de jornada, pausas e horas extras;
- rotatividade e absenteísmo agregados;
- relatos de assédio, violência ou conflito em canal protegido;
- mudanças organizacionais;
- incidentes e eventos traumáticos;
- instrumentos tecnicamente aprovados;
- relatórios ocupacionais agregados.

### 11.3 Proteções

- anonimização ou agregação quando aplicável;
- tamanho mínimo de grupo para relatório;
- proibição de ranking individual;
- separação entre denúncia, avaliação de risco e prontuário;
- acesso restrito a relatos sensíveis;
- não utilização de diagnóstico como medida de exposição organizacional;
- registro da metodologia e limitações;
- participação e comunicação dos resultados no nível adequado.

### 11.4 Plano de ação

As medidas poderão tratar:

- dimensionamento e recursos;
- organização de turnos e pausas;
- clareza de responsabilidades;
- treinamento de liderança;
- prevenção de assédio e violência;
- canais de apoio e reporte;
- melhoria da comunicação;
- participação dos trabalhadores;
- redesenho de processos;
- acompanhamento de mudanças;
- resposta a eventos traumáticos.

Medidas exclusivamente individuais não encerrarão risco cuja origem permaneça na organização do trabalho.

---

## 12. Participação dos trabalhadores, CIPA e governança

O sistema deverá permitir:

- registro de representantes e mandatos;
- reuniões e pautas;
- inspeções participativas;
- sugestões e relatos;
- planos de ação;
- responsáveis e prazos;
- comunicação de resultados;
- evidências de consulta e participação;
- histórico de decisões.

A existência de registro de reunião não comprovará a execução da ação correspondente.

Papéis de SESMT, CIPA, responsáveis de obra e prestadores deverão permanecer configuráveis e separados das permissões de sistema.

---

## 13. Emergência, resgate e simulados

### 13.1 Plano

- contexto e atividade;
- cenários de emergência;
- cadeia de comunicação;
- recursos internos e externos;
- equipe e funções;
- rotas e pontos de encontro;
- equipamentos;
- atendimento inicial;
- resgate específico;
- contatos;
- vigência;
- aprovação;
- distribuição e ciência.

### 13.2 Simulado

- cenário;
- data;
- participantes;
- observadores;
- tempos de resposta;
- falhas;
- evidências;
- lições aprendidas;
- ações corretivas;
- repetição necessária.

### 13.3 Prontidão

A prontidão poderá considerar:

- equipe disponível;
- treinamento válido;
- equipamento inspecionado;
- comunicação testada;
- acesso desobstruído;
- serviço externo confirmado;
- condições ambientais.

Atividade crítica será bloqueada quando a política exigir prontidão e ela não estiver confirmada.

---

## 14. Inspeção, embargo interno e liberação

Uma inspeção poderá gerar:

- observação;
- não conformidade;
- ação corretiva;
- bloqueio de equipamento;
- suspensão de frente;
- impedimento de trabalhador;
- interdição interna preventiva;
- escalonamento;
- nova avaliação de risco.

### Estados da não conformidade

```text
ABERTA
  → CONTIDA
  → EM_TRATAMENTO
  → AGUARDANDO_EVIDENCIA
  → EM_VALIDACAO
  → ENCERRADA
```

Estados alternativos:

```text
REABERTA
CANCELADA_COM_JUSTIFICATIVA
ESCALONADA
```

A liberação exigirá evidência, responsável e aprovador compatíveis com a criticidade.

---

## 15. Eventos externos e documentos históricos

Além dos eventos previstos no documento principal, o módulo deverá suportar:

- S-2221 quando aplicável ao trabalhador e à regra vigente;
- correlação entre S-2210, S-2220, S-2230 e S-2240;
- documentos e relatórios históricos necessários ao perfil de exposição;
- geração futura de PPP ou relatório equivalente a partir das mesmas fontes versionadas;
- registros de responsável ambiental e médico conforme leiaute vigente.

A geração de documento histórico não recalculará silenciosamente a exposição usando regras atuais. O sistema deverá utilizar as versões vigentes no período consultado.

---

## 16. Rotas complementares previstas

```text
/app/rh/sst/obras
/app/rh/sst/obras/[id]/fases
/app/rh/sst/obras/[id]/frentes
/app/rh/sst/atividades-criticas
/app/rh/sst/analises-de-risco
/app/rh/sst/permissoes
/app/rh/sst/permissoes/altura
/app/rh/sst/permissoes/espaco-confinado
/app/rh/sst/bloqueios
/app/rh/sst/terceiros
/app/rh/sst/psicossociais
/app/rh/sst/emergencias
/app/rh/sst/simulados
/app/rh/sst/cipa
/app/rh/sst/inspecoes
```

---

## 17. Requisitos funcionais complementares

**RH-M08-FR-081.** Versionar riscos e controles por fase e frente de obra.  
**RH-M08-FR-082.** Reavaliar requisitos quando a fase, método, equipamento ou condição mudar.  
**RH-M08-FR-083.** Manter PGR corporativo relacionado a inventários específicos de obra.  
**RH-M08-FR-084.** Cadastrar matriz de atividades críticas e requisitos compostos.  
**RH-M08-FR-085.** Criar análise de risco vinculada à atividade e condição real.  
**RH-M08-FR-086.** Criar permissões de trabalho e PET com validade e escopo limitados.  
**RH-M08-FR-087.** Controlar trabalho em altura, proteção contra quedas e prontidão de resgate.  
**RH-M08-FR-088.** Controlar espaços confinados, avaliações atmosféricas, vigia e resgate.  
**RH-M08-FR-089.** Registrar bloqueios e liberações de energia, máquinas e equipamentos.  
**RH-M08-FR-090.** Controlar planos e liberações para içamento, escavação e demolição.  
**RH-M08-FR-091.** Cadastrar, inspecionar e controlar retirada de EPC.  
**RH-M08-FR-092.** Gerenciar empresas contratadas e trabalhadores terceiros sem criar vínculo fictício.  
**RH-M08-FR-093.** Validar documentos e habilitações fornecidos por contratadas.  
**RH-M08-FR-094.** Avaliar fatores psicossociais por contexto e grupo, sem perfilamento clínico individual.  
**RH-M08-FR-095.** Proteger anonimato, agregação e acesso a evidências psicossociais.  
**RH-M08-FR-096.** Registrar participação dos trabalhadores e decisões de governança.  
**RH-M08-FR-097.** Cadastrar planos de emergência e resgate por cenário.  
**RH-M08-FR-098.** Registrar simulados, tempos de resposta e ações corretivas.  
**RH-M08-FR-099.** Suspender frente, equipamento ou atividade por não conformidade impeditiva.  
**RH-M08-FR-100.** Gerar histórico de exposição e documentos futuros usando regras vigentes no período.

---

## 18. Regras de negócio complementares

**RH-M08-BR-046.** Obra não possuirá perfil de risco único e permanente.  
**RH-M08-BR-047.** Mudança relevante de condição invalida a permissão dependente dessa condição.  
**RH-M08-BR-048.** Terceiro não será convertido em empregado para fins de SST.  
**RH-M08-BR-049.** Documento da contratada e validação da contratante são eventos distintos.  
**RH-M08-BR-050.** PET não será reutilizada fora da validade ou do cenário aprovado.  
**RH-M08-BR-051.** Trabalho em altura será bloqueado quando sistema de proteção ou resgate exigido estiver indisponível.  
**RH-M08-BR-052.** Retirada de EPC exige autorização e medida compensatória.  
**RH-M08-BR-053.** Bloqueio de energia não será encerrado sem procedimento de liberação.  
**RH-M08-BR-054.** Certificação de operador não substitui inspeção do equipamento.  
**RH-M08-BR-055.** Avaliação psicossocial não produzirá ranking individual de saúde.  
**RH-M08-BR-056.** Diagnóstico individual não substituirá avaliação da organização do trabalho.  
**RH-M08-BR-057.** Relatório de grupo respeitará o limite mínimo de anonimização configurado.  
**RH-M08-BR-058.** Plano de emergência vencido ou impraticável bloqueará atividade quando impeditivo.  
**RH-M08-BR-059.** Liberação de não conformidade crítica exige evidência e aprovador autorizado.  
**RH-M08-BR-060.** Documento histórico utilizará versões vigentes no período, não apenas a configuração atual.

---

## 19. Critérios de aceite complementares

41. uma mudança de fase da obra pode gerar nova avaliação sem apagar a anterior;
42. a frente não é liberada quando requisito impeditivo está pendente;
43. trabalhador terceiro pode ser habilitado sem receber vínculo de empregado;
44. certificado fornecido pela contratada permanece pendente até validação;
45. PET expirada não permite nova entrada;
46. mudança da atmosfera suspende a PET e preserva os registros anteriores;
47. trabalho em altura não é liberado quando o resgate exigido está indisponível;
48. retirada de proteção coletiva gera bloqueio ou medida compensatória aprovada;
49. bloqueio de energia mantém responsáveis, dispositivos e liberação rastreáveis;
50. avaliação psicossocial não exibe ranking individual;
51. relatório agregado não é emitido abaixo do limite de anonimização;
52. denúncia sensível não aparece no painel operacional da obra;
53. simulado gera ações corretivas sem alterar o registro original;
54. não conformidade crítica encerrada sem evidência é rejeitada;
55. relatório histórico de exposição reproduz a regra vigente na data consultada.

---

## 20. Testes complementares

### Unitários

- expiração de PT e PET;
- invalidação por mudança de condição;
- cálculo de prontidão de resgate;
- limite de anonimização;
- bloqueio por EPC retirado;
- validação de documento de terceiro;
- reconstrução histórica por vigência.

### Integração

- obra, fase, frente e inventário;
- terceiro, contratada e habilitação;
- atividade crítica, ASO, treinamento, EPI e permissão;
- incidente, emergência e plano corretivo;
- exposição histórica e evento externo.

### Segurança

- gestor sem acesso a relato psicossocial individual;
- contratada isolada de outra contratada;
- terceiro sem acesso a prontuário;
- exportação de dados sensíveis auditada;
- relatório agregado bloqueado abaixo do limite definido.

### Ponta a ponta

- mobilização de contratada em nova obra;
- liberação de trabalho em altura com resgate;
- entrada e encerramento de espaço confinado;
- suspensão de frente por EPC removido;
- avaliação psicossocial com plano organizacional;
- emergência, simulado, falha e ação corretiva.

---

## 21. Estado honesto

Este anexo é especificação funcional.

Não foram implementados:

- matriz de atividades críticas;
- análise de risco;
- PT ou PET;
- bloqueios de energia;
- planos de içamento, escavação ou demolição;
- gestão de terceiros;
- avaliação psicossocial;
- planos de emergência e resgate;
- simulados;
- bloqueio de frentes;
- documentos históricos de exposição;
- integrações ou testes de produção.

A implementação dependerá de revisão por profissionais legalmente habilitados, responsáveis de SST, medicina ocupacional, jurídico, privacidade, engenharia de obra e integração com o eSocial.