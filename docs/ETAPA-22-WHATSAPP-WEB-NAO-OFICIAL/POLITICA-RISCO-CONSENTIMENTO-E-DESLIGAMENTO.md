# Política de risco, consentimento e desligamento — Provider WhatsApp Web não oficial

**Versão:** 0.1.0  
**Data:** 03 de agosto de 2026  
**Status:** política documental; nenhuma sessão autorizada  
**Aplicação:** qualquer engine não oficial baseado no WhatsApp Web, incluindo Baileys, `whatsapp-web.js`, OpenWA ou gateway equivalente  
**Aviso:** esta política não substitui análise jurídica, de privacidade, segurança ou os termos vigentes do WhatsApp.

---

## 1. Objetivo

Definir os controles mínimos para:

- autorizar um número de homologação;
- registrar aceite interno de risco;
- obter e preservar consentimento;
- processar opt-out e bloqueio;
- impedir usos abusivos;
- desligar e remover sessões;
- cancelar o projeto quando os riscos ultrapassarem o benefício.

O provider não oficial é uma capacidade revogável. Nenhuma área possui direito adquirido de mantê-lo ativo.

---

## 2. Premissas de risco

A organização reconhece que um cliente WhatsApp Web não oficial pode sofrer:

- alteração de protocolo sem aviso;
- incompatibilidade após atualização;
- desconexão ou exigência de novo pairing;
- perda ou corrupção de sessão;
- mensagens duplicadas, atrasadas ou não entregues;
- falha de descriptografia;
- limitação, suspensão ou banimento da conta;
- ausência de suporte ou SLA do WhatsApp;
- exposição de dados se chaves ou sessões forem comprometidas;
- aumento de custo operacional e de manutenção;
- necessidade de descontinuação imediata.

O sistema não deve ocultar esses riscos dos responsáveis internos.

---

## 3. Classificação de ambientes

| Ambiente | Número permitido | Dados permitidos | Automação | IA | Estado inicial |
|---|---|---|---|---|---|
| `LOCAL_FAKE` | nenhum | fixtures sintéticas | simulada | mock | permitido |
| `LAB_ISOLADO` | descartável/autorizado | sintéticos | limitada | desligada | permitido após gates técnicos |
| `HOMOLOGACAO` | dedicado e autorizado | conjunto mínimo aprovado | assistida | `draft_only` | exige aceite de risco |
| `PILOTO_RESTRITO` | dedicado, não crítico | contatos consentidos | limitada e auditada | aprovação humana | exige nova decisão |
| `PRODUCAO` | não autorizado por esta política | nenhum | nenhum | nenhum | bloqueado |

Produção só poderá ser habilitada por revisão formal da ADR e aprovação específica.

---

## 4. Critérios para número autorizado

Um número só pode entrar em homologação quando todos os itens estiverem atendidos:

- [ ] propriedade ou autorização de uso documentada;
- [ ] responsável nominal pelo número;
- [ ] acesso ao dispositivo e ao processo de recuperação;
- [ ] capacidade de desvincular dispositivos imediatamente;
- [ ] número não utilizado para emergência, segurança, financeiro crítico ou continuidade operacional;
- [ ] número não é o principal canal comercial da empresa;
- [ ] impacto da perda formalmente classificado como baixo;
- [ ] histórico anterior inventariado ou conta criada exclusivamente para homologação;
- [ ] nenhum outro bot ou automação desconhecida conectado;
- [ ] número não associado a tentativa de evasão após banimento;
- [ ] consentimento dos participantes dos testes;
- [ ] contatos de teste identificados;
- [ ] plano de encerramento e retenção definido;
- [ ] prazo de autorização definido;
- [ ] kill switch testado;
- [ ] aprovação técnica, segurança e responsável de negócio registradas.

### Validade

A autorização deve ter data de início e expiração. Recomenda-se revisão no máximo a cada 90 dias ou antes quando houver:

- atualização relevante do engine;
- mudança nos termos do WhatsApp;
- incidente;
- restrição da conta;
- ampliação de escopo;
- inclusão de dados reais;
- inclusão de IA autônoma.

---

## 5. Termo interno de aceite de risco operacional

O aceite deve ser registrado com os seguintes campos:

```text
Identificador do aceite:
Organização:
Projeto/ambiente:
Número mascarado:
Finalidade autorizada:
Data de início:
Data de expiração:
Responsável de negócio:
Responsável técnico:
Responsável de segurança/privacidade:
Revisor jurídico, quando aplicável:
Versão da ADR:
Versão da política:
Versão do engine:
Commit/artefato do gateway:
Riscos aceitos:
Riscos não aceitos:
Limites de volume:
Tipos de dados permitidos:
Automação permitida:
IA permitida:
Critérios de interrupção:
Plano de desligamento:
Status: DRAFT | APPROVED | REJECTED | EXPIRED | REVOKED
Assinaturas/aprovações:
```

### Declaração mínima

> Os responsáveis reconhecem que o engine utiliza um canal não oficial, sem garantia de continuidade, suporte ou ausência de restrições. A autorização é limitada ao escopo, período, número e dados definidos. O sistema poderá ser interrompido sem aviso prévio quando qualquer gate de segurança, conformidade ou operação falhar.

Aceite verbal, mensagem de chat ou ausência de objeção não substituem o registro.

---

## 6. Consentimento

### 6.1 Regra de contato

Nenhuma mensagem outbound não transacional deve ser enviada sem base documentada de consentimento aplicável ao propósito.

A evidência de consentimento deve registrar:

- contato;
- número normalizado;
- organização;
- categoria de comunicação;
- texto ou contexto apresentado;
- origem da coleta;
- data e hora;
- responsável/processo;
- versão da política;
- prazo, quando houver;
- prova ou referência à prova.

### 6.2 Categorias

O consentimento deve ser granular quando necessário:

- atendimento solicitado pelo cliente;
- andamento de proposta;
- comunicação de obra;
- documentos e assinaturas;
- suporte/SAC;
- avisos operacionais;
- conteúdo comercial ou promocional.

Consentimento para uma categoria não autoriza automaticamente todas as demais.

### 6.3 Inbound

Uma mensagem iniciada pelo contato permite responder ao contexto solicitado, mas não autoriza campanhas futuras ilimitadas.

### 6.4 Surpresa e contexto

É proibido utilizar dados obtidos em outro contexto para iniciar conversa inesperada no WhatsApp. O contato deve reconhecer:

- quem está enviando;
- por que recebeu;
- qual categoria de mensagem;
- como interromper.

---

## 7. Opt-out, bloqueio e supressão

### 7.1 Canais de solicitação

Opt-out deve ser aceito:

- dentro do WhatsApp;
- por telefone;
- por e-mail;
- no site;
- por atendimento humano;
- por solicitação registrada no CRM/SAC.

### 7.2 Interpretação

O sistema e os operadores devem reconhecer pedidos inequívocos como:

- “parar”;
- “sair”;
- “cancelar mensagens”;
- “não quero receber”;
- “remova meu número”;
- expressões equivalentes.

A lista não é exaustiva. A intenção prevalece sobre a palavra exata.

### 7.3 Efeito

Ao registrar opt-out:

1. bloquear novos envios da categoria;
2. cancelar itens pendentes da outbox quando permitido;
3. registrar data, origem, categoria e evidência;
4. notificar o operador, quando aplicável;
5. impedir que IA ou automação reative o contato;
6. preservar somente a evidência necessária conforme retenção;
7. permitir reativação apenas com novo consentimento documentado.

### 7.4 Bloqueio absoluto

Contatos podem ser marcados como `DO_NOT_CONTACT`. Esse estado prevalece sobre:

- campanhas;
- workflows;
- IA;
- templates;
- listas importadas;
- solicitações internas de envio.

Apenas resposta necessária a obrigação legal ou solicitação ativa do próprio contato poderá ser avaliada, com revisão humana.

---

## 8. Casos proibidos

São proibidos em qualquer ambiente conectado ao WhatsApp real:

- spam;
- prospecção indiscriminada;
- listas compradas, raspadas ou sem origem verificável;
- disparos em massa não consentidos;
- simulação de pessoa ou empresa diferente;
- mensagens enganosas;
- fraude;
- engenharia social maliciosa;
- coleta excessiva de dados;
- solicitação de senhas, tokens ou códigos de autenticação;
- evasão de bloqueios ou limites;
- criação/rotação automatizada de contas;
- fingerprint spoofing;
- proxy rotation para ocultar origem;
- uso de número de terceiro sem autorização;
- reconexão infinita após restrição;
- reativação automática após logout deliberado;
- download irrestrito de arquivos;
- execução de arquivos recebidos;
- IA enviando compromisso contratual, financeiro ou jurídico sem aprovação;
- ocultar do usuário que está interagindo com automação quando essa informação for necessária para evitar engano;
- apagar evidência de opt-out, incidente ou falha.

---

## 9. Limites operacionais mínimos

Antes de homologação devem existir:

- limite por minuto, hora e dia;
- limite por conversa;
- limite por organização;
- limite de novas conversas iniciadas;
- limite de mídia e tamanho;
- backoff com teto;
- circuit breaker;
- DLQ;
- alerta de reconnect loop;
- alerta de opt-out ignorado;
- kill switch;
- revisão humana de reprocessamento.

Os valores serão definidos após benchmark e perfil de risco. É proibido usar valores “altos o suficiente” sem justificativa.

---

## 10. Processo de desligamento

### 10.1 Motivos

O desligamento pode ser:

- planejado;
- por expiração da autorização;
- por solicitação do responsável;
- por incidente;
- por mudança de termos;
- por vulnerabilidade;
- por restrição da conta;
- por perda de controle do número;
- por falha de conformidade.

### 10.2 Etapas

#### Fase A — Congelamento

- ativar kill switch;
- impedir novos comandos;
- interromper automações e IA;
- cancelar retries ainda não enviados;
- preservar a outbox para reconciliação.

#### Fase B — Reconciliação

- identificar mensagens em trânsito;
- registrar status conhecido;
- mover comandos incertos para revisão;
- impedir reenvio automático de mensagem possivelmente entregue.

#### Fase C — Desconexão

- interromper reconnect;
- fechar socket graciosamente;
- liberar lease;
- invalidar pairing code/QR efêmero;
- desvincular o dispositivo pelo procedimento autorizado.

#### Fase D — Credenciais

- revogar acesso interno;
- destruir DEK da sessão quando o encerramento for definitivo;
- remover auth state conforme política;
- preservar hash, auditoria e metadados sanitizados necessários;
- testar que a sessão não pode ser restaurada após exclusão criptográfica.

#### Fase E — Dados de negócio

- preservar mensagens canônicas conforme retenção aplicável;
- não apagar contratos, aceite, SAC ou histórico para ocultar o provider;
- marcar provider/sessão como encerrado;
- manter proveniência da mensagem.

#### Fase F — Evidência

- produzir relatório de desligamento;
- registrar responsável, motivo, data e resultado;
- registrar pendências e incidentes;
- atualizar inventário e runbook.

---

## 11. Critérios de suspensão ou cancelamento

Suspender imediatamente quando:

- houver suspeita de comprometimento de sessão;
- o número for bloqueado ou restrito;
- ocorrer envio sem consentimento;
- opt-out não for respeitado;
- mensagens forem duplicadas em volume material;
- a sessão alternar repetidamente entre processos;
- chaves aparecerem em logs;
- mídia escapar da quarentena;
- houver acesso cruzado entre organizações;
- IA enviar informação sensível ou compromisso não aprovado;
- o kill switch falhar.

Cancelar o projeto antes da implantação quando:

- revisão interna considerar o risco inaceitável;
- for necessário contornar controles do WhatsApp;
- não existir número dedicado;
- o runtime não puder ser isolado;
- o storage de sessão não puder ser criptografado e transacional;
- single writer não puder ser provado;
- a biblioteca ficar abandonada ou incompatível;
- vulnerabilidade crítica permanecer sem correção;
- a restauração de sessão falhar repetidamente;
- o benefício não justificar operação e manutenção;
- for necessário duplicar dados canônicos do Innov.

---

## 12. Resposta a incidente de sessão

### Severidade crítica

Considerar crítico:

- vazamento de credenciais/keys;
- acesso por organização errada;
- takeover de sessão;
- envio não autorizado;
- perda de controle do número;
- malware processado fora da quarentena.

### Resposta mínima

1. ativar kill switch;
2. isolar runtime;
3. revogar acessos;
4. desvincular sessão quando seguro;
5. preservar logs sanitizados e evidências;
6. identificar mensagens enviadas/recebidas;
7. notificar responsáveis internos;
8. avaliar comunicação a titulares/autoridades conforme processo jurídico e de privacidade;
9. corrigir causa raiz;
10. criar ou atualizar vacina;
11. exigir nova aprovação antes de reativar.

---

## 13. Checklist de autorização

### Governança

- [ ] ADR vigente
- [ ] matriz de licença vigente
- [ ] aceite de risco aprovado
- [ ] responsável de negócio
- [ ] responsável técnico
- [ ] responsável de segurança/privacidade

### Número

- [ ] dedicado
- [ ] autorizado
- [ ] recuperável
- [ ] não crítico
- [ ] expiração definida

### Sistema

- [ ] session store criptografado
- [ ] single writer/fencing
- [ ] kill switch
- [ ] outbox/DLQ
- [ ] redaction
- [ ] quarentena
- [ ] auditoria
- [ ] restore testado

### Comunicação

- [ ] finalidade definida
- [ ] consentimento registrado
- [ ] opt-out testado
- [ ] bloqueio absoluto testado
- [ ] volume limitado
- [ ] handoff humano disponível

### IA

- [ ] `draft_only`
- [ ] fontes registradas
- [ ] ferramentas em allowlist
- [ ] aprovação humana
- [ ] limite de custo
- [ ] prompt injection testada

Nenhuma sessão real é autorizada enquanto houver item obrigatório em aberto.

---

## 14. Estado atual

| Controle | Estado |
|---|---|
| Política documentada | `YES` |
| Número autorizado | `NO` |
| Aceite assinado | `NO` |
| Sessão criada | `NO` |
| Provider em produção | `NO` |
| Opt-out implementado | `NO`, planejado |
| Kill switch implementado | `NO`, planejado |
| Revisão jurídica concluída | `NO` |

O fechamento documental da Sprint W-01 não equivale à aprovação de uma sessão. Ele apenas define o processo pelo qual uma sessão poderá ser avaliada.