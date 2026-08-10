# Runtime lifecycle, single writer e fencing — Sprint W-08

**Estado:** implementado e validado com fixtures sintéticas  
**Provider estudado:** `WHATSAPP_WEB_BAILEYS`  
**Runtime real:** não registrado  
**Socket externo:** bloqueado  
**Produção:** bloqueada

## 1. Objetivo

A W-08 estabelece a fronteira que impede duas instâncias de escreverem simultaneamente na mesma sessão. O controle combina:

1. lease com expiração;
2. fencing token monotônico;
3. validação transacional do token antes de gravar credenciais;
4. state machine explícita;
5. reconnect com backoff e jitter limitados;
6. kill switch global e por sessão;
7. takeover somente após expiração ou release válido.

O supervisor foi testado com drivers sintéticos. O bootstrap do gateway continua usando apenas `FakeChannelClient` e não registra o adapter Baileys.

## 2. Persistência

A migration `20260804134000_stage22_session_runtime_leases.sql` cria quatro relações técnicas:

- `session_runtime_leases` — writer atual, expiração e fencing token;
- `messaging_runtime_global_control` — kill switch global;
- `session_runtime_controls` — kill switch por sessão;
- `session_runtime_audit` — eventos sanitizados de lease, takeover e controles.

Nenhuma dessas relações possui coluna para QR, pairing code, challenge value, credencial, key, ciphertext de sessão ou segredo.

## 3. Aquisição, renovação e takeover

### Aquisição inicial

`acquire_session_runtime_lease` cria o primeiro writer com `fencing_token = 1`.

### Renovação

O holder vigente pode renovar o lease sem trocar o token, desde que:

- o lease ainda esteja vivo;
- o instance ID seja o mesmo;
- o fencing token seja o atual;
- nenhum kill switch esteja ativo.

### Segundo writer

Uma segunda instância recebe `LEASE_HELD` enquanto o lease atual não expirou.

### Takeover

Após a expiração ou release, outra instância pode adquirir a sessão. O token é incrementado e nunca reutilizado. O holder anterior torna-se um processo zumbi e recebe `FENCING_TOKEN_STALE` em qualquer operação protegida.

## 4. Escrita protegida

`compare_and_swap_channel_session_credentials_fenced` recebe:

- `holder_instance_id`;
- `fencing_token`;
- escopo da sessão;
- geração esperada;
- envelope e credencial já cifrados.

A função executa `assert_session_runtime_fence` com lock compartilhado antes da CAS criptográfica da W-07. Aquisição, takeover e release precisam de lock exclusivo, portanto não podem trocar o writer no meio da transação protegida.

Optimistic concurrency e fencing resolvem problemas diferentes:

- `generation` detecta concorrência entre versões de credenciais;
- `fencing_token` impede uma instância antiga de escrever, mesmo que ainda esteja executando.

## 5. State machine

Estados implementados:

- `STOPPED`;
- `ACQUIRING_LEASE`;
- `CONNECTING`;
- `PAIRING_REQUIRED`;
- `READY`;
- `BACKOFF`;
- `ACTION_REQUIRED`;
- `RESTRICTED`;
- `LOGGED_OUT`;
- `KILLED`;
- `FENCED_OUT`;
- `STOPPING`;
- `FAILED`.

Transições inválidas falham com `INVALID_STATE_TRANSITION`. O supervisor não inicia fora de `STOPPED` e nenhuma escrita é executada sem lease vigente.

## 6. Pairing efêmero

O driver pode entregar um desafio somente em memória. O supervisor valida que o valor existe e não está expirado, mas publica apenas:

- identificador interno aleatório;
- tipo `QR` ou `PAIRING_CODE`;
- disponibilidade;
- expiração;
- `persisted: false`.

O valor do desafio não entra em snapshot, callback seguro, banco, auditoria ou log. A W-08 não cria QR real nem abre socket.

## 7. Reconnect

Falhas transitórias entram em `BACKOFF`. O atraso usa exponencial limitada e jitter controlado:

- tentativa mínima 1;
- base padrão de 1 segundo;
- teto padrão de 60 segundos;
- jitter padrão de 20%;
- reconexão antes de `nextReconnectAt` é rejeitada.

A classificação diferencia:

- `TRANSIENT` — retry permitido;
- `LOGGED_OUT` — exige nova decisão/autenticação;
- `RESTRICTED` — conta restringida ou limite severo;
- `ACTION_REQUIRED` — sessão inválida ou ação humana;
- `SHUTDOWN` — encerramento solicitado.

## 8. Kill switches

Há dois níveis independentes:

- global — bloqueia todas as sessões do runtime estudado;
- por sessão — bloqueia somente a sessão indicada.

Aquisição, renovação e escrita fenced falham fechado quando um controle está ativo. O supervisor ativo pode consultar o controle, desconectar o driver sintético, liberar o lease em best effort e entrar em `KILLED`.

## 9. Cenários de recuperação testados

- dois writers concorrentes;
- renovação pelo holder atual;
- takeover após expiração;
- processo zumbi com token antigo;
- tentativa de CAS zumbi sem alteração de geração;
- reinício durante atualização de credenciais;
- restore por nova instância;
- release seguido de token monotônico;
- kill switch global e por sessão;
- pairing vazio ou expirado;
- logout, restrição, falha transitória e ação humana;
- container do gateway sem rede externa.

## 10. Limites preservados

A conclusão da W-08 não autoriza:

- registrar `SessionLifecycleSupervisor` no bootstrap;
- abrir socket externo;
- gerar ou exibir QR/pairing real;
- utilizar credencial ou sessão real;
- conectar o gateway ao banco principal em produção;
- utilizar número real;
- deploy, piloto ou produção;
- ingress, dispatch, automação ou IA.

Esses itens dependem das próximas sprints e de decisões operacionais externas específicas.
