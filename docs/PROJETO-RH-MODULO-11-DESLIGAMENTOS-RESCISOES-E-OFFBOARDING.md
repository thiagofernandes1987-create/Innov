# Projeto RH — Módulo 11 — Desligamentos, Rescisões, Avisos, Verbas, Homologações e Offboarding

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR relacionada:** `PROJETO-RH-ADR-011-DESLIGAMENTO-CASO-RESCISAO-E-OFFBOARDING.md`  

---

## 1. Objetivo

Especificar o domínio responsável por planejar, validar, calcular, documentar, pagar, declarar e concluir o encerramento de relações de trabalho e prestações sem vínculo, preservando integralmente:

- fundamento;
- temporalidade;
- aprovações;
- memória de cálculo;
- documentos;
- pagamentos;
- recolhimentos;
- eventos externos;
- devolução de bens;
- revogação de acessos;
- pendências posteriores;
- correções e reintegrações.

O módulo deverá impedir que um único comando de desligamento altere silenciosamente contratos, folha, ponto, benefícios, SST, obras, acessos e obrigações digitais.

---

## 2. Princípio funcional

```text
Intenção ou gatilho
  → caso auditável
    → análise de fundamento e proteções
      → aprovação
        → aviso e projeção
          → término confirmado
            → cálculo rescisório
              → documentos e pagamento
                → obrigações externas
                  → offboarding
                    → conclusão
```

O encerramento somente será considerado completo quando as pendências obrigatórias aplicáveis estiverem resolvidas ou formalmente excepcionadas.

---

## 3. Escopo

### Incluído

- solicitações de desligamento;
- pedido de demissão;
- dispensa sem justa causa;
- dispensa por justa causa;
- extinção por acordo;
- rescisão indireta reconhecida ou determinada;
- término de contrato a prazo;
- término antecipado;
- falecimento;
- transferência entre declarantes;
- término de trabalhador sem vínculo;
- desligamentos individuais e coletivos;
- programas de desligamento;
- aviso prévio;
- cálculo rescisório;
- verbas e descontos;
- documentos e assinaturas;
- pagamento e retorno bancário;
- FGTS rescisório e indenização compensatória;
- seguro-desemprego quando aplicável;
- eventos S-2299 e S-2399;
- correções, retificações e exclusões;
- reintegração e reversão;
- offboarding de acessos, bens, EPIs e responsabilidades;
- relatórios, alertas e auditoria.

### Fora do escopo deste módulo

- decisão jurídica autônoma;
- investigação criminal;
- processo disciplinar completo anterior à decisão;
- cálculo de processo trabalhista, salvo integração;
- conciliação judicial;
- gestão completa de litígios;
- execução bancária real nesta fase;
- transmissão real aos sistemas externos;
- exclusão física de históricos;
- decisão automática de justa causa;
- substituição de consultoria jurídica, contábil ou trabalhista.

---

## 4. Atores

- trabalhador;
- gestor solicitante;
- responsável de RH;
- Departamento Pessoal;
- Jurídico;
- responsável de folha;
- Financeiro;
- Contabilidade;
- Segurança da Informação;
- responsável patrimonial;
- responsável de SST;
- gestor de obra;
- auditor;
- administrador de integrações;
- serviço de automação;
- representante sindical ou assistente autorizado;
- prestador externo autorizado.

Nenhum perfil terá acesso irrestrito por pertencer genericamente ao RH.

---

## 5. Rotas previstas

```text
/app/departamento-pessoal/desligamentos
/app/departamento-pessoal/desligamentos/novo
/app/departamento-pessoal/desligamentos/[caseId]
/app/departamento-pessoal/desligamentos/[caseId]/aviso
/app/departamento-pessoal/desligamentos/[caseId]/calculo
/app/departamento-pessoal/desligamentos/[caseId]/documentos
/app/departamento-pessoal/desligamentos/[caseId]/pagamentos
/app/departamento-pessoal/desligamentos/[caseId]/obrigacoes
/app/departamento-pessoal/desligamentos/[caseId]/offboarding
/app/departamento-pessoal/desligamentos/coletivos
/app/departamento-pessoal/desligamentos/programas
/app/departamento-pessoal/desligamentos/pendencias
/app/departamento-pessoal/desligamentos/reintegracoes
/app/departamento-pessoal/desligamentos/relatorios
/app/configuracoes/rh/desligamentos
/app/portal/trabalhador/desligamento
```

Rotas sensíveis deverão aplicar autorização no servidor e no banco.

---

## 6. Conceitos canônicos

### 6.1 Caso de desligamento

Coordena o processo e suas pendências.

### 6.2 Motivo

Classificação interna, jurídica e externa, mantidas separadamente.

### 6.3 Aviso prévio

Comunicação e período projetado antes do término.

### 6.4 Ocorrência de término

Fato temporal que encerra ou transforma a relação.

### 6.5 Execução rescisória

Resultado imutável do motor de cálculo.

### 6.6 Documento rescisório

Representação ou evidência do processo.

### 6.7 Pagamento

Movimento financeiro efetivo, diferente do valor devido.

### 6.8 Obrigação externa

Projeção e transmissão para sistema governamental.

### 6.9 Offboarding

Encerramento operacional de acessos, ativos e responsabilidades.

### 6.10 Reintegração

Novo fato que reconstrói a continuidade do vínculo sem apagar o desligamento anterior.

---

## 7. Estados

### 7.1 Caso de desligamento

```text
RASCUNHO
SOLICITADO
EM_TRIAGEM
EM_ANALISE
PENDENTE_EVIDENCIA
PENDENTE_APROVACAO
APROVADO
AVISO_ATIVO
TERMINO_PROGRAMADO
TERMINO_CONFIRMADO
CALCULO_EM_PREPARACAO
CALCULO_PENDENTE_CONFERENCIA
CALCULO_APROVADO
DOCUMENTOS_PENDENTES
PAGAMENTO_PENDENTE
OBRIGACOES_EXTERNAS_PENDENTES
OFFBOARDING_PENDENTE
CONCLUIDO
CANCELADO
REABERTO
EM_DISPUTA
```

### 7.2 Aviso

```text
NAO_APLICAVEL
RASCUNHO
EMITIDO
CIENCIA_PENDENTE
ATIVO
ALTERADO
RECONSIDERACAO_PROPOSTA
RECONSIDERADO
CUMPRIDO
INTERROMPIDO
CANCELADO
```

### 7.3 Cálculo

```text
NAO_INICIADO
COLETANDO_ENTRADAS
VALIDANDO
CALCULADO
COM_DIVERGENCIA
PENDENTE_APROVACAO
APROVADO
SUPERADO
CANCELADO
```

### 7.4 Pagamento

```text
NAO_GERADO
PREPARADO
APROVADO
ENVIADO_AO_BANCO
PROCESSANDO
PAGO
PARCIAL
REJEITADO
DEVOLVIDO
ESTORNADO
CANCELADO
```

### 7.5 Offboarding

```text
NAO_INICIADO
PLANEJADO
EM_EXECUCAO
COM_PENDENCIAS
CONCLUIDO
REABERTO
CANCELADO
```

---

## 8. Entidades propostas

- `termination_cases`;
- `termination_case_versions`;
- `termination_reason_catalog`;
- `termination_reason_versions`;
- `termination_reason_mappings`;
- `termination_requests`;
- `termination_approvals`;
- `termination_protection_checks`;
- `termination_evidence`;
- `notice_periods`;
- `notice_period_versions`;
- `termination_occurrences`;
- `termination_calculation_runs`;
- `termination_calculation_items`;
- `termination_adjustments`;
- `termination_documents`;
- `termination_signatures`;
- `termination_payment_orders`;
- `termination_payments`;
- `termination_fgts_items`;
- `termination_unemployment_items`;
- `termination_external_events`;
- `offboarding_cases`;
- `offboarding_checklist_templates`;
- `offboarding_checklist_items`;
- `offboarding_asset_returns`;
- `offboarding_access_revocations`;
- `offboarding_responsibility_transfers`;
- `collective_termination_cases`;
- `collective_termination_participants`;
- `reinstatement_cases`;
- `termination_audit_events`.

Os nomes são conceituais. A implementação dependerá de análise do schema real.

---

## 9. Catálogo de motivos e políticas

Cada motivo possuirá:

- código interno estável;
- descrição administrativa;
- fundamento jurídico referencial;
- iniciativa;
- regime aplicável;
- contrato aplicável;
- necessidade de aviso;
- política de cálculo;
- documentos obrigatórios;
- aprovações;
- verificações impeditivas;
- mapeamento eSocial;
- efeitos esperados em FGTS;
- elegibilidade potencial a seguro-desemprego;
- exigência de análise jurídica;
- vigência;
- fonte;
- versão.

A existência de um mapeamento não comprovará que o motivo é juridicamente correto para o caso concreto.

---

## 10. Abertura do caso

O caso poderá ser iniciado por:

- gestor;
- RH;
- trabalhador pelo portal;
- término programado de contrato;
- falecimento comunicado;
- decisão judicial;
- integração autorizada;
- lote coletivo;
- alerta de contrato a termo;
- conversão de processo disciplinar aprovado;
- solicitação de transferência entre declarantes.

A abertura exigirá vínculo identificado. Casos sem vínculo somente serão permitidos para trabalhador sem vínculo ou regularização autorizada.

O sistema detectará duplicidade de caso aberto para o mesmo vínculo e período.

---

## 11. Verificações prévias

Antes da aprovação, o sistema deverá verificar:

- vínculo e contrato vigentes;
- afastamentos;
- férias programadas ou em curso;
- aviso prévio existente;
- estabilidade ou proteção cadastrada;
- gravidez conhecida em fluxo autorizado;
- acidente e benefício relacionado;
- mandato sindical ou de CIPA;
- instrumentos coletivos;
- contrato suspenso;
- ordem judicial;
- folha fechada ou em cálculo;
- ponto não fechado;
- benefícios ativos;
- pensões e retenções;
- empréstimos e consignações;
- bens e acessos;
- exposição de SST;
- treinamentos e permissões;
- responsabilidades em obras;
- procurações;
- pagamentos ou adiantamentos pendentes;
- processo disciplinar relacionado;
- risco de dispensa discriminatória;
- requisitos de cota ou substituição, quando aplicável.

Cada verificação registrará regra, resultado, data, responsável e evidência.

---

## 12. Aprovações

A matriz poderá depender de:

- motivo;
- cargo;
- remuneração;
- risco jurídico;
- estabilidade;
- justa causa;
- dispensa coletiva;
- obra ou contrato estratégico;
- empresa;
- centro de custo;
- valor estimado;
- existência de disputa;
- decisão judicial.

Aprovadores possíveis:

- gestor superior;
- RH;
- Departamento Pessoal;
- Jurídico;
- diretoria;
- Financeiro;
- responsável de compliance.

Solicitante não poderá aprovar sozinho o próprio pedido quando a política exigir segregação.

---

## 13. Aviso prévio

O módulo deverá suportar:

- aviso concedido pelo empregador;
- aviso dado pelo trabalhador;
- trabalhado;
- indenizado;
- misto;
- não aplicável;
- redução diária;
- dispensa dos últimos dias;
- projeção proporcional;
- ausência e ocorrências durante o aviso;
- afastamento durante o aviso;
- mudança de modalidade;
- reconsideração;
- recusa da reconsideração;
- conversão por fato superveniente;
- integração com jornada e ponto.

A duração será calculada por política versionada e não fixada em uma constante global.

---

## 14. Pedido de demissão

O portal poderá permitir ao trabalhador:

- manifestar intenção;
- informar data desejada;
- declarar ciência;
- anexar documento;
- solicitar dispensa de cumprimento;
- acompanhar análise;
- receber decisão;
- acessar documentos finais.

O pedido digital não será aplicado sem validação de identidade, manifestação inequívoca e conferência do RH.

Solicitação cancelada permanecerá no histórico.

---

## 15. Extinção por acordo

O fluxo deverá registrar:

- proposta;
- parte proponente;
- negociação permitida;
- manifestação livre;
- documento;
- aprovações;
- verbas e efeitos conforme regra vigente;
- restrições de seguro-desemprego;
- ciência das partes;
- cálculo específico;
- ausência de coerção.

O sistema não sugerirá acordo como forma de reduzir direitos.

---

## 16. Justa causa

Além dos controles da ADR-011, o módulo deverá:

- restringir o motivo a perfis autorizados;
- exigir evidência mínima configurável;
- permitir parecer jurídico;
- controlar prazo e imediatidade;
- registrar medidas anteriores sem expor dados indevidos;
- impedir alteração retroativa sem reabertura;
- exigir aprovação especial;
- manter versões da decisão;
- registrar reversão administrativa ou judicial;
- preservar documentos originais.

O sistema não classificará automaticamente conduta como justa causa.

---

## 17. Contrato por prazo determinado

O sistema deverá distinguir:

- término normal;
- término antecipado pelo empregador;
- término antecipado pelo trabalhador;
- cláusula assecuratória;
- experiência;
- contrato temporário ou especial;
- prorrogação;
- conversão para prazo indeterminado;
- data originalmente pactuada;
- última versão contratual.

Alertas serão gerados antes do vencimento. O alerta não encerrará o contrato automaticamente.

---

## 18. Falecimento

O fluxo deverá:

- proteger documentos sensíveis;
- registrar fonte da informação;
- validar a ocorrência;
- identificar data aplicável;
- impedir comunicação inadequada ao trabalhador;
- controlar representantes e dependentes autorizados;
- calcular valores conforme política;
- orientar documentos e pagamentos sem decidir sucessão;
- encerrar acessos com prioridade;
- manter auditoria reforçada.

---

## 19. Desligamento coletivo e programas

O sistema deverá permitir:

- caso coletivo;
- motivação e população-alvo;
- critérios de seleção;
- análise de impacto;
- documentos coletivos;
- aprovações especiais;
- comunicação;
- cronograma;
- simulação financeira;
- participantes individuais;
- exceções;
- monitoramento de risco discriminatório;
- acompanhamento de offboarding em massa.

Cada participante terá caso individual e cálculo próprio.

---

## 20. Cálculo rescisório

O cálculo consumirá dados aprovados dos módulos anteriores:

- versão do vínculo e contrato;
- remuneração;
- jornada e ponto;
- banco de horas;
- férias;
- afastamentos;
- benefícios;
- dependentes;
- pensões;
- descontos e consignações;
- produção e variáveis;
- SST quando houver reflexo autorizado;
- ordens judiciais;
- parâmetros legais e coletivos.

Saídas previstas:

- saldo de salário;
- aviso;
- décimo terceiro;
- férias;
- adicionais;
- médias;
- indenizações;
- descontos;
- bases;
- incidências;
- encargos;
- líquido;
- FGTS;
- indenização compensatória;
- memória de cálculo.

Toda linha referenciará fatos, fórmulas, parâmetros e arredondamentos utilizados.

---

## 21. Conferência do cálculo

A tela deverá exibir:

- versão do cálculo;
- diferenças para simulação anterior;
- entradas faltantes;
- valores fora de faixa;
- rubricas manuais;
- bases negativas ou inconsistentes;
- médias incompletas;
- saldo de férias divergente;
- banco de horas pendente;
- descontos limitados;
- compensações;
- impactos de aviso;
- FGTS esperado;
- valor líquido;
- aprovadores.

Novo cálculo invalidará aprovação anterior.

---

## 22. Ajustes manuais

Ajuste exigirá:

- rubrica autorizada;
- valor ou fórmula;
- justificativa;
- evidência;
- usuário;
- data;
- aprovação;
- impacto em bases;
- impacto externo;
- vínculo com a execução substituída.

Não será permitido editar diretamente uma linha automática aprovada.

---

## 23. Documentos e assinatura

O sistema deverá produzir modelos versionados e preencher dados a partir das fontes estruturadas.

Recursos:

- geração de documento;
- visualização de diferenças;
- assinatura eletrônica;
- coleta presencial registrada;
- recusa de assinatura;
- testemunhas quando aplicável;
- entrega e ciência;
- hash;
- versão;
- substituição sem exclusão;
- exportação controlada.

A ausência de assinatura não apagará o fato ou o pagamento; gerará pendência e tratamento próprio.

---

## 24. Pagamento rescisório

O fluxo financeiro deverá:

- criar ordem a partir do cálculo aprovado;
- impedir edição do valor sem nova aprovação;
- validar dados bancários vigentes;
- permitir meio alternativo autorizado;
- gerar arquivo ou integração bancária;
- registrar retorno;
- conciliar valor, favorecido e data;
- tratar rejeição;
- permitir pagamento parcial apenas com permissão;
- registrar complemento;
- tratar estorno;
- anexar comprovante;
- integrar com Contabilidade e Financeiro.

Pagamento aprovado não será marcado como pago antes de confirmação.

---

## 25. FGTS rescisório

O módulo deverá preparar e reconciliar:

- bases do período de desligamento;
- remunerações para fins rescisórios;
- indenização compensatória;
- histórico de remunerações;
- valores mensais antecipados por prazo rescisório;
- débitos individualizados;
- guias;
- pagamentos;
- diferenças;
- estornos e restituições;
- processos trabalhistas quando integrados.

As regras serão mantidas por vigência. A memória interna não será substituída pelo cálculo exibido no portal externo.

---

## 26. Seguro-desemprego

Quando potencialmente aplicável, o sistema deverá:

- avaliar pré-requisitos configurados;
- sinalizar que elegibilidade final é externa;
- preparar dados;
- registrar requerimento ou comunicação;
- entregar orientação e comprovante;
- impedir geração em motivos incompatíveis;
- registrar correção;
- não armazenar decisão como direito garantido antes do processamento oficial.

---

## 27. Eventos do eSocial

### S-2299

O evento será projetado a partir de:

- vínculo;
- motivo externo;
- datas;
- aviso;
- verbas rescisórias;
- demonstrativos;
- processos;
- sucessor quando aplicável;
- pensões e informações exigidas;
- versão do leiaute.

### S-2399

Aplicado ao término de trabalhador sem vínculo conforme categoria e regra vigente.

### Integrações correlatas

- S-1210 para pagamento;
- S-2298 para reintegração;
- S-3000 para exclusão quando permitida;
- S-1200 para fatos posteriores ou situações previstas;
- S-1298 quando houver necessidade de reabertura;
- totalizadores relacionados.

Evento aceito não concluirá o caso sem reconciliação.

---

## 28. CTPS Digital e baixa contratual

O módulo deverá:

- registrar a comunicação externa;
- manter recibo;
- comparar data e motivo;
- sinalizar divergência;
- preservar a data interna aprovada;
- impedir alteração silenciosa do vínculo para acompanhar retorno incorreto;
- gerar plano de correção.

---

## 29. Offboarding de acessos

O plano poderá incluir:

- identidade corporativa;
- e-mail;
- ERP;
- repositórios;
- bancos de dados;
- VPN;
- sistemas de clientes;
- acesso físico;
- canteiros de obras;
- alarmes;
- cartões;
- certificados;
- tokens;
- chaves de API;
- procurações;
- dispositivos autenticadores.

A revogação poderá ser:

- imediata;
- na data do aviso;
- no último dia trabalhado;
- na data do término;
- após transferência de responsabilidade;
- manualmente aprovada.

Credencial secreta nunca será incluída em checklist ou log.

---

## 30. Devolução de ativos e EPIs

Itens:

- notebook;
- telefone;
- ferramentas;
- máquinas;
- veículo;
- cartões;
- chaves;
- uniforme;
- EPI;
- documentos;
- materiais;
- adiantamentos;
- estoque sob responsabilidade.

Cada item terá:

- origem patrimonial;
- responsável;
- prazo;
- condição;
- devolução;
- inspeção;
- aceite;
- pendência;
- evidência;
- tratamento financeiro autorizado.

Desconto não será gerado automaticamente pela ausência de devolução.

---

## 31. Transferência de responsabilidades

O checklist poderá exigir:

- tarefas abertas;
- contratos;
- medições;
- projetos;
- aprovações pendentes;
- documentos;
- senhas institucionais em cofre, nunca compartilhadas em texto;
- contatos;
- agenda;
- estoque;
- caixa ou valores;
- procurações;
- equipes;
- Diário de Obras;
- comunicação ao substituto.

A conclusão será confirmada pelo recebedor e responsável.

---

## 32. Benefícios e dependências

O módulo deverá gerar instruções versionadas para:

- plano de saúde;
- odontologia;
- seguro;
- alimentação;
- transporte;
- previdência;
- empréstimos;
- consignações;
- pensões;
- auxílios;
- dependentes cobertos;
- continuidade ou portabilidade quando aplicável.

Cancelamento no fornecedor não será presumido pelo fechamento do caso.

---

## 33. Obras e equipes

Integrações:

- remover alocação futura;
- preservar histórico;
- transferir responsabilidades;
- fechar permissões de trabalho;
- tratar EPI;
- retirar acesso à obra;
- revisar escalas;
- notificar responsáveis;
- manter registros do Diário de Obras;
- atualizar planejamento de mão de obra.

Remover trabalhador da equipe não encerrará vínculo.

---

## 34. Portal do trabalhador

O trabalhador poderá, conforme permissão:

- acompanhar o caso em estados apropriados;
- consultar aviso;
- confirmar ciência;
- assinar documentos;
- consultar demonstrativo;
- acompanhar pagamento;
- baixar documentos;
- consultar orientações;
- registrar divergência;
- informar dados para devolução;
- responder entrevista de saída;
- acompanhar pendências próprias.

Dados internos, pareceres e evidências restritas não serão expostos.

---

## 35. Reintegração e reversão

O fluxo deverá:

- criar caso próprio;
- registrar origem e decisão;
- relacionar desligamento anterior;
- projetar S-2298 quando aplicável;
- reconstruir vigência;
- reativar ou recriar condições;
- recalcular folha;
- restabelecer benefícios;
- reavaliar férias e afastamentos;
- tratar FGTS;
- restaurar acesso por nova autorização;
- preservar todas as versões.

Reintegração não poderá ser executada pela edição direta da data de término.

---

## 36. Correções e diferenças posteriores

Tipos:

- erro material;
- alteração de motivo;
- alteração de data;
- verba omitida;
- valor incorreto;
- direito surgido posteriormente;
- decisão coletiva retroativa;
- decisão judicial;
- reintegração;
- exclusão por cadastro indevido.

Cada tipo possuirá fluxo próprio de cálculo, aprovação e evento externo.

---

## 37. Alertas

- contrato a termo próximo do vencimento;
- caso duplicado;
- estabilidade ou proteção identificada;
- afastamento incompatível;
- aviso sem ciência;
- aviso próximo do término;
- ponto pendente;
- cálculo com divergência;
- pagamento próximo do prazo;
- pagamento rejeitado;
- S-2299 ou S-2399 pendente;
- evento rejeitado;
- FGTS rescisório divergente;
- guia não paga;
- documento não entregue;
- ativo não devolvido;
- acesso não revogado;
- benefício não cancelado;
- responsabilidade não transferida;
- caso concluído com pendência reaberta;
- reintegração sem impactos processados.

Alertas legais usarão calendário e regra versionados.

---

## 38. Relatórios

- desligamentos por período, empresa e motivo;
- casos por estado;
- tempo médio por etapa;
- pagamentos pendentes;
- diferenças e complementos;
- desligamentos com proteção;
- justa causa por estado e revisão;
- contratos a termo;
- projeções de custo;
- FGTS rescisório;
- eventos externos rejeitados;
- documentos pendentes;
- ativos não devolvidos;
- acessos ativos após término;
- benefícios ativos após término;
- offboarding por responsável;
- desligamentos por obra e centro de custo;
- reintegrações;
- divergências entre interno, eSocial, FGTS e pagamento;
- auditoria de acessos sensíveis.

Relatórios gerenciais não exibirão acusações ou dados jurídicos sensíveis sem finalidade.

---

## 39. Permissões

- `termination.view_cases`;
- `termination.create_case`;
- `termination.request_own_resignation`;
- `termination.manage_triage`;
- `termination.view_sensitive_reason`;
- `termination.manage_legal_review`;
- `termination.approve_case`;
- `termination.approve_sensitive_case`;
- `termination.manage_notice`;
- `termination.confirm_occurrence`;
- `termination.calculate`;
- `termination.adjust_calculation`;
- `termination.approve_calculation`;
- `termination.generate_documents`;
- `termination.sign_documents`;
- `termination.manage_payments`;
- `termination.confirm_payment`;
- `termination.manage_fgts`;
- `termination.manage_unemployment`;
- `termination.transmit_events`;
- `termination.reopen_case`;
- `termination.cancel_case`;
- `termination.manage_collective_cases`;
- `termination.manage_reinstatement`;
- `offboarding.view`;
- `offboarding.manage`;
- `offboarding.revoke_access`;
- `offboarding.manage_assets`;
- `offboarding.complete`;
- `termination.export_sensitive_data`;
- `termination.audit`.

---

## 40. Requisitos funcionais

### Governança e configuração

**RH-M11-FR-001.** Cadastrar motivos internos de desligamento com vigência.  
**RH-M11-FR-002.** Versionar fundamentos, políticas e mapeamentos externos.  
**RH-M11-FR-003.** Configurar documentos obrigatórios por motivo.  
**RH-M11-FR-004.** Configurar aprovações por risco, valor e motivo.  
**RH-M11-FR-005.** Configurar verificações de proteção e estabilidade.  
**RH-M11-FR-006.** Configurar calendários e prazos.  
**RH-M11-FR-007.** Configurar templates de offboarding.  
**RH-M11-FR-008.** Configurar perfis de confidencialidade.  
**RH-M11-FR-009.** Configurar políticas de retenção.  
**RH-M11-FR-010.** Consultar regra vigente em qualquer data.

### Caso e triagem

**RH-M11-FR-011.** Criar caso por vínculo.  
**RH-M11-FR-012.** Criar caso de término de TSVE.  
**RH-M11-FR-013.** Receber pedido de demissão pelo portal.  
**RH-M11-FR-014.** Criar caso por término programado.  
**RH-M11-FR-015.** Criar participantes a partir de caso coletivo.  
**RH-M11-FR-016.** Detectar caso duplicado.  
**RH-M11-FR-017.** Registrar iniciativa e fundamento.  
**RH-M11-FR-018.** Relacionar evidências.  
**RH-M11-FR-019.** Classificar risco jurídico.  
**RH-M11-FR-020.** Executar triagem auditável.

### Proteções e aprovações

**RH-M11-FR-021.** Verificar afastamentos e férias.  
**RH-M11-FR-022.** Verificar proteções cadastradas.  
**RH-M11-FR-023.** Verificar instrumentos coletivos.  
**RH-M11-FR-024.** Verificar contrato e prazo.  
**RH-M11-FR-025.** Verificar folha e ponto pendentes.  
**RH-M11-FR-026.** Verificar bens, acessos e responsabilidades.  
**RH-M11-FR-027.** Registrar resultado de cada verificação.  
**RH-M11-FR-028.** Bloquear aprovação por regra impeditiva.  
**RH-M11-FR-029.** Solicitar parecer jurídico.  
**RH-M11-FR-030.** Executar matriz de aprovação segregada.

### Aviso prévio

**RH-M11-FR-031.** Criar aviso prévio.  
**RH-M11-FR-032.** Calcular duração por regra vigente.  
**RH-M11-FR-033.** Registrar modalidade.  
**RH-M11-FR-034.** Registrar redução ou dispensa de dias.  
**RH-M11-FR-035.** Calcular data projetada.  
**RH-M11-FR-036.** Integrar aviso à jornada.  
**RH-M11-FR-037.** Registrar ciência.  
**RH-M11-FR-038.** Registrar reconsideração.  
**RH-M11-FR-039.** Alterar aviso criando nova versão.  
**RH-M11-FR-040.** Concluir ou interromper aviso.

### Motivos especiais

**RH-M11-FR-041.** Tratar pedido de demissão.  
**RH-M11-FR-042.** Tratar extinção por acordo.  
**RH-M11-FR-043.** Tratar dispensa sem justa causa.  
**RH-M11-FR-044.** Tratar justa causa com acesso restrito.  
**RH-M11-FR-045.** Tratar rescisão indireta reconhecida.  
**RH-M11-FR-046.** Tratar término normal de contrato a prazo.  
**RH-M11-FR-047.** Tratar término antecipado.  
**RH-M11-FR-048.** Tratar falecimento.  
**RH-M11-FR-049.** Tratar transferência entre declarantes.  
**RH-M11-FR-050.** Tratar decisão judicial.

### Ocorrência e vínculo

**RH-M11-FR-051.** Registrar último dia trabalhado.  
**RH-M11-FR-052.** Registrar data de desligamento.  
**RH-M11-FR-053.** Manter data projetada separada.  
**RH-M11-FR-054.** Confirmar ocorrência transacionalmente.  
**RH-M11-FR-055.** Encerrar versão contratual aplicável.  
**RH-M11-FR-056.** Preservar históricos relacionados.  
**RH-M11-FR-057.** Impedir exclusão do vínculo.  
**RH-M11-FR-058.** Corrigir ocorrência por nova versão.  
**RH-M11-FR-059.** Reabrir caso concluído.  
**RH-M11-FR-060.** Relacionar reintegração.

### Cálculo rescisório

**RH-M11-FR-061.** Criar execução rescisória versionada.  
**RH-M11-FR-062.** Congelar snapshots de entrada.  
**RH-M11-FR-063.** Consumir dados de ponto e banco.  
**RH-M11-FR-064.** Consumir férias e afastamentos.  
**RH-M11-FR-065.** Consumir benefícios e descontos.  
**RH-M11-FR-066.** Consumir médias e remuneração variável.  
**RH-M11-FR-067.** Calcular verbas por política.  
**RH-M11-FR-068.** Calcular bases e incidências.  
**RH-M11-FR-069.** Calcular FGTS e indenização aplicável.  
**RH-M11-FR-070.** Gerar memória explicável.  
**RH-M11-FR-071.** Comparar versões de cálculo.  
**RH-M11-FR-072.** Detectar divergências.  
**RH-M11-FR-073.** Registrar ajuste manual.  
**RH-M11-FR-074.** Aprovar cálculo pelo hash.  
**RH-M11-FR-075.** Invalidar aprovação após recálculo.

### Documentos

**RH-M11-FR-076.** Gerar documentos por template versionado.  
**RH-M11-FR-077.** Gerar demonstrativo de parcelas.  
**RH-M11-FR-078.** Gerar memória de cálculo.  
**RH-M11-FR-079.** Coletar assinatura eletrônica.  
**RH-M11-FR-080.** Registrar recusa ou impossibilidade.  
**RH-M11-FR-081.** Registrar entrega e ciência.  
**RH-M11-FR-082.** Preservar hash e versão.  
**RH-M11-FR-083.** Substituir documento sem apagar original.  
**RH-M11-FR-084.** Disponibilizar documentos autorizados no portal.  
**RH-M11-FR-085.** Auditar exportações.

### Pagamentos e recolhimentos

**RH-M11-FR-086.** Criar ordem de pagamento.  
**RH-M11-FR-087.** Validar favorecido e conta.  
**RH-M11-FR-088.** Integrar com Financeiro.  
**RH-M11-FR-089.** Registrar retorno bancário.  
**RH-M11-FR-090.** Conciliar pagamento.  
**RH-M11-FR-091.** Tratar rejeição e devolução.  
**RH-M11-FR-092.** Tratar pagamento parcial.  
**RH-M11-FR-093.** Tratar complemento e estorno.  
**RH-M11-FR-094.** Preparar FGTS rescisório.  
**RH-M11-FR-095.** Conciliar guia e pagamento de FGTS.  
**RH-M11-FR-096.** Preparar dados de seguro-desemprego.  
**RH-M11-FR-097.** Registrar entrega de requerimento ou orientação.

### Eventos externos

**RH-M11-FR-098.** Projetar S-2299.  
**RH-M11-FR-099.** Projetar S-2399.  
**RH-M11-FR-100.** Relacionar S-1210.  
**RH-M11-FR-101.** Projetar S-2298 para reintegração.  
**RH-M11-FR-102.** Preparar exclusão ou retificação.  
**RH-M11-FR-103.** Detectar necessidade de reabertura.  
**RH-M11-FR-104.** Registrar recibos e rejeições.  
**RH-M11-FR-105.** Reconciliar interno e externo.

### Offboarding

**RH-M11-FR-106.** Criar checklist por template.  
**RH-M11-FR-107.** Agendar revogação de acessos.  
**RH-M11-FR-108.** Executar revogação emergencial autorizada.  
**RH-M11-FR-109.** Registrar devolução de ativos.  
**RH-M11-FR-110.** Registrar devolução de EPI.  
**RH-M11-FR-111.** Transferir responsabilidades.  
**RH-M11-FR-112.** Encerrar acesso a obras.  
**RH-M11-FR-113.** Gerar instruções de benefícios.  
**RH-M11-FR-114.** Monitorar pendências por responsável.  
**RH-M11-FR-115.** Concluir offboarding sem apagar pendências.

### Relatórios e auditoria

**RH-M11-FR-116.** Gerar dashboard de casos.  
**RH-M11-FR-117.** Gerar relatório de prazos e riscos.  
**RH-M11-FR-118.** Gerar reconciliação financeira e externa.  
**RH-M11-FR-119.** Exportar dossiê auditável autorizado.  
**RH-M11-FR-120.** Preservar trilha completa de decisões e acessos.

---

## 41. Regras de negócio

**RH-M11-BR-001.** Caso de desligamento não é vínculo encerrado.  
**RH-M11-BR-002.** Solicitação não produz término automático.  
**RH-M11-BR-003.** Motivo interno não substitui fundamento jurídico.  
**RH-M11-BR-004.** Código externo não decide o motivo interno.  
**RH-M11-BR-005.** Regra legal possui versão e vigência.  
**RH-M11-BR-006.** Transferência interna não será desligamento.  
**RH-M11-BR-007.** Caso duplicado será bloqueado ou relacionado.  
**RH-M11-BR-008.** Solicitante não aprovará sozinho quando houver segregação.  
**RH-M11-BR-009.** Verificação automática não é parecer jurídico.  
**RH-M11-BR-010.** Bloqueio impeditivo exige resolução ou decisão autorizada.  
**RH-M11-BR-011.** Justa causa exige aprovação especial.  
**RH-M11-BR-012.** Evidência sensível terá acesso restrito.  
**RH-M11-BR-013.** Acusação não será exposta em relatório geral.  
**RH-M11-BR-014.** Pedido digital exige identidade e manifestação inequívoca.  
**RH-M11-BR-015.** Acordo não será sugerido para reduzir direitos.  
**RH-M11-BR-016.** Contrato a termo não encerrará apenas por alerta.  
**RH-M11-BR-017.** Aviso é objeto independente.  
**RH-M11-BR-018.** Data de aviso, último dia, desligamento e projeção são distintas.  
**RH-M11-BR-019.** Alteração de aviso cria nova versão.  
**RH-M11-BR-020.** Reconsideração preserva o aviso original.  
**RH-M11-BR-021.** Vínculo não será encerrado antes do fato aplicável.  
**RH-M11-BR-022.** Encerramento não apaga lotação ou histórico.  
**RH-M11-BR-023.** Ocorrência confirmada será imutável.  
**RH-M11-BR-024.** Correção cria nova versão.  
**RH-M11-BR-025.** Reintegração não edita o desligamento original.  
**RH-M11-BR-026.** Cálculo usa snapshots aprovados.  
**RH-M11-BR-027.** Rubrica não será definida somente pelo nome do motivo.  
**RH-M11-BR-028.** Parâmetro legal não será constante eterna.  
**RH-M11-BR-029.** Cálculo aprovado não será editado.  
**RH-M11-BR-030.** Recálculo cria nova execução.  
**RH-M11-BR-031.** Novo cálculo invalida aprovação anterior.  
**RH-M11-BR-032.** Ajuste manual será separado da linha automática.  
**RH-M11-BR-033.** Ajuste exige justificativa e aprovação.  
**RH-M11-BR-034.** Memória de cálculo referencia entradas e regras.  
**RH-M11-BR-035.** Valor devido não é valor pago.  
**RH-M11-BR-036.** Ordem bancária não é confirmação de pagamento.  
**RH-M11-BR-037.** Pagamento parcial não quita o saldo.  
**RH-M11-BR-038.** Estorno é movimento compensatório.  
**RH-M11-BR-039.** Quitação somente alcança parcelas discriminadas.  
**RH-M11-BR-040.** Documento não substitui fato estruturado.  
**RH-M11-BR-041.** Documento substituído permanece no histórico.  
**RH-M11-BR-042.** Recusa de assinatura não apaga o processo.  
**RH-M11-BR-043.** Evento externo é projeção do fato aprovado.  
**RH-M11-BR-044.** S-2299 aceito não comprova pagamento.  
**RH-M11-BR-045.** S-1210 é separado da remuneração devida.  
**RH-M11-BR-046.** Período fechado poderá exigir reabertura.  
**RH-M11-BR-047.** Reenvio, retificação e exclusão são diferentes.  
**RH-M11-BR-048.** Recibo externo não altera dado interno automaticamente.  
**RH-M11-BR-049.** Divergência externa gera plano de correção.  
**RH-M11-BR-050.** FGTS externo não substitui memória interna.  
**RH-M11-BR-051.** Guia emitida não será tratada como paga.  
**RH-M11-BR-052.** Seguro-desemprego potencial não é benefício concedido.  
**RH-M11-BR-053.** Motivo incompatível bloqueia preparação indevida.  
**RH-M11-BR-054.** Offboarding não substitui desligamento.  
**RH-M11-BR-055.** Desligamento não conclui automaticamente offboarding.  
**RH-M11-BR-056.** Revogação emergencial não encerra vínculo.  
**RH-M11-BR-057.** Falta de devolução não impede obrigação legal de comunicar.  
**RH-M11-BR-058.** Falta de ativo não gera desconto automático.  
**RH-M11-BR-059.** Acesso revogado terá evidência e responsável.  
**RH-M11-BR-060.** Segredo não será registrado em checklist.  
**RH-M11-BR-061.** Exclusão de equipe não apaga alocação histórica.  
**RH-M11-BR-062.** Benefício somente será encerrado por instrução confirmada.  
**RH-M11-BR-063.** Caso coletivo não substitui caso individual.  
**RH-M11-BR-064.** Critério coletivo será auditável.  
**RH-M11-BR-065.** Participante coletivo terá cálculo próprio.  
**RH-M11-BR-066.** Falecimento terá acesso e comunicação restritos.  
**RH-M11-BR-067.** Representante somente acessará dados autorizados.  
**RH-M11-BR-068.** Fato posterior não reescreve silenciosamente a rescisão.  
**RH-M11-BR-069.** Erro original e direito posterior terão fluxos distintos.  
**RH-M11-BR-070.** Reabertura preserva conclusão anterior.  
**RH-M11-BR-071.** Caso cancelado permanece auditável.  
**RH-M11-BR-072.** Exclusão lógica não elimina evidência obrigatória.  
**RH-M11-BR-073.** Exportação sensível será auditada.  
**RH-M11-BR-074.** Logs não conterão conteúdo jurídico ou bancário sensível.  
**RH-M11-BR-075.** Portal não exibirá parecer interno restrito.  
**RH-M11-BR-076.** Integrações serão idempotentes.  
**RH-M11-BR-077.** Eventos internos usarão outbox.  
**RH-M11-BR-078.** Correção retroativa produz impactos explícitos.  
**RH-M11-BR-079.** Conclusão exige pendências obrigatórias resolvidas ou excepcionadas.  
**RH-M11-BR-080.** Exceção exige permissão, justificativa, prazo e auditoria.

---

## 42. Critérios de aceite

**RH-M11-AC-001.** Um caso pode existir sem encerrar o vínculo.  
**RH-M11-AC-002.** Caso duplicado é detectado.  
**RH-M11-AC-003.** Motivos possuem vigência e mapeamento separado.  
**RH-M11-AC-004.** Proteções são avaliadas antes da aprovação.  
**RH-M11-AC-005.** Resultado de proteção mantém regra e evidência.  
**RH-M11-AC-006.** Justa causa exige perfil e aprovação especial.  
**RH-M11-AC-007.** Gestor comum não acessa evidência restrita.  
**RH-M11-AC-008.** Pedido de demissão mantém prova de identidade.  
**RH-M11-AC-009.** Acordo registra manifestação de ambas as partes.  
**RH-M11-AC-010.** Contrato a termo gera alerta sem término automático.  
**RH-M11-AC-011.** Aviso mantém modalidade e versão.  
**RH-M11-AC-012.** Datas de aviso, trabalho, desligamento e projeção são independentes.  
**RH-M11-AC-013.** Reconsideração não apaga aviso original.  
**RH-M11-AC-014.** Ocorrência encerra somente a versão aplicável.  
**RH-M11-AC-015.** Histórico de lotação permanece consultável.  
**RH-M11-AC-016.** Cálculo mantém snapshots.  
**RH-M11-AC-017.** Cada linha explica regra e entrada.  
**RH-M11-AC-018.** Novo cálculo cria nova execução.  
**RH-M11-AC-019.** Novo cálculo invalida aprovação anterior.  
**RH-M11-AC-020.** Ajuste manual aparece separado.  
**RH-M11-AC-021.** Documento gerado referencia cálculo aprovado.  
**RH-M11-AC-022.** Documento substituído continua disponível à auditoria.  
**RH-M11-AC-023.** Recusa de assinatura gera pendência.  
**RH-M11-AC-024.** Ordem enviada ao banco não é marcada como paga.  
**RH-M11-AC-025.** Retorno bancário concilia favorecido, valor e data.  
**RH-M11-AC-026.** Pagamento parcial mantém saldo aberto.  
**RH-M11-AC-027.** Estorno não apaga pagamento original.  
**RH-M11-AC-028.** FGTS rescisório mantém bases internas.  
**RH-M11-AC-029.** Guia de FGTS é conciliada com pagamento.  
**RH-M11-AC-030.** Seguro-desemprego é sinalizado como avaliação externa.  
**RH-M11-AC-031.** S-2299 usa versão do leiaute registrada.  
**RH-M11-AC-032.** S-2399 é separado do S-2299.  
**RH-M11-AC-033.** S-1210 referencia demonstrativo correto.  
**RH-M11-AC-034.** Rejeição externa não altera caso silenciosamente.  
**RH-M11-AC-035.** Período fechado gera pendência de reabertura quando necessário.  
**RH-M11-AC-036.** Transferência interna não produz desligamento.  
**RH-M11-AC-037.** Checklist de offboarding é criado por contexto.  
**RH-M11-AC-038.** Revogação emergencial mantém vínculo inalterado.  
**RH-M11-AC-039.** Ativo não devolvido permanece como pendência própria.  
**RH-M11-AC-040.** Falta de ativo não cria desconto automático.  
**RH-M11-AC-041.** Acesso revogado possui comprovante.  
**RH-M11-AC-042.** Histórico da equipe permanece após remoção.  
**RH-M11-AC-043.** Cancelamento de benefício exige confirmação.  
**RH-M11-AC-044.** Caso coletivo gera casos individuais.  
**RH-M11-AC-045.** Cada participante coletivo possui cálculo próprio.  
**RH-M11-AC-046.** Falecimento restringe comunicação e documentos.  
**RH-M11-AC-047.** Reintegração cria caso novo.  
**RH-M11-AC-048.** Reintegração preserva desligamento original.  
**RH-M11-AC-049.** Diferença posterior identifica sua origem.  
**RH-M11-AC-050.** Reabertura preserva conclusão anterior.  
**RH-M11-AC-051.** Portal não revela parecer restrito.  
**RH-M11-AC-052.** Exportação sensível aparece na auditoria.  
**RH-M11-AC-053.** Caso não conclui com bloqueio obrigatório aberto.  
**RH-M11-AC-054.** Exceção registra aprovador, motivo e validade.  
**RH-M11-AC-055.** Dossiê reproduz caso, cálculo, documentos, pagamentos, eventos e offboarding.

---

## 43. Requisitos não funcionais

- isolamento por organização;
- autorização por linha e atributo;
- criptografia de documentos sensíveis;
- armazenamento privado;
- trilha append-only;
- assinatura e hash de documentos;
- idempotência;
- outbox e filas;
- processamento assíncrono;
- consistência temporal;
- suporte a grandes desligamentos coletivos;
- simulações sem efeito oficial;
- paginação e filtros;
- acessibilidade;
- recuperação de desastre;
- retenção configurável;
- mascaramento de dados;
- ausência de segredos em logs;
- testes de autorização negativa;
- explicabilidade de cálculo;
- reconciliação determinística.

---

## 44. Cenários pessimistas

1. gestor abre dois desligamentos para o mesmo vínculo;
2. empregada com proteção não identificada é incluída em lote coletivo;
3. justa causa é selecionada sem evidência;
4. aviso é alterado depois do cálculo;
5. último dia trabalhado diverge da data projetada;
6. ponto ainda está aberto;
7. saldo de férias muda após aprovação;
8. cálculo usa instrumento coletivo vencido;
9. pagamento é enviado para conta antiga;
10. arquivo bancário retorna parcialmente;
11. S-2299 é aceito com motivo incorreto;
12. período do eSocial está fechado;
13. FGTS Digital apresenta base diferente;
14. guia é emitida e não paga;
15. seguro-desemprego é preparado para motivo incompatível;
16. notebook não é devolvido;
17. acesso de produção permanece ativo;
18. gestor remove trabalhador da equipe e acredita que o vínculo acabou;
19. benefício continua sendo cobrado pelo fornecedor;
20. empregado é reintegrado por decisão judicial;
21. diferença coletiva surge após a rescisão;
22. desligamento coletivo aplica critérios inconsistentes;
23. documento de falecimento é acessado indevidamente;
24. recusa de assinatura bloqueia indevidamente a comunicação legal;
25. integração repete evento após timeout.

Cada cenário deverá possuir prevenção, detecção, evidência e recuperação.

---

## 45. Estratégia de testes

### Unitários

- vigência de motivo;
- cálculo de projeção;
- grafo de dependências;
- bloqueios;
- estados;
- idempotência;
- arredondamentos;
- regras de conclusão.

### Integração

- contrato e vínculo;
- ponto e banco de horas;
- férias;
- benefícios;
- folha;
- Financeiro;
- Contabilidade;
- SST;
- Obras;
- patrimônio;
- identidade e acessos;
- Módulo 10.

### Segurança

- acesso a justa causa;
- documentos judiciais;
- dados bancários;
- exportação;
- portal do trabalhador;
- segregação de funções;
- logs.

### Concorrência

- cálculo simultâneo;
- duas aprovações;
- retorno bancário duplicado;
- retry após timeout;
- conclusão durante pendência;
- revogação de acesso concorrente.

### Ponta a ponta

- dispensa sem justa causa com aviso indenizado;
- pedido de demissão com aviso trabalhado;
- acordo entre partes;
- término de experiência;
- justa causa restrita;
- falecimento;
- desligamento coletivo;
- S-2299 rejeitado e corrigido;
- pagamento rejeitado;
- reintegração posterior.

---

## 46. Sequência sugerida de implementação

1. catálogos, vigências e autorização;
2. caso e estados;
3. verificações e aprovações;
4. aviso prévio;
5. ocorrência de término;
6. integração com motor de folha;
7. documentos e assinaturas;
8. pagamentos e conciliação;
9. FGTS e seguro-desemprego;
10. eventos externos;
11. offboarding e ativos;
12. obras, benefícios e acessos;
13. coletivos e programas;
14. reintegração e correções;
15. relatórios e portal;
16. homologação jurídica, contábil, financeira e operacional.

Nenhuma transmissão ou pagamento real será liberado antes da homologação formal.

---

## 47. Baseline oficial consultada

Em 6 de agosto de 2026 foram consultadas fontes oficiais:

- CLT compilada, incluindo os arts. 477, 479, 480, 482, 483, 484-A e 487 a 491;
- Lei nº 12.506/2011;
- Lei nº 8.036/1990;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação e regras dos eventos S-2298, S-2299, S-2399, S-1210 e S-3000;
- Manual do FGTS Digital versão 1.70;
- leiaute de Remunerações para Fins Rescisórios versão 1.2;
- orientações oficiais sobre seguro-desemprego.

A CLT compilada determina a discriminação das parcelas, comunicação da extinção e pagamento/documentos no prazo legal aplicável. O eSocial mantém eventos distintos para desligamento de empregado, término de trabalhador sem vínculo, pagamentos e reintegração. O FGTS Digital mantém fluxo próprio para bases rescisórias, indenização, guias e pagamentos.

Prazos, motivos, verbas, códigos, incidências, efeitos de instrumentos coletivos e interpretações deverão ser novamente validados antes da implementação, homologação e produção.

---

## 48. Estado honesto

Este documento é uma especificação funcional.

Não foram implementados:

- tabelas;
- migrations;
- rotas;
- componentes;
- motor rescisório;
- documentos;
- assinaturas;
- pagamentos;
- retorno bancário;
- FGTS Digital;
- seguro-desemprego;
- eventos do eSocial;
- offboarding;
- gestão de ativos;
- revogação de acessos;
- reintegração;
- testes de produção.
