# Session Credential Store — Sprint W-07

**Estado:** implementação em validação  
**Provider:** `WHATSAPP_WEB_BAILEYS`  
**Runtime real:** bloqueado  
**Material utilizado nos testes:** exclusivamente sintético

## 1. Finalidade

A W-07 cria a fronteira responsável por credenciais de dispositivo, Noise keys, identity keys, prekeys, sessões Signal, sender keys, app-state keys, mappings LID/PN e metadados de versão. O domínio de CRM, contatos, conversas e mensagens continua fora deste armazenamento.

```text
AuthenticationState Baileys
          ↓ BufferJSON no adapter autorizado
SessionCredentialStore provider-neutral
          ↓ transação + CAS
EnvelopeCrypto AES-256-GCM
          ↓
SessionCredentialRepository
          ↓
SQL: somente envelope e ciphertext
```

## 2. Contratos

`SessionCredentialStore` oferece:

- `loadCredentials`;
- `compareAndSwapCredentials`;
- `getKeys`;
- `setKeys`;
- `rotateSessionDataKey`;
- `rewrapSessionDataKey`;
- `exportEncryptedBackup`;
- `restoreEncryptedBackup`;
- `deleteSessionSecrets`;
- `listAuditEvents`.

A escrita usa `expectedGeneration`. Uma geração divergente produz `GENERATION_CONFLICT` e nenhuma mutação parcial é confirmada.

## 3. Envelope encryption

- algoritmo de dados: AES-256-GCM;
- IV aleatório: 12 bytes;
- authentication tag: 16 bytes;
- AAD: organização, sessão, conta, provider, tipo de registro, chave lógica, versão do registro e versão da DEK;
- uma DEK aleatória de 32 bytes por sessão;
- a DEK é envelopada por `KeyEnvelopeProvider`;
- a KEK não é coluna, migration, configuração comum ou parte do backup;
- buffers de DEK e plaintext temporário são sobrescritos após o uso.

O provider em memória existe exclusivamente para testes e exige `allowTestOnly: true`. Produção deverá implementar a mesma porta usando KMS/HSM ou serviço de chaves aprovado.

## 4. Persistência

Tabelas técnicas:

- `channel_session_secret_envelopes`;
- `channel_session_credentials`;
- `channel_session_keys`;
- `channel_session_secret_audit`.

O banco recebe somente:

- DEK envelopada;
- identificador e versão da KEK;
- ciphertext;
- IV;
- authentication tag;
- SHA-256 do AAD;
- versões e escopo;
- auditoria sanitizada.

Não existem colunas para chave-mestra, DEK em claro, credencial em claro, QR ou pairing code.

## 5. Transações e concorrência

A porta de repositório exige `transaction`. O repositório sintético usa copy-on-write e serialização por fila, confirmando o estado somente quando a operação termina com sucesso.

A migration disponibiliza `compare_and_swap_channel_session_credentials`, que:

1. bloqueia o envelope com `FOR UPDATE`;
2. cria a sessão somente quando `expected_generation` é nulo;
3. rejeita geração obsoleta;
4. atualiza credencial e geração na mesma transação;
5. grava somente auditoria sanitizada.

Single writer, lease e fencing token pertencem à W-08 e continuam ausentes.

## 6. Rotação

Há duas operações distintas:

- **rotate:** gera nova DEK, abre cada registro, recriptografa credenciais e keys, incrementa versões e envelopa a nova DEK;
- **rewrap:** mantém os ciphertexts de dados e reenvelopa a mesma DEK sob uma nova KEK.

A separação permite rotação de KEK sem recriptografar todos os registros e rotação completa quando a DEK precisar ser substituída.

## 7. Backup e restore

O backup contém apenas:

- envelope cifrado;
- credencial cifrada;
- keys cifradas;
- manifesto SHA-256;
- escopo e versões.

Antes da exportação, todos os registros são autenticados. Antes do restore, o manifesto, a KEK, o AAD e as tags GCM são validados. Corrupção causa `BACKUP_CORRUPTED` antes de qualquer commit.

## 8. Exclusão criptográfica

`deleteSessionSecrets` exige geração atual e remove:

- envelope da DEK;
- credenciais cifradas;
- todas as keys cifradas.

Sem a DEK envelopada, os ciphertexts não são recuperáveis pelo store. A auditoria não contém segredo e permanece como evidência do evento.

## 9. Auditoria e logs

A auditoria registra somente ação, resultado, geração, ator, correlation ID e atributos de baixa sensibilidade. Chaves proibidas incluem `credentials`, `keys`, `plaintext`, `secret`, `ciphertext`, `wrapped_dek`, `auth_tag`, `qr`, `pairing_code` e `adv_secret_key`.

Arquivos do store e do bridge não possuem `console.log`, `console.error`, `console.warn` ou `console.debug`.

## 10. Integração Baileys

`createStoredBaileysAuthenticationState` fica dentro de `engines/baileys` e:

- serializa com `BufferJSON`;
- inicializa com `initAuthCreds` quando a sessão não existe;
- implementa `SignalKeyStore.get`, `set` e `clear` sobre o store cifrado;
- mantém geração local para CAS;
- não cria socket;
- não produz QR;
- não registra o provider no bootstrap.

`useMultiFileAuthState` é proibido por scanner em todo código, exceto eventual laboratório explicitamente descartável sob `tests/disposable-baileys-lab/`.

## 11. Gates

- `messaging-session-store-boundary-v1`;
- testes unitários de criptografia, CAS, concorrência, rotação, backup, restore e exclusão;
- oito provas PostgreSQL;
- lint e typecheck;
- build do gateway;
- container sem rede;
- build Next.js.

## 12. Limites preservados

A W-07 não autoriza:

- socket externo;
- sessão ou credencial real;
- QR ou pairing;
- número real;
- conexão do gateway ao banco principal em runtime;
- lease, fencing ou reconexão;
- deploy, piloto ou produção.
